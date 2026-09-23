import { describe, expect, it } from 'vitest'

import { fotoMasuk, gerakKeping, judulMasuk } from '../utils/motion-entrance'

/**
 * Tata bahasa masuk harus TERLIHAT berbeda (fase 80). Terukur sebelum fase ini: di bagian tanpa
 * foto keempat pilihan menghasilkan gerak yang sama persis, dan `iris` tidak pernah membuka apa pun.
 */
describe('gerak masuk per tata bahasa', () => {
  const sidik = (g: ReturnType<typeof judulMasuk>) => JSON.stringify(g)

  it('judul: rise, sweep, iris, dan siluet saling berbeda', () => {
    const rise = sidik(judulMasuk('rise', 0))
    const sweep = sidik(judulMasuk('sweep', 0))
    const iris = sidik(judulMasuk('iris', 0))
    const siluet = sidik(judulMasuk('silhouette', 0))
    expect(new Set([rise, sweep, iris, siluet]).size).toBe(4)
  })

  /*
   * Fase 81: siluet teks dulu naik persis seperti `rise`, jadi di sepuluh bagian tanpa foto memilih
   * "Siluet" tidak mengubah satu piksel pun. Janjinya "bayangan dulu, lalu warnanya menyusul".
   */
  it('siluet teks mulai gelap tanpa warna dan berakhir netral', () => {
    const [awal, akhir] = judulMasuk('silhouette', 0).filter!
    expect(awal).toMatch(/grayscale\(1\)/)
    expect(awal).toMatch(/brightness\(0\.\d+\)/)
    expect(akhir).toMatch(/grayscale\(0\) brightness\(1\)/)
    // Tidak pernah benar-benar bening: teks tetap terbaca sebagai bayangan (DESIGN.md aturan 9).
    expect(Number(judulMasuk('silhouette', 0).from.opacity)).toBeGreaterThan(0)
  })

  it('judul tanpa tata bahasa tetap naik 26px seperti sebelumnya', () => {
    expect(judulMasuk(undefined, 0)).toEqual({ from: { y: 26, opacity: 0 } })
  })

  it('sweep berselang arah', () => {
    expect(judulMasuk('sweep', 0).from.x).toBe(-32)
    expect(judulMasuk('sweep', 1).from.x).toBe(32)
  })

  it('iris membuka dari tengah, dan bukaan akhirnya lebih luas dari kotaknya', () => {
    const foto = fotoMasuk('iris').clip!
    expect(foto[0]).toMatch(/^circle\(0%/)
    expect(Number(foto[1].match(/circle\((\d+)%/)![1])).toBeGreaterThan(70.7)
    const teks = judulMasuk('iris', 0).clip!
    expect(teks[0]).toMatch(/50% -25% 50%\)$/)
    // Tepi akhir negatif: ekor huruf skrip tidak terpotong.
    expect(teks[1].match(/-?\d+%/g)!.every(v => Number.parseFloat(v) < 0)).toBe(true)
  })

  it('skala foto tidak pernah melewati 1,06 (DESIGN.md aturan 5)', () => {
    for (const key of ['rise', 'sweep-left', 'sweep-right', 'iris'] as const) {
      expect(Number(fotoMasuk(key).from.scale)).toBeLessThanOrEqual(1.06)
    }
  })
})

describe('gerak per keping (fase 81)', () => {
  it('tiap preset punya titik awal yang berbeda', () => {
    const presets = ['mekar', 'naik', 'sapu', 'iris', 'jatuh', 'gambar'] as const
    const sidik = new Set(presets.map(p => JSON.stringify(gerakKeping(p))))
    expect(sidik.size).toBe(presets.length)
  })
  it('bagian, tanpa, dan nilai asing tidak menghasilkan gerak', () => {
    expect(gerakKeping('bagian')).toBeNull()
    expect(gerakKeping('tanpa')).toBeNull()
    expect(gerakKeping('meledak')).toBeNull()
  })
  it('keadaan akhir selalu terbaca: clip-path akhirnya terbuka penuh', () => {
    expect(gerakKeping('gambar')!.clip![1]).toBe('inset(0% 0% 0% 0%)')
  })
})
