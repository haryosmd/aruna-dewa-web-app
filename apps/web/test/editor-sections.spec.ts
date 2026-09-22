import { createDefaultDocument } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import {
  filterSections, normalize, sectionDomId, sectionLabels, sectionRequirement, stageScrollOffset, stageScrollTop, visibleCount,
  pindahkan,
} from '../utils/editor-sections'

const labels = sectionLabels

describe('filterSections', () => {
  const sections = createDefaultDocument().sections

  it('kueri kosong mengembalikan seluruh bagian dengan indeks aslinya', () => {
    const entries = filterSections(sections, '   ', labels)
    expect(entries).toHaveLength(sections.length)
    expect(entries.map(entry => entry.index)).toEqual(sections.map((_, index) => index))
  })

  it('mencocokkan label Indonesia tanpa peduli kapital dan diakritik', () => {
    expect(filterSections(sections, 'GALERI', labels).map(e => e.section.id)).toEqual(['gallery'])
    expect(filterSections(sections, 'cérita', labels).map(e => e.section.id)).toEqual(['story'])
    expect(filterSections(sections, 'lokasi', labels).map(e => e.section.id)).toEqual(['map'])
  })

  it('mencocokkan type mentah supaya "gallery" pun ketemu', () => {
    expect(filterSections(sections, 'gallery', labels).map(e => e.section.id)).toEqual(['gallery'])
  })

  it('indeks yang dikembalikan tetap indeks di dokumen, bukan di daftar tersaring', () => {
    const [entry] = filterSections(sections, 'penutup', labels)
    expect(entry?.index).toBe(sections.findIndex(section => section.id === 'closing'))
  })

  it('kueri yang tidak cocok mengembalikan daftar kosong, bukan semuanya', () => {
    expect(filterSections(sections, 'zzz', labels)).toEqual([])
  })
})

describe('sectionRequirement', () => {
  it('cover, mempelai, dan acara wajib; sisanya opsional', () => {
    expect(sectionRequirement('cover')).toBe('wajib')
    expect(sectionRequirement('couple')).toBe('wajib')
    expect(sectionRequirement('events')).toBe('wajib')
    expect(sectionRequirement('gallery')).toBe('opsional')
    expect(sectionRequirement('music')).toBe('opsional')
  })

  it('struktur Elegance (fase 72): amplop, hero, mempelai, acara, penutup wajib', () => {
    for (const type of ['opening-envelope', 'hero', 'couple', 'event', 'closing'] as const) expect(sectionRequirement(type)).toBe('wajib')
    for (const type of ['countdown', 'map', 'unduh-mantu', 'quote', 'gallery', 'gift', 'wishes'] as const) expect(sectionRequirement(type)).toBe('opsional')
  })
})

describe('visibleCount', () => {
  it('menghitung bagian yang enabled saja', () => {
    const sections = createDefaultDocument().sections
    const on = sections.filter(section => section.enabled).length
    expect(visibleCount(sections)).toBe(on)
    expect(visibleCount(sections.map(section => ({ ...section, enabled: false })))).toBe(0)
  })
})

describe('normalize', () => {
  it('menyatukan spasi dan membuang diakritik', () => {
    expect(normalize('  Résépsi   Akad ')).toBe('resepsi akad')
  })
})

describe('rail → panggung (fase 70)', () => {
  it('menunjuk id yang dipasang tiap komponen bagian', () => {
    expect(sectionDomId('gallery')).toBe('iv-gallery')
    expect(sectionDomId('cover')).toBe('iv-cover')
  })

  it('menggulir sampai bagian berdiri tepat di bawah tepi atas layar', () => {
    // Layar di y=100 sudah tergulir 400; bagian tampak di y=700 → jarak 600 dari atas layar.
    expect(stageScrollTop({ top: 100, scrollTop: 400 }, { top: 700 })).toBe(400 + 600 - stageScrollOffset)
  })

  it('tidak pernah negatif untuk bagian pertama', () => {
    // Bagian yang tepiannya sudah di atas tepi layar: tujuannya 0, bukan angka minus.
    expect(stageScrollTop({ top: 100, scrollTop: 0 }, { top: 104 })).toBe(0)
    expect(stageScrollTop({ top: 100, scrollTop: 0 }, { top: 60 })).toBe(0)
  })

  it('hanya bergantung pada SELISIH rect, bukan pada posisi absolutnya', () => {
    const a = stageScrollTop({ top: 0, scrollTop: 0 }, { top: 500 })
    const b = stageScrollTop({ top: 50, scrollTop: 0 }, { top: 550 })
    expect(a).toBe(b)
  })

  /*
   * Fase 76: wadah gulirnya adalah elemen yang di-`scale()` ITU SENDIRI, jadi rect (piksel layar)
   * dan `scrollTop` (koordinat render) tidak lagi satu satuan. Tanpa pembagian ini, pada skala
   * 0,5 tiap lompatan cuma sampai separuh jalan — bentuk kegagalan yang terlihat seperti
   * "panggungnya menggulir kurang jauh", bukan seperti satuan yang salah.
   */
  it('mengubah selisih rect ke koordinat render sebelum menambahkannya ke scrollTop', () => {
    // Bagian yang tampak 300px di bawah tepi layar pada skala 0,5 = 600px di koordinat render.
    expect(stageScrollTop({ top: 0, scrollTop: 0 }, { top: 300 }, 0, 0.5)).toBe(600)
    expect(stageScrollTop({ top: 0, scrollTop: 0 }, { top: 300 }, 0, 1)).toBe(300)
  })

  it('memperlakukan skala nol sebagai 1, bukan sebagai pembagian nol', () => {
    // `previewScale` berawal 0 selama satu frame sebelum `useElementSize` menjawab.
    expect(stageScrollTop({ top: 0, scrollTop: 0 }, { top: 300 }, 0, 0)).toBe(300)
  })

  it('napasnya jauh lebih kecil sejak yang menggulung bukan lagi viewport panggung', () => {
    // Dulu 96, sepadan dengan pil pemilih perangkat yang mengambang di atas viewport luar.
    expect(stageScrollOffset).toBeLessThan(32)
  })
})

describe('pindahkan', () => {
  const daftar = ['a', 'b', 'c', 'd']

  it('menggeser satu langkah tanpa menyentuh larik asal', () => {
    expect(pindahkan(daftar, 2, 1)).toEqual(['a', 'c', 'b', 'd'])
    expect(daftar).toEqual(['a', 'b', 'c', 'd'])
  })

  it('menolak yang tidak menggeser apa pun', () => {
    // `null`, bukan salinan: pemanggilnya memakai ini untuk memutuskan apakah perlu `checkpoint()`.
    expect(pindahkan(daftar, 1, 1)).toBeNull()
    expect(pindahkan(daftar, 0, -1)).toBeNull()
    expect(pindahkan(daftar, 3, 4)).toBeNull()
    expect(pindahkan(daftar, -1, 0)).toBeNull()
    expect(pindahkan([], 0, 0)).toBeNull()
  })
})
