import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hashGuestToken } from '../guests/guest-token.js';
import { PrismaService } from '../database/prisma.service.js';
import { publicDocument } from '../invitations/document-validation.js';
import { Prisma } from '@aruna/database';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async invitation(slug: string) {
    const invitation = await this.prisma.invitation.findFirst({ where: { slug, status: 'PUBLISHED', activeRevision: { isNot: null } }, include: { activeRevision: true } });
    if (!invitation?.activeRevision) throw new NotFoundException('Undangan belum dipublikasikan');
    return { document: publicDocument(invitation.activeRevision.document as never), title: invitation.title, slug: invitation.slug, publishedAt: invitation.publishedAt };
  }

  async guest(slug: string, token: string | undefined) {
    if (!token) return { personal: false };
    const invitation = await this.publishedInvitation(slug);
    const guest = await this.prisma.guest.findFirst({ where: { invitationId: invitation.id, tokenHash: hashGuestToken(token) }, include: { events: { include: { event: true } }, rsvps: true } });
    if (!guest) return { personal: false };
    return { personal: true, displayName: guest.displayName, quota: guest.quota, rsvp: guest.rsvps[0] ?? null, events: guest.events.map(({ event }) => ({ id: event.id, name: event.name, startsAt: event.startsAt, endsAt: event.endsAt, rsvpDeadline: event.rsvpDeadline })) };
  }

  async markOpened(slug: string, token: string): Promise<{ opened: boolean }> {
    if (typeof token !== 'string' || !token) return { opened: false };
    const invitation = await this.publishedInvitation(slug);
    const updated = await this.prisma.guest.updateMany({ where: { invitationId: invitation.id, tokenHash: hashGuestToken(token), openedAt: null }, data: { openedAt: new Date() } });
    if (updated.count) return { opened: true };
    const exists = await this.prisma.guest.count({ where: { invitationId: invitation.id, tokenHash: hashGuestToken(token) } });
    return { opened: exists > 0 };
  }

  async rsvp(slug: string, input: { token: string; attendance: 'yes' | 'no'; count?: number; message?: string; eventId?: string }) {
    if (!input || typeof input.token !== 'string' || (input.attendance !== 'yes' && input.attendance !== 'no')) throw new BadRequestException('RSVP tidak valid');
    const invitation = await this.publishedInvitation(slug);
    const document = publicDocument(invitation.activeRevision!.document as never);
    const rsvpSection = document.sections.find((section) => section.type === 'rsvp');
    if (!rsvpSection?.enabled) throw new BadRequestException('RSVP tidak tersedia untuk undangan ini');
    const documentDeadline = typeof rsvpSection.data.deadline === 'string' && rsvpSection.data.deadline ? new Date(rsvpSection.data.deadline) : null;
    if (documentDeadline && !Number.isNaN(documentDeadline.valueOf()) && documentDeadline < new Date()) throw new BadRequestException('Batas RSVP telah berakhir');
    const guest = await this.prisma.guest.findFirst({ where: { invitationId: invitation.id, tokenHash: hashGuestToken(input.token) }, include: { events: { include: { event: true } } } });
    if (!guest) throw new BadRequestException('Tautan RSVP personal tidak valid');
    const count = input.attendance === 'no' ? 0 : (input.count ?? 1);
    if (!Number.isInteger(count) || (input.attendance === 'yes' && count < 1) || count < 0 || count > guest.quota) throw new BadRequestException(`Jumlah kehadiran maksimal ${guest.quota}`);
    if (typeof input.message === 'string' && input.message.length > 1000) throw new BadRequestException('Pesan RSVP maksimal 1.000 karakter');
    let eventId: string | null = null;
    if (input.eventId) {
      const access = guest.events.find(({ event }) => event.id === input.eventId);
      if (!access) throw new BadRequestException('Anda tidak diundang ke acara tersebut');
      if (access.event.rsvpDeadline && access.event.rsvpDeadline < new Date()) throw new BadRequestException('Batas RSVP acara ini telah berakhir');
      eventId = access.event.id;
    } else {
      const deadlines = guest.events.map(({ event }) => event.rsvpDeadline).filter((deadline): deadline is Date => Boolean(deadline));
      if (deadlines.some((deadline) => deadline < new Date())) throw new BadRequestException('Batas RSVP telah berakhir');
    }
    const attendance = input.attendance === 'yes' ? 'YES' : 'NO';
    const rsvp = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`${guest.id}:${eventId ?? 'general'}`}))`);
      const existing = await tx.rSVP.findFirst({ where: { guestId: guest.id, eventId } });
      return existing
        ? tx.rSVP.update({ where: { id: existing.id }, data: { attendance, count, message: input.message?.trim() || null } })
        : tx.rSVP.create({ data: { guestId: guest.id, eventId, attendance, count, message: input.message?.trim() || null } });
    });
    return { attendance: rsvp.attendance.toLowerCase(), count: rsvp.count, message: rsvp.message };
  }

  async wishes(slug: string) {
    const invitation = await this.publishedInvitation(slug);
    return this.prisma.wish.findMany({ where: { invitationId: invitation.id, approved: true }, select: { id: true, authorName: true, message: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async createWish(slug: string, input: { token: string; message: string }) {
    if (!input || typeof input.token !== 'string' || typeof input.message !== 'string' || !input.message.trim() || input.message.length > 1000) throw new BadRequestException('Ucapan harus 1–1.000 karakter');
    const invitation = await this.publishedInvitation(slug);
    const guest = await this.prisma.guest.findFirst({ where: { invitationId: invitation.id, tokenHash: hashGuestToken(input.token) } });
    if (!guest) throw new BadRequestException('Tautan RSVP personal tidak valid');
    // Endpoint ini menulis tanpa autentikasi selain token tamu; batas per tamu menahan
    // satu tautan yang bocor dari membanjiri antrean moderasi pasangan.
    const alreadySent = await this.prisma.wish.count({ where: { invitationId: invitation.id, guestId: guest.id } });
    if (alreadySent >= 5) throw new BadRequestException('Ucapan dari tautan ini sudah mencapai batas');
    // Baris yang dibuat dikembalikan supaya penulisnya langsung melihat ucapannya sendiri,
    // lengkap dengan penanda bahwa ia masih menunggu ditinjau. Tamu lain tetap tidak melihatnya.
    const wish = await this.prisma.wish.create({
      data: { invitationId: invitation.id, guestId: guest.id, authorName: guest.displayName, message: input.message.trim(), approved: false },
      select: { id: true, authorName: true, message: true, createdAt: true, approved: true },
    });
    return wish;
  }

  private async publishedInvitation(slug: string) {
    const invitation = await this.prisma.invitation.findFirst({ where: { slug, status: 'PUBLISHED', activeRevision: { isNot: null } }, include: { activeRevision: true } });
    if (!invitation?.activeRevision) throw new NotFoundException('Undangan belum dipublikasikan');
    return invitation;
  }
}
