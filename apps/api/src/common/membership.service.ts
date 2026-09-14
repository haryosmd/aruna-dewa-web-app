import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { InvitationMemberRole } from '@aruna/database';
import { PrismaService } from '../database/prisma.service.js';
import { isOperator, type AuthenticatedUser } from './auth.js';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async requireInvitationRole(user: AuthenticatedUser, invitationId: string, minimum: InvitationMemberRole = 'VIEWER'): Promise<void> {
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId }, select: { id: true } });
    if (!invitation) throw new NotFoundException('Undangan tidak ditemukan');
    if (isOperator(user)) return;
    const membership = await this.prisma.invitationMember.findUnique({ where: { invitationId_userId: { invitationId, userId: user.sub } } });
    const ranks: Record<InvitationMemberRole, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };
    if (!membership || ranks[membership.role] < ranks[minimum]) throw new ForbiddenException('Anda tidak memiliki akses ke undangan ini');
  }
}
