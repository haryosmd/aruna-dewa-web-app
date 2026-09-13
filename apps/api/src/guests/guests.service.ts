import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { normalizeDisplayName, parseGuestText, type ImportRow } from '@aruna/contracts';
import { PrismaService } from '../database/prisma.service.js';
import { MembershipService } from '../common/membership.service.js';
import type { AuthenticatedUser } from '../common/auth.js';
import { createGuestToken, decryptGuestToken } from './guest-token.js';

type GuestInput = { displayName: string; phone?: string; group?: string; quota?: number };

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipService) {}

  async list(user: AuthenticatedUser, invitationId: string, query: { q?: string; page?: number; pageSize?: number }) {
    await this.memberships.requireInvitationRole(user, invitationId);
    const membership = user.role === 'OPERATOR' ? null : await this.prisma.invitationMember.findUnique({ where: { invitationId_userId: { invitationId, userId: user.sub } }, select: { role: true } });
    const revealTokens = user.role === 'OPERATOR' || membership?.role !== 'VIEWER';
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const where = { invitationId, ...(query.q ? { displayName: { contains: query.q.trim(), mode: 'insensitive' as const } } : {}) };
    const [items, total] = await this.prisma.$transaction([this.prisma.guest.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { rsvps: true } }), this.prisma.guest.count({ where })]);
    return { items: items.map((guest) => this.serializeGuest(guest, revealTokens)), total, page, pageSize };
  }

  async create(user: AuthenticatedUser, invitationId: string, input: GuestInput) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    const prepared = prepareGuest(input);
    const token = createGuestToken();
    const guest = await this.prisma.guest.create({ data: { invitationId, ...prepared, tokenHash: token.hash, tokenCiphertext: token.ciphertext } });
    return this.serializeGuest(guest);
  }

  async update(user: AuthenticatedUser, invitationId: string, guestId: string, input: GuestInput & { revision: number }) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    const prepared = prepareGuest(input);
    const updated = await this.prisma.guest.updateMany({ where: { id: guestId, invitationId, revision: input.revision }, data: { ...prepared, revision: { increment: 1 } } });
    if (!updated.count) {
      const current = await this.prisma.guest.findFirst({ where: { id: guestId, invitationId } });
      if (!current) throw new NotFoundException('Tamu tidak ditemukan');
      throw new ConflictException({ code: 'REVISION_CONFLICT', message: 'Tamu telah diubah di tempat lain', current: this.serializeGuest(current) });
    }
    return this.serializeGuest(await this.prisma.guest.findUniqueOrThrow({ where: { id: guestId } }));
  }

  async remove(user: AuthenticatedUser, invitationId: string, guestId: string) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    const deleted = await this.prisma.guest.deleteMany({ where: { id: guestId, invitationId } });
    if (!deleted.count) throw new NotFoundException('Tamu tidak ditemukan');
  }

  async preview(user: AuthenticatedUser, invitationId: string, text: string, format: 'csv' | 'tsv') {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    if (typeof text !== 'string' || (format !== 'csv' && format !== 'tsv')) throw new BadRequestException('Format impor tidak valid');
    const rows = parseGuestText(text, format);
    const job = await this.prisma.importJob.create({ data: { invitationId, createdById: user.sub, status: 'READY', source: format, rows, validCount: rows.filter((row) => row.errors.length === 0).length } });
    return { id: job.id, rows, validCount: job.validCount };
  }

  async commit(user: AuthenticatedUser, invitationId: string, jobId: string, idempotencyKey: string) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    if (!idempotencyKey || idempotencyKey.length > 200) throw new BadRequestException('Idempotency key wajib diisi');
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.importJob.findFirst({ where: { id: jobId, invitationId } });
      if (!job) throw new NotFoundException('Preview impor tidak ditemukan');
      if (job.status === 'COMMITTED') {
        if (job.idempotencyKey === idempotencyKey) return { imported: job.importedCount ?? 0 };
        throw new ConflictException('Preview ini sudah dikomit dengan idempotency key lain');
      }
      const claimed = await tx.importJob.updateMany({ where: { id: job.id, status: 'READY', idempotencyKey: null }, data: { status: 'COMMITTED', idempotencyKey, committedAt: new Date() } });
      if (!claimed.count) throw new ConflictException('Impor sedang atau sudah diproses');
      const rows = job.rows as unknown as ImportRow[];
      const validRows = rows.filter((row) => row.errors.length === 0);
      await tx.guest.createMany({ data: validRows.map((row) => { const token = createGuestToken(); return { invitationId, displayName: row.displayName, phone: row.phone || null, groupName: row.group || null, quota: row.quota ?? 1, tokenHash: token.hash, tokenCiphertext: token.ciphertext }; }) });
      await tx.importJob.update({ where: { id: job.id }, data: { importedCount: validRows.length } });
      await tx.auditEvent.create({ data: { actorId: user.sub, invitationId, action: 'GUEST_IMPORT_COMMITTED', targetType: 'ImportJob', targetId: job.id, metadata: { imported: validRows.length } } });
      return { imported: validRows.length };
    });
  }

  private serializeGuest(guest: { id: string; displayName: string; phone: string | null; groupName: string | null; quota: number; revision: number; tokenCiphertext: string; rsvps?: unknown[] }, revealToken = true) {
    return { id: guest.id, displayName: guest.displayName, ...(revealToken ? { token: decryptGuestToken(guest.tokenCiphertext) } : {}), revision: guest.revision, phone: guest.phone ?? undefined, group: guest.groupName ?? undefined, quota: guest.quota, rsvp: guest.rsvps?.[0] };
  }
}

function prepareGuest(input: GuestInput): { displayName: string; phone: string | null; groupName: string | null; quota: number } {
  if (!input || typeof input.displayName !== 'string') throw new BadRequestException('Nama undangan wajib diisi');
  const quota = input.quota ?? 1;
  if (!Number.isInteger(quota) || quota < 1 || quota > 20) throw new BadRequestException('Kuota harus 1–20 orang');
  return { displayName: normalizeDisplayName(input.displayName), phone: typeof input.phone === 'string' ? input.phone.trim() || null : null, groupName: typeof input.group === 'string' ? input.group.trim() || null : null, quota };
}
