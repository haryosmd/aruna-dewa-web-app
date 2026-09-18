import { describe, expect, it } from 'vitest'
import { templates } from '../packages/contracts/src/index'
import { checkPalette, contrastRatio, inkDark, inkLight, onPrimary, repairPalette, textContrastMinimum, tintSurface } from '../apps/web/utils/contrast'

describe('rasio kontras', () => {
  it('cocok dengan nilai referensi WCAG', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.478, 3)
    // Baris tabel DESIGN.md: ink / putih.
    expect(contrastRatio('#241A14', '#FFFFFF')).toBeGreaterThan(4.5)
  })

  it('tidak peduli urutan argumen', () => {
    expect(contrastRatio('#7A4A18', '#F6EEE2')).toBeCloseTo(contrastRatio('#F6EEE2', '#7A4A18'), 10)
  })

  it('mencampur bidang bertinta seperti color-mix in srgb', () => {
    // 9% dari #000000 di atas #FFFFFF membulat ke 232 (0,91 × 255).
    expect(tintSurface({ background: '#FFFFFF', foreground: '#000000', primary: '#000000' })).toBe('#e8e8e8')
  })
})

describe('penjaga palet undangan', () => {
  it('meloloskan keenam preset tema yang sudah diaudit', () => {
    for (const template of templates) {
      const failures = checkPalette(template.tokens).filter(check => !check.passes)
      expect(`${template.id}: ${failures.map(check => check.id).join(', ')}`).toBe(`${template.id}: `)
    }
  })

  it('menangkap palet kustom yang tidak terbaca', () => {
    /*
     * Tiga pasangan, bukan empat. Sejak tinta tombol diturunkan dari `primary` (fase 45),
     * merah muda terang ini justru **lolos** pasangan `button`: ia mendapat tinta gelap, dan
     * `#171203` di atas `#E8B4C8` bernilai 10,49. Yang tetap gagal adalah ketiga pasangan yang
     * memang tidak bisa ditolong tinta tombol.
     */
    const failing = checkPalette({ background: '#FBF6EE', foreground: '#C9C0B4', primary: '#E8B4C8' })
    expect(failing.filter(check => !check.passes).map(check => check.id)).toEqual(['body', 'accent', 'accentOnTint'])
  })

  it('memilih tinta tombol yang benar-benar lebih terbaca', () => {
    // Primary gelap menuntut tinta terang; primary terang menuntut yang gelap. Sebelum fase 45
    // hanya yang pertama ada, dan itulah sebabnya tema gelap mustahil.
    expect(onPrimary('#A93F23')).toBe(inkLight)
    expect(onPrimary('#E8B4C8')).toBe(inkDark)
    // Emas pelita: 1,97 dengan tinta terang, 9,93 dengan yang gelap.
    expect(onPrimary('#D9B978')).toBe(inkDark)
    expect(contrastRatio(onPrimary('#D9B978'), '#D9B978')).toBeGreaterThan(textContrastMinimum)
  })

  it('meloloskan palet gelap yang dulu mustahil', () => {
    // Bukti fase 45: sebelum tinta diturunkan, tidak ada palet gelap yang bisa lolos keempatnya.
    const gelap = { background: '#141719', foreground: '#F1ECE2', primary: '#D9B978' }
    expect(checkPalette(gelap).filter(check => !check.passes)).toEqual([])
  })

  it('memperbaiki palet gagal tanpa membuang pilihan warna pasangan', () => {
    const chosen = { background: '#FBF6EE', foreground: '#C9C0B4', primary: '#E8B4C8' }
    const repaired = repairPalette(chosen)
    expect(checkPalette(repaired).every(check => check.passes)).toBe(true)
    // Latar tidak pernah disentuh; itu keputusan paling terasa milik pasangan.
    expect(repaired.background).toBe(chosen.background)
  })

  it('meninggalkan palet yang sudah lolos apa adanya', () => {
    const preset = templates[0]!.tokens
    expect(repairPalette(preset)).toEqual(preset)
  })

  it('memakai ambang teks normal, bukan teks besar', () => {
    expect(textContrastMinimum).toBe(4.5)
  })
})
