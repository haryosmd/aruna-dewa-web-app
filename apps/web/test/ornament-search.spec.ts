import { liveTemplateIds } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { fitOf } from '../utils/ornament-fit'
import {
  bawaanSlot, cariOrnamen, disarankan, hitungPack, kandidat, normalkan, packOf,
} from '../utils/ornament-search'
import { muatLayer, muatSlot, ornamentSlots, layerSlots } from '../utils/ornament-slots'
import { ornament } from '../utils/ornaments'
import { variantSlots, variantsFor } from '../utils/ornament-variants'

/**
 * Grid Studio Ornamen, diukur sebagai fungsi.
 *
 * Seluruh penyaringan, pengurutan, dan pencarian sengaja hidup di `ornament-search.ts` alih-alih
 * di dalam SFC-nya, karena vitest di repo ini jalan di node tanpa DOM: logika yang masuk ke
 * `<script setup>` adalah logika yang tidak akan pernah diuji. Berkas ini yang membayar
 * pemisahan itu.
 */

const tema = liveTemplateIds[0]!

describe('kandidat per slot', () => {
  it('hanya mengembalikan glyph yang sah untuk slotnya', () => {
    for (const slot of ornamentSlots) {
      const daftar = kandidat({ slot })
      expect(daftar.length, slot).toBeGreaterThan(1)
      for (const id of daftar) expect(muatSlot(slot, id), `${slot}=${id}`).toBe(true)
    }
  })

  it('menyaring ladang berdasarkan jangkarnya, bukan cuma kategorinya', () => {
    for (const layer of layerSlots) {
      const daftar = kandidat({ layer })
      expect(daftar.length, layer).toBeGreaterThan(1)
      for (const id of daftar) expect(muatLayer(layer, id), `${layer}=${id}`).toBe(true)
    }
  })

  it('tidak pernah mengembalikan seluruh bank sekaligus', () => {
    /*
     * Angka yang membuat seluruh keputusan performa masuk akal, jadi ia diukur, bukan diyakini.
     *
     * Studio dibuka PER SLOT, jadi gridnya berisi satu kategori — bukan 328 keping. Rencana
     * awal fase ini sempat memperlakukan 328 sebagai ukuran grid dan hampir membeli virtual
     * list untuk masalah yang tidak ada.
     */
    const terbesar = Math.max(...ornamentSlots.map(slot => kandidat({ slot }).length))
    expect(terbesar).toBeLessThan(60)
  })
})

describe('tab Disarankan', () => {
  it('memakai kolam terkurasi apa adanya untuk keempat slot yang punya', () => {
    // Termasuk urutannya: bawaan tema wajib di depan, karena Studio menandai entri pertama
    // sebagai bawaan. Kolam yang tersusun ulang di sini akan menandai glyph yang bukan.
    for (const t of liveTemplateIds) {
      for (const slot of variantSlots) {
        expect(disarankan({ slot, templateId: t }), `${t}.${slot}`).toEqual([...variantsFor(t, slot)])
      }
    }
  })

  it('menurunkan rekomendasi dari `fitOf()` untuk slot yang tidak punya kolam', () => {
    // Lima slot skalar dan kelima jangkar tidak pernah punya kolam terkurasi. Untuk mereka
    // "disarankan" berarti ukuran yang sama dengan gerbang, hanya dihitung per keping.
    const tanpaKolam = ornamentSlots.filter(slot => !(variantSlots as readonly string[]).includes(slot))
    for (const slot of tanpaKolam) {
      const daftar = disarankan({ slot, templateId: tema })
      expect(daftar[0], slot).toBe(bawaanSlot({ slot, templateId: tema }))
      for (const id of daftar.slice(1)) expect(fitOf(id, tema).ok, `${slot}=${id}`).toBe(true)
    }
  })

  it('menaruh bawaan tema di depan tiap jangkar ladang', () => {
    for (const layer of layerSlots) {
      expect(disarankan({ layer, templateId: tema })[0], layer).toBe(bawaanSlot({ layer, templateId: tema }))
    }
  })
})

describe('tab Semua', () => {
  it('mengembalikan seluruh kandidat slot, bukan cuma yang seresep', () => {
    for (const slot of ornamentSlots) {
      expect(cariOrnamen({ slot, templateId: tema, tab: 'semua' }).sort())
        .toEqual([...kandidat({ slot })].sort())
    }
  })

  it('mengurutkan rekomendasi lebih dulu, lalu yang lolos fit', () => {
    /*
     * Inilah tempat kurasi yang dulu jadi larangan sekarang tinggal. Pasangan tetap bisa
     * mencapai keping mana pun; ia hanya tidak perlu menggulir melewati yang tidak seresep
     * untuk menemukan yang seresep.
     */
    const urut = cariOrnamen({ slot: 'divider', templateId: tema, tab: 'semua' })
    const kolam = variantsFor(tema, 'divider')
    expect(urut.slice(0, kolam.length)).toEqual([...kolam])

    const cocok = urut.map(id => fitOf(id, tema).ok)
    const pertamaTidakCocok = cocok.indexOf(false)
    if (pertamaTidakCocok !== -1) expect(cocok.slice(pertamaTidakCocok)).not.toContain(true)
  })
})

describe('pencarian dan penyaring pack', () => {
  it('mengabaikan huruf besar, diakritik, dan tanda hubung', () => {
    expect(normalkan('Pemisah-Ronce')).toBe('pemisah ronce')
    expect(normalkan('Mégá')).toBe('mega')
  })

  it('mencocokkan nama maupun id', () => {
    const hasil = cariOrnamen({ slot: 'divider', templateId: tema, tab: 'semua', query: 'ronce' })
    expect(hasil.length).toBeGreaterThan(0)
    for (const id of hasil) {
      expect(normalkan(`${ornament(id).name} ${id}`)).toContain('ronce')
    }
  })

  it('mengembalikan kosong, bukan seluruh bank, saat tidak ada yang cocok', () => {
    expect(cariOrnamen({ slot: 'divider', templateId: tema, tab: 'semua', query: 'zzzz' })).toEqual([])
  })

  it('menurunkan pack dari awalan id', () => {
    expect(packOf('melati-pemisah-ronce' as never)).toBe('melati')
    expect(packOf('ref-emas-hitam-mega-mendung-a' as never)).toBe('referensi')
    expect(packOf('divider-leaf' as never)).toBe('inti')
  })

  it('menyaring ke satu pack', () => {
    const hasil = cariOrnamen({ slot: 'corner', templateId: tema, tab: 'semua', pack: 'referensi' })
    expect(hasil.length).toBeGreaterThan(0)
    for (const id of hasil) expect(packOf(id)).toBe('referensi')
  })

  it('menghitung isi tiap pack sejumlah kandidatnya', () => {
    const hitung = hitungPack({ slot: 'corner' })
    const jml = Object.values(hitung).reduce((a, b) => a + b, 0)
    expect(jml).toBe(kandidat({ slot: 'corner' }).length)
  })
})
