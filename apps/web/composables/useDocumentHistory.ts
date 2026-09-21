import { computed, ref, toRaw, type Ref } from 'vue'

/**
 * Undo/redo dokumen editor — 30 langkah, sesi ini saja.
 *
 * Berkas ini ada karena satu cacat yang tidak punya gejala: `structuredClone` melempar
 * `DataCloneError` pada proxy Vue, dan editor menanam proxy ke dalam dokumen di banyak tempat
 * (menggeser urutan bagian, menghapus baris cerita, menerapkan palet). Salinan riwayatnya dulu
 * `structuredClone`, jadi `undo()` melempar tepat SESUDAH `pop()`: tumpukan habis, redo kosong,
 * dan dokumen tidak pernah kembali. Di layar tidak ada apa-apa — tombol Undo hanya diam.
 *
 * `JSON.parse(JSON.stringify(...))` menembus proxy dengan senang hati, dan itulah satu-satunya
 * alasan ia dipakai di sini. Jangan "optimalkan" kembali ke `structuredClone`:
 * `document-history.spec.ts` akan berbunyi, dan bug-nya akan kembali lewat pintu lain.
 *
 * Ia composable, bukan util murni, karena `canUndo`/`canRedo` dibaca template toolbar — jadi
 * tumpukannya wajib reaktif. Impor `vue` ditulis eksplisit supaya berkas ini bisa diuji vitest
 * tanpa auto-import Nuxt, dan ia tidak mengimpor `~/` apa pun karena suite akar tidak punya alias.
 */
export function salinDokumen<T>(nilai: T): T {
  return JSON.parse(JSON.stringify(toRaw(nilai))) as T
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
