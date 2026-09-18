import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { requireJwtSecret } from '../common/env.js';

export function createGuestToken(): { token: string; hash: string; ciphertext: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashGuestToken(token), ciphertext: encryptGuestToken(token) };
}

export function hashGuestToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }

export function decryptGuestToken(value: string): string {
  const [iv, tag, encrypted] = value.split('.');
  if (!iv || !tag || !encrypted) throw new Error('Guest token tersimpan tidak valid');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
}

/**
 * Versi yang boleh gagal, untuk daftar tamu.
 *
 * Kuncinya `sha256(JWT_SECRET)` tanpa key id, jadi baris yang ditulis di bawah secret lain
 * tidak akan pernah terbuka lagi: GCM auth tag-nya gagal dan Node melempar `Unsupported state
 * or unable to authenticate data`. Itu keadaan permanen, bukan gangguan sesaat — dan satu baris
 * seperti itu tidak boleh ikut menjatuhkan dua puluh empat baris lain yang sehat.
 *
 * Yang memanggil ini wajib membedakan `null` dari token yang memang tidak diminta: tautan yang
 * kehilangan `g` diam-diam tetap bisa dibuka, cuma tidak bisa dipakai RSVP.
 */
export function tryDecryptGuestToken(value: string): string | null {
  try {
    return decryptGuestToken(value);
  } catch {
    return null;
  }
}

function encryptGuestToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

/** Jaring terakhir: aturan yang sama sudah ditegakkan saat boot oleh `assertRuntimeEnv`. */
function encryptionKey(): Buffer {
  return createHash('sha256').update(requireJwtSecret()).digest();
}
