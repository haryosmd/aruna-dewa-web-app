import type { ToastOptions } from '~/stores/toast'

/**
 * Satu-satunya permukaan toast yang dipakai halaman.
 *
 * Bentuknya sengaja menyerupai `toast.*` milik `vue-sonner` yang digantikan di fase 60, sampai ke
 * urutan argumennya, supaya perpindahannya tidak menyentuh satu pun kalimat yang ditampilkan ke
 * pasangan — yang berubah hanya dari mana `toast` berasal.
 *
 * ```ts
 * const toast = useToast()
 * toast.success('Draft tersimpan.')
 * toast.error(url, { description: 'Salin tautan ini secara manual.', duration: 10000 })
 * ```
 */
export function useToast() {
  const store = useToastStore()

  return {
    /** Sesuatu berhasil, dan pasangan tidak perlu melakukan apa pun. */
    success: (title: string, options?: ToastOptions) => store.show('success', title, options),
    /** Sesuatu gagal. Pemanggil yang menentukan apakah ada jalan keluarnya di `description`. */
    error: (title: string, options?: ToastOptions) => store.show('error', title, options),
    /** Berhasil, tapi hasilnya tidak seperti yang diminta. */
    warning: (title: string, options?: ToastOptions) => store.show('warning', title, options),
    /** Kabar netral: bukan keberhasilan, bukan kegagalan. */
    message: (title: string, options?: ToastOptions) => store.show('message', title, options),
    /** Menutup lebih awal toast yang `key`-nya dikembalikan salah satu fungsi di atas. */
    dismiss: (key: number) => store.dismiss(key),
  }
}
