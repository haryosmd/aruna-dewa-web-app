import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { backdropTiles, backdropWeights, liveTemplateIds, templateById } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { backdropBank, backdropOpacity, backdropStyle, selectableBackdrops, toBackdrop, toBackdropWeight } from '../utils/backdrops'
import { themeOf, themeStyle } from '../utils/theme'

/**
 * Latar undangan: yang dibuka fase 59, dan yang wajib tidak bergeser sedikit pun.
 *
 * Enam ubin sudah di repo sejak lama dan hanya satu yang pernah tayang. Membuka kelimanya murah;
 * yang mahal kalau salah adalah cabang "pasangan belum memilih apa-apa", karena **setiap**
 * undangan yang sudah terbit lewat sana.
 */

const publik = fileURLToPath(new URL('../public', import.meta.url))

describe('bank ubin latar', () => {
  it('punya berkas untuk tiap id yang ditawarkan', () => {
    // Ubin yang hilang berkasnya tidak melempar apa pun — `mask-image` yang gagal dimuat hanya
    // membuat latarnya kosong. Gejalanya "saya pilih tapi tidak ada yang berubah".
    for (const id of backdropTiles) {
      expect(existsSync(`${publik}${backdropBank[id].src}`), id).toBe(true)
    }
  })

  it('menawarkan ikut-tema dan tanpa-latar di samping keenam ubin', () => {
    // `tanpa` bukan kemewahan: tanpanya pasangan `aruna-sekar` tidak punya cara melepas damask.
    expect(selectableBackdrops.map(o => o.id)).toEqual(['tema', 'tanpa', ...backdropTiles])
  })

  it('menaruh kepekatan bawaan pada nilai yang sudah terbukti terbit', () => {
    // `sedang` = 0,07, nilai yang `aruna-sekar` pakai sejak fase 53. Memilih ubin tanpa
    // menyentuh kepekatannya karena itu menghasilkan latar yang sudah pernah dibaca tamu.
    expect(backdropOpacity.sedang).toBe(themeOf('aruna-sekar').backdrop!.motif!.opacity)
    expect(backdropOpacity.halus).toBeLessThan(backdropOpacity.sedang)
    expect(backdropOpacity.tegas).toBeGreaterThan(backdropOpacity.sedang)
    // Pagu yang disengaja: laporan keterbacaan editor tidak mengukur teks terhadap ubin.
    expect(backdropOpacity.tegas).toBeLessThanOrEqual(0.12)
  })

  it('menolak nilai yang tidak dikenal alih-alih meneruskannya', () => {
    expect(toBackdrop('songket')).toBe('songket')
    expect(toBackdrop('tidak-ada')).toBeUndefined()
    expect(toBackdrop(7)).toBeUndefined()
    expect(toBackdropWeight('tegas')).toBe('tegas')
    expect(toBackdropWeight('sangat-tegas')).toBeUndefined()
    expect(backdropWeights.every(w => backdropOpacity[w] > 0)).toBe(true)
  })
})

describe('themeStyle tidak menggeser undangan yang sudah terbit', () => {
  it('menghasilkan var latar yang identik untuk dokumen tanpa key baru', () => {
    /*
     * Jangkar anti-regresi fase ini.
     *
     * Tak satu pun dokumen yang sudah tersimpan membawa `tokens.backdrop`, jadi cabang
     * "kosong = ikut tema" melayani seluruh undangan yang sedang dibaca tamu. Nilai yang
     * dibandingkan di sini adalah nilai yang berlaku sebelum fase 59, ditulis apa adanya —
     * bukan dihitung ulang lewat fungsi yang sedang diuji.
     */
    const harapan: Record<string, [string, string, string]> = {
      'aruna-bloom': ['none', '240px', '0'],
      'aruna-wastra': ['none', '240px', '0'],
      'aruna-hening': ['none', '240px', '0'],
      'aruna-pelita': ['none', '240px', '0'],
      'aruna-sekar': ['url("/textures/sekar-damask.svg")', '180px', '0.07'],
    }

    for (const tema of liveTemplateIds) {
      const style = themeStyle({ templateId: tema, tokens: { ...templateById(tema)!.tokens } })
      expect([
        style['--iv-backdrop-mask'], style['--iv-backdrop-size'], style['--iv-backdrop-opacity'],
      ], tema).toEqual(harapan[tema])
    }
  })

  it('memadamkan latar saat pasangan memilih tanpa-latar', () => {
    const style = themeStyle({ templateId: 'aruna-sekar', tokens: { ...templateById('aruna-sekar')!.tokens, backdrop: 'tanpa' } })
    expect(style['--iv-backdrop-mask']).toBe('none')
    expect(style['--iv-backdrop-opacity']).toBe('0')
  })

  it('memasang ubin pilihan pada tema yang aslinya tanpa latar', () => {
    const style = themeStyle({ templateId: 'aruna-hening', tokens: { ...templateById('aruna-hening')!.tokens, backdrop: 'kawung', backdropWeight: 'halus' } })
    expect(style['--iv-backdrop-mask']).toBe('url("/textures/kawung.svg")')
    expect(style['--iv-backdrop-size']).toBe('200px')
    expect(style['--iv-backdrop-opacity']).toBe('0.04')
  })

  it('jatuh kembali ke tema saat nilainya tidak dikenal', () => {
    const style = themeStyle({ templateId: 'aruna-sekar', tokens: { ...templateById('aruna-sekar')!.tokens, backdrop: 'batik-palsu' as never } })
    expect(style['--iv-backdrop-mask']).toBe('url("/textures/sekar-damask.svg")')
  })

  it('memakai kepekatan sedang saat ubin dipilih tanpa bobot', () => {
    const style = themeStyle({ templateId: 'aruna-bloom', tokens: { ...templateById('aruna-bloom')!.tokens, backdrop: 'catur' } })
    expect(style['--iv-backdrop-opacity']).toBe('0.07')
  })
})

describe('backdropStyle langsung', () => {
  it('memakai 240px sebagai ukuran netral saat tidak ada latar', () => {
    expect(backdropStyle(undefined, undefined, undefined)).toEqual({
      '--iv-backdrop-mask': 'none', '--iv-backdrop-size': '240px', '--iv-backdrop-opacity': '0',
    })
  })
})
