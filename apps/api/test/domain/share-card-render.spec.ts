import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDefaultDocument } from '@aruna/contracts';
import { probePng } from '../../src/media/ornament-intake.js';
import { ShareCardService } from '../../src/share-card/share-card.service.js';

/*
 * Kartu bagikan yang BENAR-BENAR dirender — satori dipanggil, resvg dipanggil, font dibaca dari
 * disk. `share-card.spec.ts` di sebelah tetap murni elemen dan tidak menyentuh satu pun dari itu.
 *
 * Berkas ini lahir dari cacat yang justru disembunyikan oleh ketiadaannya: resvg tidak punya
 * dekoder WebP dan tidak melempar — ia menggambar kosong. Tes elemen tidak bisa menangkap itu
 * karena tidak pernah merender; e2e tidak bisa karena hanya memeriksa `href`. Yang menangkapnya
 * hanya membaca piksel PNG-nya, dan itulah yang dilakukan `latar foto WebP` di bawah.
 *
 * Bentuknya meniru `s3-roundtrip.spec.ts`: server `node:http` sungguhan, bukan mock. Foto kartu
 * datang lewat HTTP di produksi, dan pagar ukuran/jenis/protokolnya hanya berarti kalau yang diuji
 * juga lewat HTTP.
 */

/** Satori + resvg + enam pembacaan font jauh di atas 10 detik bawaan saat dingin. */
const timeout = 45_000;

type Rute = { type: string; body: Buffer; status?: number };
const rute = new Map<string, Rute>();
let server: Server;
let origin = '';

