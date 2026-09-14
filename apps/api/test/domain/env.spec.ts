import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_JWT_SECRET, assertRuntimeEnv, runtimeEnvProblems, trustProxySetting } from '../../src/common/env.js';

const productionEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'x'.repeat(48),
  DATABASE_URL: 'postgresql://aruna@db:5432/aruna',
  WEB_ORIGIN: 'https://arunadewa.id',
  API_ORIGIN: 'https://api.arunadewa.id',
  TRUST_PROXY: '1',
};

describe('gerbang konfigurasi saat boot', () => {
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

  it('menuntut rahasia panjang dan empat variabel lain saat NODE_ENV=production', () => {
    expect(runtimeEnvProblems(productionEnv)).toEqual([]);
    expect(runtimeEnvProblems({ ...productionEnv, JWT_SECRET: 'pendek' })[0]).toMatch(/minimal 32 karakter/u);
    for (const key of ['DATABASE_URL', 'WEB_ORIGIN', 'API_ORIGIN', 'TRUST_PROXY']) {
      expect(runtimeEnvProblems({ ...productionEnv, [key]: '' })).toEqual([`${key} wajib diisi saat NODE_ENV=production.`]);
    }
  });

  it('mengumpulkan seluruh keluhan sekaligus, bukan satu per deploy', () => {
    expect(runtimeEnvProblems({ NODE_ENV: 'production' })).toHaveLength(5);
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
