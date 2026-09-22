import { readFileSync } from 'node:fs'

import { createDefaultDocument, type InvitationDocument } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'
import { isProxy, reactive, ref, toRaw } from 'vue'

import { bersihkan, salinDokumen, useDocumentHistory } from '../composables/useDocumentHistory'
import { pindahkan } from '../utils/editor-sections'

/*
 * Penjaga cacat 2026-09-20: undo sesudah menggeser urutan bagian tidak mengembalikan apa pun.
 *
 * Akarnya `structuredClone` yang melempar `DataCloneError` pada proxy Vue — dan editor menanam
 * proxy ke dalam dokumen di banyak tempat, bukan hanya saat mengurutkan. `undo()` melempar tepat
 * SESUDAH `pop()`, jadi tumpukan habis tanpa mengembalikan apa-apa dan tidak ada gejala di layar.
 *
 * Satu-satunya bukti bug itu mati dulu adalah sebuah e2e yang `test.skip` sendiri tanpa akun QA.
 * Berkas ini menjalankannya dalam 20 milidetik, tanpa browser.
 */
const dokumen = () => createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', { date: '2027-06-12' })
const riwayat = (awal: InvitationDocument = dokumen()) => {
  const doc = ref(awal)
  return { doc, ...useDocumentHistory(doc) }
}
const urutan = (doc: InvitationDocument) => doc.sections.map(section => section.id)

describe('salinan riwayat yang tahan proxy', () => {
  it('structuredClone memang menolak proxy Vue — penjaga di bawah bukan teori', () => {
    expect(() => structuredClone(reactive({ a: 1 }))).toThrow()
  })

  it('salinDokumen menerima proxy dan mengembalikan objek biasa', () => {
    const proxy = reactive(dokumen())
    expect(() => salinDokumen(proxy)).not.toThrow()
    const hasil = salinDokumen(proxy)
    expect(hasil).toEqual(dokumen())
    expect(isProxy(hasil)).toBe(false)
  })

  it('salinannya dalam, bukan dangkal', () => {
    const { doc, checkpoint, undo } = riwayat()
    checkpoint()
    doc.value.sections[1]!.data.title = 'Judul baru'
    undo()
    expect(doc.value.sections[1]!.data.title).not.toBe('Judul baru')
  })

  it('bertahan saat larik bagian sudah ditanami proxy — reproduksi cacat 2026-09-20', () => {
    const { doc, checkpoint, undo } = riwayat()
    const semula = urutan(doc.value)
    // Persis yang dilakukan `reorder()` sebelum diperbaiki: larik baru berisi proxy tiap bagian.
    doc.value.sections = doc.value.sections.slice()
    checkpoint()
    doc.value.sections = doc.value.sections.slice().reverse()
    expect(() => undo()).not.toThrow()
    expect(urutan(doc.value)).toEqual(semula)
  })

  it('dokumen yang kembali dari riwayat tidak menyimpan proxy di dalamnya', () => {
    const { doc, checkpoint, undo } = riwayat(reactive(dokumen()))
    checkpoint()
    // Tanam proxy persis seperti editor melakukannya, lalu urungkan.
    doc.value.sections = doc.value.sections.slice()
    undo()
    /*
     * Yang diperiksa isinya, bukan bungkusnya: `ref` selalu membungkus objek jadi proxy lagi saat
     * dibaca, jadi `isProxy(doc.value)` selalu true dan tidak membuktikan apa pun. `structuredClone`
     * pada isi mentahnya justru melempar kalau masih ada proxy bersarang di dalam — persis galat
     * yang dulu membunuh `undo()`.
     */
    expect(() => structuredClone(toRaw(doc.value))).not.toThrow()
  })
})

