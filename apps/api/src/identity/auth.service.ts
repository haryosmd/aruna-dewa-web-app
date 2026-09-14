import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { RegisterBody } from '@aruna/contracts/api';
import { PrismaService } from '../database/prisma.service.js';
import type { TokenPurpose } from '@aruna/database';
import { MailService } from './mail.service.js';
import { decideRegistration } from './registration.js';
import {
  decideRefresh,
  type GraceSlot,
  graceSlotAfter,
  matchableHashes,
  newSessionWindow,
  nextWindow,
  type RefreshSessionRecord,
  type SessionEndedCode,
  type TokenMatch,
} from './session-rotation.js';
import type { AuthenticatedUser } from '../common/auth.js';
import { canonicalWebOrigin } from '../common/web-origin.js';

const accessCookie = 'aruna_access';
const refreshCookie = 'aruna_refresh';

/** Ambang dan jendela untuk menandai rentetan login gagal sebagai satu peristiwa tersendiri. */
const FAILED_LOGIN_STREAK = 5;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;

/**
 * Hash umpan dengan parameter yang sama persis seperti password sungguhan, dibuat sekali
 * lalu dipakai ulang. Nilainya acak dan tidak pernah cocok dengan apa pun — yang diambil
 * cuma waktunya.
 */
let decoyHash: Promise<string> | undefined;
function decoyPasswordHash(): Promise<string> {
  decoyHash ??= argon2.hash(randomBytes(32).toString('base64url'), { type: argon2.argon2id });
  return decoyHash;
}

/** `argon2.verify` melempar untuk hash yang bentuknya tidak dikenal; itu tetap "tidak cocok". */
async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

const endedMessages: Record<SessionEndedCode, string> = {
  SESSION_INVALID: 'Refresh token tidak valid',
  SESSION_EXPIRED: 'Sesi sudah berakhir',
  SESSION_REPLACED: 'Akun ini dipakai masuk di perangkat lain',
  SESSION_REUSE: 'Sesi dihentikan demi keamanan',
};

/** 401 yang membawa kode, supaya web bisa menerangkan sebabnya alih-alih menebak. */
function sessionEnded(code: SessionEndedCode): UnauthorizedException {
  return new UnauthorizedException({ message: endedMessages[code], code });
}

export interface CookieResponse {
  cookie(name: string, value: string, options: Record<string, unknown>): void;
  clearCookie(name: string, options: Record<string, unknown>): void;
}

