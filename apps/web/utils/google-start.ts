/**
 * Tautan tombol "Lanjutkan dengan Google".
 *
 * Dua hal yang mudah terlewat, dan keduanya pernah terlewat di sini:
 *
 * `GoogleController` di API TIDAK berprefix `/v1` seperti controller lain — callback-nya harus
 * cocok dengan satu alamat tetap yang terdaftar di Google Console, jadi `/v1` dibuang lagi dari
 * base API.
 *
 * Host API mengikuti ejaan loopback halaman (`api-origin.ts`). Tombol ini sempat menjadi
 * satu-satunya jalur yang melewatkan penyesuaian itu: halaman di `http://localhost:3000`
 * mengirim orang ke `http://127.0.0.1:3001`, cookie sesinya terbit di host yang tidak pernah
 * dibaca halaman, dan orangnya kembali ke `/login` tanpa satu pun pesan galat — gejala yang
 * persis sama dengan bug produksi yang diperbaiki `COOKIE_DOMAIN` di sisi API.
 */

// Impor eksplisit, walau Nuxt bisa menyuntikkannya sendiri: tanpa ini berkas ini tidak bisa diuji
// di luar konteks Nuxt, dan aturannya justru yang paling pantas diuji.
import { apiBaseForPage } from './api-origin'

export function googleStartHref(configuredApiBase: string, pageHost: string | undefined, next: string): string {
  const origin = apiBaseForPage(configuredApiBase, pageHost).replace(/\/v1$/, '')
  return `${origin}/auth/google/start?next=${encodeURIComponent(next)}`
}