describe('tumpukan undo/redo', () => {
  it('mengembalikan urutan yang digeser lewat pindahkan()', () => {
    const { doc, checkpoint, undo } = riwayat()
    const semula = urutan(doc.value)
    const posisi = semula.indexOf('video')
    checkpoint()
    doc.value.sections = pindahkan(doc.value.sections, posisi, posisi - 1)!
    expect(urutan(doc.value).indexOf('video')).toBe(posisi - 1)
    undo()
    expect(urutan(doc.value)).toEqual(semula)
  })

  it('checkpoint baru mengosongkan redo', () => {
    const { doc, checkpoint, undo, canRedo } = riwayat()
    checkpoint()
    doc.value.sections[0]!.enabled = true
    undo()
    expect(canRedo.value).toBe(true)
    checkpoint()
    expect(canRedo.value).toBe(false)
  })

  it('redo mengembalikan keadaan sebelum undo', () => {
    const { doc, checkpoint, undo, redo } = riwayat()
    checkpoint()
    doc.value.sections[1]!.data.title = 'Sesudah'
    undo()
    redo()
    expect(doc.value.sections[1]!.data.title).toBe('Sesudah')
  })

  it('berhenti di tiga puluh langkah, tanpa melempar', () => {
    const { doc, checkpoint, undo, canUndo } = riwayat()
    for (let i = 0; i < 35; i += 1) {
      checkpoint()
      doc.value.sections[1]!.data.title = `Judul ${i}`
    }
    for (let i = 0; i < 30; i += 1) undo()
    expect(canUndo.value).toBe(false)
    const terakhir = doc.value.sections[1]!.data.title
    expect(() => undo()).not.toThrow()
    expect(doc.value.sections[1]!.data.title).toBe(terakhir)
  })

  it('undo pada tumpukan kosong tidak mengubah apa pun', () => {
    const { doc, undo, canRedo } = riwayat()
    const semula = JSON.stringify(doc.value)
    undo()
    expect(JSON.stringify(doc.value)).toBe(semula)
    expect(canRedo.value).toBe(false)
  })

  it('reset mengosongkan keduanya', () => {
    const { doc, checkpoint, undo, reset, canUndo, canRedo } = riwayat()
    checkpoint()
    doc.value.sections[0]!.data.title = 'x'
    undo()
    reset()
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })
})

/*
 * Penjaga fase 74.1: dokumen tidak boleh pernah MEMEGANG proxy sejak awal.
 *
 * Perbaikan 2026-09-20 menutup gejalanya di riwayat; enam situs yang menanamnya tetap hidup,
 * dan narasi "reorder + ExtrasForm + terapkanPalet" ternyata kurang dua. Yang diuji di bawah
 * adalah BENTUK tiap penulisan itu, bukan komponennya — `editor.vue` dan `ExtrasForm.vue`
 * adalah SFC, dan suite akar tidak punya plugin Vue maupun alias `~/` untuk mengimpornya
 * (alasan yang sama yang membuat gerbang breakpoint membaca teks sumber).
 *
 * Kalau satu `bersihkan()` dicabut di `editor.vue`, blok ini yang berbunyi.
 */
function jejakProxy(nilai: unknown, jalur = '$'): string[] {
  if (nilai === null || typeof nilai !== 'object') return []
  const temuan = isProxy(nilai) ? [jalur] : []
  const anak = Array.isArray(nilai)
    ? nilai.flatMap((item, index) => jejakProxy(item, `${jalur}[${index}]`))
    : Object.entries(nilai as Record<string, unknown>).flatMap(([key, item]) => jejakProxy(item, `${jalur}.${key}`))
  return [...temuan, ...anak]
}

