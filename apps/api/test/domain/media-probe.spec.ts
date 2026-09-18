import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S3MediaStorage, probeMediaStorage } from '../../src/media/storage.js';

/**
 * Probe ini ada karena `/ready` yang hanya `SELECT 1` meloloskan bug `MEDIA_LOCAL_DIR`: unggahan
 * mendarat di lapisan container dan ikut hilang tiap rilis, tanpa satu pun galat. Tes di bawah
 * menjaga bentuk yang menangkap kelas itu — bukan sekadar bahwa fungsinya ada.
 */
const konfigurasiS3 = { endpoint: 'https://is3.cloudhost.id', region: 'us-east-1', bucket: 'aruna-media', accessKeyId: 'access', secretAccessKey: 'secret', forcePathStyle: true };

const envS3 = {
  MEDIA_PROVIDER: 's3',
  // Port tertutup di loopback: gagal cepat, tanpa DNS dan tanpa menyentuh jaringan luar.
  S3_ENDPOINT: 'http://127.0.0.1:1',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'aruna-media',
  S3_ACCESS_KEY_ID: 'access',
  S3_SECRET_ACCESS_KEY: 'secret',
};

describe('probe kesiapan penyimpanan media', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'aruna-probe-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('lolos pada direktori yang benar-benar bisa ditulis', async () => {
    await expect(probeMediaStorage({ MEDIA_PROVIDER: 'local', MEDIA_LOCAL_DIR: dir })).resolves.toBeUndefined();
  });

  it('tidak meninggalkan sampah — berkas probe dihapus lagi', async () => {
    await probeMediaStorage({ MEDIA_PROVIDER: 'local', MEDIA_LOCAL_DIR: dir });
    expect(await readdir(join(dir, '.probe'))).toEqual([]);
  });

  it('gagal kalau direktori media tidak bisa ditulis', async () => {
    // Path yang sebenarnya berkas, bukan direktori. Dipilih daripada chmod 000 karena root
    // menembus izin berkas — tes yang lulus di laptop dan diam-diam tidak menguji apa pun di
    // dalam container adalah tes yang lebih buruk daripada tidak ada.
    const berkas = join(dir, 'bukan-direktori');
    await writeFile(berkas, 'x');
    await expect(probeMediaStorage({ MEDIA_PROVIDER: 'local', MEDIA_LOCAL_DIR: berkas })).rejects.toThrow();
  });

  it('pada s3 memeriksa bucket lewat HeadBucket, bukan menulis objek tiap 15 detik', async () => {
    // Cabang ini dulu `return` diam. Itu ditulis sadar waktu S3 belum dipakai, dengan syarat
    // tertulis: kalau nanti dipakai, ganti dengan HeadBucket. Tesnya membuktikan permintaannya
    // benar-benar dikirim — probe yang melewati satu-satunya provider yang sedang dipakai adalah
    // gerbang yang melaporkan hijau tanpa memeriksa apa pun, persis kelas yang melahirkannya.
    const dikirim: string[] = [];
    const storage = new S3MediaStorage(konfigurasiS3, { send: async (command: unknown) => { dikirim.push(command!.constructor.name); return {}; } } as never);
    await expect(storage.probe()).resolves.toBeUndefined();
    expect(dikirim).toEqual(['HeadBucketCommand']);
  });

  it('melaporkan bucket yang tidak bisa dihubungi sebagai belum siap', async () => {
    const storage = new S3MediaStorage(konfigurasiS3, { send: async () => { throw new Error('NoSuchBucket'); } } as never);
    await expect(storage.probe()).rejects.toThrow('NoSuchBucket');
  });

  it('tidak menyentuh disk sama sekali saat MEDIA_PROVIDER=s3', async () => {
    // Kredensial sengaja mengarah ke endpoint yang tidak ada: yang diuji bukan bucketnya, tapi
    // bahwa jalur s3 tidak diam-diam jatuh kembali ke direktori lokal.
    await expect(probeMediaStorage({ ...envS3, MEDIA_LOCAL_DIR: dir })).rejects.toThrow();
    expect(await readdir(dir)).toEqual([]);
  });
});
