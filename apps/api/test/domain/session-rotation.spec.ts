import { describe, expect, it } from 'vitest';

import {
  ABSOLUTE_MS,
  GRACE_MAX_USES,
  GRACE_MS,
  IDLE_MS,
  decideRefresh,
  graceSlotAfter,
  matchableHashes,
  newSessionWindow,
  nextWindow,
  type RefreshSessionRecord,
} from '../../src/identity/session-rotation.js';

const now = new Date('2026-09-15T10:00:00.000Z');
const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

function session(overrides: Partial<RefreshSessionRecord> = {}): RefreshSessionRecord {
  return {
    refreshTokenHash: 'hash-aktif',
    graceTokenHashes: [],
    graceExpiresAt: null,
    graceUses: 0,
    idleExpiresAt: at(IDLE_MS),
    absoluteExpiresAt: at(ABSOLUTE_MS),
    revokedAt: null,
    revokedReason: null,
    ...overrides,
  };
}

describe('keputusan rotasi refresh token', () => {
  it('memutar token aktif lewat jalur normal', () => {
    expect(decideRefresh(session(), 'current', now)).toEqual({ kind: 'rotate' });
  });

  it('melayani token sebelumnya selama tenggangnya belum habis', () => {
    const rotated = session({ graceExpiresAt: at(GRACE_MS) });
    expect(decideRefresh(rotated, 'previous', at(GRACE_MS - 1))).toEqual({ kind: 'grace' });
  });

  it('menolak token sebelumnya begitu tenggangnya lewat', () => {
    const rotated = session({ graceExpiresAt: at(GRACE_MS) });
    expect(decideRefresh(rotated, 'previous', at(GRACE_MS))).toEqual({ kind: 'reuse' });
    expect(decideRefresh(rotated, 'previous', at(GRACE_MS + 1))).toEqual({ kind: 'reuse' });
  });

  it('menolak token sebelumnya begitu kuota tenggang habis', () => {
    const drained = session({ graceExpiresAt: at(GRACE_MS), graceUses: GRACE_MAX_USES });
    expect(decideRefresh(drained, 'previous', now)).toEqual({ kind: 'reuse' });
    const lastOne = session({ graceExpiresAt: at(GRACE_MS), graceUses: GRACE_MAX_USES - 1 });
    expect(decideRefresh(lastOne, 'previous', now)).toEqual({ kind: 'grace' });
  });

  it('menganggap token asing pada sesi hidup sebagai pencurian', () => {
    expect(decideRefresh(session({ graceExpiresAt: at(GRACE_MS) }), 'none', now)).toEqual({ kind: 'reuse' });
  });

  it('mengakhiri sesi yang batas idle atau batas absolutnya lewat', () => {
    expect(decideRefresh(session({ idleExpiresAt: now }), 'current', now)).toEqual({ kind: 'ended', code: 'SESSION_EXPIRED' });
    expect(decideRefresh(session({ absoluteExpiresAt: now }), 'current', now)).toEqual({ kind: 'ended', code: 'SESSION_EXPIRED' });
  });

  it('menerangkan sebab sesi yang sudah dicabut lewat kodenya', () => {
    const cases: [RefreshSessionRecord['revokedReason'], string][] = [
      ['REPLACED', 'SESSION_REPLACED'],
      ['REUSE_DETECTED', 'SESSION_REUSE'],
      ['LOGOUT', 'SESSION_EXPIRED'],
      [null, 'SESSION_EXPIRED'],
    ];
    for (const [revokedReason, code] of cases) {
      expect(decideRefresh(session({ revokedAt: now, revokedReason }), 'current', now)).toEqual({ kind: 'ended', code });
    }
  });

  it('tidak pernah mencabut apa pun gara-gara sesi yang memang sudah dicabut', () => {
    // Perangkat lama yang masih memegang cookie usang tidak boleh menjatuhkan login baru
    // setiap kali ia mencoba menyegarkan diri.
    const revoked = session({ revokedAt: now, revokedReason: 'REPLACED' });
    for (const match of ['current', 'previous', 'none'] as const) {
      expect(decideRefresh(revoked, match, now).kind).toBe('ended');
    }
  });
});

