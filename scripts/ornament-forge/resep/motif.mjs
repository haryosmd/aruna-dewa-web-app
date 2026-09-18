import { deret, translateD, unitTema } from './tata.mjs'
import { draw, grup, mass, massHollow } from '../emit.mjs'
import { cakram, poly } from '../geometry.mjs'
import { paramUntuk } from './tema.mjs'

const W = 360
const H = 120

/**
 * Motif — pita berpola yang dijejer sebagai latar atau pembatas.
 *
 * **Satu perubahan struktural, dan ia menjawab temuan audit yang paling tajam:**
 * *"`motif-geometric` secara harfiah 13 `<rect>` bertinggi selang-seling — itu bar chart,
 * bukan motif."* Kategori ini rata-rata 14,6 perintah path, tiga dari sembilannya tanpa
 * `<path>` sama sekali.
 *
 * Sebuah motif adalah **rapport kain**: satu unit yang berulang, dan tepi kirinya harus sama
 * dengan tepi kanannya supaya ia bisa dijejer tanpa sambungan terlihat. Itu yang membedakan
 * motif dari sekadar deretan bentuk, dan itu yang dijamin di sini secara konstruksi — unit
 * dipusatkan di `(i + 0.5) / n`, jadi separuh jarak antar unit selalu tersisa di kedua tepi.
 *
 * Dua baris dengan pergeseran setengah periode, karena satu baris berulang terbaca sebagai
 * pita, bukan sebagai kain.
 */
export function motif(id) {
  const p = paramUntuk(id)
  // Dibatasi enam: di atas itu unitnya terlalu kecil untuk terbaca pada lebar pakainya, dan
  // tema berundak (`bentar`, `deco`) membayar mahal untuk detail yang tidak sampai ke mata.
  const n = Math.max(3, Math.min(6, p.rapport))
  const lebarUnit = W / n

  /** Satu baris: `n` unit, ukurannya berdenyut mengikuti `rapport`, posisinya tetap. */
  const baris = (y, r, geser, opacity) => {
    const plat = []
    const badan = []
    deret(n, p.rapport, ({ i, skala, jangkar }) => {
      const x = (i + 0.5) * lebarUnit + geser
      const rr = r * (0.66 + skala * 0.34)
      if (jangkar) plat.push(mass(translateD(unitTema(p.mahkota, rr * 1.24), x, y)))
      badan.push(jangkar
        ? massHollow(translateD(unitTema(p.mahkota, rr), x, y) + translateD(cakram(rr * 0.3), x, y), opacity)
        : mass(translateD(unitTema(p.mahkota, rr * 0.8), x, y), opacity * 0.45))
      return ''
    })
    return { plat: plat.join(''), badan: badan.join('') }
  }

  const atas = baris(H * 0.32, 21, 0, 1)
  // Baris kedua digeser setengah periode — itu yang membuat pengulangannya terbaca sebagai
  // anyaman, bukan sebagai baris yang diulang.
  const bawah = baris(H * 0.74, 16, lebarUnit / 2, 0.7)

  /*
   * Rel atas dan bawah, dan keduanya menembus tepi.
   *
   * Rel yang berhenti sebelum tepi akan menampakkan sambungan begitu motif dijejer — yaitu
   * hal yang justru sedang dihindari. Ia juga satu-satunya `data-draw` di sini.
   */
  const rel = (y) => poly([[0, y], [W, y]], false)

  return {
    file: fileDari(id),
    viewBox: `0 0 ${W} ${H}`,
    bagian: [
      grup(atas.plat + bawah.plat, 1, 'accent'),
      grup(atas.badan + bawah.badan, 1, 'body'),
      grup(draw(rel(H * 0.06), p.stroke, 0.55) + draw(rel(H * 0.97), p.stroke, 0.4)),
    ],
  }
}

const fileDari = (id) => ({
  'motif-kawung': 'MotifKawung',
  'motif-tumpal': 'MotifTumpal',
  'motif-songket': 'MotifSongket',
  'motif-arabesque': 'MotifArabesque',
  'motif-geometric': 'MotifGeometric',
  'motif-rule': 'MotifRule',
  'motif-mega-mendung': 'MotifMegaMendung',
  'motif-kenanga': 'MotifKenanga',
  'motif-catur': 'MotifCatur',
  'motif-wastra': 'MotifWastra',
  'motif-hening': 'MotifHening',
  'motif-pelita': 'MotifPelita',
}[id])

export const idMotif = [
  'motif-kawung', 'motif-tumpal', 'motif-songket', 'motif-arabesque', 'motif-geometric',
  'motif-rule', 'motif-mega-mendung', 'motif-kenanga', 'motif-catur',
  'motif-wastra', 'motif-hening', 'motif-pelita',
]
