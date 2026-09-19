/**
 * Mode demo lokal (fase 63): keputusan murni kapan server boleh masuk otomatis sebagai akun demo.
 *
 * Tidak ada DOM, tidak ada Nuxt — supaya keempat gerbangnya bisa diuji tanpa merender halaman.
 * Yang dijaga di sini bukan kenyamanan, melainkan batasnya: sakelar ini tidak boleh pernah
 * menyala di build produksi, di host non-loopback, di halaman tamu, atau pada permintaan yang
 * bukan navigasi dokumen.
 */

/**
 * Kredensial tetap dan hanya-lokal. Kata sandinya sengaja pendek dan bisa diketik (fase 64):
 * auto-login SSR tidak pernah memintanya, tapi pemiliknya butuh saat jendela privat, browser
 * kedua, atau sesi yang baru diusir suite e2e. Nilainya harus sama dengan `apps/api/src/cli/demo.ts`.
 */
export const demoCredentials = { email: 'demo@aruna.local', password: 'arunademo123' } as const

/** Ejaan loopback yang menunjuk mesin yang sama — sama dengan `utils/api-origin.ts`. */
export const loopbackHosts = ['127.0.0.1', 'localhost', '[::1]'] as const

/** Jalur yang memang butuh akun. `/`, `/login`, `/register`, dan `/i/*` sengaja tidak ada. */
const allowedPrefixes = ['/dashboard', '/order', '/account'] as const

export function demoPathAllowed(pathname: string): boolean {
  return allowedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`))
}

export interface DemoLoginInput {
  /** `NUXT_DEV_DEMO === '1'`. */
  enabled: boolean
  /** `import.meta.dev` — build produksi tidak pernah `true`. */
  dev: boolean
  hostname: string | undefined
  pathname: string
  hasSessionCookie: boolean
  /** `sec-fetch-dest: document` — bukan `_payload.json`, bukan prefetch. */
  isDocument: boolean
}

export function shouldDemoLogin(input: DemoLoginInput): boolean {
  if (!input.enabled || !input.dev) return false
  if (!input.hostname || !(loopbackHosts as readonly string[]).includes(input.hostname)) return false
  if (input.hasSessionCookie || !input.isDocument) return false
  return demoPathAllowed(input.pathname)
}

/**
 * Pendingin sesudah login demo gagal.
 *
 * Rate limit login API memaafkan percobaan yang **berhasil** saja. Tanpa pendingin, dasbor yang
 * di-refresh berulang saat API mati atau akun belum di-provision membakar 10 jatah per lima
 * menit — dan ikut membakar jatah per-IP yang dipakai login manual pemiliknya.
 */
export class DemoCooldown {
  private notBefore = 0
  constructor(private readonly now: () => number = () => Date.now()) {}
  get active(): boolean { return this.now() < this.notBefore }
  arm(ms = 60_000): void { this.notBefore = this.now() + ms }
}
