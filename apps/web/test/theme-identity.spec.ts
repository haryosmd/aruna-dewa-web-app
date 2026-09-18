import { liveTemplateIds, templates } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { ornamenPensiun, themeOrnaments, themePresentation } from '../utils/theme'
import { isOrnamentId, ornament, type OrnamentId } from '../utils/ornaments'

/**
 * Identitas tema, diukur dari PETANYA — bukan dari geometrinya.
 *
 * `scripts/ornament-forge/verify.mjs` sudah menjaga bahwa dua glyph tidak boleh punya bentuk
 * yang terlalu mirip. Yang tidak dijaganya: peta tema→glyph bisa salah tanpa satu path pun
 * berubah. Dua tema yang menunjuk id yang sama persis lolos gerbang geometri dengan mulus —
 * bentuknya memang identik karena ia memang berkas yang sama.
 *
 * Berkas ini murni data dan tidak memuat forge, jadi ia tetap berjalan di CI yang tidak
 * menjalankan generator.
 */

/** Slot yang DESIGN.md nyatakan tidak pernah berulang antar tema. */
const slotUnik = ['frame', 'divider', 'corner', 'motif', 'symbol', 'seal'] as const

describe('identitas tema', () => {
  it('memberi tiap tema hidup satu entri presentasi', () => {
    expect(Object.keys(themePresentation).sort()).toEqual([...liveTemplateIds].sort())
    expect(templates.map(t => t.id).sort()).toEqual([...liveTemplateIds].sort())
  })

  it.each(slotUnik)('tidak pernah mengulang %s antar tema hidup', slot => {
    const dipakai = liveTemplateIds.map(id => themeOrnaments(id)[slot])
    expect(new Set(dipakai).size).toBe(dipakai.length)
  })

  it('memberi tiap tema lima layer, satu per slot', () => {
    for (const id of liveTemplateIds) {
      const layers = themeOrnaments(id).layers
      expect(layers).toHaveLength(5)
      expect(new Set(layers.map(glyph => ornament(glyph).slot)).size).toBe(5)
    }
  })

  it('menunjuk hanya glyph yang benar-benar terdaftar di bank', () => {
    const semua: OrnamentId[] = []
    for (const id of liveTemplateIds) {
      const set = themeOrnaments(id)
      semua.push(...slotUnik.map(slot => set[slot]), set.floral, set.floralAlt, set.monogram, set.garland, ...set.layers)
    }
    for (const set of Object.values(ornamenPensiun)) {
      semua.push(...slotUnik.map(slot => set[slot]), set.floral, set.floralAlt, set.monogram, set.garland, ...set.layers)
    }
    for (const glyph of semua) expect(isOrnamentId(glyph)).toBe(true)
  })

  it('menyimpan set ornamen tiap tema pensiun utuh sebagai kolam varian', () => {
    // Kolam yang bolong berarti gerbang keunikan berhenti mengukur slot yang hilang itu.
    for (const [nama, set] of Object.entries(ornamenPensiun)) {
      for (const slot of slotUnik) expect(set[slot], `${nama}.${slot}`).toBeTruthy()
      expect(set.layers, nama).toHaveLength(5)
    }
  })
})
