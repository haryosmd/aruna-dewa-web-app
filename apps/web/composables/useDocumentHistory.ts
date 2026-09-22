import { computed, ref, toRaw, type Ref } from 'vue'

/**
 * Undo/redo dokumen editor — 30 langkah, sesi ini saja.
 *
 * Berkas ini ada karena satu cacat yang tidak punya gejala: `structuredClone` melempar
 * `DataCloneError` pada proxy Vue, dan editor menanam proxy ke dalam dokumen di banyak tempat.
 * Salinan riwayatnya dulu `structuredClone`, jadi `undo()` melempar tepat SESUDAH `pop()`:
 * tumpukan habis, redo kosong, dan dokumen tidak pernah kembali. Di layar tidak ada apa-apa —
 * tombol Undo hanya diam.
 *
 * **Sejak fase 74.1 pertahanannya dua lapis, dan lapis pertamanya bukan di sini.** Penanamnya
 * ditutup di sumbernya — `bersihkan()` di bawah dipakai di tiap titik tulis (`tulis()` di
 * `editor.vue`, `tulisGaya`, dan ketiga penulis `tokens`) — jadi dokumen sudah bebas proxy
 * sebelum riwayat menyentuhnya. Enam situs yang dulu menanam proxy didaftar di
 * `document-history.spec.ts`.
 *
 * `salinDokumen` tetap memakai JSON, dan itu tetap disengaja: ia jaring terakhir untuk penanam
 * ketujuh yang belum ada hari ini. Jangan "optimalkan" kembali ke `structuredClone` —
 * `document-history.spec.ts` akan berbunyi.
 *
 * Ia composable, bukan util murni, karena `canUndo`/`canRedo` dibaca template toolbar — jadi
 * tumpukannya wajib reaktif. Impor `vue` ditulis eksplisit supaya berkas ini bisa diuji vitest
 * tanpa auto-import Nuxt, dan ia tidak mengimpor `~/` apa pun karena suite akar tidak punya alias.
 */

/**
 * Nilai yang dijamin tanpa proxy Vue, untuk ditulis ke dalam dokumen.
 *
 * Primitif dikembalikan apa adanya — `JSON.parse(JSON.stringify(undefined))` melempar, dan
 * `tulis()` memang boleh menerima `undefined`. Untuk objek, `toRaw` melepas proxy lapis luar
 * dan `JSON` menembus sisanya: `stringify` membaca lewat getter proxy dengan senang hati, jadi
 * larik berisi baris-baris proxy pun keluar sebagai objek biasa seluruhnya.
 */
export function bersihkan<T>(nilai: T): T {
  if (nilai === null || typeof nilai !== 'object') return nilai
  return JSON.parse(JSON.stringify(toRaw(nilai))) as T
}

export function salinDokumen<T extends object>(nilai: T): T {
  return bersihkan(toRaw(nilai))
}

export function useDocumentHistory<T extends object>(dokumen: Ref<T>, batas = 30) {
  const undoStack = ref<T[]>([]) as Ref<T[]>
  const redoStack = ref<T[]>([]) as Ref<T[]>
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  /** Dipanggil SEBELUM setiap mutasi yang boleh diurungkan. */
  function checkpoint() {
    undoStack.value.push(salinDokumen(dokumen.value))
    if (undoStack.value.length > batas) undoStack.value.shift()
    redoStack.value = []
  }
  function undo() {
    const sebelumnya = undoStack.value.pop()
    if (!sebelumnya) return
    redoStack.value.push(salinDokumen(dokumen.value))
    dokumen.value = sebelumnya
  }
  function redo() {
    const berikut = redoStack.value.pop()
    if (!berikut) return
    undoStack.value.push(salinDokumen(dokumen.value))
    dokumen.value = berikut
  }
  /** Dipanggil saat memuat undangan: riwayat dokumen sebelumnya tidak berarti apa-apa di sini. */
  function reset() {
    undoStack.value = []
    redoStack.value = []
  }

  return { canUndo, canRedo, checkpoint, undo, redo, reset }
}
