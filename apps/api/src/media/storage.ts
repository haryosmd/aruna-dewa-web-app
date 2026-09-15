import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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
  constructor(private readonly directory: string) {}
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

export function createMediaStorage(environment: Environment = process.env): MediaStorage {
  const provider = environment.MEDIA_PROVIDER ?? 'local';
  if (provider === 's3') return new S3MediaStorage(s3ConfigFromEnvironment(environment));
  if (provider === 'local') return new LocalMediaStorage(environment.MEDIA_LOCAL_DIR ?? join(process.cwd(), '.data/media'));
  throw new Error('MEDIA_PROVIDER harus local atau s3');
}
