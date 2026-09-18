import { jejerProfil, translateD, tunasTema, unitTema } from './tata.mjs'
import { draw, grup, mass, massHollow } from '../emit.mjs'
import { cakram, poly, sepanjangTepi, sampleCubics, sampleCubicsRata } from '../geometry.mjs'
import { paramUntuk } from './tema.mjs'

const W = 120
const H = 160

/**
 * Segel — penutup amplop di cover gate.
 *
 * Satu-satunya kategori yang menerima prop (`initials`), dan satu-satunya yang mengukir
 * **tembus dengan `var(--iv-bg)`**: ukirannya karena itu selalu senada latar tema, seperti
 * lilin yang benar-benar dicap. Perilaku itu sudah ada di kesembilan segel sebelum rombak ini
 * dan dipertahankan apa adanya — yang berubah hanya bentuk di sekelilingnya.
 *
 * `seal-ring` adalah ornamen yang komentarnya sendiri sudah mengakui kegagalannya: *"Tema ini
 * memang tidak menambah apa-apa"* — satu lingkaran, satu ketupat, satu strip. Audit menyebutnya
 * sebagai salah satu bukti bahwa bank ini setengah jadi. Sekarang kesembilannya dibangkitkan
 * dari tata bahasa temanya sendiri.
 */
