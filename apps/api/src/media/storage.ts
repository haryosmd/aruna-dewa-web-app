import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface MediaStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  /** Idempoten: berkas yang sudah tidak ada bukan galat. Baris DB-nya yang menentukan aset itu masih hidup atau tidak. */
  delete(key: string): Promise<void>;
  /**
   * Membuktikan penyimpanan ini benar-benar bisa dipakai, dengan cara yang paling murah yang
   * masih menyentuh tempat sungguhan. Ada di interface, bukan di satu fungsi bercabang, supaya
   * penyimpanan baru tidak bisa ditambahkan tanpa menjawab "bagaimana membuktikan kamu hidup".
   */
  probe(): Promise<void>;
}

/** Nilai kolom `MediaAsset.provider`. Sengaja string literal, bukan impor enum Prisma: berkas ini dipakai tes murni tanpa client. */
export type MediaProviderName = 'LOCAL' | 'S3';

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

type Environment = Record<string, string | undefined>;

const S3_REQUIRED = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const;

export function s3ConfigFromEnvironment(environment: Environment = process.env): S3StorageConfig {
  for (const key of S3_REQUIRED) if (!environment[key]) throw new Error(`${key} wajib dikonfigurasi saat MEDIA_PROVIDER=s3`);
  return { endpoint: environment.S3_ENDPOINT!, region: environment.S3_REGION!, bucket: environment.S3_BUCKET!, accessKeyId: environment.S3_ACCESS_KEY_ID!, secretAccessKey: environment.S3_SECRET_ACCESS_KEY!, forcePathStyle: environment.S3_FORCE_PATH_STYLE !== 'false' };
}

/**
 * Keluhan konfigurasi media; kosong berarti boleh menyala. Dipanggil dari `runtimeEnvProblems()`
 * di luar blok produksi, dan itu disengaja — bentuknya sama persis dengan `cookieDomainProblems()`.
 *
 * Yang menentukan wajib-tidaknya `S3_*` adalah `MEDIA_PROVIDER` itu sendiri, bukan `NODE_ENV`.
 * Sebelum ini `s3ConfigFromEnvironment()` baru dipanggil saat unggahan pertama: API tanpa
 * kredensial bucket menyala bersih, `/ready` hijau, dan yang menemukannya adalah pasangan yang
 * mencoba mengunggah foto pertamanya — lewat 503 tanpa satu pun alarm. Kelas yang sama persis
 * dengan SMTP di fase 23 dan Google di fase 27, dan jawabannya juga sama: gagal saat boot.
 */
export function mediaEnvProblems(environment: Environment): string[] {
  const provider = environment.MEDIA_PROVIDER?.trim();
  if (provider && provider !== 'local' && provider !== 's3') return [`MEDIA_PROVIDER harus local atau s3, bukan ${provider}.`];
  if (provider !== 's3') return [];
  return S3_REQUIRED.filter((key) => !environment[key]?.trim()).map((key) => `${key} wajib diisi saat MEDIA_PROVIDER=s3.`);
}

