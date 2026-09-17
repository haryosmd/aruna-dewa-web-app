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
