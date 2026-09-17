/**
 * Pembacaan cookie sesi yang tidak bergantung pada urutan kiriman browser.
 *
 * Satu nama cookie bisa sampai **dua kali** dalam satu header `Cookie`, dan itu bukan kelainan:
 * cookie *host-only* di `api.arunadewa.id` dan cookie ber-`Domain=arunadewa.id` adalah dua entri
 * berbeda di jar browser. Setiap kali cakupan cookie sesi berubah — persis yang terjadi saat
 * `COOKIE_DOMAIN` dipasang — salinan lamanya tidak tertimpa dan tidak bisa dihapus lagi oleh
 * `clearCookie` yang memakai atribut baru, karena yang dihapus adalah cookie yang lain.
 *
 * Yang membuatnya berbahaya: urutannya tidak netral. RFC 6265 §5.4 menyajikan cookie berpath sama
 * urut waktu pembuatan — yang lama dulu — dan `cookie.parse` di balik `cookie-parser` memenangkan
 * kemunculan **pertama** (`// only assign once`). Jadi tanpa berkas ini, API selalu memilih token
 * basi, menolaknya sebagai sesi yang sudah dicabut, lalu memantulkan orangnya ke `/login` setiap
 * kali — selamanya, sampai cookie 30 harinya kedaluwarsa sendiri.
 *
 * Aturan di sini kebalikannya: **yang terakhir yang dipakai**, yaitu yang paling baru dibuat,
 * yaitu yang diterbitkan konfigurasi yang sedang berlaku.
 */

export const SESSION_COOKIE_NAMES = ['aruna_access', 'aruna_refresh'] as const;

export type SessionCookieName = (typeof SESSION_COOKIE_NAMES)[number];

/** Bentuk minimal `express.Request` yang dibutuhkan, supaya berkas ini bisa diuji tanpa Nest. */
export interface CookieCarrier {
  headers?: { cookie?: string | undefined } | undefined;
  cookies?: Record<string, unknown> | undefined;
}

/** Pasangan nama/nilai apa adanya, dalam urutan kirim — termasuk nama yang berulang. */
function* cookiePairs(header: string | undefined): Generator<readonly [string, string]> {
  if (!header) return;
  for (const part of header.split(';')) {
    const equals = part.indexOf('=');
    if (equals === -1) continue;
    const name = part.slice(0, equals).trim();
    if (!name) continue;
    yield [name, decodeValue(part.slice(equals + 1).trim())];
  }
}

/** Tanda kutip dilepas dan `%xx` dipulihkan, sama seperti `cookie.parse` — nilai yang cacat dibiarkan utuh. */
function decodeValue(raw: string): string {
  const unquoted = raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
  if (!unquoted.includes('%')) return unquoted;
  try {
    return decodeURIComponent(unquoted);
  } catch {
    return unquoted;
  }
}

/**
 * Kemunculan **terakhir** sebuah cookie di header mentah. Sengaja berbeda dari `cookie.parse`,
 * yang mengambil yang pertama; lihat catatan di kepala berkas.
 */
export function lastCookieValue(header: string | undefined, name: string): string | undefined {
  let found: string | undefined;
  for (const [key, value] of cookiePairs(header)) {
    if (key === name) found = value;
  }
  return found;
}

/**
 * Nama cookie sesi yang muncul lebih dari sekali.
 *
 * Header `Cookie` tidak membawa atribut `Domain`, jadi asal-usul tiap salinan tidak terbaca di
 * sini. Tapi aplikasi ini hanya pernah memakai satu nilai `Domain` pada satu waktu, jadi duplikat
 * berarti tepat satu hal: ada salinan warisan yang cakupannya berbeda dari yang berlaku sekarang.
 */
export function duplicatedSessionCookies(header: string | undefined): SessionCookieName[] {
  const seen = new Map<string, number>();
  for (const [key] of cookiePairs(header)) {
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return SESSION_COOKIE_NAMES.filter((name) => (seen.get(name) ?? 0) > 1);
}

/**
 * Cookie sesi dari sebuah request. `request.cookies` hanya jadi cadangan untuk pemanggil yang
 * tidak membawa header mentah — di jalur sungguhan ia justru sumber nilai yang salah.
 */
export function readSessionCookie(request: CookieCarrier, name: SessionCookieName): string | undefined {
  return lastCookieValue(request.headers?.cookie, name) ?? (request.cookies?.[name] as string | undefined);
}
