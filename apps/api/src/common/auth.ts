import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';

export interface AuthenticatedUser { sub: string; sid: string; email: string; role: 'USER' | 'OPERATOR' }
type RequestWithUser = Request & { user?: AuthenticatedUser };

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const user = context.switchToHttp().getRequest<RequestWithUser>().user;
  if (!user) throw new UnauthorizedException('Login diperlukan');
  return user;
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = request.cookies?.aruna_access as string | undefined;
    if (!token) throw new UnauthorizedException('Login diperlukan');
    try {
      const payload = await this.jwt.verifyAsync<AuthenticatedUser>(token);
      const session = await this.prisma.session.findFirst({ where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
      if (!session) throw new UnauthorizedException('Sesi akses sudah dicabut');
      request.user = payload;
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
    const configuredOrigin = process.env.WEB_ORIGIN ?? 'http://127.0.0.1:3000';
    const origin = request.header('origin');
    if (origin !== configuredOrigin) throw new ForbiddenException('Origin request tidak diizinkan');
    return true;
  }
}

export function assertOperator(user: AuthenticatedUser): void {
  if (user.role !== 'OPERATOR') throw new ForbiddenException('Akses operator diperlukan');
}
