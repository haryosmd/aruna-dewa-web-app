import { describe, expect, it } from 'vitest';
import { cookieDomainProblems, sessionCookieDomain } from '../../src/common/cookie-domain.js';

const produksi = { WEB_ORIGIN: 'https://arunadewa.id', API_ORIGIN: 'https://api.arunadewa.id', COOKIE_DOMAIN: 'arunadewa.id' };
const lokal = { WEB_ORIGIN: 'http://127.0.0.1:3000', API_ORIGIN: 'http://127.0.0.1:3001' };

describe('cakupan host cookie sesi', () => {
  it('menolak menyala saat host web dan host API berbeda tanpa COOKIE_DOMAIN', () => {
    // Persis konfigurasi yang berjalan di produksi sampai hari ini: login berhasil di sisi API,
    // lalu render server Nuxt tidak pernah melihat cookienya dan memantulkan orang ke /login.
    const problems = cookieDomainProblems({ ...produksi, COOKIE_DOMAIN: undefined });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/COOKIE_DOMAIN wajib diisi/u);
    expect(problems[0]).toContain('arunadewa.id');
    expect(problems[0]).toContain('api.arunadewa.id');
  });

  it('tidak menuntut apa pun saat web dan API berbagi satu host', () => {
    expect(cookieDomainProblems(lokal)).toEqual([]);
    expect(sessionCookieDomain(lokal)).toBeUndefined();
  });

  it('membiarkan dua ejaan loopback berbeda tanpa Domain', () => {
    // `localhost` dan `127.0.0.1` memang dua host cookie yang berbeda, tapi jalan keluarnya bukan
    // `Domain` — IP tidak sah di sana. `apps/web/utils/api-origin.ts` yang menyamakan keduanya.
    expect(cookieDomainProblems({ WEB_ORIGIN: 'http://localhost:3000', API_ORIGIN: 'http://127.0.0.1:3001' })).toEqual([]);
  });

  it('menerima induk bersama kedua subdomain', () => {
    expect(cookieDomainProblems(produksi)).toEqual([]);
    expect(sessionCookieDomain(produksi)).toBe('arunadewa.id');
  });

  it('merapikan titik di depan, titik di belakang, spasi, dan huruf besar', () => {
    expect(sessionCookieDomain({ COOKIE_DOMAIN: '  .ArunaDewa.id.  ' })).toBe('arunadewa.id');
    expect(cookieDomainProblems({ ...produksi, COOKIE_DOMAIN: '.arunadewa.id' })).toEqual([]);
  });

  it('menolak satu huruf yang salah ketik, di host mana pun', () => {
    const salah = cookieDomainProblems({ ...produksi, COOKIE_DOMAIN: 'arunadewaa.id' });
    expect(salah).toHaveLength(2);
    expect(salah[0]).toMatch(/bukan induk dari host web/u);
    expect(salah[1]).toMatch(/bukan induk dari host API/u);
  });

  it('menolak domain yang hanya menutupi salah satu host', () => {
    const problems = cookieDomainProblems({ WEB_ORIGIN: 'https://arunadewa.id', API_ORIGIN: 'https://api.aruna-dewa.id', COOKIE_DOMAIN: 'arunadewa.id' });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/host API \(api\.aruna-dewa\.id\)/u);
  });

  it('menolak satu label, karena browser tidak pernah menerima cookie atas seluruh TLD', () => {
    expect(cookieDomainProblems({ ...produksi, COOKIE_DOMAIN: 'id' })[0]).toMatch(/minimal dua label/u);
  });

  it('menolak alamat IP dan host loopback yang dibuang browser tanpa galat', () => {
    for (const domain of ['127.0.0.1', 'localhost', '::1']) {
      expect(cookieDomainProblems({ ...lokal, COOKIE_DOMAIN: domain })[0]).toMatch(/alamat IP atau host loopback/u);
    }
  });

  it('memakai entri pertama WEB_ORIGIN, sama seperti tautan yang dikirim lewat email', () => {
    const problems = cookieDomainProblems({ WEB_ORIGIN: 'https://arunadewa.id, https://www.arunadewa.id', API_ORIGIN: 'https://api.arunadewa.id', COOKIE_DOMAIN: 'arunadewa.id' });
    expect(problems).toEqual([]);
  });

  it('diam saat origin-nya sendiri belum diisi', () => {
    // Keduanya sudah dikeluhkan `env.ts` sebagai variabel wajib. Keluhan susulan dari sini hanya
    // mengirim orang mengejar COOKIE_DOMAIN padahal yang hilang WEB_ORIGIN.
    expect(cookieDomainProblems({ WEB_ORIGIN: 'https://arunadewa.id' })).toEqual([]);
    expect(cookieDomainProblems({ API_ORIGIN: 'https://api.arunadewa.id' })).toEqual([]);
    expect(cookieDomainProblems({})).toEqual([]);
  });
});
