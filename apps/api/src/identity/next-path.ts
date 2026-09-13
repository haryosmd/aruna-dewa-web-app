/**
 * Tujuan setelah login Google hanya boleh berupa path di dalam aplikasi web sendiri.
 *
 * Nilainya berjalan bolak-balik lewat browser sebelum akhirnya menjadi header `Location`,
 * jadi ia diperlakukan sebagai masukan tak tepercaya di kedua ujungnya: absolut, protocol
 * relative (`//host`, dan `/\host` yang dinormalkan browser menjadi hal yang sama), serta
 * karakter kontrol yang bisa memotong header semuanya ditolak, bukan dibersihkan.
 */
const maximumLength = 512;
const controlCharacters = /[\u0000-\u001F\u007F]/u;

export function safeWebPath(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (controlCharacters.test(value)) return fallback;
  return value;
}
