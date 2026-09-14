import type { ApiError } from '@aruna/contracts/api'

let browserRefreshFlight: Promise<void> | undefined

/**
 * Endpoint yang tidak boleh memicu perpanjangan sesi otomatis: `/auth/refresh` karena akan
 * memanggil dirinya sendiri, sisanya karena 401-nya berarti kredensial salah — bukan sesi
 * kedaluwarsa. `/auth/me` sengaja tidak ada di sini: cookie akses hidup 15 menit sementara
 * sesinya berhari-hari, jadi memblokirnya berarti mengeluarkan orang setiap seperempat jam.
 */
const credentialPaths = new Set([
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
])

export function useApi() {
  const config = useRuntimeConfig()
  // Ditangkap saat setup, selagi konteksnya masih ada: penanganan sesi berakhir terjadi di
  // dalam `catch` setelah beberapa `await`, saat `useAuthStore()` sudah tidak bisa dipanggil
  // begitu saja. `runWithContext` yang mengembalikannya.
  const nuxtApp = useNuxtApp()
  // Di browser, host API mengikuti ejaan loopback yang sedang dibuka — kalau tidak, cookie
  // sesinya lintas-situs dan hilang tanpa suara. Lihat `utils/api-origin.ts`.
  const baseURL = import.meta.server ? config.apiBase : apiBaseForPage(config.public.apiBase, window.location.hostname)
  const event = import.meta.server ? useRequestEvent() : undefined
  const incomingCookie = import.meta.server ? useRequestHeaders(['cookie']).cookie : undefined

  /** Cookie untuk request berikutnya: hasil perpanjangan dalam render ini menang atas bawaan browser. */
  const cookieHeader = (): string | undefined => (event?.context.arunaCookie as string | undefined) ?? incomingCookie
  const requestHeaders = (): Record<string, string> | undefined => {
    if (!import.meta.server) return undefined
    const cookie = cookieHeader()
    return cookie ? { cookie } : undefined
  }

  const browserRefresh = async () => {
    browserRefreshFlight ??= $fetch('/auth/refresh', { baseURL, method: 'POST', credentials: 'include' }).then(() => undefined).finally(() => { browserRefreshFlight = undefined })
    return browserRefreshFlight
  }

  /**
   * Perpanjangan sesi di sisi server. Cookie yang baru diterbitkan harus dipakai dua kali:
   * untuk mengulang request ini, **dan** diteruskan ke browser lewat header respons. Tanpa
   * penerusan itu halaman memang berhasil dirender, tapi browser masih memegang cookie lama
   * dan klik berikutnya jatuh lagi ke `/login` — persis gejala "ditinggal lalu di-reload".
   *
   * Satu render tetap hanya memperpanjang sekali. API sekarang punya jendela tenggang, jadi
   * penyegaran kembar tidak lagi berakhir sebagai tuduhan pencurian — tapi kuota tenggangnya
   * terbatas, dan membakarnya untuk satu render yang sama tetap pemborosan.
   */
  const serverRefresh = async () => {
    if (!event) throw new Error('Sesi perlu diperbarui di browser.')
    const flight = (event.context.arunaRefreshFlight as Promise<void> | undefined) ?? (async () => {
      const cookie = cookieHeader()
      // `OriginGuard` di API menolak POST tanpa `Origin`; browser mengisinya sendiri, render
      // server tidak. Yang dikirim adalah origin kanonik web ini — memang dari aplikasi ini.
      const headers = { origin: config.public.webBase, ...(cookie ? { cookie } : {}) }
      const response = await $fetch.raw('/auth/refresh', { baseURL, method: 'POST', headers })
      const issued = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
      if (!issued.length) throw new Error('Sesi tidak diperbarui.')
      for (const setCookie of issued) event.node.res.appendHeader('set-cookie', setCookie)
      event.context.arunaCookie = mergeCookieHeader(cookie, issued)
    })()
    event.context.arunaRefreshFlight = flight
    return flight
  }

  /**
   * Bersihkan sesi lalu antar orangnya ke `/login` dengan sebabnya. Di server cukup ditandai:
   * `middleware/auth` yang mengalihkan, dan ia sudah ikut membawa `reason` dari store.
   */
  const endSession = async (cause: unknown) => {
    const status = (cause as { status?: number; response?: { status?: number } })?.status ?? (cause as { response?: { status?: number } })?.response?.status
    if (status !== 401) return
    const code = (cause as { data?: ApiError })?.data?.code
    await nuxtApp.runWithContext(async () => {
      const auth = useAuthStore()
      const wasSignedIn = Boolean(auth.me)
      auth.endSession(code)
      // Tamu undangan yang kena 401 di endpoint publik tidak pernah punya sesi untuk hilang,
      // dan halaman login tidak boleh mengalihkan ke dirinya sendiri.
      if (!wasSignedIn || import.meta.server) return
      const route = useRoute()
      if (route.path === '/login') return
      const reason = auth.endedCode ? `&reason=${auth.endedCode}` : ''
      await navigateTo(`/login?next=${encodeURIComponent(route.fullPath)}${reason}`)
    })
  }

  const request = async <T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) => {
    try {
      return await $fetch<T>(path, { baseURL, credentials: 'include', headers: requestHeaders(), ...options })
    } catch (cause: unknown) {
      const error = cause as { data?: ApiError; message?: string }
      const status = (cause as { status?: number; response?: { status?: number } }).status ?? (cause as { response?: { status?: number } }).response?.status
      if (status === 401 && !credentialPaths.has(path)) {
        try {
          await (import.meta.server ? serverRefresh() : browserRefresh())
          return await $fetch<T>(path, { baseURL, credentials: 'include', headers: requestHeaders(), ...options })
        } catch (refreshFailure) {
          // Penyegaran sendiri yang ditolak berarti sesinya memang sudah habis — bukan satu
          // endpoint yang kebetulan membalas 401.
          await endSession(refreshFailure)
        }
      }
      throw { message: error.data?.message ?? error.message ?? 'Tidak dapat menghubungi layanan. Coba lagi.', ...error.data } satisfies ApiError
    }
  }
  return { request }
}
