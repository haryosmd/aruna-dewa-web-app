/**
 * Cakupan host cookie sesi.
 *
 * Tanpa atribut `Domain`, cookie yang diterbitkan `api.arunadewa.id` menjadi *host-only*:
 * browser menyimpannya, mengirimkannya kembali ke API, dan **tidak pernah** mengirimkannya ke
 * `arunadewa.id`. Render server Nuxt membaca sesi dari header cookie yang sampai ke host web
 * (`apps/web/plugins/auth.server.ts`), jadi ia melihat pengunjung yang barusan berhasil masuk
 * sebagai tamu — dan `middleware/auth` memantulkannya ke `/login` dengan sesi yang sebenarnya
 * hidup dan sah di sisi API. Itulah gejala "login Google berhasil lalu kembali ke halaman masuk";
 * reload biasa di `/dashboard` setelah login kata sandi memantul dengan sebab yang sama persis.
 *
 * Di mesin pengembang kegagalan ini tidak bisa muncul: web di `127.0.0.1:3000` dan API di
 * `127.0.0.1:3001` adalah host yang sama, dan cookie tidak peduli port. Dua subdomain berbeda
 * hanya ada di produksi — jadi satu-satunya tempat yang bisa membuktikan konfigurasinya benar
 * adalah saat boot di server itu sendiri.
 *
 * `SameSite=Lax` sudah benar dan tidak berubah: `arunadewa.id` dan `api.arunadewa.id` memang satu
 * *site*. Yang kurang bukan izin lintas situs, melainkan cakupan *host* — dua hal berbeda yang
 * mudah tertukar, dan komentar di `apps/web/utils/api-origin.ts` sempat menertawakan yang salah.
 */

import { canonicalWebOrigin } from './web-origin.js';
import type { RuntimeEnv } from './env.js';

/** Sama dengan nilai cadangan `API_ORIGIN` di `auth.service.ts`; keduanya menunjuk mesin ini. */
const DEFAULT_API_ORIGIN = 'http://127.0.0.1:3001';

/** Ejaan loopback yang menunjuk mesin yang sama, tanpa kurung IPv6. */
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1'];

/** Host mentah sebuah origin, huruf kecil, tanpa kurung IPv6. String kosong kalau tak terbaca. */
function hostOf(origin: string): string {
  try {
    return new URL(origin).hostname.toLowerCase().replace(/^\[|\]$/gu, '');
  } catch {
    return '';
  }
}

function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.includes(host) || host.startsWith('127.');
}

/** Alamat IP tidak pernah sah sebagai `Domain` cookie — browser membuangnya tanpa bersuara. */
function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/u.test(host) || host.includes(':');
}

/** `domain` mencakup `host` kalau keduanya sama, atau `host` adalah subdomainnya. */
function covers(domain: string, host: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function apiHost(env: RuntimeEnv): string {
  return hostOf(env.API_ORIGIN?.trim() || DEFAULT_API_ORIGIN);
}

/**
 * Nilai `Domain` untuk cookie sesi, atau `undefined` kalau cookie harus tetap host-only.
 *
 * Titik di depan sengaja dibuang: RFC 6265 mengabaikannya, dan menuliskannya membuat nilai di
 * `api.env` tidak pernah sama persis dengan yang terlihat di DevTools.
 */
export function sessionCookieDomain(env: RuntimeEnv = process.env): string | undefined {
  const domain = env.COOKIE_DOMAIN?.trim().toLowerCase().replace(/^\./u, '').replace(/\.$/u, '');
  return domain || undefined;
}

/**
 * Keluhan yang membuat boot berhenti. Wajibnya tidak digantung pada `NODE_ENV`, melainkan pada
 * keadaan yang benar-benar menentukan: host web dan host API yang berbeda. Staging yang lupa
 * menyetel `NODE_ENV=production` punya masalah yang sama persis, dan ia pantas ditolak juga.
 */
export function cookieDomainProblems(env: RuntimeEnv = process.env): string[] {
  const problems: string[] = [];
  // Origin yang belum diisi sudah dikeluhkan sendiri di `env.ts`, dan nilai cadangan loopback-nya
  // tidak mewakili niat siapa pun. Menumpuk keluhan kedua di atasnya hanya mengaburkan sebab
  // pertama — orang yang membaca log deploy akan mengejar COOKIE_DOMAIN padahal yang hilang
  // WEB_ORIGIN.
  if (!env.WEB_ORIGIN?.trim() || !env.API_ORIGIN?.trim()) return problems;
  const web = hostOf(canonicalWebOrigin(env));
  const api = apiHost(env);
  const domain = sessionCookieDomain(env);
  const loopbackOnly = isLoopbackHost(web) && isLoopbackHost(api);

  if (!domain) {
    // Dua ejaan loopback yang berbeda memang dua host cookie yang berbeda, tapi jalan keluarnya
    // bukan `Domain` — IP tidak boleh dipakai di sana. `apps/web/utils/api-origin.ts` yang
    // menyamakan keduanya di sisi browser.
    if (web && api && web !== api && !loopbackOnly) {
      problems.push(`COOKIE_DOMAIN wajib diisi: host web (${web}) dan host API (${api}) berbeda, jadi cookie sesi tanpa Domain tidak akan pernah sampai ke halaman web.`);
    }
    return problems;
  }

  if (isIpLiteral(domain) || isLoopbackHost(domain)) {
    problems.push(`COOKIE_DOMAIN tidak boleh berupa alamat IP atau host loopback (${domain}); browser membuang cookie-nya tanpa galat.`);
    return problems;
  }
  if (domain.split('.').filter(Boolean).length < 2) {
    problems.push(`COOKIE_DOMAIN minimal dua label (contoh: arunadewa.id), bukan "${domain}".`);
    return problems;
  }
  for (const [label, host] of [['web', web], ['API', api]] as const) {
    if (host && !covers(domain, host)) {
      problems.push(`COOKIE_DOMAIN "${domain}" bukan induk dari host ${label} (${host}); cookie sesinya akan dibuang browser.`);
    }
  }
  return problems;
}
