import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { canEditDesign, createDefaultDocument, templateIds, type InvitationDocument, type TemplateId } from '@aruna/contracts';
import type { CreateInvitationBody } from '@aruna/contracts/api';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '@aruna/database';
import { MembershipService } from '../common/membership.service.js';
import { isOperator, type AuthenticatedUser } from '../common/auth.js';
import { validatePublishableDocument } from './document-validation.js';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipService) {}

  async list(user: AuthenticatedUser) {
    const rows = isOperator(user)
      ? await this.prisma.invitation.findMany({ orderBy: { updatedAt: 'desc' } })
      : await this.prisma.invitation.findMany({ where: { members: { some: { userId: user.sub } } }, orderBy: { updatedAt: 'desc' } });
    return rows.map((row) => ({ id: row.id, slug: row.slug, title: row.title, status: row.status }));
  }

  async create(user: AuthenticatedUser, input: CreateInvitationBody) {
    const slug = input.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) throw new BadRequestException('Slug tidak valid');
    const templateId = (input.templateId?.trim() || 'aruna-bloom') as TemplateId;
    if (!templateIds.includes(templateId)) throw new BadRequestException('Template tidak tersedia');
    const document = createDefaultDocument(input.partner1.trim(), input.partner2.trim(), templateId);
    const eventSection = document.sections.find((section) => section.type === 'events');
    const date = input.date?.trim() ?? '';
    if (eventSection && Array.isArray(eventSection.data.events)) {
      eventSection.data.events = eventSection.data.events.map((event) => ({ ...event, date, venue: input.venue?.trim() || 'Lokasi akan diumumkan', address: input.address?.trim() || '' }));
    }
    const countdown = document.sections.find((section) => section.type === 'countdown');
    if (countdown) countdown.data.date = date;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const invitation = await tx.invitation.create({ data: { slug, title: input.title.trim(), partner1: input.partner1.trim(), partner2: input.partner2.trim(), eventDate: input.date ? new Date(input.date) : null, venue: input.venue?.trim(), address: input.address?.trim(), draftDocument: toJson(document), createdById: user.sub } });
        await tx.invitationMember.create({ data: { invitationId: invitation.id, userId: user.sub, role: 'OWNER' } });
        return invitation;
      });
    } catch (error) {
      if (isPrismaUniqueError(error)) throw new ConflictException('Slug sudah digunakan');
      throw error;
    }
  }

  async get(user: AuthenticatedUser, invitationId: string) {
    await this.memberships.requireInvitationRole(user, invitationId);
    const invitation = await this.prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, include: { entitlements: { where: { revokedAt: null, OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }] }, include: { feature: true } } } });
    return { id: invitation.id, slug: invitation.slug, title: invitation.title, status: invitation.status, document: invitation.draftDocument, revision: invitation.draftRevision, features: invitation.entitlements.map((item) => item.featureId), activeUntil: invitation.entitlements.reduce<Date | null>((latest, item) => !latest || (item.activeUntil && item.activeUntil > latest) ? item.activeUntil : latest, null), publishedAt: invitation.publishedAt };
  }

  /** `document` dan `revision` sudah lolos `saveDraftBodySchema` di batas controller. */
  async saveDraft(user: AuthenticatedUser, invitationId: string, document: InvitationDocument, revision: number) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    const existing = await this.prisma.invitation.findUnique({ where: { id: invitationId }, select: { draftDocument: true, entitlements: { where: { revokedAt: null, OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }] }, select: { featureId: true } } } });
    if (!existing) throw new NotFoundException('Undangan tidak ditemukan');
    // Aturan yang sama persis dipakai editor untuk mematikan kontrolnya, supaya kontrol
    // yang terlihat hidup tidak pernah berujung pada autosave yang ditolak.
    const designUnlocked = canEditDesign({ isOperator: isOperator(user), features: existing.entitlements.map((item) => item.featureId) });
    if (!designUnlocked && hasDesignChange(existing.draftDocument, document)) throw new BadRequestException('Perubahan warna, font, atau urutan section memerlukan add-on desain');
    const update = await this.prisma.invitation.updateMany({ where: { id: invitationId, draftRevision: revision }, data: { draftDocument: toJson(document), draftRevision: { increment: 1 } } });
    if (!update.count) {
      const current = await this.prisma.invitation.findUnique({ where: { id: invitationId }, select: { draftRevision: true, draftDocument: true } });
      throw new ConflictException({ code: 'REVISION_CONFLICT', message: 'Draft telah diubah di tempat lain', current });
    }
    return { document, revision: revision + 1 };
  }

  async publish(user: AuthenticatedUser, invitationId: string) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { id: invitationId }, include: { entitlements: { where: { revokedAt: null, OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }] } } } });
      if (!invitation) throw new NotFoundException('Undangan tidak ditemukan');
      if (invitation.activeRevisionId) {
        const active = await tx.publishedRevision.findUnique({ where: { id: invitation.activeRevisionId } });
        if (active?.revision === invitation.draftRevision) return { slug: invitation.slug, publishedAt: invitation.publishedAt };
      }
      const document = validatePublishableDocument(invitation.draftDocument);
      const enabledTypes = document.sections.filter((section) => section.enabled).map((section) => section.type);
      const granted = new Set(invitation.entitlements.map((item) => item.featureId));
      if (!isOperator(user) && enabledTypes.some((feature) => !granted.has(feature))) throw new BadRequestException('Paket aktif belum mencakup seluruh section yang diaktifkan');
      const snapshot = await tx.publishedRevision.create({ data: { invitationId, revision: invitation.draftRevision, document: toJson(document) } });
      const publishedAt = new Date();
      await tx.invitation.update({ where: { id: invitationId }, data: { activeRevisionId: snapshot.id, status: 'PUBLISHED', publishedAt } });
      await tx.auditEvent.create({ data: { actorId: user.sub, invitationId, action: 'INVITATION_PUBLISHED', targetType: 'PublishedRevision', targetId: snapshot.id } });
      return { slug: invitation.slug, publishedAt };
    });
  }
}

function isPrismaUniqueError(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002'; }

function hasDesignChange(previous: unknown, next: InvitationDocument): boolean {
  if (!previous || typeof previous !== 'object') return true;
  const oldDocument = previous as InvitationDocument;
  return JSON.stringify(oldDocument.tokens) !== JSON.stringify(next.tokens) || oldDocument.sections.map((section) => section.id).join('|') !== next.sections.map((section) => section.id).join('|');
}

function toJson(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
