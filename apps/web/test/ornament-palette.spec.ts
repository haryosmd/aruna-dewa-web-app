import { templates } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { contrastRatio } from '../utils/contrast'
import {
  checkRamp,
  ornamentRamp,
  ornamentRampOnDark,
  ornamentStops,
  rampMinimum,
  rampSteps,
} from '../utils/ornament-palette'
import { themeStyle } from '../utils/theme'

/**
 * Gerbang ramp warna ornamen.
 *
 * Pemilik produk menilai ornamennya monoton, dan angkanya membenarkannya: 283
 * `fill="currentColor"`, 60 `stroke="currentColor"`, nol hex di seluruh 133 komponen.
 * Rombakan ini memberi ornamen empat tingkat warna — dan berkas ini yang menjaga keempatnya
 * tetap terlihat pada kesembilan tema, termasuk setelah pasangan mengubah paletnya sendiri.
 *
 * Yang **tidak** dijaga di sini: ambang teks 4,5:1. Ornamen adalah bidang dekoratif, bukan
 * kalimat. Memaksakan ambang teks akan menolak `accent` di hampir semua tema — diukur
 * serendah 2,32:1 terhadap latarnya — dan justru di situlah aksennya bekerja.
 */

const gelapDari = (t: typeof templates[number]) => [
  { nama: 'primary', ground: t.tokens.primary },
  { nama: 'ink', ground: t.tokens.foreground },
]

describe('ramp ornamen terlihat di kesembilan tema', () => {
  it.each(templates.map(t => [t.id, t] as const))('%s — bidang terang', (_id, t) => {
    const ramp = ornamentRamp(t.tokens, t.accent)
    for (const { stop, ratio, passes } of checkRamp(ramp, t.tokens.background)) {
      expect({ stop, ratio: Number(ratio.toFixed(2)), passes }).toMatchObject({ passes: true })
    }
  })

  it.each(templates.flatMap(t => gelapDari(t).map(g => [`${t.id}/${g.nama}`, t, g.ground] as const)))(
    '%s — bidang gelap',
    (_label, t, ground) => {
      const ramp = ornamentRampOnDark(t.accent, ground)
      for (const { stop, ratio, passes } of checkRamp(ramp, ground)) {
        expect({ stop, ratio: Number(ratio.toFixed(2)), passes }).toMatchObject({ passes: true })
      }
    },
  )
})

/**
 * Dedaunan diuji SENDIRI, dan tidak ikut deret empat langkah.
 *
 * `leaf` adalah satu-satunya nilai ramp yang keluar dari keluarga rona aksen — ia dipakai
 * keping floral pack `sekar` supaya daun tidak berona sama dengan bunganya. Memasukkannya ke
 * `ornamentStops` akan membuat `rampSteps` mengukur jarak antar-rona sebagai kalau ia jarak
 * antar-terang, pada kelima tema sekaligus. Yang harus benar tentangnya cuma satu: ia terlihat
 * di atas latarnya.
 *
 * Yang sengaja TIDAK diuji: jaraknya terhadap `accent`. Diukur, ia 1,02 pada `aruna-hening`
 * dan 1,31 pada `aruna-sekar`, dan keduanya benar — aksen hening memang sudah kelabu, jadi
 * dedaunan yang diturunkan darinya juga kelabu. Tema yang aksennya sudah pucat tidak boleh
 * tiba-tiba menumbuhkan hijau jenuh hanya supaya sebuah angka naik.
 */
