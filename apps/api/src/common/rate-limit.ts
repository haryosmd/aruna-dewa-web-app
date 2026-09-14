import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Batas laju jalur identitas, dengan **dua** ember sekaligus.
 *
 * Satu ember saja selalu salah di salah satu arah. Per-IP saja membiarkan satu kantor
 * ber-NAT mengunci semua orang di dalamnya dari halaman login. Per-email saja membiarkan
 * satu penyerang menyisir sepuluh ribu alamat dari satu mesin — tiap alamat dapat jatah
 * sendiri, dan tiap percobaan membakar satu argon2id di server kami.
 *
 * Ditulis sendiri, bukan lewat `@nestjs/throttler`, setelah percobaan memakai dua
 * `ThrottlerGuard` bertumpuk ternyata salah: keduanya membaca metadata `@Throttle` yang
 * sama, jadi penjaga per-IP ikut memakai ambang ketat milik penjaga per-email dan login
 * terkunci pada percobaan kedua. `ThrottlerModule` tetap dipakai untuk sisa API — yang
 * memang cukup dengan satu ember per IP.
 */

export interface RateLimitRule {
  /** Panjang jendela dalam milidetik. */
  ttl: number;
  limit: number;
}

export interface IdentityRateLimit {
  /** Ember per (IP, email): menahan tebakan beruntun atas satu akun. */
  perIdentity: RateLimitRule;
  /** Ember per IP: menahan penyisiran banyak akun dari satu tempat. */
  perAddress: RateLimitRule;
}

export interface RateLimitVerdict {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * Penghitung jendela tetap in-memory. Sengaja sederhana: satu proses, satu peta, dan
 * pembersihan yang berjalan dari operasi yang sama — tidak ada timer yang bisa bocor.
 */
export class FixedWindowCounter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly pruneEvery = 500) {}

  hit(key: string, rule: RateLimitRule, now: number = Date.now()): RateLimitVerdict {
    if (this.windows.size >= this.pruneEvery) this.prune(now);
    const current = this.windows.get(key);
    if (!current || current.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + rule.ttl });
      return { allowed: true, retryAfterMs: 0 };
    }
    current.count += 1;
    return current.count <= rule.limit ? { allowed: true, retryAfterMs: 0 } : { allowed: false, retryAfterMs: current.resetAt - now };
  }

  /**
   * Kembalikan satu jatah. Dipakai saat percobaan ternyata **berhasil**: yang dibatasi
   * adalah menebak, bukan memakai. Tanpa ini pasangan yang wajar — masuk dari ponsel, lalu
   * laptop, lalu ponsel lagi — ikut menghabiskan anggaran yang disediakan untuk penyerang.
   */
  forgive(key: string): void {
    const window = this.windows.get(key);
    if (window && window.count > 0) window.count -= 1;
  }

  /** Dipakai tes; juga jaring pengaman kalau sebuah proses hidup sangat lama. */
  prune(now: number = Date.now()): void {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }

  get size(): number {
    return this.windows.size;
  }
}

const minutes = (count: number): number => count * 60 * 1000;

export const identityRateLimits = {
  /** argon2id per percobaan, tanpa autentikasi: menebak harus mahal, memakai halaman login tidak. */
  login: { perIdentity: { ttl: minutes(5), limit: 10 }, perAddress: { ttl: minutes(5), limit: 60 } },
  /** Satu baris token + satu email terkirim per panggilan; tanpa batas ini ia alat mailbomb. */
  forgotPassword: { perIdentity: { ttl: minutes(15), limit: 5 }, perAddress: { ttl: minutes(15), limit: 20 } },
  /** Sama, plus enumerasi: jawabannya membedakan email yang sudah terdaftar dari yang belum. */
  register: { perIdentity: { ttl: minutes(15), limit: 5 }, perAddress: { ttl: minutes(15), limit: 20 } },
} as const satisfies Record<string, IdentityRateLimit>;

const IDENTITY_RATE_LIMIT = 'aruna:identity-rate-limit';

/** Menandai handler sekaligus memasang penjaganya, supaya keduanya tidak bisa terpisah. */
export function IdentityRateLimit(limit: IdentityRateLimit): MethodDecorator & ClassDecorator {
  return applyDecorators(SetMetadata(IDENTITY_RATE_LIMIT, limit), UseGuards(IdentityRateLimitGuard));
}

/** Kunci ember yang dipakai permintaan ini, dititipkan supaya bisa dikembalikan kalau berhasil. */
const CHARGED_KEYS = Symbol('aruna:rate-limit-keys');

type ChargedRequest = { [CHARGED_KEYS]?: string[] };

@Injectable()
export class IdentityRateLimitGuard implements CanActivate {
  static readonly counter = new FixedWindowCounter();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const limit = this.reflector.get<IdentityRateLimit | undefined>(IDENTITY_RATE_LIMIT, context.getHandler());
    if (!limit) return true;
    const request = context.switchToHttp().getRequest<{ ip?: string; body?: { email?: unknown } } & ChargedRequest>();
    // `request.ip` hanya benar kalau `trust proxy` sudah disetel sesuai bentuk deploy-nya;
    // salah setel berarti seluruh dunia berbagi satu ember di sini.
    const address = request.ip ?? 'unknown';
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase().slice(0, 320) : '';
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const keys = [`${route}|pair|${address}|${email}`, `${route}|addr|${address}`];
    const rules = [limit.perIdentity, limit.perAddress];
    const verdicts = keys.map((key, index) => IdentityRateLimitGuard.counter.hit(key, rules[index]!));
    request[CHARGED_KEYS] = keys;
    const blocked = verdicts.find((verdict) => !verdict.allowed);
    if (blocked) throw rateLimited(blocked.retryAfterMs);
    return true;
  }
}

/**
 * Kembalikan jatah yang baru saja dipakai permintaan ini.
 *
 * Yang dibatasi adalah **menebak**, bukan memakai: login yang berhasil tidak boleh
 * menghabiskan anggaran yang disediakan untuk menahan penyerang. Tanpa ini sebuah suite
 * e2e — atau pasangan yang berpindah perangkat beberapa kali — terkunci dari akunnya
 * sendiri, dan itulah yang terjadi saat 87 tes e2e dijalankan pertama kalinya.
 */
export function forgiveIdentityAttempt(request: unknown): void {
  const keys = (request as ChargedRequest | null | undefined)?.[CHARGED_KEYS];
  for (const key of keys ?? []) IdentityRateLimitGuard.counter.forgive(key);
}

/** 429 yang membawa kode, seperti galat lain di API ini — bukan `HTTP_429` generik. */
export function rateLimited(retryAfterMs: number): HttpException {
  return new HttpException(
    { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.', retryAfterSeconds: Math.ceil(retryAfterMs / 1000) },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