describe('dokumen bebas proxy di setiap bentuk penulisan', () => {
  /** Dokumen yang reaktif seperti di editor: `document = ref(createDefaultDocument())`. */
  const hidup = () => ref(dokumen())

  it('jejakProxy benar-benar menemukan proxy — kalau tidak, seluruh blok ini hijau palsu', () => {
    expect(jejakProxy({ a: reactive({ b: 1 }) })).toEqual(['$.a'])
    expect(jejakProxy(reactive([{ x: 1 }]))).toEqual(['$', '$[0]'])
    expect(jejakProxy({ a: 1, b: 'dua', c: null, d: [1, 2] })).toEqual([])
  })

  it('ExtrasForm: tambah baris membawa baris lama sebagai proxy tanpa bersihkan', () => {
    const doc = hidup()
    const story = doc.value.sections.find(section => section.type === 'story')!
    story.data.steps = [{ id: 'a', title: 'Bertemu', text: '', image: '', side: 'kiri' }]
    // Bentuk persis `tambahLangkah()`: `[...rows('steps'), {…}]` dibaca dari data yang reaktif.
    const rows = story.data.steps as Record<string, unknown>[]
    const mentah = [...rows, { id: 'b', title: '', text: '', image: '', side: 'kanan' }]
    expect(jejakProxy(mentah)).toEqual(['$[0]'])

    story.data.steps = bersihkan(mentah)
    expect(jejakProxy(toRaw(doc.value))).toEqual([])
  })

  it('ExtrasForm: hapus baris lewat slice() juga menanam proxy tanpa bersihkan', () => {
    const doc = hidup()
    const rundown = doc.value.sections.find(section => section.type === 'rundown')!
    rundown.data.items = [{ id: 'a', time: '08.00' }, { id: 'b', time: '11.00' }]
    const rows = rundown.data.items as Record<string, unknown>[]
    const mentah = rows.slice()
    mentah.splice(0, 1)
    expect(jejakProxy(mentah)).toEqual(['$[0]'])

    rundown.data.items = bersihkan(mentah)
    expect(jejakProxy(toRaw(doc.value))).toEqual([])
  })

  it('tulisGaya: textStyles berisi OBJEK, jadi sebaran dangkal membawanya sebagai proxy', () => {
    const doc = hidup()
    const hero = doc.value.sections.find(section => section.type === 'hero')!
    hero.data.textStyles = { title: { size: 40 } }
    const styles = { ...(hero.data.textStyles as Record<string, unknown>) }
    expect(jejakProxy(styles)).toEqual(['$.title'])

    hero.data.textStyles = bersihkan(styles)
    expect(jejakProxy(toRaw(doc.value))).toEqual([])
  })

  it('terapkanPalet: tokens.motion adalah objek dan ikut by-reference', () => {
    const doc = hidup()
    doc.value.tokens.motion = { amplop: 'pelan' }
    const tokens = { ...doc.value.tokens, primary: '#7A5C44' }
    expect(jejakProxy(tokens)).toEqual(['$.motion'])

    doc.value.tokens = bersihkan(tokens)
    expect(jejakProxy(toRaw(doc.value))).toEqual([])
    expect(doc.value.tokens.motion).toEqual({ amplop: 'pelan' })
  })

  it('bersihkan melepas primitif apa adanya — `undefined` tidak boleh melempar', () => {
    expect(bersihkan(undefined)).toBeUndefined()
    expect(bersihkan(null)).toBeNull()
    expect(bersihkan('')).toBe('')
    expect(bersihkan(false)).toBe(false)
    expect(bersihkan(0)).toBe(0)
  })

  it('dokumen yang bersih bisa di-structuredClone TANPA toRaw — sabuk kedua tidak lagi menanggung', () => {
    const doc = hidup()
    const hero = doc.value.sections.find(section => section.type === 'hero')!
    hero.data.textStyles = bersihkan({ title: { size: 40 } })
    doc.value.tokens = bersihkan({ ...doc.value.tokens, motion: { amplop: 'pelan' } })
    expect(() => structuredClone(toRaw(doc.value))).not.toThrow()
  })
})

/*
 * Blok di atas menguji BENTUKNYA; blok ini mengikat BERKASNYA.
 *
 * Tanpa yang ini, mencabut satu `bersihkan()` di `editor.vue` tidak membuat satu tes pun merah —
 * spec di atas memanggil `bersihkan` sendiri, jadi ia akan tetap hijau sambil editornya bocor.
 * Membaca teks sumber adalah satu-satunya cara: SFC tidak bisa diimpor suite akar (tanpa plugin
 * Vue, tanpa alias `~/`), pola yang sama dengan `invitation-breakpoints.spec.ts` dan
 * `ornament-slots.spec.ts`.
 */
describe('titik tulis di editor benar-benar memanggil bersihkan', () => {
  const sumber = readFileSync(new URL('../pages/dashboard/[id]/editor.vue', import.meta.url), 'utf8')
  const tanpaKomentar = sumber.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it.each([
    ['tulis()', 'section.data[key] = bersihkan(value)'],
    ['tulisGaya() — salinan textStyles', 'const styles = bersihkan({ ...((section.data.textStyles'],
    ['tulisGaya() — gaya yang masuk', 'styles[key] = bersihkan(style)'],
    ['terapkanPalet()', 'document.value.tokens = bersihkan({ ...document.value.tokens, ...palette.tokens })'],
    ['repairPaletteColors()', 'document.value.tokens = bersihkan({ ...document.value.tokens, ...repairPalette('],
    ['applyTemplate()', 'document.value.tokens = bersihkan({ ...document.value.tokens, ...preset.tokens })'],
  ])('%s', (_nama, potongan) => {
    expect(tanpaKomentar).toContain(potongan)
  })

  it('tidak ada penulisan tokens yang melewatkan bersihkan', () => {
    const penulis = tanpaKomentar.match(/document\.value\.tokens = [^\n]+/g) ?? []
    expect(penulis.length).toBeGreaterThanOrEqual(3)
    for (const baris of penulis) expect(baris, baris).toContain('bersihkan(')
  })
})
