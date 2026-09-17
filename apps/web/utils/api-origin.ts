/**
 * Host API mengikuti host halaman selama keduanya loopback.
 *
 * Cookie sesi terikat ke *host*, bukan ke port: `localhost` dan `127.0.0.1` adalah dua
 * situs berbeda bagi browser meski mesinnya sama. Halaman di `http://localhost:3000` yang
 * memanggil API di `http://127.0.0.1:3001` membuat `Set-Cookie` dengan `SameSite=Lax`
 * dibuang diam-diam — tidak ada error, tidak ada peringatan; login menjawab 200, lalu
 * `/auth/me` menjawab 401 dan middleware memantulkan kembali ke `/login`.
 *
 * `apps/api/src/common/web-origin.ts` sudah menerima ketiga ejaan itu di CORS dan
 * `OriginGuard`. Modul ini melengkapi separuh yang tersisa: tanpa ini, kelonggaran di sisi
 * API hanya memindahkan kegagalan dari 403 yang kelihatan menjadi sesi yang hilang senyap.
 */

/** Ejaan loopback yang menunjuk mesin yang sama. `URL.hostname` menyertakan kurung IPv6. */
const loopbackHosts = ['127.0.0.1', 'localhost', '[::1]']

export function apiBaseForPage(configured: string, pageHost: string | undefined): string {
  if (!pageHost || !loopbackHosts.includes(pageHost)) return configured
  let url: URL
  try {
    url = new URL(configured)
  } catch {
    // Base relatif (proxy same-origin) tidak punya host untuk disamakan — biarkan utuh.
    return configured
  }
  // Domain produksi tidak pernah disentuh — tapi bukan karena tidak butuh apa-apa.
  // `arunadewa.id` dan `api.arunadewa.id` memang satu *site*, jadi `SameSite=Lax` tidak
  // menghalangi; yang tetap kurang di sana adalah cakupan *host*, dan itu diselesaikan di sisi
  // API lewat `COOKIE_DOMAIN` (`apps/api/src/common/cookie-domain.ts`), bukan di modul ini.
  // Dua hal yang mudah tertukar, dan komentar di sini sempat menyimpulkan yang salah.
  if (!loopbackHosts.includes(url.hostname)) return configured
  url.hostname = pageHost
  return url.toString().replace(/\/$/, '')
}
