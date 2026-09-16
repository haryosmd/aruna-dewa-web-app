import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { probeMediaStorage } from '../../src/media/storage.js';

/**
 * Probe ini ada karena `/ready` yang hanya `SELECT 1` meloloskan bug `MEDIA_LOCAL_DIR`: unggahan
 * mendarat di lapisan container dan ikut hilang tiap rilis, tanpa satu pun galat. Tes di bawah
 * menjaga bentuk yang menangkap kelas itu — bukan sekadar bahwa fungsinya ada.
 */
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

  it('dilewati saat MEDIA_PROVIDER=s3, dan tidak menyentuh disk', async () => {
    // Cabangnya sengaja diam sekarang; kalau S3 dipakai, ia harus diganti HeadBucket — bukan
    // dibiarkan lolos sambil terlihat seperti sedang memeriksa sesuatu.
    await expect(probeMediaStorage({ MEDIA_PROVIDER: 's3', MEDIA_LOCAL_DIR: dir })).resolves.toBeUndefined();
    expect(await readdir(dir)).toEqual([]);
  });
});
