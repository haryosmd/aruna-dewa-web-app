import { liveTemplateIds, selectableFonts, templates } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { checkPalette } from '../utils/contrast'
import { paletteOf, themePalettes } from '../utils/theme-palettes'

/**
 * Preset palet (fase 72.3) diukur, bukan dipercaya: tiap palet harus lolos keempat pasangan
 * kontras yang sama dengan penjaga publish — kalau tidak, klik satu kartu preset akan langsung
 * mengunci tombol Publikasikan, dan itu bukan pengalaman yang pantas dari sebuah "preset".
 */
describe('themePalettes', () => {
  it.each(liveTemplateIds)('%s: empat palet, yang pertama persis preset tema, semuanya terbaca', (id) => {
    const daftar = themePalettes[id]
    expect(daftar).toHaveLength(4)
    expect(daftar[0]!.tokens).toEqual(templates.find(t => t.id === id)!.tokens)
    expect(new Set(daftar.map(p => p.id)).size).toBe(4)
    for (const palette of daftar) {
      const gagal = checkPalette(palette.tokens).filter(check => !check.passes)
      expect(gagal.map(g => `${palette.id}:${g.id}=${g.ratio.toFixed(2)}`)).toEqual([])
      expect(selectableFonts.some(font => font.id === palette.tokens.font), palette.id).toBe(true)
    }
  })

  it('mengenali palet yang sedang berlaku dari tiga warnanya', () => {
    const [pertama, kedua] = themePalettes['aruna-bloom']
    expect(paletteOf('aruna-bloom', pertama!.tokens)?.id).toBe(pertama!.id)
    expect(paletteOf('aruna-bloom', { ...kedua!.tokens, primary: '#000000' })).toBeUndefined()
  })
})
