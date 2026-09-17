/**
 * Sebab gagalnya callback Google, dalam bentuk yang boleh ditulis ke URL.
 *
 * Callback bukan endpoint XHR: yang menerimanya adalah orang yang sedang berpindah halaman dari
 * `accounts.google.com`. Sebelum ini, kesebelas cabang gagalnya merambat ke `ApiExceptionFilter`
 * dan mendarat sebagai JSON mentah di `api.arunadewa.id` — termasuk cabang yang paling sering
 * dan paling tidak salah: pengunjung yang menekan "Batal" di layar consent.
 *
 * Kodenya dibawa oleh exception-nya sendiri, bukan disimpulkan dari kalimat pesannya. Pencocokan
 * kalimat akan berumur pendek: kalimatnya ditulis untuk manusia dan akan diperbaiki suatu hari,
 * dan saat itu terjadi pemetaan ini gagal tanpa satu pun tes berubah warna. Polanya sama dengan
 * `NO_PASSWORD_SET` di `auth.service.ts`.
 */

export const googleFailureCodes = [
  /** Pengunjung membatalkan di layar consent, atau kembali tanpa `code`. Bukan galat. */
  'GOOGLE_CANCELLED',
  /** State tidak cocok, sudah terpakai, atau lewat 10 menit — tab yang ditinggal terlalu lama. */
  'GOOGLE_EXPIRED',
  /** Kredensial OAuth belum terpasang di server ini. */
  'GOOGLE_UNCONFIGURED',
  /** Google menolak penukaran kode atau tidak mengakui profilnya. */
  'GOOGLE_REJECTED',
  /** Akun Google-nya sendiri belum memverifikasi alamat emailnya. */
  'GOOGLE_EMAIL_UNVERIFIED',
  /** Sisanya: kegagalan basis data, balapan penautan identitas, apa pun yang tak terduga. */
  'GOOGLE_FAILED',
] as const;

export type GoogleFailureCode = (typeof googleFailureCodes)[number];

/** Bentuk minimal `HttpException` yang dipakai di sini; sengaja tanpa ketergantungan ke Nest. */
type CodedFailure = { getResponse?: () => unknown };

function codeOf(body: unknown): GoogleFailureCode | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const code = (body as { code?: unknown }).code;
  return googleFailureCodes.find((known) => known === code);
}

/**
 * Kode untuk sebuah kegagalan, dengan `GOOGLE_FAILED` sebagai jawaban terakhir. Apa pun yang
 * tidak membawa kode dikenal **tidak** boleh menjadi kode karangan: yang dikirim ke URL hanya
 * nilai dari daftar di atas.
 */
export function googleFailureCode(cause: unknown): GoogleFailureCode {
  const body = (cause as CodedFailure | null)?.getResponse?.();
  return codeOf(body) ?? 'GOOGLE_FAILED';
}