describe('rona dedaunan terlihat di tiap tema', () => {
  it.each(templates.map(t => [t.id, t] as const))('%s — bidang terang', (_id, t) => {
    const ramp = ornamentRamp(t.tokens, t.accent)
    const ratio = contrastRatio(ramp.leaf, t.tokens.background)
    expect({ leaf: ramp.leaf, passes: ratio >= rampMinimum.terhadapLatar }).toMatchObject({ passes: true })
  })

  it.each(templates.flatMap(t => gelapDari(t).map(g => [`${t.id}/${g.nama}`, t, g.ground] as const)))(
    '%s — bidang gelap',
    (_label, t, ground) => {
      const ramp = ornamentRampOnDark(t.accent, ground)
      const ratio = contrastRatio(ramp.leaf, ground)
      expect({ leaf: ramp.leaf, passes: ratio >= rampMinimum.terhadapLatar }).toMatchObject({ passes: true })
    },
  )

  it('menurunkannya dari aksen, bukan menyimpannya', () => {
    // Aksen digeser, dedaunan harus ikut bergeser. Kalau tidak, ada hijau yang dipanggang.
    const t = templates[0]!
    const a = ornamentRamp(t.tokens, '#C89F3B').leaf
    const b = ornamentRamp(t.tokens, '#3B6FC8').leaf
    expect(a).not.toBe(b)
  })
})

describe('ramp terbaca empat langkah, bukan dua', () => {
  it.each(templates.map(t => [t.id, t] as const))('%s — bidang terang', (_id, t) => {
    for (const langkah of rampSteps(ornamentRamp(t.tokens, t.accent))) {
      expect(langkah).toMatchObject({ passes: true })
    }
  })

  it.each(templates.flatMap(t => gelapDari(t).map(g => [`${t.id}/${g.nama}`, t, g.ground] as const)))(
    '%s — bidang gelap',
    (_label, t, ground) => {
      for (const langkah of rampSteps(ornamentRampOnDark(t.accent, ground))) {
        expect(langkah).toMatchObject({ passes: true })
      }
    },
  )

  it('mengurutkan langkah menurut terangnya, bukan menurut urutan penulisannya', () => {
    /*
     * Versi pertama membandingkan `deep→body→accent→glow` apa adanya. Di bidang gelap `body`
     * adalah kertas — stop paling terang, bukan stop kedua — jadi metriknya membandingkan
     * pasangan yang tidak pernah bersebelahan di mata, dan melaporkan 1,03 untuk ramp yang
     * baik-baik saja. Urutan tulisan bukan urutan mata.
     */
    const ramp = ornamentRampOnDark(templates[0]!.accent, templates[0]!.tokens.primary)
    const urutan = rampSteps(ramp).map(l => l.pair)
    expect(urutan[urutan.length - 1]).toContain('body')
  })
})

describe('ramp sampai ke undangan', () => {
  it('themeStyle memancarkan keempat stop sebagai hex', () => {
    const t = templates[0]!
    const style = themeStyle({ templateId: t.id, tokens: t.tokens })
    for (const stop of ornamentStops) {
      expect(style[`--iv-orn-${stop}`]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('body tidak menggeser warna ornamen yang sudah tayang', () => {
    // Ramp ditambahkan, bukan menggantikan. Kalau `body` bergeser dari `primary`, tiap
    // undangan yang sudah terbit ikut berubah warnanya tanpa ada yang memintanya.
    for (const t of templates) {
      const style = themeStyle({ templateId: t.id, tokens: t.tokens })
      expect(style['--iv-orn-body']).toBe(t.tokens.primary)
      expect(style['--iv-primary']).toBe(t.tokens.primary)
    }
  })

  it('bertahan saat pasangan mengganti primary sendiri', () => {
    // Fitur premium `design` membiarkan pasangan mengubah tiga token. Ramp yang diturunkan
    // harus ikut bergerak; itu seluruh alasan ia diturunkan alih-alih ditulis tangan.
    const t = templates[0]!
    const tokens = { ...t.tokens, primary: '#2F5D7C' }
    const style = themeStyle({ templateId: t.id, tokens })
    expect(style['--iv-orn-body']).toBe('#2F5D7C')
    expect(contrastRatio(style['--iv-orn-deep']!, tokens.background))
      .toBeGreaterThan(contrastRatio(style['--iv-orn-body']!, tokens.background))
  })
})

describe('ambang ramp adalah ambang dekoratif, dan itu disengaja', () => {
  it('jauh di bawah ambang teks, dengan alasan yang tertulis', () => {
    expect(rampMinimum.terhadapLatar).toBeLessThan(4.5)
    expect(rampMinimum.antarStop).toBeLessThan(4.5)
  })
})
