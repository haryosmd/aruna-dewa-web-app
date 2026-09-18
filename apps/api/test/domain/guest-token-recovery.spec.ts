import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createGuestToken, decryptGuestToken, hashGuestToken, tryDecryptGuestToken } from '../../src/guests/guest-token.js';

/*
 * Kuncinya `sha256(JWT_SECRET)` mentah, tanpa key id yang tersimpan per baris. Konsekuensinya
 * bukan hipotesis: empat baris tamu di database lokal ditulis di bawah secret ambient sebuah
 * shell dan sejak itu tidak bisa dibuka lagi oleh siapa pun, lalu menjatuhkan seluruh
 * `GET /v1/invitations/:id/guests` jadi 500.
 *
 * `requireJwtSecret()` membaca `process.env` tiap kali dipanggil dan tidak menyimpan apa pun,
 * jadi rotasi secret bisa ditiru di sini dengan menukar nilainya di antara enkripsi dan
 * dekripsi — tanpa harness Nest, tanpa database.
 */
const SECRET_LAMA = 'rahasia-lama-yang-panjangnya-lebih-dari-32-karakter';
const SECRET_BARU = 'rahasia-baru-yang-panjangnya-lebih-dari-32-karakter';

describe('pemulihan token tamu yang tidak bisa didekripsi', () => {
  let sebelumnya: string | undefined;

  beforeEach(() => {
    sebelumnya = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SECRET_LAMA;
  });

  afterEach(() => {
    if (sebelumnya === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = sebelumnya;
  });

  it('mengembalikan token utuh selama secretnya tidak berubah', () => {
    const dibuat = createGuestToken();

    expect(tryDecryptGuestToken(dibuat.ciphertext)).toBe(dibuat.token);
    expect(decryptGuestToken(dibuat.ciphertext)).toBe(dibuat.token);
  });

  it('menyerah dengan null saat barisnya ditulis di bawah secret lain, dan versi ketatnya tetap melempar', () => {
    const dibuat = createGuestToken();
    process.env.JWT_SECRET = SECRET_BARU;

    expect(tryDecryptGuestToken(dibuat.ciphertext)).toBeNull();
    // Versi ketat sengaja dipertahankan: `create()` dan `update()` baru saja menempa tokennya
    // sendiri, jadi kegagalan di sana berarti ada yang rusak sekarang juga, bukan warisan.
    expect(() => decryptGuestToken(dibuat.ciphertext)).toThrow();
  });

  it('menyerah dengan null untuk ciphertext yang cacat bentuk, bukan melempar', () => {
    expect(tryDecryptGuestToken('bukan-token')).toBeNull();
    expect(tryDecryptGuestToken('')).toBeNull();
    expect(tryDecryptGuestToken('satu.dua')).toBeNull();
  });

  /*
   * Batas ledakannya: tautan yang sudah beredar tetap hidup. Pencarian publik memakai
   * `hashGuestToken`, sha256 polos tanpa kunci, jadi ia tidak ikut bergantung pada `JWT_SECRET`.
   * Yang hilang hanya kemampuan operator menampilkan ulang tautannya.
   */
  it('tidak menyentuh pencarian publik, yang hash-nya tidak berkunci', () => {
    const dibuat = createGuestToken();
    const sebelumRotasi = hashGuestToken(dibuat.token);
    process.env.JWT_SECRET = SECRET_BARU;

    expect(hashGuestToken(dibuat.token)).toBe(sebelumRotasi);
  });
});