export class LocalMediaStorage implements MediaStorage {
  private readonly directory: string;
  /**
   * Di-resolve sekali di sini, bukan dibiarkan relatif sampai saat menulis. Path relatif
   * diselesaikan terhadap cwd proses, dan cwd proses bukan akar repo: `pnpm --filter @aruna/api
   * start` berjalan dari `apps/api`, sehingga `./.data/media` berarti `apps/api/.data/media`.
   * Di dalam container itulah yang membuat volume media pernah dipasang di path yang tidak
   * pernah ditulis — unggahan masuk ke lapisan container dan ikut hilang tiap rilis.
   */
  constructor(directory: string) {
    this.directory = resolve(directory);
  }
  async put(key: string, body: Buffer): Promise<void> { await mkdir(join(this.directory, key.split('/')[0]!), { recursive: true }); await writeFile(join(this.directory, key), body, { flag: 'wx' }); }
  async get(key: string): Promise<Buffer> { return readFile(join(this.directory, key)); }
  async delete(key: string): Promise<void> { await rm(join(this.directory, key), { force: true }); }
  /**
   * Tulis-baca-hapus, dan hanya bentuk ini yang menangkap kelasnya. Bug `MEDIA_LOCAL_DIR` di
   * fase 20 membuat unggahan mendarat di lapisan container dan ikut hilang tiap rilis, tanpa
   * satu galat; memeriksa keberadaan direktori saja tidak akan menangkapnya, karena direktori
   * yang salah pun ada.
   */
  async probe(): Promise<void> {
    // Berprefiks supaya `put` membuat direktori induknya seperti unggahan sungguhan — kunci tanpa
    // garis miring akan membuat `mkdir` dan `writeFile` menunjuk path yang sama, lalu EISDIR.
    const key = `.probe/${randomUUID()}`;
    const body = Buffer.from('ready');
    try {
      await this.put(key, body);
      if (!(await this.get(key)).equals(body)) throw new Error('Isi berkas probe berbeda dari yang ditulis');
    } finally {
      // Kegagalan pembersihan tidak boleh menutupi kegagalan yang sebenarnya, dan berkas probe
      // yang tertinggal tidak merusak apa pun — `delete` sendiri sudah idempoten.
      await this.delete(key).catch(() => undefined);
    }
  }
}

export class S3MediaStorage implements MediaStorage {
  private readonly client: S3Client;
  constructor(private readonly config: S3StorageConfig, client?: S3Client) { this.client = client ?? new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: config.forcePathStyle, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } }); }
  /**
   * Menolak menimpa kunci yang sudah ada — padanan `flag: 'wx'` milik penyimpanan lokal, supaya
   * kedua backend memberi jaminan yang sama dan `ops/backup/backup.sh` boleh menyandarkan
   * "salin yang belum ada" pada storage, bukan hanya pada `randomUUID`.
   *
   * Dipasang setelah dibuktikan, bukan diasumsikan: penegakannya tidak seragam di implementasi
   * S3-compatible, dan `pnpm media:check` menuntut **HTTP 412** — bukan sekadar "permintaannya
   * melempar", karena header yang ditolak sebagai tidak didukung juga melempar. IDCloudHost IS3
   * menjawab 412 (diverifikasi 2026-09-18).
   *
   * Harganya, dan ia disengaja: kalau unggahan pertama berhasil di server tapi jawabannya hilang
   * di jalan, percobaan ulang menabrak 412 dan unggahannya dilaporkan gagal. Pengunggah tinggal
   * mengulang — kuncinya `randomUUID`, jadi yang kedua pasti lolos — dan yang tertinggal hanya
   * satu objek yatim. Itu kegagalan yang bisa dipulihkan; menimpa foto yang sudah ada tidak.
   */
  async put(key: string, body: Buffer, contentType: string): Promise<void> { await this.client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: body, ContentType: contentType, IfNoneMatch: '*' })); }
  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
    if (!response.Body) throw new Error('Objek S3 tidak memiliki body');
    return Buffer.from(await response.Body.transformToByteArray());
  }
  async delete(key: string): Promise<void> { await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key })); }
  /**
   * HeadBucket, bukan tulis-baca-hapus. `/ready` dipanggil healthcheck tiap 15 detik: menulis dan
   * menghapus objek di sana berarti ~5.700 siklus tulis-hapus sehari ke bucket berbayar untuk
   * menjawab pertanyaan yang dijawab sama baiknya oleh satu HEAD. Yang ditanya memang cuma
   * "bucket ini ada dan kredensial ini masih boleh menyentuhnya" — endpoint salah, kunci
   * dicabut, bucket terhapus, dan jaringan yang mati semuanya gagal di sini.
   */
  async probe(): Promise<void> { await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket })); }
}

/** Direktori media lokal, selalu absolut. Di produksi nilainya datang dari `compose.prod.yaml`. */
export function localMediaDirectory(environment: Environment = process.env, cwd = process.cwd()): string {
  return resolve(cwd, environment.MEDIA_LOCAL_DIR?.trim() || join(cwd, '.data/media'));
}

