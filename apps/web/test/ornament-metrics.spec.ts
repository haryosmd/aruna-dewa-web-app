import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { rakit, susunMetrik, tujuan } from '../../../scripts/ornament-metrics/build.mjs'
import { fitOf, garisTema } from '../utils/ornament-fit'
import { ornamentMetrics } from '../utils/ornament-metrics'
import { ornamentBank } from '../utils/ornaments'
import { semuaVarianTerkurasi } from '../utils/ornament-variants'
import { liveTemplateIds } from '@aruna/contracts'
import { themeOrnaments } from '../utils/theme'

/**
 * Tabel metrik ornamen: segar, lengkap, dan sepakat dengan gerbang yang melahirkannya.
 *
 * `ornament-metrics.ts` dibangkitkan dari `jalankan()` karena lencana kecocokan di Studio butuh
 * angka yang hanya bisa diukur dengan membaca berkas `.vue` dari disk. Berkas hasil generate
 * punya satu mode gagal yang khas: ia basi diam-diam. Sebuah glyph digambar ulang, ketebalannya
 * berubah, tabelnya tidak — dan lencananya mulai berbohong tanpa satu tes pun merah.
 */

describe('tabel metrik ornamen segar', () => {
  it('sama persis dengan yang dirakit ulang dari pengukuran', () => {
    /*
     * Pesan gagalnya menyebut jalan keluarnya, karena kegagalan di sini punya dua sebab yang
     * berlawanan: kalau glyph-nya yang berubah, jalankan ulang generatornya; kalau tabelnya
     * yang disunting tangan, suntingan itu yang salah tempat.
     */
    expect(
      readFileSync(tujuan as string, 'utf8'),
      'tabel metrik menyimpang dari pengukuran — jalankan `pnpm ornament:metrics --tulis`',
    ).toBe(rakit(susunMetrik()))
  })

  it('menutup seluruh bank, dua arah', () => {
    /*
     * Dua arah, dan keduanya perlu. Yang hilang membuat lencana buta pada glyph yang baru
     * ditambahkan; yang berlebih berarti tabel menyimpan glyph yang sudah dicabut dari bank,
     * dan pemilih bisa menawarkan id yang tidak bisa dirender.
     *
     * Inilah juga yang menangkap pola pendaftaran ketiga di `ornaments.ts`: `bacaBank()`
     * mem-parse dua bentuk saja (objek literal dan helper `layer(...)`), jadi bentuk ketiga
     * akan hilang dari tabel tanpa satu galat pun.
     */
    expect(Object.keys(ornamentMetrics).sort()).toEqual(Object.keys(ornamentBank).sort())
  })

  it('mengukur tiap glyph yang dipakai tema hidup', () => {
    // Glyph tema adalah satu-satunya yang lencananya WAJIB benar: ia jadi pembanding untuk
    // semua kandidat lain lewat `garisTema()`. Tidak terukur di sini berarti mesin lencananya
    // buta pada titik acuannya sendiri.
    for (const tema of liveTemplateIds) {
      const set = themeOrnaments(tema)
      for (const glyph of [set.frame, set.divider, set.corner, set.motif, set.symbol, set.seal]) {
        expect(ornamentMetrics[glyph]?.garis.length, `${tema}: ${glyph}`).toBeGreaterThan(0)
        expect(ornamentMetrics[glyph]?.rel, `${tema}: ${glyph}`).toBe(true)
      }
    }
  })

  it('memberi tiap tema hidup satu ketebalan garis, bukan dua', () => {
    // Cermin `gerbangKohesi` di sisi browser. Kalau ini dua, `fitOf()` membandingkan kandidat
    // terhadap tema yang sendirinya tidak seragam, dan lencananya tidak berarti apa-apa.
    for (const tema of liveTemplateIds) expect(garisTema(tema), tema).toHaveLength(1)
  })
})

describe('lencana browser sepakat dengan gerbang node', () => {
  it('meloloskan tiap anggota kolam terkurasi', () => {
    /*
     * Tes jembatan, dan ia yang membuat seluruh fitur ini jujur.
     *
     * Kolam terkurasi diukur `ukur()` di node lewat `ornament-variants.spec.ts`; lencana Studio
     * diukur `fitOf()` di browser lewat tabel hasil generate. Dua mesin, satu pertanyaan. Tanpa
     * tes ini keduanya bisa menyimpang dan pasangan melihat peringatan "ketebalan garis berbeda
     * dari tema" tepat pada keping yang gerbang nyatakan seresep — lencana yang salah pada
     * himpunan yang paling kami yakini adalah lencana yang mengajari orang mengabaikannya.
     */
    for (const { tema, slot, glyph } of semuaVarianTerkurasi()) {
      const fit = fitOf(glyph, tema)
      expect(fit.flags, `${tema}.${slot}=${glyph} — ${fit.ringkas}`).toEqual([])
      expect(fit.ok).toBe(true)
    }
  })

  it('tidak pernah menuduh aset referensi soal ketebalan yang tidak pernah diukur', () => {
    // `garis` kosong berarti tidak terukur, bukan tidak cocok. Melaporkan `garis` di sini akan
    // menempelkan peringatan yang tidak punya dasar pengukuran ke 65 aset sekaligus.
    const referensi = Object.entries(ornamentMetrics).filter(([, m]) => m.tetap)
    expect(referensi).toHaveLength(65)
    for (const [id] of referensi) {
      const fit = fitOf(id as never, liveTemplateIds[0]!)
      expect(fit.flags, id).toContain('warna')
      expect(fit.flags, id).not.toContain('garis')
      expect(fit.ok).toBe(false)
    }
  })
})
