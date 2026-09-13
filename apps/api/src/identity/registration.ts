/**
 * Apa yang harus terjadi ketika sebuah email didaftarkan.
 *
 * Sebelumnya pendaftaran selalu membuat baris user lebih dulu dan baru mengirim email
 * verifikasi. Ketika SMTP mati, barisnya tetap tertinggal — percobaan berikutnya dijawab
 * "Email sudah terdaftar" padahal pemiliknya tidak pernah menerima apa pun dan tidak punya
 * jalan keluar. Modul ini memisahkan keputusannya dari Prisma supaya ketiga cabangnya bisa
 * diuji tanpa basis data.
 */

export interface ExistingAccount {
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
}

export type RegistrationDecision =
  /** Email belum dikenal: buat akun, lalu kirim verifikasi. */
  | { kind: 'create' }
  /** Akun email/password yang tak pernah terverifikasi: setel ulang dan kirim ulang verifikasi. */
  | { kind: 'reclaim' }
  /** Sudah terverifikasi, atau sudah terikat ke Google: pendaftar harus masuk, bukan mendaftar. */
  | { kind: 'conflict'; message: string };

export function decideRegistration(existing: ExistingAccount | null): RegistrationDecision {
  if (!existing) return { kind: 'create' };
  if (existing.emailVerifiedAt) return { kind: 'conflict', message: 'Email sudah terdaftar' };
  // Tanpa password hash, satu-satunya cara masuk ke akun ini adalah lewat penyedia luar.
  // Membiarkan siapa pun menyetel password di atasnya berarti membajaknya lewat form daftar.
  if (!existing.passwordHash) return { kind: 'conflict', message: 'Email ini terhubung ke akun Google. Masuk dengan tombol Google.' };
  return { kind: 'reclaim' };
}
