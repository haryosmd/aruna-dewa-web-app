import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const web = fileURLToPath(new URL('..', import.meta.url))
const cari = (dir: string) =>
  readdirSync(web + dir, { recursive: true, encoding: 'utf8' })
    .filter(nama => nama.endsWith('.vue'))
    .map(nama => `${dir}/${nama.replaceAll('\\', '/')}`)
    .sort()

/*
 * Chrome aplikasi memakai skala, bukan angka yang diketik di tempat (fase 77).
 *
 * Sebelum fase ini, `components/dashboard/` memuat **79 ukuran huruf arbitrer** melawan 80
 * pemakaian token — dan 73 dari 80 itu token yang sama (`text-caption`). Skala resmi 8 langkah,
 * dalam praktiknya, adalah skala 2 langkah ditambah tujuh ukuran liar: 10/11/12/13/14/15/17px.
 * **21 arbitrer di antaranya duplikat persis token yang sudah ada** — 18× `0.8125rem` yang sama
 * dengan `text-caption`, 3× `1.0625rem` yang sama dengan `text-body-lg`. Satu berkas bahkan
 * memakai kedua ejaan sekaligus: `Field.vue` menulis nilai mentah di baris 29 dan tokennya di
 * baris 35.
 *
 * Gejalanya nol — tiap nilai liar terlihat wajar sendirian, dan hanya terbaca sebagai "acak"
 * setelah tujuh di antaranya berdiri di satu layar. Karena itu penjaganya harus membaca sumber,
 * bukan menunggu ada yang mengeluh: pemilik butuh dua fase untuk menyebutnya, dan sampai itu
 * terjadi tidak ada satu pun tes yang akan merah.
 *
 * Gerbang teks-sumber, meniru `invitation-breakpoints.spec.ts` dan `motion-rules.spec.ts`.
 */
describe('chrome aplikasi memakai skala huruf, bukan angka lepas', () => {
  const berkas = [
    ...cari('components/dashboard'),
    ...cari('components/ui'),
    ...cari('components/layout'),
    ...cari('pages/dashboard'),
  ]

  it('menemukan berkas chrome-nya, bukan daftar kosong', () => {
    expect(berkas.length).toBeGreaterThanOrEqual(40)
  })

  it('tidak ada satu pun ukuran huruf arbitrer', () => {
    const pelanggaran: string[] = []
    for (const rel of berkas) {
      const isi = readFileSync(web + rel, 'utf8')
      for (const [teks] of isi.matchAll(/text-\[[0-9.]+(?:rem|px|em)\]/g)) {
        pelanggaran.push(`${rel} → ${teks}`)
      }
    }
    /*
     * Pesannya menyebut jalan keluarnya, karena yang membaca kegagalan ini sedang menambah satu
     * baris di komponen, bukan sedang membaca DESIGN.md.
     */
    expect(pelanggaran, [
      'Chrome aplikasi memakai token skala, bukan nilai mentah. Padanannya:',
      '  12px → text-ui-label · 13px → text-caption · 14px → text-ui · 15px → text-ui-lg',
      '  16px → text-body · 17px → text-body-lg · angka metrik → text-stat',
      'Kalau tidak ada yang cocok, tambahkan tokennya di assets/css/main.css lebih dulu.',
    ].join('\n')).toEqual([])
  })

  /*
   * Token yang baru lahir gampang jadi token yang tidak pernah dipakai. Angka bawahnya diambil
   * dari hitungan sesudah konversi, dan ia menjaga arah sebaliknya: kalau seseorang mengembalikan
   * nilai mentah dengan mencabut tokennya, tes di atas tetap hijau sementara yang ini merah.
   */
  it('token UI benar-benar dipakai, bukan sekadar didefinisikan', () => {
    const semua = berkas.map(rel => readFileSync(web + rel, 'utf8')).join('\n')
    for (const token of ['text-ui-label', 'text-ui', 'text-ui-lg', 'text-caption']) {
      expect(semua.split(new RegExp(`\\b${token}\\b`)).length - 1, token).toBeGreaterThan(3)
    }
  })

  it('mendefinisikan tiap token UI yang dipakai chrome', () => {
    const css = readFileSync(web + 'assets/css/main.css', 'utf8')
    for (const token of ['--text-ui-label', '--text-ui', '--text-ui-lg', '--text-stat']) {
      expect(css, token).toContain(`${token}:`)
    }
  })
})
