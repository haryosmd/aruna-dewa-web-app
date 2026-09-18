import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_JWT_SECRET, assertRuntimeEnv, runtimeEnvProblems, trustProxySetting } from '../../src/common/env.js';

const productionEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'x'.repeat(48),
  DATABASE_URL: 'postgresql://aruna@db:5432/aruna',
  WEB_ORIGIN: 'https://arunadewa.id',
  API_ORIGIN: 'https://api.arunadewa.id',
  TRUST_PROXY: '1',
  SMTP_HOST: 'smtp.relay.test',
  SMTP_PORT: '2587',
  SMTP_USER: 'aruna',
  SMTP_PASS: 'rahasia-relay',
  SMTP_FROM: 'Aruna Dewa <halo@arunadewa.id>',
  GOOGLE_CLIENT_ID: '1234567890-contoh.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'GOCSPX-contoh',
  COOKIE_DOMAIN: 'arunadewa.id',
  // Cerminan produksi sejak fase 56, bukan nilai termudah: `MEDIA_PROVIDER` datang dari
  // `compose.prod.yaml` dan `S3_*` dari `api.env`. Fixture yang memakai `local` akan hijau
  // sambil berhenti mewakili satu-satunya lingkungan yang gerbang ini benar-benar jaga.
  MEDIA_PROVIDER: 's3',
  S3_ENDPOINT: 'https://is3.cloudhost.id',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'aruna-media',
  S3_ACCESS_KEY_ID: 'contoh-akses',
  S3_SECRET_ACCESS_KEY: 'contoh-rahasia',
};

