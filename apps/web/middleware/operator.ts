/**
 * Pintu backoffice (fase 78).
 *
 * Dipasang **setelah** `auth`, jadi yang sampai ke sini sudah punya sesi; yang tersisa satu
 * pertanyaan saja. Repo ini belum pernah punya middleware peran — `auth.ts` cuma bertanya
 * "sudah masuk atau belum" — dan `isOperator` di store adalah satu-satunya pembacanya.
 *
 * Jawabannya **404, bukan 403**. Ketiganya sama-sama menolak, tapi 403 mengumumkan bahwa
 * halamannya ada: pengguna biasa yang mengetik `/bo` tidak perlu tahu ada backoffice di
 * belakang sana, dan penjaga sesungguhnya toh ada di API (`assertOperator`), bukan di sini.
 * Middleware ini hanya menjaga orang dari mendarat di tabel kosong berisi galat.
 */
export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()
  await auth.loadOnce()
  if (auth.isOperator) return
  return abortNavigation(createError({ statusCode: 404, statusMessage: 'Halaman tidak ditemukan' }))
})
