/**
 * Keputusan rotasi refresh token, dipisah dari Prisma supaya bisa diuji tanpa basis data.
 *
 * Inti persoalannya: rotasi yang ketat menganggap setiap pemakaian ulang sebagai pencurian,
 * padahal satu browser bisa menyegarkan sesi dua kali nyaris bersamaan — dua tab yang
 * di-reload berbarengan, atau render server yang berpapasan dengan panggilan di browser.
 * Obatnya jendela tenggang pendek: token yang baru saja digantikan masih dilayani selama
 * beberapa detik, dan tiap pemakaian dalam jendela itu menerima token baru — bukan
 * menyajikan ulang token lama, supaya yang bocor tetap hanya berumur sekali pakai.
 */

export const GRACE_MS = 30_000;
/**
 * Tenggang tanpa kuota akan jadi lubang tanpa dasar. Yang benar-benar membatasi penyalahguna
 * adalah tenggatnya, bukan angka ini — ia menjaga panjang daftar tetap wajar, karena tiap
 * entri berarti satu verifikasi argon2 di jalur penyegaran. Rentetan sah paling banyak dua
 * atau tiga (satu render server, satu browser), jadi lima memberi kelonggaran tanpa membuat
 * pencocokan jadi mahal.
 */
export const GRACE_MAX_USES = 5;
export const IDLE_MS = 30 * 24 * 60 * 60 * 1000;
export const ABSOLUTE_MS = 90 * 24 * 60 * 60 * 1000;

export type SessionRevokeReason = 'LOGOUT' | 'REPLACED' | 'REUSE_DETECTED' | 'PASSWORD_RESET' | 'ACCOUNT_RECLAIMED';

/** Kode yang ikut di badan 401 supaya web bisa menjelaskan sebabnya, bukan memantul senyap. */
export type SessionEndedCode = 'SESSION_INVALID' | 'SESSION_EXPIRED' | 'SESSION_REPLACED' | 'SESSION_REUSE';

export interface RefreshSessionRecord {
  refreshTokenHash: string;
  /**
   * Token-token yang sudah digantikan tapi masih dilayani sampai `graceExpiresAt`. Berupa
   * daftar, bukan satu slot: satu rentetan penyegaran bisa menerbitkan beberapa token yang
   * sama-sama beredar, dan yang kalah balapan pun tetap dipegang tab yang menerimanya.
   */
  graceTokenHashes: string[];
  graceExpiresAt: Date | null;
  graceUses: number;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  revokedReason: SessionRevokeReason | null;
}

export interface GraceSlot {
  graceTokenHashes: string[];
  graceExpiresAt: Date;
  graceUses: number;
}

export type TokenMatch = 'current' | 'previous' | 'none';

export type RefreshVerdict =
  | { kind: 'rotate' }
  | { kind: 'grace' }
  | { kind: 'reuse' }
  | { kind: 'ended'; code: SessionEndedCode };

export function decideRefresh(session: RefreshSessionRecord, match: TokenMatch, now: Date): RefreshVerdict {
  // Sesi yang sudah dicabut tidak pernah memicu pencabutan lanjutan. Kalau ia memicunya,
  // perangkat lama yang masih memegang cookie usang akan mencabut login baru setiap kali
  // ia mencoba — persis kebalikan dari maksud "satu sesi per akun".
  if (session.revokedAt) return { kind: 'ended', code: endedCode(session.revokedReason) };
  if (session.absoluteExpiresAt <= now || session.idleExpiresAt <= now) return { kind: 'ended', code: 'SESSION_EXPIRED' };
  if (match === 'current') return { kind: 'rotate' };
  if (match === 'previous' && withinGrace(session, now)) return { kind: 'grace' };
  // Token yang dikenal tapi sudah lewat tenggangnya, atau token yang tak dikenal sama
  // sekali pada sesi yang hidup: tidak ada jalur sah yang menghasilkan ini.
  return { kind: 'reuse' };
}

export function withinGrace(session: RefreshSessionRecord, now: Date): boolean {
  return session.graceExpiresAt !== null && session.graceExpiresAt > now && session.graceUses < GRACE_MAX_USES;
}

/** Hash yang boleh dicocokkan dengan token yang dibawa: yang aktif dulu, lalu isi tenggang. */
export function matchableHashes(session: RefreshSessionRecord, now: Date): string[] {
  const graceAlive = session.graceExpiresAt !== null && session.graceExpiresAt > now;
  return [session.refreshTokenHash, ...(graceAlive ? session.graceTokenHashes : [])];
}

/**
 * Isi slot tenggang setelah satu rotasi. Token yang baru saja digantikan **selalu** ikut
 * masuk — termasuk di jalur `grace`, karena token itulah yang sedang dipegang tab yang
 * memenangi balapan sebelumnya. Membiarkannya jatuh berarti menendang tab itu satu
 * penyegaran kemudian, yaitu persis kegagalan yang hendak dihapus tenggang ini.
 *
 * Tenggat tidak diperpanjang di jalur `grace`: jendelanya milik satu rentetan, bukan sesuatu
 * yang bisa digeser terus-menerus oleh pemakaian beruntun.
 */
export function graceSlotAfter(session: RefreshSessionRecord, kind: 'rotate' | 'grace', now: Date): GraceSlot {
  if (kind === 'rotate') {
    return { graceTokenHashes: [session.refreshTokenHash], graceExpiresAt: new Date(now.getTime() + GRACE_MS), graceUses: 0 };
  }
  return {
    graceTokenHashes: [...session.graceTokenHashes, session.refreshTokenHash],
    graceExpiresAt: session.graceExpiresAt ?? new Date(now.getTime() + GRACE_MS),
    graceUses: session.graceUses + 1,
  };
}

function endedCode(reason: SessionRevokeReason | null): SessionEndedCode {
  if (reason === 'REPLACED') return 'SESSION_REPLACED';
  if (reason === 'REUSE_DETECTED') return 'SESSION_REUSE';
  return 'SESSION_EXPIRED';
}

/** Jendela sesi yang baru lahir: idle geser, batas absolut terkunci sejak detik ini. */
export function newSessionWindow(now: Date): { idleExpiresAt: Date; absoluteExpiresAt: Date; cookieMaxAgeMs: number } {
  return {
    idleExpiresAt: new Date(now.getTime() + IDLE_MS),
    absoluteExpiresAt: new Date(now.getTime() + ABSOLUTE_MS),
    cookieMaxAgeMs: IDLE_MS,
  };
}

/**
 * Jendela setelah satu rotasi. Geseran idle dijepit batas absolut, dan umur cookie
 * mengikuti sisa yang sama — cookie tidak boleh hidup lebih lama dari barisnya, karena
 * cookie yang menjanjikan sesi mati hanya menunda kekecewaan sampai klik berikutnya.
 */
export function nextWindow(session: Pick<RefreshSessionRecord, 'absoluteExpiresAt'>, now: Date): { idleExpiresAt: Date; cookieMaxAgeMs: number } {
  const idleExpiresAt = new Date(Math.min(now.getTime() + IDLE_MS, session.absoluteExpiresAt.getTime()));
  return { idleExpiresAt, cookieMaxAgeMs: Math.max(0, idleExpiresAt.getTime() - now.getTime()) };
}
