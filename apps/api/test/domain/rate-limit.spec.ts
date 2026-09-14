import { describe, expect, it } from 'vitest';
import { FixedWindowCounter, identityRateLimits } from '../../src/common/rate-limit.js';

const rule = { ttl: 1000, limit: 3 };

describe('penghitung jendela tetap', () => {
  it('meloloskan sampai ambang lalu menahan', () => {
    const counter = new FixedWindowCounter();
    for (let attempt = 1; attempt <= 3; attempt += 1) expect(counter.hit('k', rule, 0).allowed).toBe(true);
    const blocked = counter.hit('k', rule, 0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(1000);
  });

  it('membuka lagi setelah jendelanya lewat', () => {
    const counter = new FixedWindowCounter();
    for (let attempt = 1; attempt <= 4; attempt += 1) counter.hit('k', rule, 0);
    expect(counter.hit('k', rule, 1000).allowed).toBe(true);
  });

  it('memisahkan kunci, jadi satu korban tidak mengunci yang lain', () => {
    const counter = new FixedWindowCounter();
    for (let attempt = 1; attempt <= 4; attempt += 1) counter.hit('korban-a', rule, 0);
    expect(counter.hit('korban-b', rule, 0).allowed).toBe(true);
  });

  it('membuang jendela mati alih-alih menumpuknya selamanya', () => {
    const counter = new FixedWindowCounter();
    for (let index = 0; index < 50; index += 1) counter.hit(`k${index}`, rule, 0);
    expect(counter.size).toBe(50);
    counter.prune(2000);
    expect(counter.size).toBe(0);
  });
});

describe('jatah yang dikembalikan', () => {
  it('percobaan yang berhasil tidak ikut membebani ember', () => {
    // Yang dibatasi adalah menebak, bukan memakai. Tanpa aturan ini suite e2e — dan pasangan
    // yang berpindah perangkat beberapa kali — terkunci dari akunnya sendiri.
    const counter = new FixedWindowCounter();
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      expect(counter.hit('k', rule, 0).allowed).toBe(true);
      counter.forgive('k');
    }
  });

  it('tidak pernah turun di bawah nol, jadi forgive berlebih tidak memberi jatah gratis', () => {
    const counter = new FixedWindowCounter();
    counter.hit('k', rule, 0);
    for (let index = 0; index < 5; index += 1) counter.forgive('k');
    for (let attempt = 1; attempt <= 3; attempt += 1) expect(counter.hit('k', rule, 0).allowed).toBe(true);
    expect(counter.hit('k', rule, 0).allowed).toBe(false);
  });
});

describe('dua ember jalur identitas', () => {
  it('ember per-IP selalu lebih longgar daripada ember per (IP, email)', () => {
    // Kalau terbalik, satu kantor ber-NAT mengunci seluruh penghuninya dari halaman login —
    // persis yang terjadi saat dua ThrottlerGuard bertumpuk berbagi satu metadata @Throttle.
    for (const limit of Object.values(identityRateLimits)) {
      expect(limit.perAddress.limit).toBeGreaterThan(limit.perIdentity.limit);
    }
  });

  it('memberi login jendela lebih pendek daripada jalur yang mengirim email', () => {
    expect(identityRateLimits.login.perIdentity.ttl).toBeLessThan(identityRateLimits.forgotPassword.perIdentity.ttl);
  });
});
