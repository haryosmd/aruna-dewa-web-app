import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

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

function encryptGuestToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

function encryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'development-only-change-me') throw new Error('JWT_SECRET wajib dikonfigurasi untuk mengenkripsi token tamu');
  return createHash('sha256').update(secret).digest();
}
