import { deret, translateD, tunasTema, unitTema } from './tata.mjs'
import { draw, grup, mass, massHollow } from '../emit.mjs'
import { cakram, poly } from '../geometry.mjs'
import { paramUntuk } from './tema.mjs'

const W = 320
const H = 40
const TENGAH = H / 2

/**
 * Pemisah — pita mendatar di antara dua blok teks.
 *
 * **Kategori dengan pelanggaran keunikan terparah di seluruh audit**, dan ia bertahan sampai
 * fase 44: `divider-row` (tema Kenanga) meminjam **100%** geometrinya dari
 * `divider-lung-lungan` (tema Sogan) — kuncup yang sama digeser 2px — dan `divider-row` hanya
 * punya dua path, jadi keduanya pinjaman. Gerbang keunikan menemukannya sendiri pada frac 1,0
 * lewat metode yang sama sekali berbeda dari audit manual. Keduanya sekarang dibangkitkan dari
 * `unitTema` masing-masing, jadi mereka tidak bisa sama lagi tanpa temanya sendiri berubah.
 *
 * **Bukan band bergelombang, dan itu pelajaran dari melihat.** Percobaan pertama memakai
 * susunan yang sama dengan bingkai: siluet bertepi gelombang, di-`offsetInward` jadi band,
 * lalu ditembus isen. Gerbangnya lolos semua. Di lembar kontak hasilnya deretan oval yang
 * saling menindih — pada pita setinggi 40 satuan, band selebar 6 yang bergelombang terjepit
 * jadi lobus-lobus terpisah. Tidak satu pun dari sembilan gerbang bisa melihat itu; yang
 * melihatnya mata. Susunan yang benar untuk pemisah memang bukan band, melainkan **rel dengan
 * deretan motif berirama** di atasnya.
 */
export function pemisah(id) {
  const p = paramUntuk(id)

  /** Medalion tengah, dengan pusatnya ditembus supaya aksennya terbaca lewat lubang itu. */
  const rTengah = 13
  const medalion = massHollow(
    translateD(unitTema(p.mahkota, rTengah), W / 2, TENGAH)
    + translateD(cakram(rTengah * 0.3), W / 2, TENGAH),
  )
  const platTengah = mass(translateD(unitTema(p.mahkota, rTengah * 1.26), W / 2, TENGAH))

  /*
   * Deretan motif. Jaraknya tetap; yang berdenyut UKURANNYA, mengikuti `rapport` — aturan
   * irama yang sama dengan butiran cecek pada band bingkai, jadi pemisah dan bingkai satu tema
   * berdetak pada ketukan yang sama.
   *
   * Plat dan badan dikumpulkan TERPISAH karena keduanya hidup di lapis berbeda: menggabungkan
   * di sini berarti menimpakan massa sewarna di atas massa sewarna, kesalahan fase 41 yang
   * sekarang dijaga gerbang `massa-tertimbun`.
   */
  const langkah = 29
  const jumlah = 5
  const sisi = (tanda) => {
    const plat = []
    const badan = []
    deret(jumlah, p.rapport, ({ i, skala, jangkar }) => {
      // Meruncing ke ujung: motif terjauh dari pusat selalu paling kecil, berapa pun iramanya.
      const susut = 1 - (i / jumlah) * 0.5
      const r = 10 * skala * susut
      const x = W / 2 + tanda * (rTengah * 1.75 + langkah * (i + 0.5))
      if (r < 1.5 || x < 12 || x > W - 12) return ''
      if (jangkar) {
        plat.push(mass(translateD(unitTema(p.mahkota, r * 1.3), x, TENGAH)))
        badan.push(massHollow(
          translateD(unitTema(p.mahkota, r), x, TENGAH)
          + translateD(cakram(r * 0.28), x, TENGAH),
        ))
      }
      else {
        badan.push(mass(translateD(unitTema(p.mahkota, r * 0.78), x, TENGAH), 0.45))
      }
      return ''
    })
    return { plat: plat.join(''), badan: badan.join('') }
  }

  const kiri = sisi(-1)
  const kanan = sisi(1)

  /** Pertumbuhan di kedua sisi medalion — jenisnya mengikuti keluarga isen temanya. */
  const tunas = (tanda) => mass(translateD(
    tunasTema(p, { len: 19, r0: 8, dir: tanda, tilt: tanda > 0 ? 0 : Math.PI }),
    W / 2 + tanda * (rTengah + 2), TENGAH,
  ), 0.6)

  /*
   * Rel: dua ruas yang berhenti sebelum medalion, bukan satu garis yang menembusnya.
   *
   * Ia juga satu-satunya `data-draw` di sini, jadi ia yang membuat pemisah bisa digambar
   * DrawSVG saat di-scroll — 64% bank lama tidak punya satu pun lapisan garis.
   */
  const rel = (tanda) => poly([
    [W / 2 + tanda * (rTengah * 1.4), TENGAH],
    [W / 2 + tanda * (W / 2 - 8), TENGAH],
  ], false)

  return {
    file: fileDari(id),
    viewBox: `0 0 ${W} ${H}`,
    bagian: [
      grup(platTengah + kiri.plat + kanan.plat, 1, 'accent'),
      grup(medalion + kiri.badan + kanan.badan, 1, 'body'),
      grup(tunas(1) + tunas(-1), 1, 'glow'),
      grup(draw(rel(1), p.stroke, 0.55) + draw(rel(-1), p.stroke, 0.55)),
    ],
  }
}

const fileDari = (id) => ({
  'divider-leaf': 'Divider',
  'divider-diamond': 'DividerDiamond',
  'divider-row': 'DividerRow',
  'divider-knot': 'DividerKnot',
  'divider-wave': 'DividerWave',
  'divider-rope': 'DividerRope',
  'divider-dotted': 'DividerDotted',
  'divider-lung-lungan': 'DividerLungLungan',
  'divider-songket': 'DividerSongket',
  'divider-wastra': 'DividerWastra',
  'divider-hening': 'DividerHening',
  'divider-pelita': 'DividerPelita',
}[id])

export const idPemisah = [
  'divider-leaf', 'divider-diamond', 'divider-row', 'divider-knot', 'divider-wave',
  'divider-rope', 'divider-dotted', 'divider-lung-lungan', 'divider-songket',
  'divider-wastra', 'divider-hening', 'divider-pelita',
]