/**
 * Batas waktu probe kesiapan. Jauh di bawah `timeout: 5s` pada healthcheck `api` di
 * `compose.prod.yaml`: berkas sistem atau bucket yang menggantung harus dilaporkan sebagai tidak
 * siap, bukan membuat healthcheck-nya sendiri kehabisan waktu dan kehilangan sebabnya.
 */
const PROBE_TIMEOUT_MS = 2000;

/**
 * Membuktikan penyimpanan media benar-benar bisa dipakai, apa pun providernya.
 *
 * `/ready` sebelumnya hanya `SELECT 1`, dan itu tidak pernah menyentuh direktori media. Bug
 * `MEDIA_LOCAL_DIR` yang membuat unggahan mendarat di lapisan container — dan ikut hilang tiap
 * rilis — lolos sepenuhnya dari gerbang itu: nol galat, `/ready` hijau, foto pelanggan hilang.
 *
 * Fungsi ini pernah punya cabang yang `return` diam untuk provider selain `local`, ditulis saat
 * S3 belum dipakai. Cabang itu hilang di fase 56 bersama alasannya: probe yang melewati satu-
 * satunya provider yang sedang dipakai adalah gerbang yang melaporkan hijau tanpa memeriksa
 * apa pun — persis kelas kegagalan yang melahirkannya. Bentuk pembuktiannya sekarang milik
 * masing-masing penyimpanan (`MediaStorage.probe`), jadi provider baru tidak bisa menyelinap
 * masuk tanpa punya satu.
 */
export async function probeMediaStorage(environment: Environment = process.env): Promise<void> {
  const storage = createMediaStorage(environment);
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Probe media melewati batas waktu')), PROBE_TIMEOUT_MS);
  });
  try {
    await Promise.race([storage.probe(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

function buildStorage(provider: MediaProviderName, environment: Environment): MediaStorage {
  if (provider === 'S3') return new S3MediaStorage(s3ConfigFromEnvironment(environment));
  if (provider === 'LOCAL') return new LocalMediaStorage(localMediaDirectory(environment));
  throw new Error(`Provider media tidak dikenal: ${provider}`);
}

/**
 * Satu instance per provider, dan hanya untuk `process.env` — pemanggil yang menyuntik
 * lingkungan sendiri (semua tes) selalu dapat instance segar, jadi memo ini tidak bisa membocorkan
 * konfigurasi satu tes ke tes berikutnya.
 *
 * Alasannya bukan kerapian. `S3Client` membawa agen HTTPS-nya sendiri, dan sebelum ini kelimanya
 * dibangun ulang tiap operasi: satu TLS handshake ke Jakarta untuk tiap foto yang dilihat tamu,
 * nol koneksi yang dipakai ulang.
 */
const memo = new Map<MediaProviderName, MediaStorage>();

/**
 * Penyimpanan milik satu aset, dipilih dari kolom `MediaAsset.provider` — bukan dari
 * `MEDIA_PROVIDER` yang sedang berlaku.
 *
 * Bedanya baru terasa satu kali, dan mahal: di detik `MEDIA_PROVIDER` diflip ke `s3`, tiap foto
 * yang sudah ada dicari di bucket yang tidak pernah memilikinya. Boot bersih, `/ready` hijau,
 * undangan yang sudah terbit tetap tampil — hanya fotonya jadi kotak kosong, dan yang menemukannya
 * adalah tamu. Kolomnya sudah ditulis benar sejak unggahan pertama; yang hilang hanya pembacanya.
 */
export function storageForAsset(provider: MediaProviderName, environment: Environment = process.env): MediaStorage {
  if (environment !== process.env) return buildStorage(provider, environment);
  const existing = memo.get(provider);
  if (existing) return existing;
  const storage = buildStorage(provider, environment);
  memo.set(provider, storage);
  return storage;
}

/** Penyimpanan untuk tulisan baru: yang sedang disetel, bukan yang dimiliki aset lama. */
export function createMediaStorage(environment: Environment = process.env): MediaStorage {
  const provider = environment.MEDIA_PROVIDER?.trim() ?? 'local';
  if (provider !== 'local' && provider !== 's3') throw new Error('MEDIA_PROVIDER harus local atau s3');
  return storageForAsset(provider === 's3' ? 'S3' : 'LOCAL', environment);
}
