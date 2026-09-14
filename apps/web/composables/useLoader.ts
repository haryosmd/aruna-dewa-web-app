import type { ApiError } from '@aruna/contracts/api'

/**
 * Kerangka pemuatan, sekali tulis.
 *
 * Empat halaman dasbor menyalin `load()` yang sama persis — `pending = true`, kosongkan
 * error, `try`, `catch (cause) { error = (cause as { message: string }).message }`,
 * `finally { pending = false }` — dan potongan `as { message: string }` itu sendiri muncul
 * 26 kali di seluruh web. Yang dipertaruhkan bukan kerapian: tiap salinan adalah satu
 * kesempatan lagi untuk lupa mengosongkan error lama atau lupa menurunkan pending.
 */

export function apiErrorMessage(cause: unknown): string {
  const error = cause as Partial<ApiError> | undefined
  return error?.message || 'Tidak dapat menghubungi layanan. Coba lagi.'
}

export interface Loader {
  pending: Ref<boolean>
  error: Ref<string>
  /** Menjalankan satu tugas; `undefined` berarti gagal, dan sebabnya sudah ada di `error`. */
  run: <T>(task: () => Promise<T>) => Promise<T | undefined>
}

export function useLoader(initialPending = false): Loader {
  const pending = ref(initialPending)
  const error = ref('')

  async function run<T>(task: () => Promise<T>): Promise<T | undefined> {
    pending.value = true
    error.value = ''
    try {
      return await task()
    } catch (cause) {
      error.value = apiErrorMessage(cause)
      return undefined
    } finally {
      pending.value = false
    }
  }

  return { pending, error, run }
}