/** Jejak perangkat yang menerbitkan sesi; dipakai kalau nanti ingin ditampilkan ke pemilik akun. */
export interface SessionContext {
  userAgent?: string | null;
  ip?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  /** Bentuk dan batasnya dijamin `registerBodySchema` di batas controller. */
  async register(input: RegisterBody): Promise<{ id: string; email: string; name: string }> {
    const { email, name } = input;
    const existing = await this.prisma.user.findUnique({ where: { email } });
    const decision = decideRegistration(existing);
    if (decision.kind === 'conflict') throw new ConflictException(decision.message);
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = decision.kind === 'reclaim' && existing
      // Pendaftaran ulang atas akun yang tak pernah terverifikasi: sesi lama dicabut,
      // karena password barunya sekarang yang menentukan siapa pemegang akun ini.
      ? await this.prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash, sessions: { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'ACCOUNT_RECLAIMED' } } } } })
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

  async login(emailInput: string, password: string, response: CookieResponse, context: SessionContext = {}): Promise<AuthenticatedUser> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Email tak dikenal dulu dijawab ~1 ms karena `!user?.passwordHash` memotong sebelum
    // argon2, sementara email yang ada makan ~100 ms. Selisih itu sendiri sudah menjawab
    // "akun ini terdaftar?" kepada siapa pun yang mengukurnya. Hash umpan membuat kedua
    // jalur membayar harga yang sama.
    const matched = await verifyPassword(user?.passwordHash ?? (await decoyPasswordHash()), password);
    if (!user?.passwordHash || !matched) {
      if (user) await this.recordFailedLogin(user.id);
      throw new UnauthorizedException('Email atau password salah');
    }
    return this.createSession(user, response, context);
  }

  /**
   * Percobaan gagal atas akun yang benar-benar ada dicatat, dan rentetannya ditandai sendiri.
   * Dibatasi ke akun yang ada supaya endpoint tanpa autentikasi ini tidak jadi jalan menulis
   * baris audit sebanyak-banyaknya dengan email karangan.
   */
  private async recordFailedLogin(userId: string): Promise<void> {
    await this.prisma.auditEvent.create({ data: { actorId: userId, action: 'AUTH_LOGIN_FAILED', targetType: 'User', targetId: userId } });
    const recent = await this.prisma.auditEvent.count({ where: { actorId: userId, action: 'AUTH_LOGIN_FAILED', createdAt: { gt: new Date(Date.now() - FAILED_LOGIN_WINDOW_MS) } } });
    if (recent >= FAILED_LOGIN_STREAK) {
      await this.prisma.auditEvent.create({ data: { actorId: userId, action: 'AUTH_LOGIN_FAILED_STREAK', targetType: 'User', targetId: userId, metadata: { attempts: recent, windowMinutes: FAILED_LOGIN_WINDOW_MS / 60_000 } } });
    }
  }

  /**
   * Satu sesi per akun: masuk di tempat baru mengakhiri semua sesi lama pemilik akun itu.
   * Aman dilakukan di sini justru karena rotasi tidak lagi membuat baris baru — kalau ia
   * masih membuat baris, langkah ini akan mencabut hasil rotasinya sendiri.
   */
  async createSession(user: { id: string; email: string; role: 'USER' | 'OPERATOR' }, response: CookieResponse, context: SessionContext = {}): Promise<AuthenticatedUser> {
    const now = new Date();
    const rawToken = randomBytes(32).toString('base64url');
    // Argon2 sengaja lambat; membiarkannya di dalam transaksi berarti mengunci baris sesi
    // selama ratusan milidetik tiap login.
    const refreshTokenHash = await argon2.hash(rawToken, { type: argon2.argon2id });
    const window = newSessionWindow(now);
    const session = await this.prisma.$transaction(async (tx) => {
      await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now, revokedReason: 'REPLACED' } });
      return tx.session.create({
        data: {
          userId: user.id,
          refreshTokenHash,
          idleExpiresAt: window.idleExpiresAt,
          absoluteExpiresAt: window.absoluteExpiresAt,
          userAgent: context.userAgent?.slice(0, 512) ?? null,
          ip: context.ip ?? null,
        },
      });
    });
    return this.issueSessionCookies(user, session.id, rawToken, window.cookieMaxAgeMs, response);
  }

  private async issueSessionCookies(user: { id: string; email: string; role: 'USER' | 'OPERATOR' }, sessionId: string, rawToken: string, refreshMaxAgeMs: number, response: CookieResponse): Promise<AuthenticatedUser> {
    const payload: AuthenticatedUser = { sub: user.id, sid: sessionId, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: '15m' });
    const cookieOptions = this.cookieOptions();
    response.cookie(accessCookie, accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    response.cookie(refreshCookie, `${sessionId}.${rawToken}`, { ...cookieOptions, maxAge: refreshMaxAgeMs });
    return payload;
  }

  /**
   * Rotasi dengan tenggang. `sid` tidak pernah berubah: barisnya ditulis ulang di tempat,
   * jadi access token yang sedang beredar tetap sah dan penyegaran berhenti menjadi
   * peristiwa yang mematikan sesi dirinya sendiri.
   */
  async refresh(cookie: string | undefined, response: CookieResponse): Promise<AuthenticatedUser> {
    const [sessionId, rawToken, ...rest] = cookie?.split('.') ?? [];
    if (!sessionId || !rawToken || rest.length) throw sessionEnded('SESSION_INVALID');
    // Kalah balapan berarti permintaan lain sudah memutar sesi ini sepersekian detik lalu;
    // token kita kini ada di slot tenggang dan percobaan berikutnya melewatinya sebagai
    // `grace`. Beberapa percobaan cukup untuk rentetan sah mana pun.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const now = new Date();
      const session = await this.prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
      if (!session) throw sessionEnded('SESSION_EXPIRED');
      const verdict = decideRefresh(session, await this.matchToken(session, rawToken, now), now);
      if (verdict.kind === 'ended') throw sessionEnded(verdict.code);
      if (verdict.kind === 'reuse') {
        const revoked = await this.prisma.session.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: now, revokedReason: 'REUSE_DETECTED' } });
        // Sinyal keamanan paling jelas yang diproduksi sistem ini, dan sampai sekarang ia
        // hanya meninggalkan satu enum di baris sesi yang tak pernah ada yang membacanya.
        await this.prisma.auditEvent.create({ data: { actorId: session.userId, action: 'SESSION_REUSE_DETECTED', targetType: 'Session', targetId: session.id, metadata: { revokedSessions: revoked.count } } });
        throw sessionEnded('SESSION_REUSE');
      }
      // Penjaga optimistik: kalau nilai yang barusan dibaca sudah bergeser, ada permintaan
      // lain yang mendahului. Itu balapan biasa, bukan pencurian — tidak ada yang dicabut.
      const guard = verdict.kind === 'rotate' ? { refreshTokenHash: session.refreshTokenHash } : { graceUses: session.graceUses };
      const issued = await this.advanceSession(session, now, guard, graceSlotAfter(session, verdict.kind, now));
      if (issued) return this.issueSessionCookies(session.user, session.id, issued.rawToken, issued.cookieMaxAgeMs, response);
    }
    // Kalah balapan berkali-kali bukan alasan mengeluarkan orang dari akunnya. Balasannya
    // sengaja bukan 401, supaya web memperlakukannya sebagai gangguan sesaat — bukan sesi
    // yang berakhir — dan tidak ada yang tertendang gara-gara rebutan sepersekian detik.
    throw new ServiceUnavailableException({ message: 'Sesi sedang diperbarui. Coba lagi.', code: 'SESSION_BUSY' });
  }

  /** Cocokkan token dengan hash aktif dulu, lalu dengan isi slot tenggang selama jendelanya hidup. */
  private async matchToken(session: RefreshSessionRecord, rawToken: string, now: Date): Promise<TokenMatch> {
    const candidates = matchableHashes(session, now);
    for (const [index, hash] of candidates.entries()) {
      if (await argon2.verify(hash, rawToken)) return index === 0 ? 'current' : 'previous';
    }
    return 'none';
  }

  /** Terbitkan token berikutnya untuk sesi yang sama; `null` berarti penjaganya tidak lolos. */
  private async advanceSession(
    session: { id: string; absoluteExpiresAt: Date },
    now: Date,
    guard: { refreshTokenHash: string } | { graceUses: number },
    grace: GraceSlot,
  ): Promise<{ rawToken: string; cookieMaxAgeMs: number } | null> {
    const rawToken = randomBytes(32).toString('base64url');
    const refreshTokenHash = await argon2.hash(rawToken, { type: argon2.argon2id });
    const { idleExpiresAt, cookieMaxAgeMs } = nextWindow(session, now);
    const updated = await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null, ...guard },
      data: { refreshTokenHash, rotatedAt: now, idleExpiresAt, ...grace },
    });
    return updated.count === 1 ? { rawToken, cookieMaxAgeMs } : null;
  }

  async logout(cookie: string | undefined, response: CookieResponse): Promise<void> {
    const sessionId = cookie?.split('.', 1)[0];
    if (sessionId) await this.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'LOGOUT' } });
    response.clearCookie(accessCookie, this.cookieOptions());
    response.clearCookie(refreshCookie, this.cookieOptions());
  }

  async issueEmailVerification(userId: string, email: string): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.oneTimeToken.create({ data: { userId, purpose: 'VERIFY_EMAIL', tokenHash: hashOneTimeToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    await this.mail.send(email, 'Verifikasi email Aruna Dewa', `Buka ${canonicalWebOrigin()}/verify-email?token=${token}`);
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
    await this.mail.send(user.email, 'Atur ulang password Aruna Dewa', `Buka ${canonicalWebOrigin()}/reset-password?token=${token}`);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.consumeToken(token, 'RESET_PASSWORD');
    if (!record.userId) throw new BadRequestException('Token reset tidak valid');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } }),
      this.prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'PASSWORD_RESET' } }),
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

  async completeGoogle(code: string, state: string, cookieState: string | undefined, response: CookieResponse, context: SessionContext = {}): Promise<AuthenticatedUser> {
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
          : await tx.user.update({ where: { id: existing.id }, data: { name: profile.name?.trim() || existing.name, passwordHash: null, emailVerifiedAt: new Date(), sessions: { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'ACCOUNT_RECLAIMED' } } } } })
        : await tx.user.create({ data: { email, name: profile.name?.trim() || email, emailVerifiedAt: new Date() } });
      await tx.oAuthIdentity.create({ data: { provider: 'google', providerUserId, email, userId: account.id } });
      return account;
    });
    return this.createSession(user, response, context);
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