describe('slot tenggang', () => {
  /** Rotasi satu langkah: token aktif digantikan, yang lama masuk slot tenggang. */
  const advance = (current: RefreshSessionRecord, kind: 'rotate' | 'grace', at: Date, nextHash: string): RefreshSessionRecord => ({
    ...current,
    ...graceSlotAfter(current, kind, at),
    refreshTokenHash: nextHash,
  });

  it('menyimpan token yang baru digantikan saat rotasi biasa', () => {
    const rotated = advance(session({ refreshTokenHash: 'T0' }), 'rotate', now, 'T1');
    expect(rotated.graceTokenHashes).toEqual(['T0']);
    expect(rotated.graceExpiresAt).toEqual(at(GRACE_MS));
    expect(matchableHashes(rotated, now)).toEqual(['T1', 'T0']);
  });

  it('menahan token pemenang balapan saat rentetan berlanjut', () => {
    // Dua tab memuat ulang bersamaan. Tab A menyegarkan dengan T0 dan menerima T1; tab B
    // masih memegang T0 dan ikut menyegarkan, menerima T2. Cookie browser berakhir di salah
    // satu dari keduanya — jadi T1 dan T2 dua-duanya harus tetap dilayani.
    const afterA = advance(session({ refreshTokenHash: 'T0' }), 'rotate', now, 'T1');
    const afterB = advance(afterA, 'grace', at(5), 'T2');

    expect(matchableHashes(afterB, at(10))).toEqual(['T2', 'T0', 'T1']);
    expect(decideRefresh(afterB, 'previous', at(10))).toEqual({ kind: 'grace' });
    // Tenggatnya milik satu rentetan, bukan sesuatu yang bisa digeser terus-menerus.
    expect(afterB.graceExpiresAt).toEqual(at(GRACE_MS));
    expect(afterB.graceUses).toBe(1);
  });

  it('berhenti mencocokkan isi tenggang begitu jendelanya lewat', () => {
    const rotated = advance(session({ refreshTokenHash: 'T0' }), 'rotate', now, 'T1');
    expect(matchableHashes(rotated, at(GRACE_MS))).toEqual(['T1']);
  });

  it('memulai jendela baru tiap rotasi biasa, bukan menumpuk selamanya', () => {
    const first = advance(session({ refreshTokenHash: 'T0' }), 'rotate', now, 'T1');
    const second = advance(first, 'rotate', at(GRACE_MS + 1), 'T2');
    expect(second.graceTokenHashes).toEqual(['T1']);
    expect(second.graceUses).toBe(0);
  });
});

describe('jendela umur sesi', () => {
  it('mengunci batas absolut sejak login dan menggeser idle-nya saja', () => {
    const fresh = newSessionWindow(now);
    expect(fresh.idleExpiresAt).toEqual(at(IDLE_MS));
    expect(fresh.absoluteExpiresAt).toEqual(at(ABSOLUTE_MS));
    expect(fresh.cookieMaxAgeMs).toBe(IDLE_MS);

    const later = at(ABSOLUTE_MS / 2);
    const slid = nextWindow({ absoluteExpiresAt: at(ABSOLUTE_MS) }, later);
    expect(slid.idleExpiresAt).toEqual(new Date(later.getTime() + IDLE_MS));
  });

  it('menjepit geseran idle pada batas absolut', () => {
    const nearEnd = at(ABSOLUTE_MS - 60_000);
    const { idleExpiresAt, cookieMaxAgeMs } = nextWindow({ absoluteExpiresAt: at(ABSOLUTE_MS) }, nearEnd);
    expect(idleExpiresAt).toEqual(at(ABSOLUTE_MS));
    // Cookie tidak boleh menjanjikan sesi yang barisnya sudah mati.
    expect(cookieMaxAgeMs).toBe(60_000);
  });

  it('tidak pernah menerbitkan umur cookie negatif', () => {
    expect(nextWindow({ absoluteExpiresAt: at(-1000) }, now).cookieMaxAgeMs).toBe(0);
  });
});
