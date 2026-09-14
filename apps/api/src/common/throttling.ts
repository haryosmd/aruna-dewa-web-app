import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { rateLimited } from './rate-limit.js';

/**
 * Batas laju pada jalur yang jadi amplifier.
 *
 * Bukan setiap endpoint perlu dijaga ketat; yang perlu adalah yang satu permintaannya
 * membangkitkan kerja atau baris yang jauh lebih besar daripada permintaannya sendiri:
 * argon2id 64 MiB per percobaan login, satu email terkirim per lupa-password, satu baris
 * `OneTimeToken` per hit `/auth/google/start` — endpoint tanpa autentikasi yang tak pernah
 * dibersihkan siapa pun.
 *
 * Jalur identitas (login, daftar, lupa password) tidak diatur di sini: ia butuh dua ember
 * sekaligus dan punya penjaganya sendiri di `rate-limit.ts`.
 *
 * Catatan yang tidak boleh dilupakan: semua ini mengandalkan `request.ip`, dan `request.ip`
 * hanya benar kalau `trust proxy` sudah disetel sesuai bentuk deploy-nya. Salah setel berarti
 * seluruh dunia berbagi satu ember.
 */

/** Detik → milidetik, supaya angka di bawah terbaca sebagai satuan waktu, bukan digit. */
const seconds = (count: number): number => count * 1000;
const minutes = (count: number): number => seconds(count * 60);

export const throttleLimits = {
  /** Cukup longgar untuk pemakaian wajar; ia hanya menangkap pengulangan yang tidak wajar. */
  default: { ttl: minutes(1), limit: 600 },
  /** Menulis baris `OneTimeToken` tiap hit, tanpa autentikasi. */
  googleStart: { ttl: minutes(15), limit: 20 },
  /** Tebakan signature tanpa batas; Midtrans sendiri tidak pernah sedekat ini. */
  webhook: { ttl: minutes(1), limit: 120 },
  /** Jalur publik yang menulis: `opened` sebelumnya sama sekali tanpa batas. */
  publicWrite: { ttl: minutes(1), limit: 30 },
  /**
   * Media undangan: satu halaman menarik belasan aset sekaligus, dan satu wifi gedung berarti
   * ratusan tamu berbagi satu `request.ip`. Batasnya tetap ada, tapi jauh di atas pemakaian wajar.
   */
  publicMedia: { ttl: minutes(1), limit: 2000 },
} as const;

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(_context: ExecutionContext, detail: ThrottlerLimitDetail): Promise<void> {
    throw rateLimited(detail.timeToBlockExpire * 1000);
  }
}
