import { describe, expect, it } from 'vitest'

import { envelopeTempo, selectableEnvelopeSpeeds, toEnvelopeSpeed } from '../utils/motion-envelope'

/**
 * Tempo amplop (fase 69). Yang dijaga: `sedang` tidak bergeser dari angka fase 68 yang sudah
 * diukur pemilik, dan tiga tingkatnya benar-benar berurutan — bukan tiga label untuk tempo
 * yang hampir sama.
 */
describe('tempo amplop', () => {
  it('sedang mempertahankan flap dan surat fase 68', () => {
    expect(envelopeTempo.sedang).toMatchObject({ flap: 1.1, flapOverlap: 0.22, cardFadeAt: 0.45, cardRise: 1.4 })
  })

  it('tabel hanya memuat besaran positif — arah posisi milik susunAmplop, bukan tanda angka', () => {
    for (const tempo of Object.values(envelopeTempo)) {
      for (const [kunci, nilai] of Object.entries(tempo)) expect(nilai, kunci).toBeGreaterThan(0)
    }
  })

  it('pelan lebih lambat dari sedang, sedang lebih lambat dari cepat — pada flap, surat, dan jedanya', () => {
    for (const kunci of ['flap', 'cardRise', 'cardFadeAt', 'breath'] as const) {
      expect(envelopeTempo.pelan[kunci], kunci).toBeGreaterThan(envelopeTempo.sedang[kunci])
      expect(envelopeTempo.sedang[kunci], kunci).toBeGreaterThan(envelopeTempo.cepat[kunci])
    }
  })

  it('surat selalu mulai sebelum flap selesai — sebab-akibat, bukan dua adegan', () => {
    for (const tempo of Object.values(envelopeTempo)) expect(tempo.cardFadeAt).toBeLessThan(tempo.flap)
  })

  it('nilai asing jatuh ke sedang, dan tiap tingkat punya label', () => {
    expect(toEnvelopeSpeed('lambat sekali')).toBe('sedang')
    expect(toEnvelopeSpeed(undefined)).toBe('sedang')
    expect(toEnvelopeSpeed('pelan')).toBe('pelan')
    expect(selectableEnvelopeSpeeds.map(o => o.id).sort()).toEqual(Object.keys(envelopeTempo).sort())
  })
})
