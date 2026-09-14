import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { MembershipService } from '../common/membership.service.js';
import type { AuthenticatedUser } from '../common/auth.js';
import { publicAttendance } from './attendance.js';

@Injectable()
export class RsvpService {
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipService) {}
  async listRsvps(user: AuthenticatedUser, invitationId: string) {
    await this.memberships.requireInvitationRole(user, invitationId);
    const rows = await this.prisma.rSVP.findMany({ where: { guest: { invitationId } }, include: { guest: { select: { id: true, displayName: true, quota: true } }, event: true }, orderBy: { updatedAt: 'desc' } });
    return rows.map((row) => ({ ...row, attendance: publicAttendance(row.attendance) }));
  }
  async listWishes(user: AuthenticatedUser, invitationId: string) { await this.memberships.requireInvitationRole(user, invitationId); return this.prisma.wish.findMany({ where: { invitationId }, orderBy: { createdAt: 'desc' } }); }
  async moderateWish(user: AuthenticatedUser, invitationId: string, wishId: string, approved: boolean) { await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR'); const changed = await this.prisma.wish.updateMany({ where: { id: wishId, invitationId }, data: { approved } }); if (!changed.count) throw new NotFoundException('Ucapan tidak ditemukan'); return { approved }; }
}
