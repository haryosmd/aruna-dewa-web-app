import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PublicRsvpBody, PublicWishBody } from '@aruna/contracts/api';
import { hashGuestToken } from '../guests/guest-token.js';
import { publicAttendance, serializeRsvp } from '../rsvp/attendance.js';
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
    return { personal: true, displayName: guest.displayName, quota: guest.quota, rsvp: serializeRsvp(guest.rsvps[0]), events: guest.events.map(({ event }) => ({ id: event.id, name: event.name, startsAt: event.startsAt, endsAt: event.endsAt, rsvpDeadline: event.rsvpDeadline })) };
  }

  async markOpened(slug: string, token: string): Promise<{ opened: boolean }> {
    const invitation = await this.publishedInvitation(slug);
    const updated = await this.prisma.guest.updateMany({ where: { invitationId: invitation.id, tokenHash: hashGuestToken(token), openedAt: null }, data: { openedAt: new Date() } });
    if (updated.count) return { opened: true };
    const exists = await this.prisma.guest.count({ where: { invitationId: invitation.id, tokenHash: hashGuestToken(token) } });
    return { opened: exists > 0 };
  }

  /*
   * Jalur v1 saja. Dokumen Elegance (v2) tidak punya bagian `rsvp` — kehadiran naik lewat
   * `POST /public/:slug/wishes`, dan batas RSVP yang dibaca di bawah adalah salah satu kehilangan
   * yang diakui `migrateLegacyDocument`. Jadi undangan v2 selalu dijawab 400 di sini, dan itu
   * benar: renderer v2 tidak pernah memanggilnya. Revisi terbit v1 yang lama tetap terlayani
   * sampai pasangannya menerbitkan ulang.
   */
  async rsvp(slug: string, input: PublicRsvpBody) {
    const invitation = await this.publishedInvitation(slug);
    const document = publicDocument(invitation.activeRevision!.document as never);
    const rsvpSection = document.sections.find((section) => section.type === 'rsvp');
    if (!rsvpSection?.enabled) throw new BadRequestException('RSVP tidak tersedia untuk undangan ini');
    const documentDeadline = typeof rsvpSection.data.deadline === 'string' && rsvpSection.data.deadline ? new Date(rsvpSection.data.deadline) : null;
    if (documentDeadline && !Number.isNaN(documentDeadline.valueOf()) && documentDeadline < new Date()) throw new BadRequestException('Batas RSVP telah berakhir');
    const guest = await this.prisma.guest.findFirst({ where: { invitationId: invitation.id, tokenHash: hashGuestToken(input.token) }, include: { events: { include: { event: true } } } });
    if (!guest) throw new BadRequestException('Tautan RSVP personal tidak valid');
    const count = input.attendance === 'no' ? 0 : (input.count ?? 1);
    // Batas yang hanya bisa diketahui setelah tamunya ditemukan; skema tidak kenal kuotanya.
    if ((input.attendance === 'yes' && count < 1) || count > guest.quota) throw new BadRequestException(`Jumlah kehadiran maksimal ${guest.quota}`);
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
    return { attendance: publicAttendance(rsvp.attendance), count: rsvp.count, message: rsvp.message };
  }

  async wishes(slug: string) {
    const invitation = await this.publishedInvitation(slug);
    return this.prisma.wish.findMany({ where: { invitationId: invitation.id, approved: true }, select: { id: true, authorName: true, message: true, attendance: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  /**
   * Ucapan dari form undangan. Sejak fase 72 form Elegance menggabungkan buku tamu dan
   * kehadiran, dan terbuka untuk tamu tanpa tautan personal seperti referensi: tanpa token
   * nama wajib ditulis sendiri; dengan token tamu tetap tercatat lewat `guestId`, namanya
   * boleh ditulis ulang, dan pilihan kehadirannya ikut memperbarui baris RSVP-nya.
   */
  async createWish(slug: string, input: PublicWishBody) {
    const invitation = await this.publishedInvitation(slug);
    const guest = input.token ? await this.prisma.guest.findFirst({ where: { invitationId: invitation.id, tokenHash: hashGuestToken(input.token) } }) : null;
    if (input.token && !guest) throw new BadRequestException('Tautan RSVP personal tidak valid');
    const authorName = input.name?.trim() || guest?.displayName || '';
    if (!authorName) throw new BadRequestException({ code: 'INVALID_BODY', message: 'Nama wajib diisi', fieldErrors: { name: ['Nama wajib diisi'] } });
    if (guest) {
      // Endpoint ini menulis tanpa autentikasi selain token tamu; batas per tamu menahan
      // satu tautan yang bocor dari membanjiri antrean moderasi pasangan. Ucapan tanpa token
      // hanya dijaga throttle per IP — dan tetap menunggu moderasi sebelum terlihat tamu lain.
      const alreadySent = await this.prisma.wish.count({ where: { invitationId: invitation.id, guestId: guest.id } });
      if (alreadySent >= 5) throw new BadRequestException('Ucapan dari tautan ini sudah mencapai batas');
      if (input.attendance) await this.recordAttendance(guest.id, input.attendance);
    }
    // Baris yang dibuat dikembalikan supaya penulisnya langsung melihat ucapannya sendiri,
    // lengkap dengan penanda bahwa ia masih menunggu ditinjau. Tamu lain tetap tidak melihatnya.
    const wish = await this.prisma.wish.create({
      data: { invitationId: invitation.id, guestId: guest?.id ?? null, authorName, message: input.message.trim(), attendance: input.attendance ?? null, approved: false },
      select: { id: true, authorName: true, message: true, attendance: true, createdAt: true, approved: true },
    });
    return wish;
  }

  /**
   * Kehadiran dari form ucapan ditulis ke baris RSVP umum (tanpa acara) supaya penghitung
   * "hadir" di dasbor tetap satu sumber. Kuota dan tenggat tidak diperiksa di sini: form
   * ucapan tidak menanyakan jumlah kursi (selalu 1), dan tenggat milik RSVP v1.
   */
  private async recordAttendance(guestId: string, attendance: PublicWishBody['attendance']) {
    const enumOf = { 'hadir': 'YES', 'belum-pasti': 'MAYBE', 'berhalangan': 'NO' } as const;
    const value = enumOf[attendance!];
    const count = value === 'NO' ? 0 : 1;
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`${guestId}:general`}))`);
      const existing = await tx.rSVP.findFirst({ where: { guestId, eventId: null } });
      if (existing) await tx.rSVP.update({ where: { id: existing.id }, data: { attendance: value, count } });
      else await tx.rSVP.create({ data: { guestId, eventId: null, attendance: value, count } });
    });
  }

  private async publishedInvitation(slug: string) {
    const invitation = await this.prisma.invitation.findFirst({ where: { slug, status: 'PUBLISHED', activeRevision: { isNot: null } }, include: { activeRevision: true } });
    if (!invitation?.activeRevision) throw new NotFoundException('Undangan belum dipublikasikan');
    return invitation;
  }
}