describe('gerbang konfigurasi saat boot', () => {
  it('menolak dua subdomain tanpa COOKIE_DOMAIN', () => {
    // Aturannya sendiri diuji di `cookie-domain.spec.ts`; yang dipastikan di sini hanya bahwa ia
    // benar-benar ikut menahan boot, bukan hidup sebagai fungsi yang tidak pernah dipanggil.
    const { COOKIE_DOMAIN: _, ...tanpaDomain } = productionEnv;
    expect(() => assertRuntimeEnv(tanpaDomain)).toThrow(/COOKIE_DOMAIN/u);
  });

  it('menolak menyala tanpa JWT_SECRET', () => {
    expect(runtimeEnvProblems({})).toContain('JWT_SECRET wajib diisi.');
    expect(() => assertRuntimeEnv({})).toThrow(/JWT_SECRET/u);
  });

  it('menolak nilai contoh pengembangan, betapapun lingkungannya', () => {
    expect(runtimeEnvProblems({ JWT_SECRET: DEVELOPMENT_JWT_SECRET })).toHaveLength(1);
    expect(runtimeEnvProblems({ ...productionEnv, JWT_SECRET: DEVELOPMENT_JWT_SECRET })[0]).toMatch(/contoh pengembangan/u);
  });

  it('meloloskan rahasia sungguhan di luar produksi tanpa menuntut sisanya', () => {
    expect(runtimeEnvProblems({ JWT_SECRET: 'rahasia-lokal-yang-bukan-contoh' })).toEqual([]);
  });

  it('menuntut rahasia panjang dan dua belas variabel lain saat NODE_ENV=production', () => {
    expect(runtimeEnvProblems(productionEnv)).toEqual([]);
    expect(runtimeEnvProblems({ ...productionEnv, JWT_SECRET: 'pendek' })[0]).toMatch(/minimal 32 karakter/u);
    for (const key of ['DATABASE_URL', 'WEB_ORIGIN', 'API_ORIGIN', 'TRUST_PROXY', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'MEDIA_PROVIDER']) {
      expect(runtimeEnvProblems({ ...productionEnv, [key]: '' })).toEqual([`${key} wajib diisi saat NODE_ENV=production.`]);
    }
  });

  it('menolak SMTP yang separuh terisi — ia gagal persis seperti kosong, tapi terlihat siap', () => {
    // smtpTransportOptions() hanya mengirim blok `auth` kalau user DAN pass ada. Relay menolak
    // koneksi tanpa AUTH, jadi verifikasi email mati total — dan tidak ada yang menyadarinya
    // sampai pendaftar pertama datang.
    expect(runtimeEnvProblems({ ...productionEnv, SMTP_PASS: '' })).toEqual(['SMTP_PASS wajib diisi saat NODE_ENV=production.']);
  });

  /**
   * SMTP_PORT satu-satunya variabel SMTP yang punya nilai bawaan — 1025, port Mailpit. Justru
   * karena itu ia yang paling mahal saat lupa: tidak ada yang meledak, dan tiap email menempuh
   * perjalanan ke port yang tidak pernah menjawab di relay produksi.
   */
  it('menolak SMTP_PORT yang kosong, meski kode punya nilai bawaannya', () => {
    expect(runtimeEnvProblems({ ...productionEnv, SMTP_PORT: '' })).toEqual(['SMTP_PORT wajib diisi saat NODE_ENV=production.']);
  });

  /**
   * Rilis pertama berjalan berhari-hari dengan keduanya kosong: `startGoogle` baru memeriksanya
   * saat ada yang menekan tombolnya, sementara tombolnya sendiri dirender tanpa syarat di dua
   * halaman masuk. Boot hijau, `/ready` hijau, dan yang menemukannya adalah pengunjung.
   */
  it('menolak Google OAuth yang separuh terisi — tombolnya dirender tanpa menanyakan ini', () => {
    expect(runtimeEnvProblems({ ...productionEnv, GOOGLE_CLIENT_SECRET: '' })).toEqual(['GOOGLE_CLIENT_SECRET wajib diisi saat NODE_ENV=production.']);
  });

  /**
   * `S3_*` tidak ikut `PRODUCTION_REQUIRED`, dan itu keputusan, bukan kelalaian: yang menentukan
   * wajib-tidaknya adalah `MEDIA_PROVIDER` itu sendiri. Staging yang menunjuk bucket dengan kunci
   * kosong gagal persis seperti produksi, dan mesin pengembang tidak perlu punya bucket sama sekali.
   */
  it('menuntut kredensial bucket begitu providernya s3, di lingkungan mana pun', () => {
    expect(runtimeEnvProblems({ ...productionEnv, S3_BUCKET: '' })).toEqual(['S3_BUCKET wajib diisi saat MEDIA_PROVIDER=s3.']);
    expect(runtimeEnvProblems({ JWT_SECRET: 'rahasia-lokal-yang-bukan-contoh', MEDIA_PROVIDER: 's3' })).toHaveLength(5);
  });

  it('tidak menuntut bucket saat media masih lokal — mesin pengembang tidak punya satu pun', () => {
    expect(runtimeEnvProblems({ JWT_SECRET: 'rahasia-lokal-yang-bukan-contoh', MEDIA_PROVIDER: 'local' })).toEqual([]);
  });

  it('tidak menuntut SMTP di luar produksi — Mailpit lokal memang menolak blok auth', () => {
    expect(runtimeEnvProblems({ JWT_SECRET: 'rahasia-lokal-yang-bukan-contoh', SMTP_HOST: '127.0.0.1' })).toEqual([]);
  });

  it('mengumpulkan seluruh keluhan sekaligus, bukan satu per deploy', () => {
    expect(runtimeEnvProblems({ NODE_ENV: 'production' })).toHaveLength(13);
  });
});

describe('setelan trust proxy', () => {
  it('mati kalau tidak disetel — X-Forwarded-For karangan tidak boleh jadi request.ip', () => {
    expect(trustProxySetting({})).toBe(false);
    expect(trustProxySetting({ TRUST_PROXY: '' })).toBe(false);
    expect(trustProxySetting({ TRUST_PROXY: '0' })).toBe(false);
    expect(trustProxySetting({ TRUST_PROXY: 'false' })).toBe(false);
  });

  it('membaca angka sebagai jumlah hop dan meneruskan sisanya apa adanya', () => {
    expect(trustProxySetting({ TRUST_PROXY: '1' })).toBe(1);
    expect(trustProxySetting({ TRUST_PROXY: '2' })).toBe(2);
    expect(trustProxySetting({ TRUST_PROXY: 'true' })).toBe(true);
    expect(trustProxySetting({ TRUST_PROXY: 'loopback' })).toBe('loopback');
  });
});
