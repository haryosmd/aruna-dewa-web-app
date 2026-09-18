import { bodyFontChoices, fontChoices, liveTemplateIds, selectableBodyFonts, selectableFonts, templateById } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { bodyFontOf, fontStack, themeOf, themeStyle } from '../utils/theme'

/**
 * Huruf body yang bisa dipilih — dan aturan yang tidak boleh ikut terbuka bersamanya.
 *
 * `DESIGN.md` menyatakan "script/handwriting tidak pernah untuk paragraf atau navigasi". Sampai
 * fase 58 aturan itu ditegakkan oleh **struktur**: huruf body datang dari `themePresentation` dan
 * pasangan tidak punya jalan menyentuhnya. Fase 59 memberi jalan itu, jadi aturannya berhenti
 * jadi kemustahilan dan mulai jadi sesuatu yang harus dijaga. Berkas ini yang menjaganya.
 */

/** Kelima script kaligrafis di `selectableFonts`. Semuanya berbobot 400 dan bersambung. */
const script = ['charm', 'great-vibes', 'parisienne', 'pinyon', 'allura']

describe('daftar huruf body', () => {
  it('tidak memuat satu pun script kaligrafis', () => {
    // Paragraf 16px dalam Allura tidak terbaca. Kalau baris ini merah, yang salah adalah
    // daftarnya, bukan tesnya.
    for (const font of script) expect(bodyFontChoices as readonly string[], font).not.toContain(font)
  })

  it('tidak memuat `italiana`, yang display tapi bukan script', () => {
    /*
     * Dikecualikan sendiri karena alasannya berbeda dan mudah hilang: Italiana bukan huruf
     * sambung, jadi penyaring "bukan script" meloloskannya. Ia display berbobot 400 dengan
     * goresan sangat tipis, dirancang untuk ukuran besar — sah sebagai huruf judul (dan memang
     * bawaan `aruna-pelita`) dan tidak sah sebagai huruf paragraf.
     */
    expect(bodyFontChoices as readonly string[]).not.toContain('italiana')
    expect(selectableFonts.map(f => f.id)).toContain('italiana')
  })

  it('hanya berisi id yang sah dan punya stack', () => {
    for (const id of bodyFontChoices) {
      expect(fontChoices as readonly string[], id).toContain(id)
      expect(fontStack(id), id).toBeTruthy()
    }
    expect(selectableBodyFonts.map(f => f.id).sort()).toEqual([...bodyFontChoices].sort())
  })

  it('mencakup huruf body yang sudah dipakai kelima tema hidup', () => {
    // Kalau sebuah tema memakai huruf body yang tidak ada di daftar, pemilihnya akan membuka
    // dengan nilai yang tidak ada opsinya — dan menyentuh kontrol apa pun akan mengubah huruf.
    for (const tema of liveTemplateIds) {
      expect(bodyFontChoices as readonly string[], tema).toContain(themeOf(tema).body)
    }
  })
})

describe('bodyFontOf', () => {
  it('jatuh ke huruf tema saat pasangan belum memilih', () => {
    for (const tema of liveTemplateIds) {
      expect(bodyFontOf({ templateId: tema, tokens: { ...templateById(tema)!.tokens } }), tema).toBe(themeOf(tema).body)
    }
  })

  it('memakai pilihan pasangan saat sah', () => {
    const doc = { templateId: 'aruna-bloom' as const, tokens: { ...templateById('aruna-bloom')!.tokens, bodyFont: 'jost' as const } }
    expect(bodyFontOf(doc)).toBe('jost')
    expect(themeStyle(doc)['--iv-body']).toBe(fontStack('jost'))
  })

  it('menolak script yang masuk lewat dokumen suntingan tangan', () => {
    /*
     * Ini bukan pengulangan validasi zod, dan menghapusnya mencabut aturannya.
     *
     * Skema memvalidasi `bodyFont` terhadap `fontChoices` yang PENUH supaya dokumen lama tetap
     * terbaca, jadi `allura` lolos zod dengan sah. Yang menolaknya cuma penjaga di
     * `bodyFontOf()`; tanpa itu satu dokumen hasil sunting tangan cukup untuk mengatur seluruh
     * paragraf undangan dalam huruf sambung.
     */
    for (const font of script) {
      const doc = { templateId: 'aruna-bloom' as const, tokens: { ...templateById('aruna-bloom')!.tokens, bodyFont: font as never } }
      expect(bodyFontOf(doc), font).toBe(themeOf('aruna-bloom').body)
    }
  })

  it('tidak menyentuh huruf judul', () => {
    // `tokens.font` dan `tokens.bodyFont` adalah dua sumbu. Pasangan yang mengganti huruf
    // paragraf tidak boleh kehilangan huruf judulnya.
    const doc = { templateId: 'aruna-pelita' as const, tokens: { ...templateById('aruna-pelita')!.tokens, bodyFont: 'jakarta' as const } }
    const style = themeStyle(doc)
    expect(style['--iv-display']).toBe(fontStack(templateById('aruna-pelita')!.tokens.font))
    expect(style['--iv-body']).toBe(fontStack('jakarta'))
  })
})
