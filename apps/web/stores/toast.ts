/*
 * Diimpor eksplisit, bukan mengandalkan auto-import Nuxt: aturan antrean dan pewaktu di bawah
 * dikunci tes unit, dan tes itu berjalan di vitest polos tanpa runtime Nuxt — persis alasan
 * yang sama yang sudah ditulis di `stores/popup.ts`.
 */
import { shallowRef } from 'vue'
import { defineStore } from 'pinia'

/**
 * Satu antrean toast untuk seluruh aplikasi.
 *
 * Sebelum fase 60 ini milik `vue-sonner`. Yang membuatnya pindah bukan tampilannya melainkan
 * markup-nya: pustaka itu merender wadahnya sebagai `<ol>` dan tiap toast sebagai
 * `<li role="status">`, dan `role` itu menimpa peran `listitem` bawaan `<li>` — sebuah daftar
 * yang anak langsungnya bukan listitem, `serious` di `list`/`only-listitems`. Tidak ada satu pun
 * prop yang bisa mengganti elemen atau perannya, jadi yang tersisa adalah memiliki markup-nya
 * sendiri. Alasan lengkapnya di `docs/ROADMAP.md` fase 60.
 *
 * Store-nya hanya memegang antrean dan pewaktunya. Yang merender ada di `AtomicToaster`, dan yang
 * dipakai halaman ada di composable `useToast()` — halaman tidak pernah menyentuh store ini
 * langsung.
 */

/** Empat nada yang benar-benar dipakai repo. Sengaja tidak lebih. */
export type ToastTone = 'success' | 'error' | 'warning' | 'message'

export interface ToastOptions {
  /** Baris kedua yang lebih kecil di bawah judul. */
  description?: string
  /** Milidetik sampai ia pergi sendiri. `0` berarti menetap sampai `dismiss()`. */
  duration?: number
}

export interface ToastEntry extends ToastOptions {
  key: number
  tone: ToastTone
  title: string
}

/** Sama dengan bawaan `vue-sonner` yang digantikan, supaya ritme yang sudah dikenal tidak berubah. */
const DURASI_BAWAAN = 4000

/**
 * Tiga sekaligus, sama seperti `visibleToasts` bawaan pustaka yang digantikan.
 *
 * Yang dibuang adalah yang **paling tua**, dan pewaktunya ikut dibatalkan. Ini kebersihan, bukan
 * perbaikan cacat: `key` unik, jadi timer yatim yang tetap menyala hanya akan memanggil
 * `dismiss()` untuk kunci yang sudah tidak ada dan tidak menyentuh toast lain. Yang dihemat
 * adalah timer beserta closure-nya, sampai empat detik lebih awal.
 */
const BATAS_TAMPIL = 3

export const useToastStore = defineStore('toast', () => {
  /*
   * `shallowRef` + penggantian array, bukan `ref` + `push`: isinya data mati yang tidak pernah
   * disunting di tempat, jadi proxy reaktif per-anggota tidak membeli apa pun.
   */
  const entries = shallowRef<ToastEntry[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  let counter = 0

  function batalkanPewaktu(key: number) {
    const timer = timers.get(key)
    if (timer === undefined) return
    clearTimeout(timer)
    timers.delete(key)
  }

  /** Menerbitkan toast. Mengembalikan `key`-nya supaya pemanggil bisa menutupnya lebih awal. */
  function show(tone: ToastTone, title: string, options: ToastOptions = {}): number {
    counter += 1
    const key = counter

    const next: ToastEntry[] = [{ ...options, key, tone, title }, ...entries.value]
    for (const dibuang of next.slice(BATAS_TAMPIL)) batalkanPewaktu(dibuang.key)
    entries.value = next.slice(0, BATAS_TAMPIL)

    /*
     * Pewaktunya hanya di klien. Toast lahir dari penanganan event, jadi ini tidak pernah terjadi
     * saat render server — tapi `setTimeout` yang tertinggal di sana menahan respons Nitro selama
     * durasinya, dan itu kegagalan yang sunyi.
     *
     * `typeof window`, bukan `import.meta.client`: yang kedua hanya ada setelah Nuxt menggantinya
     * saat build, jadi di vitest polos ia `undefined` dan seluruh cabang ini tidak pernah bisa
     * diuji. Yang pertama benar di ketiga tempat — klien, SSR, dan tes.
     */
    const duration = options.duration ?? DURASI_BAWAAN
    if (typeof window !== 'undefined' && duration > 0) {
      timers.set(key, setTimeout(() => dismiss(key), duration))
    }

    return key
  }

  /** Menutup satu toast. Aman dipanggil dua kali, dan aman untuk `key` yang sudah pergi. */
  function dismiss(key: number) {
    batalkanPewaktu(key)
    entries.value = entries.value.filter(entry => entry.key !== key)
  }

  return { entries, show, dismiss }
})
