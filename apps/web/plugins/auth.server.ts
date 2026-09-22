import { DemoCooldown, demoCredentials, shouldDemoLogin } from '~/utils/demo-login'

/**
 * Cookie sesi yang diterbitkan `apps/api`; keduanya cukup untuk menduga ada sesi.
 *
 * Yang dibaca di sini adalah cookie yang sampai ke host **web**, bukan ke host API. Selama cookie
 * sesi terbit host-only di `api.arunadewa.id`, pemeriksaan ini selalu gagal di produksi dan tiap
 * navigasi penuh berakhir di `/login` walau sesinya hidup. `COOKIE_DOMAIN` di sisi API yang
 * membuatnya terlihat dari sini — lihat `apps/api/src/common/cookie-domain.ts`.
 */
const sessionCookie = /(?:^|;\s*)aruna_(?:access|refresh)=/

/** Satu per proses dev: kegagalan login demo tidak diulang tiap refresh. */
const demoCooldown = new DemoCooldown()

/**
 * Siapa yang sedang masuk perlu diketahui di **setiap** halaman, bukan hanya di balik
 * middleware `auth`. Tanpa ini header landing menulis "Masuk" walau sesinya hidup, karena
 * tidak ada satu pun yang memanggil store di halaman publik.
 *
 * Server saja: state-nya ikut payload Pinia, jadi browser tidak memanggil `/auth/me` lagi
 * saat hidrasi. Tamu undangan tidak membawa cookie sesi sama sekali — mereka ditandai
 * keluar tanpa satu pun round trip ke API.
 */
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  if (auth.loaded) return
  const headers = useRequestHeaders(['cookie', 'sec-fetch-dest'])
  const hasSessionCookie = sessionCookie.test(headers.cookie ?? '')
  const demoMode = useState('demoMode', () => false)
  if (!hasSessionCookie) {
    if (await demoLogin(headers['sec-fetch-dest'])) await auth.load()
    else auth.markSignedOut()
  } else {
    await auth.load()
    /*
     * Cookie ada tapi ditolak — sesi yang sudah dicabut, misalnya karena suite e2e barusan masuk
     * sebagai akun yang sama. Di mode demo itu bukan alasan memantulkan pemilik ke `/login`:
     * masuk ulang saja. Di luar mode demo cabang ini tidak pernah jalan.
     */
    if (!auth.me && await demoLogin(headers['sec-fetch-dest'])) await auth.load()
  }
  // Lencana mengikuti siapa yang sedang masuk, bukan render mana yang kebetulan melakukan login:
  // kunjungan kedua memakai cookie yang sudah ada dan tidak pernah lewat `demoLogin()`.
  const config = useRuntimeConfig()
  demoMode.value = import.meta.dev && config.demoLogin === '1' && auth.me?.user.email === (config.demoEmail || demoCredentials.email)
})

/**
 * Mode demo lokal (fase 63): masuk sebagai akun demo dari SSR, tanpa form.
 *
 * Bukan backdoor. Ini `POST /auth/login` sungguhan dengan baris `Session` asli; yang berbeda
 * hanya siapa yang mengetik kata sandinya. `Set-Cookie` dari API diteruskan ke browser persis
 * seperti `serverRefresh()` di `useApi.ts`, dan `arunaCookie` diisi supaya `/auth/me` di render
 * yang sama sudah memakai sesi baru. Keempat gerbangnya ada di `utils/demo-login.ts`.
 */
async function demoLogin(fetchDest: string | undefined): Promise<boolean> {
  // Semua composable dipanggil SEBELUM `await`: sesudah fetch selesai, instance Nuxt sudah lepas
  // dari konteks async dan `useState()`/`useRuntimeConfig()` melempar "called outside of a
  // plugin" — yang tertangkap sebagai "login gagal" padahal cookienya sudah diteruskan ke browser.
  const config = useRuntimeConfig()
  const url = useRequestURL()
  const enabled = shouldDemoLogin({
    enabled: config.demoLogin === '1',
    dev: import.meta.dev,
    hostname: url.hostname,
    pathname: url.pathname,
    // Cookie yang ada sudah terbukti ditolak atau memang tidak ada — keduanya berarti tidak ada
    // sesi hidup yang bisa ditimpa.
    hasSessionCookie: false,
    isDocument: fetchDest === 'document',
  })
  if (!enabled || demoCooldown.active) return false

  const event = useRequestEvent()
  if (!event) return false
  const body = { email: config.demoEmail || demoCredentials.email, password: config.demoPassword || demoCredentials.password }
  try {
    // `OriginGuard` di API menolak POST tanpa `Origin`; render server tidak mengisinya sendiri.
    const response = await $fetch.raw('/auth/login', { baseURL: config.apiBase, method: 'POST', headers: { origin: config.public.webBase }, body })
    const issued = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
    if (!issued.length) throw new Error('API tidak menerbitkan cookie sesi.')
    for (const setCookie of issued) event.node.res.appendHeader('set-cookie', setCookie)
    event.context.arunaCookie = mergeCookieHeader(undefined, issued)
    return true
  } catch (cause) {
    demoCooldown.arm()
    const message = (cause as { data?: { message?: string }; message?: string }).data?.message ?? (cause as { message?: string }).message ?? String(cause)
    console.warn(`[demo] Masuk otomatis sebagai ${body.email} gagal: ${message}. Jalankan \`pnpm demo:local\` dan pastikan API hidup. Tidak dicoba lagi selama 60 detik.`)
    return false
  }
}
