import { afterEach, describe, expect, it } from 'vitest';
import { canonicalWebOrigin, isAllowedOrigin, webOrigins } from '../../src/common/web-origin.js';

const original = process.env.WEB_ORIGIN;
afterEach(() => {
  if (original === undefined) delete process.env.WEB_ORIGIN;
  else process.env.WEB_ORIGIN = original;
});

describe('daftar origin web', () => {
  it('menerima kedua ejaan loopback pada port yang sama', () => {
    process.env.WEB_ORIGIN = 'http://127.0.0.1:3000';
    expect(isAllowedOrigin('http://127.0.0.1:3000')).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('http://[::1]:3000')).toBe(true);
  });

  it('tetap menolak port lain, skema lain, dan host lain', () => {
    process.env.WEB_ORIGIN = 'http://127.0.0.1:3000';
    for (const hostile of ['http://localhost:3200', 'https://localhost:3000', 'http://evil.test', 'http://127.0.0.1', '']) {
      expect(isAllowedOrigin(hostile)).toBe(false);
    }
  });

  it('menolak request tanpa header Origin', () => {
    expect(isAllowedOrigin(undefined)).toBe(false);
    expect(isAllowedOrigin(null)).toBe(false);
  });

  it('membaca daftar berkoma dan merapikan spasi serta garis miring penutup', () => {
    process.env.WEB_ORIGIN = 'https://arunadewa.id/, https://www.arunadewa.id';
    expect(webOrigins()).toEqual(['https://arunadewa.id', 'https://www.arunadewa.id']);
    expect(isAllowedOrigin('https://www.arunadewa.id')).toBe(true);
  });

  it('tidak melahirkan alias untuk domain produksi', () => {
    process.env.WEB_ORIGIN = 'https://arunadewa.id';
    expect(webOrigins()).toEqual(['https://arunadewa.id']);
    expect(isAllowedOrigin('https://localhost')).toBe(false);
  });

  it('memakai origin yang dikonfigurasi lebih dulu untuk tautan yang dikirim', () => {
    // Alias loopback tidak boleh terpilih: penerima email belum tentu duduk di mesin ini.
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    expect(canonicalWebOrigin()).toBe('http://localhost:3000');
    process.env.WEB_ORIGIN = 'https://arunadewa.id, https://staging.arunadewa.id';
    expect(canonicalWebOrigin()).toBe('https://arunadewa.id');
  });

  it('jatuh ke loopback bawaan saat env kosong atau tidak diisi', () => {
    delete process.env.WEB_ORIGIN;
    expect(canonicalWebOrigin()).toBe('http://127.0.0.1:3000');
    process.env.WEB_ORIGIN = '  ,  ';
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
  });
});
