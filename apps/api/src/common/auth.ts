import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import { isAllowedOrigin } from './web-origin.js';

export interface AuthenticatedUser { sub: string; sid: string; email: string; role: 'USER' | 'OPERATOR' }
type RequestWithUser = Request & { user?: AuthenticatedUser };

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const user = context.switchToHttp().getRequest<RequestWithUser>().user;
  if (!user) throw new UnauthorizedException('Login diperlukan');
  return user;
});

/**
 * Syarat sesi masih hidup, satu definisi untuk semua penjaga. Batas idle dan batas absolut
 * harus dua-duanya lolos: yang pertama menghukum sesi yang ditinggalkan, yang kedua memaksa
 * login ulang berkala betapapun rajinnya seseorang memakai akunnya.
 */
export function liveSessionWhere(payload: AuthenticatedUser, now: Date = new Date()) {
  return { id: payload.sid, userId: payload.sub, revokedAt: null, idleExpiresAt: { gt: now }, absoluteExpiresAt: { gt: now } };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = request.cookies?.aruna_access as string | undefined;
    if (!token) throw new UnauthorizedException('Login diperlukan');
    try {
      const payload = await this.jwt.verifyAsync<AuthenticatedUser>(token);
      // `role` ikut dibaca dari kueri yang memang sudah berjalan — nol kueri tambahan.
      // Tanpa ini klaim di dalam token yang berlaku sampai 15 menit, jadi operator yang
      // baru dicabut tetap berkuasa selama itu, dan token tempaan tak pernah diuji ulang.
      const session = await this.prisma.session.findFirst({ where: liveSessionWhere(payload), select: { id: true, user: { select: { role: true } } } });
      if (!session) throw new UnauthorizedException('Sesi akses sudah dicabut');
      request.user = { ...payload, role: session.user.role };
      return true;
    } catch {
      throw new UnauthorizedException('Sesi akses tidak valid');
    }
  }
}

@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!isAllowedOrigin(request.header('origin'))) throw new ForbiddenException('Origin request tidak diizinkan');
    return true;
  }
}

/**
 * Satu definisi "operator", melawan tujuh perbandingan `role === 'OPERATOR'` yang dulu
 * tersebar di lima berkas. Yang paling penting di antaranya menggantungkan aktivasi tanpa
 * bayar pada satu perbandingan string yang berdiri sendiri.
 */
export function isOperator(user: AuthenticatedUser): boolean {
  return user.role === 'OPERATOR';
}

export function assertOperator(user: AuthenticatedUser): void {
  if (!isOperator(user)) throw new ForbiddenException('Akses operator diperlukan');
}
