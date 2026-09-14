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
