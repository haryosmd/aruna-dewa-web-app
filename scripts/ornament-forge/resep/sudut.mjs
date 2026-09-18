import { bandBerukir, jejerProfil, translateD, tunasTema, unitTema } from './tata.mjs'
import { grup, mass } from '../emit.mjs'
import { sampleCubicsRata } from '../geometry.mjs'
import { paramUntuk } from './tema.mjs'

const S = 170

/**
 * Sudut — siku berukir di pojok kartu.
 *
 * Diukur di titik pakainya, sudut adalah ornamen yang paling sering dirender kecil:
 * `corner-flourish` dulu dipasang `h-10 w-10` dari viewBox 170, yang membuat stroke 1,1
 * menyusut jadi **0,31px tinta** — praktis tak terlihat, dan itulah asal keluhan "garis tipis"
 * yang memulai seluruh rombak bermassa. Karena itu sudut dibangun dari BAND bermassa.
 *
 * **Siluetnya diturunkan dari profil temanya, dan itu bukan pilihan gaya.** Versi pertama
 * membangunnya dari persegi panjang generik dengan hanya satu unit khas tema di sikunya, dan
 * gerbang keunikan melonjak 1 → 144 pelanggaran: sidik jarinya tahan skala, jadi persegi
 * panjang selalu cocok dengan persegi panjang. Sekarang tepi diagonalnya bergelombang
 * mengikuti `profilTema`, dan band, rel, serta isen semuanya diturunkan dari tepi itu —
 * cara yang sama persis dengan yang membuat tiga belas bingkai lolos gerbang sejak fase 41.
 */
export function sudut(id) {
  const p = paramUntuk(id)
  const tepi = 12
  const lengan = S * 0.86

  /*
   * Siluet: dua lengan lurus di tepi kartu, lalu tepi dalam yang bergelombang kembali ke
   * siku. Gelombangnya menghadap KELUAR dari siku (menggunung ke arah pojok berlawanan),
   * jadi bentuknya terbaca tumbuh dari pojok, bukan ditempel di pojok.
   */
  const lobus = Math.max(2, Math.min(5, Math.round(p.rapport / 2) + 1))
  const luar = sampleCubicsRata([
    // Tepi atas, lurus.
    [[tepi, tepi], [tepi + 30, tepi], [lengan - 30, tepi], [lengan, tepi]],
    // Tepi diagonal bergelombang, dari ujung lengan atas ke ujung lengan kiri.
    ...jejerProfil([lengan, tepi], [tepi, lengan], lobus, 22 * (0.8 + p.isenSkala * 0.5), p.mahkota),
    // Tepi kiri, lurus, kembali ke siku.
    [[tepi, lengan], [tepi, lengan - 30], [tepi, tepi + 30], [tepi, tepi]],
  ], 9)

  const band = 21
  const dalam = sampleCubicsRata([
    [[tepi + band, tepi + band], [tepi + 40, tepi + band], [lengan - 46, tepi + band], [lengan - 34, tepi + band]],
    ...jejerProfil([lengan - 34, tepi + band], [tepi + band, lengan - 34], lobus, 13 * (0.8 + p.isenSkala * 0.5), p.mahkota),
    [[tepi + band, lengan - 34], [tepi + band, lengan - 40], [tepi + band, tepi + 40], [tepi + band, tepi + band]],
  ], 9)

  /*
   * Tunas dari siku: unit tema, lalu dua sulur yang menjalar. Sulur wajib bertangkai —
   * aturan bentuk paling tegas di kosakata ini: curl telanjang terbaca sebagai spiral teknis.
   */
  const pusat = [tepi + band * 1.5, tepi + band * 1.5]
  const menjalar = [0.72, 1.5].map((arah, k) => mass(translateD(
    tunasTema(p, { len: 34 + p.rapport, r0: 13, dir: k ? -1 : 1, tilt: arah }),
    pusat[0], pusat[1],
  ), k ? 0.45 : 1)).join('')

  const lapis = bandBerukir(luar, dalam, p, { band, jumlah: Math.round(9 + p.rapport) })

  return {
    file: fileDari(id),
    viewBox: `0 0 ${S} ${S}`,
    bagian: [
      lapis[0],
      lapis[1],
      grup(menjalar + mass(translateD(unitTema(p.mahkota, 11), pusat[0] + 2, pusat[1] + 2), 0.7), 0.85, 'glow'),
      lapis[2],
    ],
  }
}

const fileDari = (id) => ({
  'corner-flourish': 'Corner',
  'corner-vine': 'CornerVine',
  'corner-angle': 'CornerAngle',
  'corner-deco': 'CornerDeco',
  'corner-batik': 'CornerBatik',
  'corner-fan': 'CornerFan',
  'corner-pucuak-rabuang': 'CornerPucuakRabuang',
  'corner-wadasan': 'CornerWadasan',
  'corner-kenanga': 'CornerKenanga',
  'corner-catur': 'CornerCatur',
  'corner-wastra': 'CornerWastra',
  'corner-hening': 'CornerHening',
  'corner-pelita': 'CornerPelita',
}[id])

export const idSudut = [
  'corner-flourish', 'corner-vine', 'corner-angle', 'corner-deco', 'corner-batik',
  'corner-fan', 'corner-pucuak-rabuang', 'corner-wadasan', 'corner-kenanga', 'corner-catur',
  'corner-wastra', 'corner-hening', 'corner-pelita',
]