export function segel(id) {
  const p = paramUntuk(id)
  const cx = W / 2
  const cy = H * 0.52
  const r = 46

  /*
   * Cakram lilin dengan tepi berkerut.
   *
   * Lilin yang ditekan tidak pernah berbibir rata; kerutnya mengikuti `rapport` temanya, jadi
   * segel dan band bingkai satu tema berdenyut pada ketukan yang sama.
   */
  const kerut = Math.max(7, Math.min(12, p.rapport + 3))

  /*
   * Kerutnya memakai **profil tema**, bukan gelombang sinus generik.
   *
   * Versi pertama membuat lingkaran berkerut biasa, dan gerbang keunikan melaporkan 36
   * pelanggaran sekaligus: sembilan segel yang semuanya lingkaran berkerut memang bentuk yang
   * sama, dan sidik jari tahan skala jadi jumlah kerut yang berbeda pun tidak menolong. Dengan
   * `profilTema` tiap tema mendapat bibir lilin yang berbeda jenisnya — bergonjong, berundak,
   * berawan — dan bukan hanya berbeda cacahnya.
   */
  const sudutTitik = (i) => {
    const a = (Math.PI * 2 * i) / kerut - Math.PI / 2
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  }
  const tepi = []
  for (let i = 0; i < kerut; i += 1) {
    tepi.push(...jejerProfil(sudutTitik(i), sudutTitik(i + 1), 1, -r * 0.16, p.mahkota))
  }
  /*
   * Langkah 8 satuan viewBox pada cakram berjari-jari 46. Pada langkah 5 kesembilan segel
   * mendarat di 8,2–10,8 KB, di atas plafon 8.192 — dan yang mahal bukan bentuknya melainkan
   * kerapatan sampelnya, karena bibir lilin dipakai tiga kali (plat, badan, rel).
   */
  const cakramLilin = sampleCubicsRata(tepi, 8)

  /** Butiran di dalam cincin luar, mengikuti irama tema. */
  const butir = sepanjangTepi(cakramLilin, { band: 15, jumlah: kerut * 2 })
    .map(({ cx: bx, cy: by, urut }) => {
      const dalam = urut % Math.max(2, Math.round(p.rapport))
      return translateD(cakram(dalam === 0 ? 3.4 : 2), bx, by)
    })

  /** Mahkota tema di atas cakram, dan ekor pita di bawahnya. */
  const mahkota = mass(translateD(unitTema(p.mahkota, 20), cx, H * 0.12))
  /*
   * Ekor pita, dengan takik berbentuk unit tema DILUBANGI di ujungnya.
   *
   * Tanpa takik itu, sembilan ekor adalah bentuk yang sama dan gerbang keunikan benar untuk
   * mengeluhkannya. Dan takiknya harus dilubangi, bukan ditimpakan: versi pertama menaruh unit
   * itu sebagai massa di atas pita sewarna, dan gerbang `massa-tertimbun` menangkapnya pada
   * `seal-bentar` — massa sewarna di atas massa tidak pernah terlihat. Pita berujung bertakik
   * juga yang memang terjadi pada pita sungguhan.
   */
  const ekor = [-1, 1].map(s => massHollow(poly(sampleCubics([
    [[cx + s * 14, cy + r * 0.86], [cx + s * 20, H * 0.92], [cx + s * 30, H * 0.95], [cx + s * 34, H]],
    [[cx + s * 34, H], [cx + s * 18, H * 0.99], [cx + s * 8, H * 0.96], [cx + s * 4, cy + r * 0.9]],
  ], 10)) + translateD(unitTema(p.mahkota, 6), cx + s * 26, H * 0.94), s > 0 ? 1 : 0.45)).join('')

  const apit = [-1, 1].map(s => mass(translateD(
    tunasTema(p, { len: 15, r0: 6.5, dir: s, tilt: s > 0 ? -0.9 : Math.PI + 0.9 }),
    cx + s * r * 0.88, cy - r * 0.5,
  ), 0.6)).join('')

  return {
    file: fileDari(id),
    viewBox: `0 0 ${W} ${H}`,
    props: '{ initials?: string }',
    bagian: [
      // Plat aksen memakai unit tema, bukan cakram polos: cakram cocok dengan cakram mana pun.
      grup(mass(translateD(unitTema(p.mahkota, r * 1.12), cx, cy)) + ekor, 1, 'accent'),
      grup(mahkota + apit, 0.9, 'glow'),
      /*
       * Badan lilin ditandai `data-seal-body`, penanda yang sudah dikenali gerbang `data-mass`
       * sejak fase 39. Butirannya DILUBANGI lewat `evenodd`, bukan ditimpakan — plat aksen di
       * bawahnya yang kemudian terbaca lewat tiap lubang.
       */
      `<g fill="var(--iv-orn-body, currentColor)"><path data-seal-body="" fill-rule="evenodd" d="${poly(cakramLilin) + butir.join('')}" /></g>`,
      // Ukiran tembus: selalu senada latar tema, seperti cap pada lilin sungguhan.
      // Ukiran tembus berbentuk unit tema, bukan cincin polos — dengan alasan yang sama.
      `<g data-seal-carve="" fill="var(--iv-bg)" opacity="0.4">${massHollow(translateD(unitTema(p.mahkota, r * 0.78), cx, cy) + translateD(unitTema(p.mahkota, r * 0.68), cx, cy))}</g>`,
      `<text v-if="initials" x="${cx}" y="${cy + 12}" text-anchor="middle" fill="var(--iv-bg)" style="font-family: var(--iv-display, Georgia, serif); font-size: 32px; letter-spacing: 0.1em">{{ initials }}</text>`,
      grup(draw(poly(sepanjangTepi(cakramLilin, { band: 26, jumlah: 24 }).map(t => [t.cx, t.cy])), p.stroke, 0.5)),
    ],
  }
}

const fileDari = (id) => ({
  'seal-kayon': 'SealKayon',
  'seal-laurel': 'SealLaurel',
  'seal-crest': 'SealCrest',
  'seal-tumpal': 'SealTumpal',
  'seal-ring': 'SealRing',
  'seal-gonjong': 'SealGonjong',
  'seal-mendung': 'SealMendung',
  'seal-kenanga': 'SealKenanga',
  'seal-bentar': 'SealBentar',
  'seal-wastra': 'SealWastra',
  'seal-hening': 'SealHening',
  'seal-pelita': 'SealPelita',
}[id])

export const idSegel = [
  'seal-kayon', 'seal-laurel', 'seal-crest', 'seal-tumpal', 'seal-ring',
  'seal-gonjong', 'seal-mendung', 'seal-kenanga', 'seal-bentar',
  'seal-wastra', 'seal-hening', 'seal-pelita',
]
