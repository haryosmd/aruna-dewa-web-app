import { liveTemplateIds } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { toOrnamentOverrides } from '../utils/invitation-options'
import {
  jumlahDiganti, layerSlots, muatLayer, muatSlot, ornamentSlots,
  slotCategories, terapkanOverrides, tileWidth,
} from '../utils/ornament-slots'
import { layerSlot, ornament, ornamentBank, type OrnamentId } from '../utils/ornaments'
import { themeOrnaments } from '../utils/theme'

/**
 * Korektnes slot: apa yang boleh dipasang di mana, dan apa yang dibuang sebelum sampai renderer.
 *
 * Fase 59 melepas penyaring "harus anggota kolam tema" dan menggantinya dengan penyaring
 * kategori. Itu melonggarkan dengan sengaja — tapi hanya satu lapis. Lapis di bawahnya, yang
 * diukur di sini, tidak boleh ikut longgar: `section.data` adalah `z.record(z.unknown())` dan
 * tidak ada satu pun validasi zod di dalamnya, jadi `toOrnamentOverrides()` benar-benar
 * satu-satunya yang berdiri antara dokumen hasil suntingan tangan dan `<OrnamentGlyph>`.
 */

const tema = liveTemplateIds[0]!
const ids = Object.keys(ornamentBank) as OrnamentId[]
const pertama = (cocok: (id: OrnamentId) => boolean) => ids.find(cocok)!

describe('kosakata slot', () => {
  it('sebelas slot skalar sejak fase 69, dan tiap slot amplop punya lebih dari satu bentuk', () => {
    expect(ornamentSlots).toHaveLength(11)
    for (const slot of ['envelopePocket', 'envelopeFlap'] as const) {
      expect(ids.filter(id => muatSlot(slot, id)).length, slot).toBeGreaterThan(1)
    }
  })

  it('memberi tiap slot skalar daftar kategori yang tidak kosong', () => {
    expect(Object.keys(slotCategories).sort()).toEqual([...ornamentSlots].sort())
    for (const slot of ornamentSlots) expect(slotCategories[slot].length, slot).toBeGreaterThan(0)
  })

  it('tidak menawarkan `motif`, karena undangan tidak pernah merendernya', () => {
    /*
     * Bukan kelalaian. `OrnamentSet.motif` ada, dijaga gerbang keunikan, dan satu-satunya
     * pembacanya adalah penghitung teaser di `components/landing/Themes.vue` — nol pembacaan di
     * seluruh `components/invitation/`. Slot yang ditawarkan tapi tidak mengubah apa pun yang
     * bisa dilihat pasangan terbaca sebagai aplikasi yang rusak, jadi ia sengaja di luar.
     *
     * Kalau kelak `motif` mendapat tempat render, tes inilah yang harus dicabut lebih dulu —
     * dan pencabutannya memaksa orang membaca alasan kenapa ia tadinya di luar.
     */
    expect(ornamentSlots).not.toContain('motif')
  })

  it('menyediakan kandidat untuk tiap slot dan tiap jangkar ladang', () => {
    // Slot tanpa kandidat berarti Studio membuka panel kosong. Lebih baik merah di sini.
    for (const slot of ornamentSlots) {
      expect(ids.filter(id => muatSlot(slot, id)).length, slot).toBeGreaterThan(1)
    }
    for (const jangkar of layerSlots) {
      expect(ids.filter(id => muatLayer(jangkar, id)).length, jangkar).toBeGreaterThan(1)
    }
  })

  it('menerima glyph bawaan tiap tema hidup di slotnya sendiri', () => {
    // Menjaga `slotCategories` terhadap kenyataan: `garland` misalnya berkategori `floral`,
    // dan peta yang menebak `garland: ['garland']` akan menolak bawaan kelima tema sekaligus.
    for (const t of liveTemplateIds) {
      const set = themeOrnaments(t)
      for (const slot of ornamentSlots) expect(muatSlot(slot, set[slot]), `${t}.${slot}=${set[slot]}`).toBe(true)
      for (const glyph of set.layers) expect(ornament(glyph).category, `${t}=${glyph}`).toBe('layer')
    }
  })
})

