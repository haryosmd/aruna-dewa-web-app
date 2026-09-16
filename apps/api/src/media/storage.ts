import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface MediaStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  /** Idempoten: berkas yang sudah tidak ada bukan galat. Baris DB-nya yang menentukan aset itu masih hidup atau tidak. */
  delete(key: string): Promise<void>;
}

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

type Environment = Record<string, string | undefined>;

export function s3ConfigFromEnvironment(environment: Environment = process.env): S3StorageConfig {
  const required = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const;
  for (const key of required) if (!environment[key]) throw new Error(`${key} wajib dikonfigurasi saat MEDIA_PROVIDER=s3`);
  return { endpoint: environment.S3_ENDPOINT!, region: environment.S3_REGION!, bucket: environment.S3_BUCKET!, accessKeyId: environment.S3_ACCESS_KEY_ID!, secretAccessKey: environment.S3_SECRET_ACCESS_KEY!, forcePathStyle: environment.S3_FORCE_PATH_STYLE !== 'false' };
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
}

export class S3MediaStorage implements MediaStorage {
  private readonly client: S3Client;
  constructor(private readonly config: S3StorageConfig, client?: S3Client) { this.client = client ?? new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: config.forcePathStyle, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } }); }
  async put(key: string, body: Buffer, contentType: string): Promise<void> { await this.client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: body, ContentType: contentType })); }
  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
    if (!response.Body) throw new Error('Objek S3 tidak memiliki body');
    return Buffer.from(await response.Body.transformToByteArray());
  }
  async delete(key: string): Promise<void> { await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key })); }
}

/** Direktori media lokal, selalu absolut. Di produksi nilainya datang dari `compose.prod.yaml`. */
export function localMediaDirectory(environment: Environment = process.env, cwd = process.cwd()): string {
  return resolve(cwd, environment.MEDIA_LOCAL_DIR?.trim() || join(cwd, '.data/media'));
}

/**
 * Batas waktu probe kesiapan. Jauh di bawah `timeout: 5s` pada healthcheck `api` di
 * `compose.prod.yaml`: berkas sistem yang menggantung harus dilaporkan sebagai tidak siap,
 * bukan membuat healthcheck-nya sendiri kehabisan waktu dan kehilangan sebabnya.
 */
const PROBE_TIMEOUT_MS = 2000;

/**
 * Membuktikan penyimpanan media benar-benar bisa ditulis, dibaca ulang, lalu dihapus.
 *
 * `/ready` sebelumnya hanya `SELECT 1`, dan itu tidak pernah menyentuh direktori media. Bug
 * `MEDIA_LOCAL_DIR` yang membuat unggahan mendarat di lapisan container — dan ikut hilang tiap
 * rilis — lolos sepenuhnya dari gerbang itu: nol galat, `/ready` hijau, foto pelanggan hilang.
 * Tulis-baca-hapus adalah satu-satunya bentuk yang menangkap kelas itu; memeriksa keberadaan
 * direktori saja tidak, karena direktori yang salah pun ada.
 *
 * Hanya untuk penyimpanan lokal. Pada `MEDIA_PROVIDER=s3` probe ini akan menulis dan menghapus
 * objek tiap 15 detik — ~17 ribu permintaan per hari untuk menjawab pertanyaan yang tidak sedang
 * ditanyakan, karena S3 memang belum dipakai. Kalau nanti dipakai, ganti ini dengan HeadBucket;
 * jangan biarkan cabangnya diam-diam berhenti memeriksa apa pun.
 */
export async function probeMediaStorage(environment: Environment = process.env): Promise<void> {
  if ((environment.MEDIA_PROVIDER ?? 'local') !== 'local') return;
  const storage = createMediaStorage(environment);
  // Berprefiks supaya `put` membuat direktori induknya seperti unggahan sungguhan — kunci tanpa
  // garis miring akan membuat `mkdir` dan `writeFile` menunjuk path yang sama, lalu EISDIR.
  const key = `.probe/${randomUUID()}`;
  const body = Buffer.from('ready');
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Probe media melewati batas waktu')), PROBE_TIMEOUT_MS);
  });
  try {
    await Promise.race([
      (async () => {
        await storage.put(key, body, 'application/octet-stream');
        const roundTrip = await storage.get(key);
        if (!roundTrip.equals(body)) throw new Error('Isi berkas probe berbeda dari yang ditulis');
      })(),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    // Kegagalan pembersihan tidak boleh menutupi kegagalan yang sebenarnya, dan berkas probe
    // yang tertinggal tidak merusak apa pun — `delete` sendiri sudah idempoten.
    await storage.delete(key).catch(() => undefined);
  }
}

export function createMediaStorage(environment: Environment = process.env): MediaStorage {
  const provider = environment.MEDIA_PROVIDER ?? 'local';
  if (provider === 's3') return new S3MediaStorage(s3ConfigFromEnvironment(environment));
  if (provider === 'local') return new LocalMediaStorage(localMediaDirectory(environment));
  throw new Error('MEDIA_PROVIDER harus local atau s3');
}
