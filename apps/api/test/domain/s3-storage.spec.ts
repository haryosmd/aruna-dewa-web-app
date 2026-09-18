import { describe, expect, it } from 'vitest';
import { mediaEnvProblems, s3ConfigFromEnvironment } from '../../src/media/storage.js';

describe('S3 media configuration', () => {
  it('requires a complete S3 configuration instead of silently falling back to local disk', () => {
    expect(() => s3ConfigFromEnvironment({ S3_BUCKET: 'aruna-media' })).toThrow('S3_ENDPOINT');
  });

  it('accepts an S3-compatible endpoint and credentials', () => {
    expect(s3ConfigFromEnvironment({ S3_ENDPOINT: 'http://127.0.0.1:9000', S3_REGION: 'us-east-1', S3_BUCKET: 'aruna-media', S3_ACCESS_KEY_ID: 'access', S3_SECRET_ACCESS_KEY: 'secret' })).toMatchObject({ bucket: 'aruna-media', forcePathStyle: true });
  });
});

/**
 * Gerbangnya pindah ke saat boot di Fase 56. Sebelumnya `s3ConfigFromEnvironment()` baru dipanggil
 * saat unggahan pertama, jadi API produksi tanpa kredensial bucket menyala bersih dan `/ready`
 * hijau — yang menemukannya adalah pasangan yang mencoba mengunggah foto pertamanya.
 */
describe('gerbang konfigurasi media saat boot', () => {
  const kunciS3 = { S3_ENDPOINT: 'https://is3.cloudhost.id', S3_REGION: 'us-east-1', S3_BUCKET: 'aruna-media', S3_ACCESS_KEY_ID: 'access', S3_SECRET_ACCESS_KEY: 'secret' };

  it('menuntut kredensial bucket begitu MEDIA_PROVIDER=s3', () => {
    const { S3_BUCKET: _bucket, ...tanpaBucket } = kunciS3;
    expect(mediaEnvProblems({ MEDIA_PROVIDER: 's3', ...tanpaBucket })).toEqual(['S3_BUCKET wajib diisi saat MEDIA_PROVIDER=s3.']);
  });

  it('tidak menuntut apa pun saat masih lokal — mesin pengembang tidak perlu punya bucket', () => {
    expect(mediaEnvProblems({ MEDIA_PROVIDER: 'local' })).toEqual([]);
    expect(mediaEnvProblems({})).toEqual([]);
  });

  it('lolos saat kelimanya terisi', () => {
    expect(mediaEnvProblems({ MEDIA_PROVIDER: 's3', ...kunciS3 })).toEqual([]);
  });

  it('menolak provider yang tidak dikenal, bukan diam-diam memakai lokal', () => {
    // Salah ketik `s3 ` atau `S3` tidak boleh berakhir menulis ke disk container sambil terlihat
    // seperti sudah pindah ke bucket.
    expect(mediaEnvProblems({ MEDIA_PROVIDER: 'S3' })).toEqual(['MEDIA_PROVIDER harus local atau s3, bukan S3.']);
  });
});
