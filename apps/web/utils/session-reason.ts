/**
 * Kode akhir sesi dari API diterjemahkan jadi kalimat. Tanpa ini, sesi yang berakhir karena
 * masuk di perangkat lain tidak bisa dibedakan dari sesi yang sekadar kedaluwarsa — dan
 * orangnya mendarat di form login tanpa satu pun petunjuk kenapa ia ada di sana.
 */
const messages: Record<string, string> = {
  SESSION_REPLACED: 'Sesi berakhir karena akun ini dipakai masuk di perangkat lain.',
  SESSION_REUSE: 'Sesi dihentikan demi keamanan. Masuk lagi untuk melanjutkan.',
  SESSION_EXPIRED: 'Sesi sudah berakhir. Masuk lagi untuk melanjutkan.',
  SESSION_INVALID: 'Sesi sudah berakhir. Masuk lagi untuk melanjutkan.',
}

/** Kode yang boleh ditulis ke URL; apa pun di luar daftar ini diabaikan. */
export function sessionEndedReason(code: unknown): string | null {
  return typeof code === 'string' && code in messages ? code : null
}

export function sessionEndedMessage(code: unknown): string | null {
  const reason = sessionEndedReason(code)
  return reason ? messages[reason]! : null
}

/**
 * Kalimat untuk satu kegagalan yang bentuknya khas: `POST /auth/login` menjawab 200, lalu
 * `/auth/me` tetap tidak melihat siapa pun.
 *
 * Sebelumnya semua kasus ini dijawab satu kalimat yang menuduh cookie diblokir. Tuduhan itu
 * benar paling banter sepertiga waktu: kegagalan yang sama muncul saat browser masih memegang
 * cookie sesi warisan yang sudah tidak berlaku (`common/legacy-session-cookie.middleware.ts` di
 * API mengusirnya, dan sekali muat ulang sudah cukup), dan muncul lagi saat `/auth/me` sekadar
 * gagal dihubungi — `stores/auth.ts` menelan galat apa pun jadi `me = null`.
 */
export function sessionNotStoredMessage(endedCode: unknown, cookiesEnabled: boolean): string {
  if (!cookiesEnabled) return 'Login berhasil, tapi browser ini memblokir cookie, jadi sesinya tidak bisa disimpan. Izinkan cookie untuk situs ini lalu coba lagi.'
  if (sessionEndedReason(endedCode)) return 'Login berhasil, tapi browser ini masih memegang sesi lama yang sudah tidak berlaku. Muat ulang halaman ini, lalu coba lagi.'
  return 'Login berhasil, tapi sesinya belum bisa dipastikan. Coba lagi sebentar lagi.'
}

/**
 * Sebab berakhirnya sebuah sesi, dari enum `SessionRevokeReason` di basis data.
 *
 * Terpisah dari peta di atas dan memang harus terpisah: yang di atas memetakan kode `SESSION_*`
 * yang dibawa 401 kepada orang yang **baru saja** tertendang, dan kalimatnya berbunyi seperti
 * instruksi ("masuk lagi untuk melanjutkan"). Yang di sini dibaca di halaman akun, tentang sesi
 * yang sudah lama selesai, dan di sana instruksi itu tidak masuk akal.
 */
const endLabels: Record<string, string> = {
  LOGOUT: 'Keluar sendiri',
  REPLACED: 'Digantikan perangkat lain',
  REUSE_DETECTED: 'Dihentikan demi keamanan',
  PASSWORD_RESET: 'Kata sandi diganti',
  ACCOUNT_RECLAIMED: 'Akun didaftarkan ulang',
}

export function sessionEndLabel(reason: unknown): string {
  return (typeof reason === 'string' && endLabels[reason]) || 'Berakhir'
}
