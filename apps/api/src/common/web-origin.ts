/**
 * Satu sumber kebenaran untuk origin web yang boleh berbicara dengan API ini.
 *
 * Sebelumnya `WEB_ORIGIN` dibaca di empat tempat sebagai satu string yang harus cocok
 * persis. Dua konsekuensinya sama-sama menyakitkan di lokal: `http://localhost:3000` dan
 * `http://127.0.0.1:3000` adalah origin berbeda bagi browser meski mesinnya sama — GET
 * diblokir CORS, POST ditolak `OriginGuard` dengan 403 — sementara empat literal cadangan
 * itu bisa saling menyimpang tanpa ada yang menyadarinya.
 */

import type { RuntimeEnv } from './env.js';

const DEFAULT_WEB_ORIGIN = 'http://127.0.0.1:3000';

/** Ejaan loopback yang menunjuk mesin yang sama. `URL.hostname` menyertakan kurung IPv6. */
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

function normalize(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

/**
 * Ejaan loopback lain pada port yang sama. Hanya berlaku untuk host loopback, jadi
 * domain produksi tidak pernah melahirkan alias — daftarnya tetap eksplisit, tanpa wildcard.
 */
function loopbackSiblings(origin: string): string[] {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return [];
  }
  if (!LOOPBACK_HOSTS.includes(url.hostname)) return [];
  const port = url.port ? `:${url.port}` : '';
  return LOOPBACK_HOSTS.map((host) => `${url.protocol}//${host}${port}`);
}

let cache: { key: string; origins: string[] } | undefined;

/**
 * Daftar origin yang diizinkan, urut: yang dikonfigurasi dulu, lalu alias loopback-nya.
 *
 * `env` bisa diberikan supaya pemeriksaan saat boot bekerja atas lingkungan yang sedang
 * diperiksa, bukan atas `process.env` proses tes — lihat `cookie-domain.ts`.
 */
export function webOrigins(env: RuntimeEnv = process.env): string[] {
  const key = env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN;
  if (cache?.key === key) return cache.origins;
  const configured = key.split(',').map(normalize).filter(Boolean);
  const origins: string[] = [];
  for (const origin of configured.length ? configured : [DEFAULT_WEB_ORIGIN]) {
    for (const candidate of [origin, ...loopbackSiblings(origin)]) {
      if (!origins.includes(candidate)) origins.push(candidate);
    }
  }
  cache = { key, origins };
  return origins;
}

/**
 * Origin kanonik: entri pertama yang dikonfigurasi. Dipakai untuk tautan yang *dikirim*
 * (verifikasi email, reset password, redirect setelah OAuth) — alias loopback tidak
 * pernah dipilih di situ, karena yang menerima tautan belum tentu duduk di mesin ini.
 */
export function canonicalWebOrigin(env: RuntimeEnv = process.env): string {
  return webOrigins(env)[0] ?? DEFAULT_WEB_ORIGIN;
}

export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  return webOrigins().includes(normalize(origin));
}
