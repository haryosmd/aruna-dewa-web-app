/*
 * Diimpor eksplisit, bukan mengandalkan auto-import Nuxt seperti `stores/auth.ts`: aturan
 * antrean di bawah dikunci tes unit, dan tes itu berjalan di vitest polos tanpa runtime Nuxt.
 */
import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'

/**
 * Satu popup untuk seluruh aplikasi.
 *
 * Sebelum ini pertanyaan yang tidak boleh dilewatkan dijawab `window.confirm` — kotak abu-abu
 * milik sistem operasi yang tidak mengenal satu pun token kita, tidak bisa menaruh tiga pilihan,
 * dan tidak bisa membedakan "tinggalkan halaman" dari "buang perubahan". Yang dibutuhkan editor
 * bukan konfirmasi ya/tidak melainkan tiga jalan keluar, jadi bentuknya di sini adalah daftar
 * aksi, bukan boolean.
 *
 * Store-nya sengaja hanya memegang antrean dan jawabannya. Yang merender ada di `AtomicPopup`,
 * dan yang dipakai halaman ada di composable `usePopup()` — halaman tidak pernah menyentuh
 * store ini langsung.
 */
/**
 * Sengaja ditulis ulang, bukan diimpor: `UiButton` mendefinisikannya lewat `cva` di dalam
 * `<script setup>`, yang tidak bisa mengekspor tipe. Penyimpangan tetap tertangkap — nilainya
 * diteruskan apa adanya ke `UiButton` di `AtomicPopup`, jadi anggota yang tidak dikenalnya
 * menjadi galat vue-tsc di sana.
 */
type ButtonTone = 'primary' | 'ink' | 'outline' | 'ghost' | 'quiet' | 'gold'

export interface PopupAction {
  /** Nilai yang diterima pemanggil saat tombolnya ditekan. */
  id: string
  label: string
  tone?: ButtonTone
}

export interface PopupRequest {
  title: string
  description?: string
  /** `danger` mewarnai judulnya; dipakai untuk tindakan yang membuang pekerjaan. */
  tone?: 'default' | 'danger'
  /** Urutan di layar = urutan di sini. Yang pertama mendapat fokus awal. */
  actions: PopupAction[]
  /** Jawaban untuk Escape, klik overlay, dan tombol tutup. Bawaannya `'dismiss'`. */
  dismissId?: string
}

/**
 * `key` ada supaya menjawab bersifat idempoten.
 *
 * Escape ditangani dua kali — oleh `DialogContent` reka-ui dan oleh `onKeyStroke` di
 * `AtomicPopup` — dan tanpa penanda ini, penekanan yang sama akan membuang popup berikutnya
 * di antrean sekalian. Dengan `key`, panggilan kedua tidak cocok dengan kepala antrean dan
 * tidak melakukan apa-apa.
 */
interface PopupEntry {
  key: number
  request: PopupRequest
  resolve: (actionId: string) => void
}

export const usePopupStore = defineStore('popup', () => {
  /*
   * `shallowRef` + penggantian array, bukan `ref` + `push`/`shift`: isinya memuat `resolve`
   * milik sebuah Promise, dan tidak ada gunanya membungkus fungsi itu dengan proxy reaktif.
   */
  const entries = shallowRef<PopupEntry[]>([])
  let counter = 0

  const current = computed(() => entries.value[0] ?? null)
  const open = computed(() => Boolean(current.value))

  /** Menambah popup ke antrean. Resolve dengan `id` aksi yang akhirnya dipilih. */
  function ask(request: PopupRequest): Promise<string> {
    return new Promise<string>((resolve) => {
      counter += 1
      entries.value = [...entries.value, { key: counter, request, resolve }]
    })
  }

  /** Sebuah tombol ditekan. Diabaikan kalau `key` bukan lagi kepala antrean. */
  function answer(key: number, actionId: string) {
    const entry = entries.value[0]
    if (!entry || entry.key !== key) return
    entries.value = entries.value.slice(1)
    entry.resolve(actionId)
  }

  /** Escape, klik overlay, atau tombol tutup. */
  function dismiss(key: number) {
    const entry = entries.value[0]
    if (!entry || entry.key !== key) return
    answer(key, entry.request.dismissId ?? 'dismiss')
  }

  return { entries, current, open, ask, answer, dismiss }
})
