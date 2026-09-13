import type { ApiError } from '~/types/aruna'

let browserRefreshFlight: Promise<void> | undefined

export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = import.meta.server ? config.apiBase : config.public.apiBase
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const refresh = async () => {
    if (import.meta.server) throw new Error('Sesi perlu diperbarui di browser.')
    browserRefreshFlight ??= $fetch('/auth/refresh', { baseURL, method: 'POST', credentials: 'include' }).then(() => undefined).finally(() => { browserRefreshFlight = undefined })
    return browserRefreshFlight
  }
  const request = async <T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) => {
    try {
      return await $fetch<T>(path, { baseURL, credentials: 'include', headers: requestHeaders, ...options })
    } catch (cause: unknown) {
      const error = cause as { data?: ApiError; message?: string }
      const status = (cause as { status?: number; response?: { status?: number } }).status ?? (cause as { response?: { status?: number } }).response?.status
      if (status === 401 && !path.startsWith('/auth/') && import.meta.client) {
        try {
          await refresh()
          return await $fetch<T>(path, { baseURL, credentials: 'include', headers: requestHeaders, ...options })
        } catch { /* Surface the original authorization error below. */ }
      }
      throw { message: error.data?.message ?? error.message ?? 'Tidak dapat menghubungi layanan. Coba lagi.', ...error.data } satisfies ApiError
    }
  }
  return { request }
}