beforeAll(async () => {
  server = createServer((request, response) => {
    const hit = rute.get(request.url ?? '');
    if (!hit) { response.writeHead(404).end(); return; }
    response.writeHead(hit.status ?? 200, { 'content-type': hit.type, 'content-length': String(hit.body.byteLength) });
    response.end(hit.body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

/** Kotak satu warna, dipakai sebagai latar supaya "fotonya sampai" bisa dibaca sebagai angka. */
async function kotak(format: 'webp' | 'png' | 'jpeg'): Promise<Buffer> {
  const gambar = sharp({ create: { width: 1200, height: 630, channels: 3, background: { r: 200, g: 40, b: 40 } } });
  if (format === 'webp') return gambar.webp({ quality: 90 }).toBuffer();
  if (format === 'jpeg') return gambar.jpeg().toBuffer();
  return gambar.png().toBuffer();
}

function dokumen(shareCard: Record<string, unknown> = {}) {
  const base = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', { date: '2026-10-03', venue: 'Pendopo Aruna' });
  return { ...base, shareCard };
}

/**
 * Prisma palsu seperlunya: `render()` menyentuh tepat satu metode. Memakai `@nestjs/testing` di
 * sini berarti menyalakan modul penuh untuk mendapatkan satu `findFirst`.
 */
function layanan(document: unknown, revisionId = 'rev-1') {
  const prisma = {
    invitation: {
      findFirst: async () => ({ slug: 'aruna-dewa', activeRevision: { id: revisionId, document } }),
    },
  };
  return new ShareCardService(prisma as never);
}

/** Rata-rata dan sebaran kanal merah — kanvas kosong memberi 0/0, foto memberi angka. */
async function piksel(png: Buffer) {
  const { channels } = await sharp(png).stats();
  return { mean: channels[0]!.mean, stdev: channels[0]!.stdev };
}

describe('render kartu bagikan', () => {
  it('menghasilkan PNG 1200x630 yang sah, dengan font yang benar-benar terbaca', { timeout }, async () => {
    const png = await layanan(dokumen()).render('aruna-dewa', 'Budi Santoso');

    // Tanda tangan dan IHDR dibaca `probePng` yang sudah ada — jangan tulis pembaca PNG kedua.
    const probe = probePng(png);
    expect(probe).not.toBeNull();
    expect(probe).toMatchObject({ width: 1200, height: 630 });

    // Kartu bertema jelas bukan bidang kosong: ada tinta di atas latarnya.
    const { stdev } = await piksel(png);
    expect(stdev).toBeGreaterThan(1);
  });

  /*
   * INI penjaga cacatnya, dan bentuknya sengaja dua sisi.
   *
   * Versi pertamanya hanya menuntut `mean > 20`, dan itu **tidak menjaga apa pun**: kartu yang
   * fotonya gagal tetap menggambar latar tema plus lapisan gelap plus teks, jadi angkanya lewat
   * ambang itu dengan mudah. Dibuktikan dengan mencabut transkodenya — kasusnya tetap hijau.
   *
   * Yang benar-benar membedakan "fotonya sampai" dari "fotonya hilang" adalah membandingkannya
   * dengan dua kartu lain: harus **jauh** dari kartu tanpa foto, dan harus **dekat** dengan kartu
   * berfoto PNG yang isinya sama. Cabut transkodenya dan keduanya merah sekaligus.
   */
  it('latar foto WebP sampai ke kartu, bukan jatuh ke latar tema', { timeout }, async () => {
    rute.set('/sama.webp', { type: 'image/webp', body: await kotak('webp') });
    rute.set('/sama.png', { type: 'image/png', body: await kotak('png') });

    const tanpaFoto = await piksel(await layanan(dokumen({ backgroundMode: 'foto' })).render('aruna-dewa', undefined));
    const dariWebp = await piksel(await layanan(dokumen({ backgroundMode: 'foto', imageUrl: `${origin}/sama.webp` })).render('aruna-dewa', undefined));
    const dariPng = await piksel(await layanan(dokumen({ backgroundMode: 'foto', imageUrl: `${origin}/sama.png` })).render('aruna-dewa', undefined));

    // Jauh dari kartu tanpa foto: kalau resvg menggambar kosong, keduanya justru berimpit.
    expect(Math.abs(dariWebp.mean - tanpaFoto.mean)).toBeGreaterThan(20);
    // Dekat dengan PNG berisi sama — bukan identik, WebP lossy.
    expect(Math.abs(dariWebp.mean - dariPng.mean)).toBeLessThan(6);
  });

  it('foto JPEG diserahkan tanpa transkode dan tetap sampai', { timeout }, async () => {
    rute.set('/foto.jpg', { type: 'image/jpeg; charset=binary', body: await kotak('jpeg') });
    const png = await layanan(dokumen({ backgroundMode: 'foto', imageUrl: `${origin}/foto.jpg` })).render('aruna-dewa', undefined);
    expect((await piksel(png)).mean).toBeGreaterThan(20);
  });
});

describe('pagar fetchPhoto', () => {
  /**
   * Gagal apa pun sebabnya berarti kartu jatuh ke latar tema — bukan 500, dan bukan kartu kosong.
   * Yang dibandingkan karena itu kartu tanpa foto sama sekali, bukan sekadar "tidak melempar".
   */
  async function samaDenganTanpaFoto(imageUrl: string) {
    const tanpa = await piksel(await layanan(dokumen({ backgroundMode: 'foto' })).render('aruna-dewa', undefined));
    const dengan = await piksel(await layanan(dokumen({ backgroundMode: 'foto', imageUrl })).render('aruna-dewa', undefined));
    expect(dengan.mean).toBeCloseTo(tanpa.mean, 1);
  }

  it('menolak jenis di luar daftar', { timeout }, async () => {
    rute.set('/bukan-gambar', { type: 'image/gif', body: Buffer.from('GIF89a') });
    await samaDenganTanpaFoto(`${origin}/bukan-gambar`);
  });

  it('menolak badan yang lebih besar dari 6 MB', { timeout }, async () => {
    rute.set('/raksasa.png', { type: 'image/png', body: Buffer.alloc(6 * 1024 * 1024 + 1, 7) });
    await samaDenganTanpaFoto(`${origin}/raksasa.png`);
  });

  it('menolak jawaban yang bukan 2xx', { timeout }, async () => {
    rute.set('/hilang.png', { type: 'image/png', body: Buffer.from('x'), status: 404 });
    await samaDenganTanpaFoto(`${origin}/hilang.png`);
  });

  it('menolak protokol di luar http/https', { timeout }, async () => {
    await samaDenganTanpaFoto('data:image/png;base64,AAAA');
  });

  it('badan yang mengaku PNG tapi tidak bisa didekode tidak menjatuhkan kartu', { timeout }, async () => {
    rute.set('/rusak.webp', { type: 'image/webp', body: Buffer.from('bukan webp sama sekali') });
    await samaDenganTanpaFoto(`${origin}/rusak.webp`);
  });
});

describe('cache dan nama tamu', () => {
  it('memakai ulang PNG yang sama untuk kunci yang sama, dan membedakan per tamu', { timeout }, async () => {
    const service = layanan(dokumen());
    const pertama = await service.render('aruna-dewa', 'Budi Santoso');
    const kedua = await service.render('aruna-dewa', 'Budi Santoso');
    expect(kedua).toBe(pertama); // identitas, bukan kesamaan isi: ini yang membuktikan cache kena

    const lain = await service.render('aruna-dewa', 'Siti Aminah');
    expect(lain).not.toBe(pertama);
  });

  it('kunci cache ikut revisi terbit, bukan slug saja', { timeout }, async () => {
    const doc = dokumen();
    const revisiLama = await layanan(doc, 'rev-1').render('aruna-dewa', 'Budi');
    const revisiBaru = await layanan(doc, 'rev-2').render('aruna-dewa', 'Budi');
    expect(revisiBaru).not.toBe(revisiLama);
  });

  it('nama tamu yang tidak sah dibaca sebagai tanpa nama, bukan melempar', { timeout }, async () => {
    const service = layanan(dokumen());
    const kosong = await service.render('aruna-dewa', '   ');
    const tanpa = await service.render('aruna-dewa', undefined);
    expect(kosong).toBe(tanpa);
  });
});
