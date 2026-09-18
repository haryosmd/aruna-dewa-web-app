import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalMediaStorage, S3MediaStorage, storageForAsset } from '../../src/media/storage.js';

/**
 * Kolom `MediaAsset.provider` sudah ditulis benar sejak unggahan pertama, tapi jalur bacanya
 * memakai `createMediaStorage()` global — penyimpanan yang sedang disetel sekarang, bukan
 * penyimpanan milik aset itu. Selama hanya ada satu provider, keduanya kebetulan sama dan
 * tidak ada yang tahu bedanya.
 *
 * Bedanya muncul persis satu kali, di detik `MEDIA_PROVIDER` diflip ke `s3`: tiap foto lama
 * dicari di bucket yang tidak pernah memilikinya. Boot tetap bersih, `/ready` tetap hijau,
 * undangan yang sudah terbit tetap tampil — hanya fotonya jadi kotak kosong, dan yang
 * menemukannya adalah tamu pernikahan. Tes ini yang menahan kelas itu.
 */
describe('penyimpanan dipilih dari kolom aset, bukan dari setelan global', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'aruna-routing-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const s3Env = {
    MEDIA_PROVIDER: 's3',
    MEDIA_LOCAL_DIR: '',
    S3_ENDPOINT: 'https://is3.cloudhost.id',
    S3_REGION: 'us-east-1',
    S3_BUCKET: 'aruna-media',
    S3_ACCESS_KEY_ID: 'access',
    S3_SECRET_ACCESS_KEY: 'secret',
  };

  it('aset LOCAL warisan tetap dibaca dari disk walau seluruh sistem sudah di S3', async () => {
    const key = '11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.jpg';
    await mkdir(join(dir, key.split('/')[0]!), { recursive: true });
    await writeFile(join(dir, key), 'foto lama');

    const storage = storageForAsset('LOCAL', { ...s3Env, MEDIA_LOCAL_DIR: dir });

    expect(storage).toBeInstanceOf(LocalMediaStorage);
    expect((await storage.get(key)).toString()).toBe('foto lama');
  });

  it('aset S3 dibaca dari bucket walau mesinnya masih disetel lokal — arah sebaliknya, untuk rollback', () => {
    expect(storageForAsset('S3', { ...s3Env, MEDIA_PROVIDER: 'local', MEDIA_LOCAL_DIR: dir })).toBeInstanceOf(S3MediaStorage);
  });

  it('menolak nilai provider yang tidak dikenal, bukan diam-diam jatuh ke salah satu', () => {
    // Enum Prisma hanya punya LOCAL dan S3, tapi baris bisa datang dari restore atau migrasi
    // tangan. Jatuh ke bawaan berarti mencari foto di tempat yang salah tanpa satu pun galat.
    expect(() => storageForAsset('GCS' as never, s3Env)).toThrow();
  });
});
