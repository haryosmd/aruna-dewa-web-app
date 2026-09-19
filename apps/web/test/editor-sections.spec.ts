import { createDefaultDocument } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import {
  filterSections, normalize, sectionDomId, sectionRequirement, stageScrollOffset, stageScrollTop, visibleCount,
} from '../utils/editor-sections'

const labels = {
  cover: 'Cover pembuka', couple: 'Mempelai', events: 'Acara', countdown: 'Hitung mundur',
  gallery: 'Galeri', story: 'Cerita cinta', rundown: 'Rundown', dresscode: 'Dresscode',
  video: 'Video & live stream', gift: 'Hadiah', rsvp: 'RSVP', wishes: 'Ucapan',
  closing: 'Penutup', music: 'Musik',
}

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
  })

  it('mencocokkan type mentah supaya "gallery" pun ketemu', () => {
    expect(filterSections(sections, 'gallery', labels).map(e => e.section.id)).toEqual(['gallery'])
  })

  it('indeks yang dikembalikan tetap indeks di dokumen, bukan di daftar tersaring', () => {
    const [entry] = filterSections(sections, 'musik', labels)
    expect(entry?.index).toBe(sections.findIndex(section => section.id === 'music'))
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

  it('menggulir sampai bagian berdiri di bawah pemilih perangkat', () => {
    // Viewport di y=100 sudah tergulir 400; bagian tampak di y=700 → jarak 600 dari atas viewport.
    expect(stageScrollTop({ top: 100, scrollTop: 400 }, { top: 700 })).toBe(400 + 600 - stageScrollOffset)
  })

  it('tidak pernah negatif untuk bagian pertama', () => {
    expect(stageScrollTop({ top: 100, scrollTop: 0 }, { top: 120 })).toBe(0)
  })

  it('memakai rect pasca-transform apa adanya — skala tidak dikalikan lagi', () => {
    // Dua rect yang selisihnya sama menghasilkan posisi yang sama, berapa pun skalanya.
    const a = stageScrollTop({ top: 0, scrollTop: 0 }, { top: 500 })
    const b = stageScrollTop({ top: 50, scrollTop: 0 }, { top: 550 })
    expect(a).toBe(b)
  })
})
