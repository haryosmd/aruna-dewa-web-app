import { describe, expect, it } from 'vitest';
import { decideRegistration } from '../../src/identity/registration.js';

describe('keputusan pendaftaran', () => {
  it('membuat akun baru untuk email yang belum dikenal', () => {
    expect(decideRegistration(null)).toEqual({ kind: 'create' });
  });

  it('menolak email yang sudah terverifikasi', () => {
    expect(decideRegistration({ emailVerifiedAt: new Date(), passwordHash: 'argon2id$…' })).toEqual({ kind: 'conflict', message: 'Email sudah terdaftar' });
  });

  it('mengarahkan akun Google ke tombol Google, bukan ke form password', () => {
    expect(decideRegistration({ emailVerifiedAt: null, passwordHash: null })).toMatchObject({ kind: 'conflict' });
  });

  it('mengizinkan pendaftaran ulang ketika verifikasi tidak pernah sampai', () => {
    expect(decideRegistration({ emailVerifiedAt: null, passwordHash: 'argon2id$…' })).toEqual({ kind: 'reclaim' });
  });
});
