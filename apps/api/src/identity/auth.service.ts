import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import type { TokenPurpose } from '@aruna/database';
import { MailService } from './mail.service.js';
import { decideRegistration } from './registration.js';
import type { AuthenticatedUser } from '../common/auth.js';

const accessCookie = 'aruna_access';
const refreshCookie = 'aruna_refresh';
const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000;

export interface CookieResponse {
  cookie(name: string, value: string, options: Record<string, unknown>): void;
  clearCookie(name: string, options: Record<string, unknown>): void;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async register(input: { email: string; password: string; name: string }): Promise<{ id: string; email: string; name: string }> {
    if (!input || typeof input.email !== 'string' || typeof input.password !== 'string' || typeof input.name !== 'string') throw new BadRequestException('Data pendaftaran tidak valid');
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    if (!/^\S+@\S+\.\S+$/u.test(email)) throw new BadRequestException('Email tidak valid');
    if (input.password.length < 10) throw new BadRequestException('Password minimal 10 karakter');
    if (!name) throw new BadRequestException('Nama wajib diisi');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    const decision = decideRegistration(existing);
    if (decision.kind === 'conflict') throw new ConflictException(decision.message);
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = decision.kind === 'reclaim' && existing
      // Pendaftaran ulang atas akun yang tak pernah terverifikasi: sesi lama dicabut,
      // karena password barunya sekarang yang menentukan siapa pemegang akun ini.
      ? await this.prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash, sessions: { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } } } } })
      : await this.prisma.user.create({ data: { email, name, passwordHash } });
    try {
      await this.issueEmailVerification(user.id, user.email);
    } catch (cause) {
      // SMTP mati tidak boleh meninggalkan akun hantu: emailnya akan dijawab "sudah
      // terdaftar" selamanya sementara pemiliknya tidak pernah menerima verifikasi.
      // Baris yang baru saja dibuat dihapus; baris yang sudah ada sejak tadi dibiarkan.
      if (decision.kind === 'create') await this.prisma.user.deleteMany({ where: { id: user.id, emailVerifiedAt: null } });
      throw cause;
    }
    return { id: user.id, email: user.email, name: user.name };
  }

  async login(emailInput: string, password: string, response: CookieResponse): Promise<AuthenticatedUser> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) throw new UnauthorizedException('Email atau password salah');
    return this.createSession(user, response);
  }

  async createSession(user: { id: string; email: string; role: 'USER' | 'OPERATOR' }, response: CookieResponse): Promise<AuthenticatedUser> {
    const rawToken = randomBytes(32).toString('base64url');
    const session = await this.prisma.session.create({
      data: { userId: user.id, refreshTokenHash: await argon2.hash(rawToken, { type: argon2.argon2id }), expiresAt: new Date(Date.now() + refreshLifetimeMs) },
    });
    return this.issueSessionCookies(user, session.id, rawToken, response);
  }

  private async issueSessionCookies(user: { id: string; email: string; role: 'USER' | 'OPERATOR' }, sessionId: string, rawToken: string, response: CookieResponse): Promise<AuthenticatedUser> {
    const payload: AuthenticatedUser = { sub: user.id, sid: sessionId, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: '15m' });
    const cookieOptions = this.cookieOptions();
    response.cookie(accessCookie, accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    response.cookie(refreshCookie, `${sessionId}.${rawToken}`, { ...cookieOptions, maxAge: refreshLifetimeMs });
    return payload;
  }

  async refresh(cookie: string | undefined, response: CookieResponse): Promise<AuthenticatedUser> {
    const [sessionId, rawToken, ...rest] = cookie?.split('.') ?? [];
    if (!sessionId || !rawToken || rest.length) throw new UnauthorizedException('Refresh token tidak valid');
    const session = await this.prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
    if (!session || !(await argon2.verify(session.refreshTokenHash, rawToken))) throw new UnauthorizedException('Refresh token sudah digunakan atau tidak valid');
    if (session.expiresAt <= new Date() || session.revokedAt) {
      await this.prisma.session.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token sudah digunakan atau tidak valid');
    }
    const replacement = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.session.updateMany({ where: { id: session.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date(), rotatedAt: new Date() } });
      if (consumed.count !== 1) {
        await tx.session.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
        return null;
      }
      const nextRawToken = randomBytes(32).toString('base64url');
      const next = await tx.session.create({ data: { userId: session.userId, refreshTokenHash: await argon2.hash(nextRawToken, { type: argon2.argon2id }), expiresAt: new Date(Date.now() + refreshLifetimeMs) } });
      return { id: next.id, rawToken: nextRawToken };
    });
    if (!replacement) throw new UnauthorizedException('Refresh token sudah digunakan atau tidak valid');
    return this.issueSessionCookies(session.user, replacement.id, replacement.rawToken, response);
  }

  async logout(cookie: string | undefined, response: CookieResponse): Promise<void> {
    const sessionId = cookie?.split('.', 1)[0];
    if (sessionId) await this.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
    response.clearCookie(accessCookie, this.cookieOptions());
    response.clearCookie(refreshCookie, this.cookieOptions());
  }

  async issueEmailVerification(userId: string, email: string): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.oneTimeToken.create({ data: { userId, purpose: 'VERIFY_EMAIL', tokenHash: hashOneTimeToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    await this.mail.send(email, 'Verifikasi email Aruna Dewa', `Buka ${process.env.WEB_ORIGIN ?? 'http://127.0.0.1:3000'}/verify-email?token=${token}`);
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.consumeToken(token, 'VERIFY_EMAIL');
    if (!record.userId) throw new BadRequestException('Token verifikasi tidak valid');
    await this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  }

  async issuePasswordReset(emailInput: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: emailInput.trim().toLowerCase() } });
    if (!user) return;
    const token = randomBytes(32).toString('base64url');
    await this.prisma.oneTimeToken.create({ data: { userId: user.id, purpose: 'RESET_PASSWORD', tokenHash: hashOneTimeToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    await this.mail.send(user.email, 'Atur ulang password Aruna Dewa', `Buka ${process.env.WEB_ORIGIN ?? 'http://127.0.0.1:3000'}/reset-password?token=${token}`);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    if (password.length < 10) throw new BadRequestException('Password minimal 10 karakter');
    const record = await this.consumeToken(token, 'RESET_PASSWORD');
    if (!record.userId) throw new BadRequestException('Token reset tidak valid');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } }),
      this.prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  async startGoogle(): Promise<{ url: string; state: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) throw new BadRequestException('GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum dikonfigurasi');
    const state = randomBytes(32).toString('base64url');
    await this.prisma.oneTimeToken.create({ data: { purpose: 'OAUTH_STATE', tokenHash: hashOneTimeToken(state), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', `${process.env.API_ORIGIN ?? 'http://127.0.0.1:3001'}/auth/google`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'online');
    return { url: url.toString(), state };
  }

  async completeGoogle(code: string, state: string, cookieState: string | undefined, response: CookieResponse): Promise<AuthenticatedUser> {
    if (!code || !state) throw new BadRequestException('Callback Google tidak lengkap');
    if (!cookieState || cookieState.length !== state.length || cookieState !== state) throw new UnauthorizedException('OAuth state tidak cocok dengan browser yang memulai login');
    await this.consumeToken(state, 'OAUTH_STATE');
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new BadRequestException('Google OAuth belum dikonfigurasi');
    const redirectUri = `${process.env.API_ORIGIN ?? 'http://127.0.0.1:3001'}/auth/google`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }) });
    if (!tokenResponse.ok) throw new UnauthorizedException('Google menolak authorization code');
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) throw new UnauthorizedException('Google tidak mengembalikan access token');
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${token.access_token}` } });
    if (!profileResponse.ok) throw new UnauthorizedException('Profil Google tidak dapat diverifikasi');
    const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!profile.sub || !profile.email || !profile.email_verified) throw new UnauthorizedException('Google tidak memberikan email terverifikasi');
    const providerUserId = profile.sub;
    const email = profile.email.toLowerCase();
    const user = await this.prisma.$transaction(async (tx) => {
      const identity = await tx.oAuthIdentity.findUnique({ where: { provider_providerUserId: { provider: 'google', providerUserId } } });
      if (identity) return tx.user.findUniqueOrThrow({ where: { id: identity.userId } });
      const existing = await tx.user.findUnique({ where: { email } });
      const account = existing
        ? existing.emailVerifiedAt
          ? existing
          : await tx.user.update({ where: { id: existing.id }, data: { name: profile.name?.trim() || existing.name, passwordHash: null, emailVerifiedAt: new Date(), sessions: { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } } } } })
        : await tx.user.create({ data: { email, name: profile.name?.trim() || email, emailVerifiedAt: new Date() } });
      await tx.oAuthIdentity.create({ data: { provider: 'google', providerUserId, email, userId: account.id } });
      return account;
    });
    return this.createSession(user, response);
  }

  private async consumeToken(rawToken: string, purpose: TokenPurpose) {
    const record = await this.prisma.oneTimeToken.findFirst({ where: { purpose, tokenHash: hashOneTimeToken(rawToken), usedAt: null, expiresAt: { gt: new Date() } } });
    if (!record) throw new BadRequestException('Token tidak valid atau kedaluwarsa');
    const consumed = await this.prisma.oneTimeToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (consumed.count !== 1) throw new BadRequestException('Token tidak valid atau kedaluwarsa');
    return record;
  }

  private cookieOptions(): Record<string, unknown> {
    return { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
  }
}

export function hashOneTimeToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
