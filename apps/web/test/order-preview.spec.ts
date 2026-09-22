import { createDefaultDocument } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { langkahDariQuery, focusPreview, previewScrolls, previewSectionIds } from '../utils/order-preview'

const enabledIds = (sections: { id: string; enabled: boolean }[]) =>
  sections.filter(section => section.enabled).map(section => section.id)

describe('previewSectionIds', () => {
  it('langkah nama hanya menampilkan hero (fase 72: pengganti cover)', () => {
    expect([...previewSectionIds(1, { hasDate: false })!]).toEqual(['hero'])
  })

  it('langkah acara menampilkan acara dan lokasi, hitung mundur hanya kalau tanggal terisi', () => {
    expect([...previewSectionIds(2, { hasDate: false })!]).toEqual(['event', 'map'])
    expect([...previewSectionIds(2, { hasDate: true })!]).toEqual(['event', 'map', 'countdown'])
  })

  it('langkah tema cukup hero: palet, ornamen, dan huruf tema semua ada di sana', () => {
    expect([...previewSectionIds(3, { hasDate: true })!]).toEqual(['hero'])
  })

  it('langkah paket menampilkan seluruh dokumen dan boleh menggulung', () => {
    expect(previewSectionIds(4, { hasDate: false })).toBeNull()
    expect(previewScrolls(4, { hasDate: false })).toBe(true)
    expect(previewScrolls(1, { hasDate: false })).toBe(false)
  })
})

describe('focusPreview', () => {
  const sections = createDefaultDocument().sections

  it('menyalakan hanya section langkah itu, tanpa memutasi masukan', () => {
    const focused = focusPreview(sections, 1, { hasDate: false })
    expect(enabledIds(focused)).toEqual(['hero'])
    expect(enabledIds(sections)).toContain('couple')
    expect(focused[0]).not.toBe(sections[0])
  })

  it('urutan dokumen dipertahankan supaya renderer tidak mengocoknya', () => {
    const focused = focusPreview(sections, 3, { hasDate: false })
    expect(focused.map(section => section.id)).toEqual(sections.map(section => section.id))
  })

  it('langkah terakhir mengembalikan section apa adanya, termasuk yang mati di bawaan', () => {
    const focused = focusPreview(sections, 4, { hasDate: false })
    expect(enabledIds(focused)).toEqual(enabledIds(sections))
    expect(focused.find(section => section.id === 'story')?.enabled).toBe(false)
  })
})

describe('langkahDariQuery (fase 69)', () => {
  it('memetakan nama langkah ke nomornya', () => {
    expect(langkahDariQuery('pasangan')).toBe(1)
    expect(langkahDariQuery('tema')).toBe(3)
    expect(langkahDariQuery('paket')).toBe(4)
  })
  it('nilai asing, angka, dan array jatuh ke langkah pertama', () => {
    expect(langkahDariQuery('3')).toBe(1)
    expect(langkahDariQuery(undefined)).toBe(1)
    expect(langkahDariQuery(['tema'])).toBe(1)
  })
})
