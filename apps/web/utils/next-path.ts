/**
 * Tujuan setelah login hanya boleh berupa path internal. Menolak URL absolut,
 * protocol-relative (`//host`, dan `/\host` yang dinormalkan browser menjadi hal yang
 * sama) serta karakter kontrol menutup celah open-redirect lewat `?next=`.
 *
 * Aturannya sengaja kembar dengan `safeWebPath` di `apps/api`: nilai yang sama melewati
 * kedua sisi pada jalur Google, dan ambang yang berbeda akan membuat salah satunya menjadi
 * penjaga yang percuma.
 */
const maximumLength = 512
const controlCharacters = /[\u0000-\u001F\u007F]/u

export function safeNextPath(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (controlCharacters.test(value)) return fallback
  return value
}
