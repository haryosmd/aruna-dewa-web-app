import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { S3MediaStorage, type S3StorageConfig } from '../../src/media/storage.js';

/**
 * Putaran penuh lewat HTTP sungguhan, bukan klien yang di-mock.
 *
 * Yang tidak bisa ditangkap tes ber-mock, dan ketiganya hidup di antara kode kita dan kawat:
 * bentuk alamat (`forcePathStyle`), kunci bergaris miring yang harus tetap utuh sebagai path,
 * dan `GetObject` yang gagal — apakah ia melempar, atau mengembalikan body kosong yang lolos
 * sampai ke `<img>` tamu sebagai berkas rusak.
 *
 * Yang dipalsukan hanya penyimpanannya. `S3Client`, penandatanganan, dan HTTP-nya asli.
 */
describe('putaran penuh S3MediaStorage lewat HTTP', () => {
  const objek = new Map<string, Buffer>();
  const diminta: string[] = [];
  let server: Server;
  let config: S3StorageConfig;

  beforeAll(async () => {
    server = createServer((request, response) => {
      // Query dibuang: SDK menempelkan `?x-id=PutObject` ke tiap operasi, dan kunci objek adalah
      // path-nya saja. Bucket sungguhan melakukan hal yang sama; tiruan yang tidak, menyimpan
      // objek dengan kunci yang tidak akan pernah bisa dibaca kembali.
      const path = decodeURIComponent(new URL(request.url ?? '/', 'http://tiruan').pathname);
      diminta.push(`${request.method} ${path}`);
      // Path-style: /<bucket>/<key...>. Kalau klien memakai virtual-host, path-nya hanya `/<key>`
      // dan bucket pindah ke hostname — permintaan itu tidak akan pernah sampai ke sini, karena
      // `bucket.127.0.0.1` tidak bisa di-resolve. Itu sendiri sudah jadi assertion.
      const cocok = /^\/aruna-media(?:\/(.*))?$/u.exec(path);
      if (!cocok) { response.writeHead(404).end(); return; }
      const key = cocok[1] ?? '';

      if (request.method === 'HEAD' && !key) { response.writeHead(200).end(); return; }
      if (request.method === 'PUT') {
        if (request.headers['if-none-match'] === '*' && objek.has(key)) {
          response.writeHead(412, { 'content-type': 'application/xml' }).end('<Error><Code>PreconditionFailed</Code></Error>');
          return;
        }
        const potongan: Buffer[] = [];
        request.on('data', (bagian: Buffer) => potongan.push(bagian));
        request.on('end', () => { objek.set(key, Buffer.concat(potongan)); response.writeHead(200, { etag: '"x"' }).end(); });
        return;
      }
      if (request.method === 'GET') {
        const isi = objek.get(key);
        if (!isi) { response.writeHead(404, { 'content-type': 'application/xml' }).end('<Error><Code>NoSuchKey</Code></Error>'); return; }
        response.writeHead(200, { 'content-length': String(isi.length) }).end(isi);
        return;
      }
      if (request.method === 'DELETE') { objek.delete(key); response.writeHead(204).end(); return; }
      response.writeHead(405).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    config = { endpoint: `http://127.0.0.1:${port}`, region: 'us-east-1', bucket: 'aruna-media', accessKeyId: 'access', secretAccessKey: 'secret', forcePathStyle: true };
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const key = '3f1b2c4d-0000-4000-8000-000000000001/9a8b7c6d-0000-4000-8000-000000000002.jpg';

  it('menulis, membaca ulang byte yang sama, lalu menghapus', async () => {
    const storage = new S3MediaStorage(config);
    const foto = Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02, 0x03]);

    await storage.put(key, foto, 'image/jpeg');
    expect(await storage.get(key)).toEqual(foto);

    await storage.delete(key);
    await expect(storage.get(key)).rejects.toThrow();
  });

  it('memakai alamat path-style, dengan kunci bergaris miring yang tetap utuh', async () => {
    const storage = new S3MediaStorage(config);
    await storage.put(key, Buffer.from('x'), 'image/jpeg');
    expect(diminta).toContain(`PUT /aruna-media/${key}`);
    await storage.delete(key);
  });

  it('probe lolos pada bucket yang menjawab HeadBucket', async () => {
    await expect(new S3MediaStorage(config).probe()).resolves.toBeUndefined();
  });

  it('probe gagal pada bucket yang bukan miliknya — kredensial dicabut atau nama salah ketik', async () => {
    await expect(new S3MediaStorage({ ...config, bucket: 'bucket-yang-salah' }).probe()).rejects.toThrow();
  });

  it('put kedua atas kunci yang sama ditolak 412 — padanan flag wx milik jalur lokal', async () => {
    const storage = new S3MediaStorage(config);
    await storage.put(key, Buffer.from('pertama'), 'image/jpeg');
    await expect(storage.put(key, Buffer.from('kedua'), 'image/jpeg')).rejects.toThrow();
    // Yang pertama tidak boleh ikut berubah: itu seluruh gunanya.
    expect((await storage.get(key)).toString()).toBe('pertama');
    await storage.delete(key);
  });
});