describe('toOrnamentOverrides membuang yang tidak sah', () => {
  it('menerima glyph sekategori di slot skalar', () => {
    const set = themeOrnaments(tema)
    const lain = pertama(id => ornament(id).category === 'divider' && id !== set.divider)
    expect(toOrnamentOverrides({ divider: lain }, tema)).toEqual({ divider: lain })
  })

  it('menolak kategori yang salah', () => {
    const bingkai = pertama(id => ornament(id).category === 'frame')
    expect(toOrnamentOverrides({ divider: bingkai }, tema)).toEqual({})
  })

  it('menolak id yang tidak ada di bank', () => {
    expect(toOrnamentOverrides({ divider: 'tidak-ada-glyph-ini' }, tema)).toEqual({})
  })

  it('membuang pilihan yang sama dengan bawaan tema', () => {
    // Dokumen tidak perlu membawa penukaran yang tidak menukar apa pun, dan pasangan yang
    // kembali ke bawaan berhak ikut tema kalau temanya kelak berubah.
    const set = themeOrnaments(tema)
    expect(toOrnamentOverrides({ divider: set.divider, corner: set.corner }, tema)).toEqual({})
  })

  it('menolak keping ladang di jangkar yang salah', () => {
    const cascade = pertama(id => layerSlot(id) === 'cascade' && !ornament(id).asset)
    expect(toOrnamentOverrides({ layers: { bloom: cascade } }, tema)).toEqual({})
  })

  it('menolak aset referensi di `layers`, dan hanya di sana', () => {
    /*
     * Batas berat, bukan batas selera. Kelima keping referensi berkategori `layer` berjumlah
     * 6,43 MB, dan `OrnamentField` memasang keping ladang 2–6 kali per section di sepuluh
     * section. Slot lain memakai satu keping sekali, jadi hanya kombinasi inilah yang bisa
     * melahirkan undangan puluhan megabita di data seluler tamu.
     */
    const refLayer = pertama(id => String(id).startsWith('ref-') && ornament(id).category === 'layer')
    const jangkar = layerSlot(refLayer)!
    expect(toOrnamentOverrides({ layers: { [jangkar]: refLayer } }, tema)).toEqual({})

    const refSudut = pertama(id => String(id).startsWith('ref-') && ornament(id).category === 'corner')
    expect(toOrnamentOverrides({ corner: refSudut }, tema)).toEqual({ corner: refSudut })
  })

  it('mengembalikan objek kosong untuk masukan yang bukan objek', () => {
    for (const nilai of [null, undefined, 'x', 7, [], [{ divider: 'x' }]]) {
      expect(toOrnamentOverrides(nilai, tema)).toEqual({})
    }
    expect(toOrnamentOverrides({ layers: [] }, tema)).toEqual({})
  })

  it('masih membaca dokumen berbentuk lama apa adanya', () => {
    // Empat key skalar adalah seluruh isi dokumen yang ditulis sebelum fase 59. Tidak ada
    // migrasi, jadi bentuk itu wajib tetap terbaca.
    const set = themeOrnaments(tema)
    const lain = pertama(id => ornament(id).category === 'seal' && id !== set.seal)
    expect(toOrnamentOverrides({ seal: lain }, tema)).toEqual({ seal: lain })
  })
})

describe('terapkanOverrides menjaga bentuk set', () => {
  it('selalu menyisakan lima layer, satu per jangkar', () => {
    /*
     * Invarian yang dijaga `theme-identity.spec.ts` untuk tema; di sini ia dijaga untuk hasil
     * penggabungan. `layers` adalah array, jadi spread biasa akan menimpanya bulat-bulat dan
     * sebuah penukaran satu jangkar bisa menghapus empat keping lain tanpa satu galat pun.
     */
    for (const t of liveTemplateIds) {
      const set = themeOrnaments(t)
      const bloom = pertama(id => layerSlot(id) === 'bloom' && !ornament(id).asset)
      const hasil = terapkanOverrides(set, { layers: { bloom } })
      expect(hasil.layers, t).toHaveLength(5)
      expect(new Set(hasil.layers.map(id => layerSlot(id))).size, t).toBe(5)
      expect(hasil.layers, t).toContain(bloom)
    }
  })

  it('mengembalikan set tema apa adanya saat tidak ada penukaran', () => {
    for (const t of liveTemplateIds) expect(terapkanOverrides(themeOrnaments(t), {})).toEqual(themeOrnaments(t))
  })

  it('menghitung berapa slot yang menyimpang', () => {
    expect(jumlahDiganti({})).toBe(0)
    expect(jumlahDiganti({ divider: 'x' as OrnamentId, layers: { bloom: 'y' as OrnamentId } })).toBe(2)
  })
})

describe('tileWidth', () => {
  it('melebarkan ubin mengikuti rasio, dalam batas yang ditulis', () => {
    // Ubin persegi membuat pemisah berasio 8:1 terbaca sebagai garis tipis yang sama persis.
    const pemisah = pertama(id => ornament(id).category === 'divider' && ornament(id).ratio > 6)
    const segel = pertama(id => ornament(id).category === 'seal')
    expect(parseInt(tileWidth(pemisah), 10)).toBeGreaterThan(parseInt(tileWidth(segel), 10))
    for (const id of ids) {
      const lebar = parseInt(tileWidth(id), 10)
      expect(lebar, id).toBeGreaterThanOrEqual(64)
      expect(lebar, id).toBeLessThanOrEqual(168)
    }
  })
})
