/**
 * Sebab gagalnya login Google, dari `?error=` yang dipasang callback API.
 *
 * Terpisah dari peta `SESSION_*` di `session-reason.ts`, dengan alasan yang sama seperti kenapa
 * peta di berkas itu sendiri ada dua: yang ini bicara kepada orang yang **belum** masuk dan baru
 * saja kembali dari Google, jadi kalimatnya harus menyebutkan jalan keluar yang masih terbuka —
 * form di bawahnya. Menyatukan keduanya berarti salah satu konteks kehilangan kalimatnya.
 *
 * Kode di luar daftar ini diabaikan: `?error=` datang lewat URL, dan URL bisa ditulis siapa saja.
 */
const messages: Record<string, string> = {
  GOOGLE_CANCELLED: 'Login dengan Google dibatalkan. Coba lagi, atau masuk dengan email dan kata sandi.',
  GOOGLE_EXPIRED: 'Percobaan masuk lewat Google sudah kedaluwarsa. Tekan tombolnya sekali lagi.',
  GOOGLE_UNCONFIGURED: 'Login Google sedang tidak tersedia. Masuk dengan email dan kata sandi untuk sementara.',
  GOOGLE_REJECTED: 'Google tidak dapat memastikan akun itu. Coba lagi, atau masuk dengan email dan kata sandi.',
  GOOGLE_EMAIL_UNVERIFIED: 'Akun Google itu belum memverifikasi alamat emailnya, jadi ia belum bisa dipakai masuk.',
  GOOGLE_FAILED: 'Login dengan Google gagal. Coba lagi, atau masuk dengan email dan kata sandi.',
}

export function googleErrorMessage(code: unknown): string | null {
  return (typeof code === 'string' && messages[code]) || null
}
