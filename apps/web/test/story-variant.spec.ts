import { describe, expect, it } from 'vitest'
import { storyVariantEfektif, storyVariants, toStoryVariant } from '../utils/invitation-options'

/*
 * Penjaga fase 79, dan yang paling penting di antaranya.
 *
 * Bagian Cerita sampai fase ini bercabang pada `steps.length`: tanpa langkah satu foto dan satu
 * paragraf, dengan langkah rel melengkung. Fase 79 mengganti cabang itu dengan kolom pilihan —
 * dan berkas ini yang membuktikan penggantian itu tidak mengubah apa pun untuk dokumen yang
 * sudah ada, tanpa merender satu komponen pun.
 */

describe('toStoryVariant', () => {
  it('menerima tiap id yang sah', () => {
    for (const id of storyVariants) expect(toStoryVariant(id)).toBe(id)
  })

  it.each([undefined, null, '', 'spiral', 42, {}])('nilai asing jatuh ke rel: %s', value => {
    expect(toStoryVariant(value)).toBe('rel')
  })
})

describe('storyVariantEfektif — dokumen lama tidak berubah tampilannya', () => {
  it('dokumen lama TANPA langkah tetap prosa, persis cabang v-if lama', () => {
    expect(storyVariantEfektif(undefined, 0)).toBe('prosa')
    expect(storyVariantEfektif({}, 0)).toBe('prosa')
  })

  it('dokumen lama DENGAN langkah tetap rel, persis cabang v-else lama', () => {
    expect(storyVariantEfektif(undefined, 4)).toBe('rel')
    expect(storyVariantEfektif({}, 4)).toBe('rel')
  })

  it('bawaan kontrak `rel` pada dokumen baru yang lahir tanpa langkah tetap merender prosa', () => {
    // `createEleganceSections` menulis `variant: 'rel'` dan `steps: []`. Kalau baris ini berubah
    // jadi 'rel', tiap undangan baru menampilkan rel kosong sebelum pasangan menulis apa pun.
    expect(storyVariantEfektif({ variant: 'rel' }, 0)).toBe('prosa')
  })

  it('pilihan pasangan menang begitu ada langkah', () => {
    expect(storyVariantEfektif({ variant: 'buku' }, 4)).toBe('buku')
    expect(storyVariantEfektif({ variant: 'tumpuk' }, 1)).toBe('tumpuk')
    expect(storyVariantEfektif({ variant: 'rel-datar' }, 9)).toBe('rel-datar')
  })

  it('memilih prosa secara sadar tetap prosa walau langkahnya ada', () => {
    expect(storyVariantEfektif({ variant: 'prosa' }, 6)).toBe('prosa')
  })

  it('varian berbasis langkah tanpa langkah jatuh ke prosa, bukan ke bidang kosong', () => {
    expect(storyVariantEfektif({ variant: 'buku' }, 0)).toBe('prosa')
  })
})
