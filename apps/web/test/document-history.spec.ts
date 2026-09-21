import { createDefaultDocument, type InvitationDocument } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'
import { isProxy, reactive, ref, toRaw } from 'vue'

import { salinDokumen, useDocumentHistory } from '../composables/useDocumentHistory'
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
