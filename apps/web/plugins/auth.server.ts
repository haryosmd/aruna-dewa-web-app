/**
 * Cookie sesi yang diterbitkan `apps/api`; keduanya cukup untuk menduga ada sesi.
 *
 * Yang dibaca di sini adalah cookie yang sampai ke host **web**, bukan ke host API. Selama cookie
 * sesi terbit host-only di `api.arunadewa.id`, pemeriksaan ini selalu gagal di produksi dan tiap
 * navigasi penuh berakhir di `/login` walau sesinya hidup. `COOKIE_DOMAIN` di sisi API yang
 * membuatnya terlihat dari sini — lihat `apps/api/src/common/cookie-domain.ts`.
 */
const sessionCookie = /(?:^|;\s*)aruna_(?:access|refresh)=/

/**
 * Siapa yang sedang masuk perlu diketahui di **setiap** halaman, bukan hanya di balik
 * middleware `auth`. Tanpa ini header landing menulis "Masuk" walau sesinya hidup, karena
 * tidak ada satu pun yang memanggil store di halaman publik.
 *
 * Server saja: state-nya ikut payload Pinia, jadi browser tidak memanggil `/auth/me` lagi
 * saat hidrasi. Tamu undangan tidak membawa cookie sesi sama sekali — mereka ditandai
 * keluar tanpa satu pun round trip ke API.
 */
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  if (auth.loaded) return
  if (!sessionCookie.test(useRequestHeaders(['cookie']).cookie ?? '')) return auth.markSignedOut()
  await auth.load()
})
