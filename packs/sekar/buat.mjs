#!/usr/bin/env node
/**
 * Pembangun pack ornamen `sekar` — fase 53.
 *
 * **Kosakatanya dipelajari, bentuknya dihitung.** Sembilan ekspor Canva milik pemilik
 * (`docs/features/ornament-builder/imported/canva-sekar/`) diukur lebih dulu — viewBox,
 * kerapatan, dan ramp warna yang benar-benar dirender — lalu yang diambil hanya kosakata dan
 * proporsinya: ukel, tumpal, cecek, kelopak cat air, dan simpul damask. Tidak ada satu path
 * pun yang disalin; seluruh koordinat di `svg/` lahir dari `geometri.mjs`.
 *
 * **Gradasi adalah syarat, bukan hiasan.** Permintaan pemilik: "warna dan skema warna
 * gradasinya pastikan sama, jangan datar". Tiap glyph karena itu memakai tiga dari empat stop
 * ramp ornamen dan minimal satu `<linearGradient>` pada bidang bermassa terbesarnya. Nilai
 * stopnya `var(--iv-orn-*)`, jadi gradasinya ikut palet pasangan dan bukan warna yang
 * dipanggang ke berkas — pelajaran yang sama yang membuat tekstur latar dipasang sebagai
 * `mask-image`.
 *
 * **Tujuannya `packs/sekar/`, bukan `docs/`.** Pack `kayon` menaruh pembangunnya di docs lalu
 * menyalin hasilnya; salinan itu yang membuat 92 glyph sempat hidup hanya di satu mesin.
 * Di sini pembangun dan hasilnya tinggal berdampingan di direktori yang terlacak git.
 *
 *   node packs/sekar/buat.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { busur, cakram, cincin, daun, damask, halus, kelopak, n, pada, segiBulat, tangkai, tumpal, ukel } from './geometri.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const SVG = join(HERE, 'svg')
const TEKSTUR = join(HERE, 'tekstur')

/* ── penulisan ──────────────────────────────────────────────────────────────── */

const AKSEN = 'var(--iv-orn-accent, currentColor)'
const GLOW = 'var(--iv-orn-glow, currentColor)'
const DALAM = 'var(--iv-orn-deep, currentColor)'

/**
 * Rona dedaunan.
 *
 * Cadangannya bertingkat dengan sengaja: tema yang belum memancarkan `--iv-orn-leaf` jatuh ke
 * aksen, dan konteks yang tidak memancarkan ramp sama sekali — empat belas tempat di undangan
 * memaksa `color:` sendiri — jatuh ke `currentColor`. Jadi keping ini tidak pernah hilang, ia
 * hanya kehilangan ronanya.
 */
const DAUN = 'var(--iv-orn-leaf, var(--iv-orn-accent, currentColor))'

/** Massa berwarna ramp. Tanpa `isi`, ia mewarisi `body` dari elemen `<svg>` induknya. */
const massa = (d, { isi, evenodd = false } = {}) =>
  `<path data-mass=""${evenodd ? ' fill-rule="evenodd"' : ''}${isi ? ` fill="${isi}"` : ''} d="${d}"/>`

/** Lapisan garis. `stroke-width` apa pun di sini akan diseragamkan importir ke ketebalan pack. */
const garis = (d, { opacity = 0.45, lebar = 3.2 } = {}) =>
  `<path data-draw="" fill="none" stroke="currentColor" stroke-width="${lebar}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" d="${d}"/>`

const grup = (id, lapis, isi, { opacity } = {}) =>
  `<g id="${id}" data-layer="${lapis}"${opacity ? ` opacity="${opacity}"` : ''}>${isi}</g>`

/**
 * Gradient ramp glyph.
 *
 * `gradientUnits="userSpaceOnUse"` supaya arahnya ditentukan koordinat viewBox dan tidak
 * berubah mengikuti kotak pembatas tiap bidang yang memakainya — dua bidang sebentuk pada
 * ketinggian berbeda harus mewarisi gradasi yang sama, bukan masing-masing mengulangnya.
 *
 * Id diawali id glyph karena `Glyph.vue` merender beberapa ornamen dalam satu halaman, dan
 * `url(#…)` tidak punya ruang nama.
 */
function rampDef(id, [x1, y1, x2, y2], stop) {
  const stops = stop.map(([off, warna, op]) =>
    `<stop offset="${off}" stop-color="${warna}"${op == null ? '' : ` stop-opacity="${op}"`}/>`).join('')
  return `<linearGradient id="sekar-${id}-ramp" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`
}

/** Ramp baku: aksen terang di pangkal gradasi, badan di tengah, ukiran gelap di ujungnya. */
const rampEmas = (id, arah) => rampDef(id, arah, [
  ['0', AKSEN],
  ['0.42', 'currentColor'],
  ['1', 'var(--iv-orn-deep, currentColor)'],
])

/** Ramp cat air: pucat di tepi kelopak, pekat di jantungnya. */
const rampAir = (id, arah) => rampDef(id, arah, [
  ['0', GLOW],
  ['0.5', AKSEN],
  ['1', 'currentColor'],
])

const daftar = []
function tambah({ id, nama, kategori, w, h, peran, defs = '', isi, catatan }) {
  const penuh = `sekar-${id}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="currentColor" role="img" aria-labelledby="${penuh}-title">`
    + `<title id="${penuh}-title">${nama}</title>`
    + (defs ? `<defs>${defs}</defs>` : '')
    + isi
    + '</svg>\n'
  const berkas = join(SVG, `${penuh}.svg`)
  writeFileSync(berkas, svg)
  // `data-layer` dibaca balik dari hasilnya, bukan didaftar tangan: itu yang membuat entri
  // katalog tidak bisa berselisih dengan berkasnya.
  const lapisan = [...new Set([...svg.matchAll(/data-layer="([^"]+)"/g)].map(m => m[1]))]
  daftar.push({
    id: penuh, nama, kategori, w, h, peran, catatan,
    bytes: Buffer.byteLength(svg),
    lapisan,
    sha256: createHash('sha256').update(readFileSync(berkas)).digest('hex'),
  })
}

/* ── cecek: butiran isen, dipakai di hampir semua glyph ─────────────────────── */

const cecekBusur = (cx, cy, r, a0, a1, jml, ukuran) =>
  Array.from({ length: jml }, (_, i) => {
    const [x, y] = pada(cx, cy, r, a0 + ((a1 - a0) * i) / Math.max(1, jml - 1))
    return cakram(x, y, ukuran)
  }).join('')

/**
 * Anyaman — rongga belah ketupat yang DILUBANGI, bukan ditimpakan.
 *
 * Ini persis temuan fase 42 yang dicatat `verify.mjs`: isen yang ditimpakan di atas badan
 * sewarna tidak akan terlihat sama sekali. Jadi keping-kepingnya ikut di dalam `d` yang sama
 * dengan badannya, di bawah `fill-rule="evenodd"`.
 */
const anyaman = (cx, cy, lebar, tinggi, baris) => {
  const keping = []
  for (let r = 0; r < baris; r++) {
    const t = (r + 0.5) / baris
    const w = (lebar / 2) * (1 - t * 0.78)
    const kolom = Math.max(1, baris - r - 1)
    for (let c = 0; c < kolom; c++) {
      const x = cx + (kolom === 1 ? 0 : (c / (kolom - 1) - 0.5) * w * 1.5)
      const y = cy + t * tinggi * 0.86 - tinggi * 0.36
      const s = 4.6 * (1 - t * 0.4)
      keping.push(halus([[x, y - s], [x + s * 0.72, y], [x, y + s], [x - s * 0.72, y]], { tegangan: 0.7 }))
    }
  }
  return keping.join('')
}

const cecekGaris = (x0, y0, x1, y1, jml, ukuran) =>
  Array.from({ length: jml }, (_, i) => {
    const t = jml === 1 ? 0.5 : i / (jml - 1)
    return cakram(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, ukuran)
  }).join('')

mkdirSync(SVG, { recursive: true })
mkdirSync(TEKSTUR, { recursive: true })

/* ── bingkai ────────────────────────────────────────────────────────────────── */

/**
 * Gapura lengkung, dari referensi H.
 *
 * Yang di referensi adalah garis rambut setebal satu piksel; di sini ia jadi band bermassa
 * berongga `evenodd`, karena bank ini digambar bermassa sejak rombak 2026-09-12 dan garis
 * rambut menghilang di titik pakainya.
 */
{
  const arc = (r) => busur(150, 150, r, 180, 360)
  const luar = `M24 404L24 150${arc(126)}L276 404Z`
  const dalam = `M34 404L34 150${arc(116)}L266 404Z`
  tambah({
    id: 'bingkai-gapura',
    nama: 'Gapura sekar',
    kategori: 'frame',
    w: 300, h: 420,
    peran: 'dekorasi-original',
    catatan: 'Siluet gapura; band berongga, bukan garis rambut.',
    defs: rampEmas('bingkai-gapura', [150, 24, 150, 410]),
    isi:
      grup('sekar-bingkai-gapura-band', 'frame',
        massa(luar + dalam, { isi: 'url(#sekar-bingkai-gapura-ramp)', evenodd: true }))
      + grup('sekar-bingkai-gapura-kunci', 'crown',
        massa(tumpal(150, 36, 30, 52) + cakram(150, 58, 6) + cakram(150, 76, 4), { isi: AKSEN, evenodd: true }))
      + grup('sekar-bingkai-gapura-cecek', 'isen',
        massa(cecekBusur(150, 150, 104, 192, 348, 9, 3.6)), { opacity: '0.45' })
      + grup('sekar-bingkai-gapura-rel', 'frame',
        garis(`M52 392L52 150${busur(150, 150, 98, 180, 360)}L248 392`, { opacity: 0.55 })
        + garis(`M52 214${ukel(74, 236, 24, { putaran: 1.25, awal: 180, arah: 1 }).replace(/^M[\d.\- ]+/, 'L74 212')}`, { opacity: 0.7 })
        + garis(`M248 214${ukel(226, 236, 24, { putaran: 1.25, awal: 0, arah: -1 }).replace(/^M[\d.\- ]+/, 'L226 212')}`, { opacity: 0.7 })),
  })
}

/**
 * Oval berbibir, dari referensi I.
 *
 * Referensinya bingkai stadion emas yang dikepung cat air. Bunganya hidup sebagai glyph
 * `floral` tersendiri supaya bisa dipasang tanpa bingkainya — itu justru yang diminta
 * pemilik ketika ia meminta yang berpasangan kiri-kanan dipecah.
 */
{
  const stadion = (r, x0, x1) =>
    `M${n(x0)} 130${busur(150, 130, r, 180, 360)}L${n(x1)} 290${busur(150, 290, r, 0, 180)}Z`
  /** Patran menempel pada band: pangkalnya di jari-jari bibir, ujungnya keluar menyerong. */
  const patran = (cx, cy, sudut, panjang, lebar) => {
    const [x0, y0] = pada(cx, cy, 84, sudut)
    const [x1, y1] = pada(cx, cy, 84 + panjang, sudut - 26)
    return daun(x0, y0, x1, y1, lebar)
  }
  const daunTepi = [
    patran(150, 290, 128, 40, 13), patran(150, 290, 106, 46, 14), patran(150, 290, 84, 38, 12),
    patran(150, 130, 308, 40, 13), patran(150, 130, 286, 46, 14), patran(150, 130, 264, 38, 12),
  ].join('')
  tambah({
    id: 'bingkai-oval',
    nama: 'Oval sekar',
    kategori: 'frame',
    w: 300, h: 420,
    peran: 'dekorasi-original',
    catatan: 'Bingkai stadion dengan patran di dua sudut berlawanan.',
    defs: rampEmas('bingkai-oval', [60, 40, 240, 400]),
    isi:
      grup('sekar-bingkai-oval-band', 'frame',
        massa(stadion(90, 60, 240) + stadion(79, 71, 229), { isi: 'url(#sekar-bingkai-oval-ramp)', evenodd: true }))
      + grup('sekar-bingkai-oval-patran', 'floral', massa(daunTepi, { isi: DAUN }))
      + grup('sekar-bingkai-oval-cecek', 'isen',
        massa(cecekBusur(150, 130, 68, 196, 344, 7, 3.4) + cecekBusur(150, 290, 68, 16, 164, 7, 3.4)),
        { opacity: '0.4' })
      + grup('sekar-bingkai-oval-rel', 'frame',
        garis(`M88 130${busur(150, 130, 62, 180, 360)}L212 290${busur(150, 290, 62, 0, 180)}Z`, { opacity: 0.5 })),
  })
}

/**
 * Segi bersilang, dari referensi F dan G.
 *
 * Referensi F memakai **516 KB untuk bentuk ini** — 774 serpih terklip yang meniru gradient
 * satu per satu, karena ekspor Canva tidak punya `<linearGradient>`. Di sini gradasinya satu
 * definisi, dan sudutnya dibulatkan dengan kubik sungguhan supaya gerbang `kurva` mengukur
 * bentuk yang memang melengkung, bukan poligon yang dibulatkan `stroke-linejoin`.
 */
{
  const bandA = segiBulat(160, 160, 140, 7, { mulai: -96, bulat: 0.1, jitter: [0.02, -0.04, 0.03, -0.02, 0.04, -0.03, 0.01] })
    + segiBulat(160, 160, 132, 7, { mulai: -96, bulat: 0.1, jitter: [0.02, -0.04, 0.03, -0.02, 0.04, -0.03, 0.01] })
  const bandB = segiBulat(160, 160, 134, 8, { mulai: -54, bulat: 0.09, jitter: [-0.03, 0.02, -0.02, 0.04, -0.04, 0.03, -0.01, 0.02] })
    + segiBulat(160, 160, 127, 8, { mulai: -54, bulat: 0.09, jitter: [-0.03, 0.02, -0.02, 0.04, -0.04, 0.03, -0.01, 0.02] })
  tambah({
    id: 'bingkai-segi',
    nama: 'Segi bersilang',
    kategori: 'frame',
    w: 320, h: 320,
    peran: 'dekorasi-original',
    catatan: 'Dua poligon bersilang; gradasi satu definisi, bukan 774 serpih.',
    defs: rampEmas('bingkai-segi', [20, 20, 300, 300])
      + rampDef('bingkai-segi-silang', [300, 30, 40, 290], [['0', AKSEN], ['1', 'currentColor']]),
    isi:
      grup('sekar-bingkai-segi-tujuh', 'frame',
        massa(bandA, { isi: 'url(#sekar-bingkai-segi-ramp)', evenodd: true }))
      + grup('sekar-bingkai-segi-delapan', 'frame',
        massa(bandB, { isi: 'url(#sekar-bingkai-segi-silang-ramp)', evenodd: true }), { opacity: '0.62' })
      + grup('sekar-bingkai-segi-cecek', 'isen',
        massa(Array.from({ length: 7 }, (_, i) => {
          const [x, y] = pada(160, 160, 148, -96 + (360 / 7) * i)
          return cakram(x, y, 4.4)
        }).join('')), { opacity: '0.5' })
      + grup('sekar-bingkai-segi-rel', 'frame',
        garis(segiBulat(160, 160, 112, 7, { mulai: -96, bulat: 0.14 }), { opacity: 0.4 })),
  })
}

/* ── pemisah ────────────────────────────────────────────────────────────────── */

/**
 * Mahkota berel ganda, dari referensi E.
 *
 * Referensinya memang dua rel sejajar dengan mahkota sulur di tengahnya; yang tidak diambil
 * adalah ketipisannya — dua rel setebal 1 satuan pada lebar pakai 320 px menghilang.
 */
{
  const rel = (y, x0, x1) => `M${x0} ${y}L${x1} ${y}`
  tambah({
    id: 'pemisah-mahkota',
    nama: 'Mahkota berel',
    kategori: 'divider',
    w: 320, h: 40,
    peran: 'dekorasi-original',
    catatan: 'Mahkota ukel di antara dua rel; rel ditebalkan agar terbaca.',
    defs: rampEmas('pemisah-mahkota', [120, 40, 200, 4]),
    isi:
      grup('sekar-pemisah-mahkota-mahkota', 'crown',
        massa([
          kelopak(160, 38, 36, 11, -90),
          kelopak(160, 38, 29, 10, -124), kelopak(160, 38, 29, 10, -56),
          kelopak(160, 38, 21, 8, -154), kelopak(160, 38, 21, 8, -26),
        ].join(''), { isi: 'url(#sekar-pemisah-mahkota-ramp)' }))
      + grup('sekar-pemisah-mahkota-inti', 'crown', massa(cakram(160, 36, 7), { isi: AKSEN }))
      + grup('sekar-pemisah-mahkota-daun', 'floral',
        massa(daun(134, 34, 92, 14, 10) + daun(186, 34, 228, 14, 10), { isi: AKSEN }), { opacity: '0.75' })
      + grup('sekar-pemisah-mahkota-cecek', 'isen',
        massa(cecekGaris(32, 18, 100, 18, 4, 2.8) + cecekGaris(220, 18, 288, 18, 4, 2.8)), { opacity: '0.5' })
      + grup('sekar-pemisah-mahkota-rel', 'divider',
        garis(rel(26, 12, 112) + rel(26, 208, 308), { opacity: 0.7 })
        + garis(rel(35, 44, 112) + rel(35, 208, 276), { opacity: 0.35 })),
  })
}

/**
 * Sulur berjalan, dari referensi A.
 *
 * Ukel-nya bergantian arah tiap unit — di referensi itu yang membuat pita tepi terbaca
 * bergerak, bukan berulang.
 */
{
  const spine = halus([[12, 26], [76, 12], [160, 28], [244, 12], [308, 26]], { tutup: false })
  const gulung = [
    ukel(60, 22, 11, { putaran: 1, awal: 90, arah: 1 }),
    ukel(120, 24, 9, { putaran: 1, awal: -90, arah: -1 }),
    ukel(200, 24, 9, { putaran: 1, awal: 270, arah: 1 }),
    ukel(260, 22, 11, { putaran: 1, awal: 90, arah: -1 }),
  ].join('')
  tambah({
    id: 'pemisah-sulur',
    nama: 'Sulur berjalan',
    kategori: 'divider',
    w: 320, h: 40,
    peran: 'dekorasi-original',
    catatan: 'Ukel bergantian arah tiap unit.',
    defs: rampEmas('pemisah-sulur', [12, 20, 308, 20]),
    isi:
      grup('sekar-pemisah-sulur-daun', 'floral',
        massa([
          daun(90, 20, 106, 6, 6), daun(160, 28, 160, 6, 7), daun(230, 20, 214, 6, 6),
          daun(36, 24, 20, 12, 5), daun(284, 24, 300, 12, 5),
        ].join(''), { isi: DAUN }))
      + grup('sekar-pemisah-sulur-mata', 'isen',
        massa(cakram(60, 22, 3.4) + cakram(120, 24, 3) + cakram(200, 24, 3) + cakram(260, 22, 3.4), { isi: AKSEN }),
        { opacity: '0.85' })
      + grup('sekar-pemisah-sulur-rel', 'divider', garis(spine, { opacity: 0.6 }) + garis(gulung, { opacity: 0.5 })),
  })
}

/* ── sudut ──────────────────────────────────────────────────────────────────── */

/**
 * Sudut sulur kiri, dari referensi A.
 *
 * Referensinya menaruh sepasang sudut yang saling berputar 180°; permintaan pemilik adalah
 * **memecah yang berpasangan kiri-kanan**, jadi keduanya jadi glyph tersendiri. Dan keduanya
 * benar-benar digambar terpisah: yang kanan bukan cerminan yang kiri, melainkan komposisi
 * lain dengan kosakata yang sama — dua ukel besar, bukan tiga yang menyusut.
 */
{
  const spine = halus([[158, 16], [92, 30], [46, 62], [24, 122], [16, 156]], { tutup: false })
  tambah({
    id: 'sudut-sulur-kiri',
    nama: 'Sudut sulur kiri',
    kategori: 'corner',
    w: 170, h: 170,
    peran: 'dekorasi-original',
    catatan: 'Tiga ukel menyusut di sepanjang tulang diagonal.',
    defs: rampEmas('sudut-sulur-kiri', [160, 10, 20, 160]),
    isi:
      grup('sekar-sudut-sulur-kiri-tumpal', 'crown',
        massa(tumpal(72, 42, 48, 62) + anyaman(72, 60, 30, 30, 4), { isi: 'url(#sekar-sudut-sulur-kiri-ramp)', evenodd: true }))
      + grup('sekar-sudut-sulur-kiri-daun', 'floral',
        massa(daun(120, 24, 148, 42, 11) + daun(40, 96, 22, 68, 10) + daun(96, 34, 116, 56, 8) + daun(34, 132, 56, 150, 8),
          { isi: DAUN }))
      + grup('sekar-sudut-sulur-kiri-cecek', 'isen',
        massa(cecekGaris(142, 30, 30, 142, 6, 3)), { opacity: '0.45' })
      + grup('sekar-sudut-sulur-kiri-rel', 'corner',
        garis(spine, { opacity: 0.7 })
        + garis(ukel(142, 34, 15, { putaran: 1.25, awal: 20, arah: 1 }), { opacity: 0.6 })
        + garis(ukel(96, 96, 12, { putaran: 1.25, awal: 130, arah: -1 }), { opacity: 0.5 })
        + garis(ukel(34, 142, 9, { putaran: 1.25, awal: 200, arah: 1 }), { opacity: 0.45 })),
  })
}

/** Sudut sulur kanan — komposisi kembarannya, bukan cerminannya. */
{
  const spine = halus([[12, 18], [78, 26], [126, 60], [148, 116], [154, 154]], { tutup: false })
  tambah({
    id: 'sudut-sulur-kanan',
    nama: 'Sudut sulur kanan',
    kategori: 'corner',
    w: 170, h: 170,
    peran: 'dekorasi-original',
    catatan: 'Dua ukel besar dan tumpal di ujung luar.',
    defs: rampEmas('sudut-sulur-kanan', [10, 14, 160, 160]),
    isi:
      grup('sekar-sudut-sulur-kanan-tumpal', 'crown',
        massa(tumpal(104, 50, 54, 68) + anyaman(104, 70, 34, 34, 4), { isi: 'url(#sekar-sudut-sulur-kanan-ramp)', evenodd: true }))
      + grup('sekar-sudut-sulur-kanan-daun', 'floral',
        massa(daun(44, 22, 20, 46, 11) + daun(140, 120, 158, 96, 10) + daun(70, 30, 58, 58, 8), { isi: DAUN }))
      + grup('sekar-sudut-sulur-kanan-cecek', 'isen',
        massa(cecekGaris(28, 36, 140, 148, 5, 3.2) + cakram(154, 154, 4)), { opacity: '0.45' })
      + grup('sekar-sudut-sulur-kanan-rel', 'corner',
        garis(spine, { opacity: 0.7 })
        + garis(ukel(36, 40, 17, { putaran: 1.5, awal: 160, arah: -1 }), { opacity: 0.6 })
        + garis(ukel(136, 138, 14, { putaran: 1.5, awal: 340, arah: 1 }), { opacity: 0.5 })),
  })
}

/**
 * Sudut damask — simpul latar yang dipadatkan jadi siku.
 *
 * Ubin latar tema ini dan sudut ini berbagi satu simpul; itu disengaja supaya halaman terbaca
 * sebagai satu kain, bukan sebagai ornamen yang ditempel di atas motif asing.
 */
{
  const { badan, inti, cuping, sulur } = damask(60, 60, 86, 100)
  tambah({
    id: 'sudut-damask',
    nama: 'Sudut damask',
    kategori: 'corner',
    w: 170, h: 170,
    peran: 'dekorasi-original',
    catatan: 'Simpul ubin latar yang sama, dipadatkan jadi siku.',
    defs: rampEmas('sudut-damask', [14, 14, 150, 150]),
    isi:
      grup('sekar-sudut-damask-simpul', 'motif',
        massa(badan + inti, { isi: 'url(#sekar-sudut-damask-ramp)', evenodd: true }))
      + grup('sekar-sudut-damask-cuping', 'motif', massa(cuping, { isi: AKSEN }), { opacity: '0.85' })
      + grup('sekar-sudut-damask-sulur', 'motif', garis(sulur, { opacity: 0.55 }))
      + grup('sekar-sudut-damask-tetangga', 'motif',
        massa(damask(142, 60, 46, 54).badan, { isi: AKSEN }), { opacity: '0.55' })
      + grup('sekar-sudut-damask-tetangga-bawah', 'motif',
        massa(damask(60, 142, 46, 54).badan, { isi: GLOW }), { opacity: '0.95' })
      + grup('sekar-sudut-damask-palang', 'isen',
        massa(cecekGaris(106, 60, 126, 60, 3, 3.4) + cecekGaris(60, 106, 60, 126, 3, 3.4) + cakram(118, 118, 5)),
        { opacity: '0.7' })
      + grup('sekar-sudut-damask-rel', 'corner',
        garis('M10 60L14 60M60 10L60 14', { opacity: 0.5 })
        + garis(halus([[106, 106], [130, 120], [152, 152]], { tutup: false }), { opacity: 0.45 })),
  })
}

/* ── kosakata rangkai: mawar dan pakis ──────────────────────────────────────── */

/**
 * Mawar cat air jadi vektor.
 *
 * Referensi I adalah PNG 3241×3802; yang ditiru bukan teksturnya melainkan **arah gradasinya**
 * — pucat di tepi kelopak, pekat di jantung. Karena itu kelopak luar memakai stop `glow` dan
 * jantungnya `body`, dan ketiganya hidup di tiga grup berbeda supaya `massa-tertimbun` tidak
 * menuduh kelopak dalam yang memang duduk di atas kelopak luar.
 */
const mawar = (cx, cy, r) => ({
  luar: Array.from({ length: 6 }, (_, i) => kelopak(cx, cy, r, r * 0.46, -90 + i * 60 + 10)).join(''),
  /*
   * Cincin kedua dipilin 40° terhadap yang pertama dan cincin ketiga 26° lagi, jadi tiap
   * kelopak jatuh di sela kelopak di bawahnya. Versi pertama memakai dua cincin sepilinan dan
   * hasilnya bunga bersegi lima yang rata — dibandingkan berdampingan dengan mawar cat air
   * referensi, yang hilang bukan warnanya melainkan tumpukannya.
   */
  tengah: Array.from({ length: 5 }, (_, i) => kelopak(cx, cy, r * 0.72, r * 0.36, -90 + i * 72 + 40)).join(''),
  /*
   * Cincin keempat hanya untuk mawar yang memang besar.
   *
   * Dipotong dari kuncup karena dua alasan yang sejalan: kuncup berjari-jari di bawah 24 tidak
   * pernah memperlihatkan empat tingkat kelopak pada lebar pakainya, dan dua keping
   * `rangkaian-*` melewati plafon bobot 8192 begitu tangkai bermassa masuk. Yang dipotong
   * adalah yang tidak terlihat, bukan bentuknya.
   */
  dalam: r < 24 ? '' : Array.from({ length: 4 }, (_, i) => kelopak(cx, cy, r * 0.48, r * 0.28, -90 + i * 90 + 66)).join(''),
  jantung: Array.from({ length: 3 }, (_, i) => kelopak(cx, cy, r * 0.28, r * 0.2, -90 + i * 120 + 84)).join('')
    + cakram(cx, cy, r * 0.11),
})

/** Pakis: tulang daun dengan patran berpasangan yang mengecil ke ujung. */
const pakis = (x0, y0, x1, y1, jml, lebar) => {
  /*
   * Helai dipisah jadi dua bidang nilai, bukan satu.
   *
   * Begitu dedaunan punya ronanya sendiri, ia berhenti ikut gradient bunganya — dan diukur,
   * itu justru MERATAKAN enam keping: rentang terangnya jatuh ke 0,05. Referensinya tidak
   * begitu; pakis dan eukaliptusnya bertumpuk, yang di belakang lebih gelap. Helai sisi pertama
   * karena itu tayang di bidang yang lebih redup daripada sisi kedua.
   */
  const belakang = []
  const helai = []
  for (let i = 0; i < jml; i++) {
    const t = (i + 0.6) / (jml + 0.6)
    const x = x0 + (x1 - x0) * t; const y = y0 + (y1 - y0) * t
    const sisa = 1 - t * 0.72
    const dx = (x1 - x0) / (jml * 1.1); const dy = (y1 - y0) / (jml * 1.1)
    belakang.push(daun(x, y, x - dy * 1.5 * sisa, y + dx * 1.5 * sisa, lebar * sisa))
    helai.push(daun(x, y, x + dy * 1.5 * sisa, y - dx * 1.5 * sisa, lebar * sisa))
  }
  const spine = [[x0, y0], [x0 + (x1 - x0) * 0.5 - (y1 - y0) * 0.1, y0 + (y1 - y0) * 0.5 + (x1 - x0) * 0.1], [x1, y1]]
  return {
    tulang: halus(spine, { tutup: false }),
    batang: tangkai(spine, lebar * 0.5, lebar * 0.16),
    helai: helai.join(''),
    belakang: belakang.join(''),
    /*
     * Potongan pendek di pangkal, dan inilah satu-satunya `data-draw` keping floral.
     *
     * Gerbang `data-draw` menuntut ada lapisan garis, tapi versi pertama memenuhinya dengan
     * MENGGARIS SELURUH TULANG. Pada viewBox 140 satuan, garis seketebalan 3,2 sepanjang itu
     * tayang sebagai balok kelabu yang memotong rangkaiannya — terlihat jelas begitu
     * disandingkan dengan referensinya. Gerbangnya tetap lolos dengan satu urat sepanjang 18%.
     */
    urat: `M${n(x0)} ${n(y0)}L${n(x0 + (x1 - x0) * 0.18)} ${n(y0 + (y1 - y0) * 0.18)}`,
  }
}

/**
 * Karangan: patran yang dipasang MENGIKUTI busur, bukan di sepanjang garis miring.
 *
 * Versi pertama memakai `pakis()` dan hasilnya dua tangkai lurus yang kebetulan berdekatan;
 * karangan baru terbaca karena tiap helainya menyinggung lingkaran yang sama.
 */
const karangan = (cx, cy, r, a0, a1, jml, panjang, lebar) => {
  const helai = []
  const belakang = []
  for (let i = 0; i < jml; i++) {
    const t = i / (jml - 1)
    const a = a0 + (a1 - a0) * t
    const sisa = 1 - Math.abs(t - 0.45) * 0.7
    const [x, y] = pada(cx, cy, r, a)
    const [x1, y1] = pada(cx, cy, r + panjang * sisa, a - (a1 > a0 ? 26 : -26))
    const [x2, y2] = pada(cx, cy, r - panjang * sisa * 0.62, a - (a1 > a0 ? 22 : -22))
    helai.push(daun(x, y, x1, y1, lebar * sisa))
    belakang.push(daun(x, y, x2, y2, lebar * sisa * 0.7))
  }
  const spine = Array.from({ length: 7 }, (_, i) => pada(cx, cy, r, a0 + ((a1 - a0) * i) / 6))
  return {
    helai: helai.join(''),
    belakang: belakang.join(''),
    tulang: `M${n(pada(cx, cy, r, a0)[0])} ${n(pada(cx, cy, r, a0)[1])}${busur(cx, cy, r, a0, a1)}`,
    batang: tangkai(spine, lebar * 0.42, lebar * 0.16),
    urat: `M${n(spine[0][0])} ${n(spine[0][1])}L${n(spine[1][0])} ${n(spine[1][1])}`,
  }
}

/* ── segel ──────────────────────────────────────────────────────────────────── */

/** Rozet, dari referensi C — medalion berkelopak radial dengan jantung berongga. */
{
  const kelopakLuar = Array.from({ length: 18 }, (_, i) => kelopak(60, 60, 48, 4.6, (360 / 18) * i)).join('')
  const kelopakDalam = Array.from({ length: 9 }, (_, i) => kelopak(60, 60, 30, 5.6, (360 / 9) * i + 20)).join('')
  tambah({
    id: 'segel-rozet',
    nama: 'Rozet sekar',
    kategori: 'seal',
    w: 120, h: 120,
    peran: 'dekorasi-original',
    catatan: 'Medalion radial; jantungnya berongga agar tidak jadi gumpalan.',
    defs: rampEmas('segel-rozet', [60, 8, 60, 112]),
    isi:
      grup('sekar-segel-rozet-luar', 'seal', massa(kelopakLuar, { isi: 'url(#sekar-segel-rozet-ramp)' }))
      + grup('sekar-segel-rozet-dalam', 'seal', massa(kelopakDalam, { isi: AKSEN }), { opacity: '0.9' })
      + grup('sekar-segel-rozet-cincin', 'seal',
        massa(cincin(60, 60, 20, 7), { evenodd: true }))
      + grup('sekar-segel-rozet-cecek', 'isen', massa(cecekBusur(60, 60, 38, 0, 340, 18, 2.4)), { opacity: '0.5' })
      + grup('sekar-segel-rozet-rel', 'seal',
        garis(`M${60 + 44} 60${busur(60, 60, 44, 0, 360)}`, { opacity: 0.35 })),
  })
}

/** Segel tumpal — liontin referensi A, berdiri sendiri sebagai segel. */
{
  tambah({
    id: 'segel-tumpal',
    nama: 'Liontin tumpal',
    kategori: 'seal',
    w: 120, h: 160,
    peran: 'dekorasi-original',
    catatan: 'Liontin beranyaman dengan mahkota ukel.',
    defs: rampEmas('segel-tumpal', [60, 30, 60, 150]),
    isi:
      grup('sekar-segel-tumpal-badan', 'seal',
        massa(tumpal(60, 46, 72, 96) + anyaman(60, 72, 48, 52, 5),
          { isi: 'url(#sekar-segel-tumpal-ramp)', evenodd: true }))
      + grup('sekar-segel-tumpal-mahkota', 'crown',
        massa(kelopak(60, 42, 22, 8, -90) + kelopak(60, 42, 16, 7, -132) + kelopak(60, 42, 16, 7, -48)
          + cakram(60, 20, 5), { isi: AKSEN }), { opacity: '0.9' })
      + grup('sekar-segel-tumpal-cecek', 'isen',
        massa(cecekGaris(30, 44, 90, 44, 5, 3)), { opacity: '0.55' })
      + grup('sekar-segel-tumpal-rel', 'seal',
        garis(ukel(34, 50, 12, { putaran: 1.25, awal: 180, arah: 1 }), { opacity: 0.55 })
        + garis(ukel(86, 50, 12, { putaran: 1.25, awal: 0, arah: -1 }), { opacity: 0.55 })),
  })
}

/* ── motif ──────────────────────────────────────────────────────────────────── */

/**
 * Pita damask — tiga simpul disambung palang, persis struktur ubin latarnya.
 *
 * Pita ini dan `/textures/sekar-damask.svg` dibangkitkan dari primitif yang sama, jadi motif
 * yang tayang di atas kertas dan motif yang tayang sebagai latar tidak pernah berbeda bentuk.
 */
{
  const simpul = [60, 180, 300].map(x => damask(x, 60, 78, 112))
  const tepi = [damask(0, 60, 78, 112), damask(360, 60, 78, 112)]
  tambah({
    id: 'motif-damask',
    nama: 'Pita damask',
    kategori: 'motif',
    w: 360, h: 120,
    peran: 'dekorasi-original',
    catatan: 'Rapport 120 satuan; bentuk yang sama dengan ubin latar tema.',
    defs: rampDef('motif-damask', [0, 0, 360, 120], [['0', 'currentColor'], ['0.5', AKSEN], ['1', 'currentColor']]),
    isi:
      grup('sekar-motif-damask-simpul', 'motif',
        massa(simpul.map(s => s.badan + s.inti).join('') + tepi.map(s => s.badan).join(''),
          { isi: 'url(#sekar-motif-damask-ramp)', evenodd: true }))
      + grup('sekar-motif-damask-cuping', 'motif',
        massa(simpul.map(s => s.cuping).join(''), { isi: GLOW }), { opacity: '0.9' })
      + grup('sekar-motif-damask-palang', 'isen',
        // Cecek sengaja TIDAK jatuh di x=120/240: di sana sudah ada palangnya sendiri, dan
        // butiran yang duduk persis di bawah massa sewarna tidak akan terlihat — itu yang
        // ditangkap gerbang `massa-tertimbun`, dan ia menangkapnya di versi pertama motif ini.
        massa([[120, 60], [240, 60], [0, 60], [360, 60]].map(([x, y]) => cakram(x, y, 6)).join('')
          + cecekGaris(98, 60, 142, 60, 2, 3) + cecekGaris(218, 60, 262, 60, 2, 3)), { opacity: '0.7' })
      + grup('sekar-motif-damask-rel', 'motif',
        garis(simpul.map(s => s.sulur).join(''), { opacity: 0.5 })),
  })
}

/* ── simbol ─────────────────────────────────────────────────────────────────── */

/** Kembang air — mawar referensi I, digambar ulang sebagai tiga bidang nilai. */
{
  const m = mawar(58, 62, 40)
  const p = pakis(96, 96, 132, 40, 4, 7)
  tambah({
    id: 'simbol-kembang-air',
    nama: 'Kembang air',
    kategori: 'symbol',
    w: 140, h: 120,
    peran: 'dekorasi-original',
    catatan: 'Gradasi kelopak mengikuti arah terukur referensi: pucat di tepi, pekat di jantung.',
    defs: rampAir('simbol-kembang-air', [58, 24, 58, 100]),
    isi:
      grup('sekar-simbol-kembang-air-batang', 'floral', massa(p.batang, { isi: DAUN }), { opacity: '0.85' })
      + grup('sekar-simbol-kembang-air-belakang', 'floral', massa(p.belakang, { isi: DAUN }), { opacity: '0.6' })
      + grup('sekar-simbol-kembang-air-pakis', 'floral', massa(p.helai, { isi: DAUN }))
      + grup('sekar-simbol-kembang-air-luar', 'floral',
        massa(m.luar, { isi: 'url(#sekar-simbol-kembang-air-ramp)' }))
      + grup('sekar-simbol-kembang-air-tengah', 'floral', massa(m.tengah, { isi: AKSEN }), { opacity: '0.88' })
      + grup('sekar-simbol-kembang-air-dalam', 'floral', massa(m.dalam, { isi: GLOW }), { opacity: '0.8' })
      + grup('sekar-simbol-kembang-air-jantung', 'floral', massa(m.jantung, { isi: DALAM }), { opacity: '0.72' })
      + grup('sekar-simbol-kembang-air-rel', 'floral', garis(p.urat, { opacity: 0.45 })),
  })
}

/* ── monogram ───────────────────────────────────────────────────────────────── */

/** Karangan monogram — cincin ganda berdaun, tengahnya sengaja kosong untuk inisial. */
{
  const kiri = karangan(100, 104, 74, 118, 232, 7, 26, 9)
  const kanan = karangan(100, 104, 74, 62, -52, 7, 26, 9)
  tambah({
    id: 'monogram-karangan',
    nama: 'Karangan sekar',
    kategori: 'monogram',
    w: 200, h: 200,
    peran: 'dekorasi-original',
    catatan: 'Tengahnya kosong; yang mengisi adalah inisial pasangan.',
    defs: rampEmas('monogram-karangan', [20, 180, 180, 20]),
    isi:
      grup('sekar-monogram-karangan-batang', 'floral',
        massa(kiri.batang + kanan.batang, { isi: DAUN }), { opacity: '0.8' })
      + grup('sekar-monogram-karangan-belakang', 'floral',
        massa(kiri.belakang + kanan.belakang, { isi: DAUN }), { opacity: '0.55' })
      + grup('sekar-monogram-karangan-daun', 'floral', massa(kiri.helai + kanan.helai, { isi: DAUN }))
      + grup('sekar-monogram-karangan-mahkota', 'crown',
        massa(kelopak(100, 46, 24, 9, -90) + kelopak(100, 46, 17, 7, -128) + kelopak(100, 46, 17, 7, -52)
          + cakram(100, 24, 5), { isi: AKSEN }), { opacity: '0.9' })
      + grup('sekar-monogram-karangan-cecek', 'isen',
        massa(cecekBusur(100, 104, 46, 40, 140, 6, 3)), { opacity: '0.45' })
      + grup('sekar-monogram-karangan-rel', 'monogram',
        garis(kiri.urat + kanan.urat, { opacity: 0.5 })
        + garis(`M${100 + 56} 104${busur(100, 104, 56, 0, 360)}`, { opacity: 0.26 })),
  })
}

/* ── floral: yang berpasangan kiri-kanan, dipecah ───────────────────────────── */

/**
 * Rangkaian kiri dan kanan, dari referensi I.
 *
 * Di referensi keduanya satu berkas: satu rumpun di pinggang kiri bingkai oval, satu lagi di
 * kaki kanannya. Permintaan pemilik adalah memecah yang berpasangan, dan itu juga yang membuat
 * keduanya berguna di ladang ornamen — `OrnamentField` memasang keping per jangkar, bukan per
 * bingkai.
 *
 * Keduanya **bukan cerminan satu sama lain**: yang kiri bertumpu pada satu mawar besar dengan
 * dua kuncup, yang kanan pada dua mawar sedang. Itu yang terukur di referensinya.
 */
{
  const susun = [
    {
      id: 'rangkaian-kiri', nama: 'Rangkaian kiri',
      mawarUtama: mawar(58, 62, 34), kuncup: [mawar(96, 34, 17), mawar(38, 116, 15)],
      pakisan: [pakis(70, 96, 22, 158, 5, 8), pakis(74, 84, 128, 118, 4, 7), pakis(64, 40, 28, 14, 4, 6)],
      arah: [24, 12, 120, 168],
    },
    {
      id: 'rangkaian-kanan', nama: 'Rangkaian kanan',
      mawarUtama: mawar(82, 72, 28), kuncup: [mawar(44, 44, 22), mawar(98, 126, 16)],
      pakisan: [pakis(70, 92, 124, 156, 5, 8), pakis(66, 80, 14, 112, 4, 7), pakis(96, 46, 132, 16, 4, 6)],
      arah: [116, 12, 20, 168],
    },
  ]
  for (const b of susun) {
    tambah({
      id: b.id,
      nama: b.nama,
      kategori: 'floral',
      w: 140, h: 176,
      peran: 'dekorasi-original',
      catatan: 'Rumpun cat air digambar ulang; gradasi kelopak mengikuti arah terukur referensi.',
      defs: rampAir(b.id, b.arah),
      isi:
        grup(`sekar-${b.id}-batang`, 'floral',
          massa(b.pakisan.map(p => p.batang).join(''), { isi: DAUN }), { opacity: '0.82' })
        + grup(`sekar-${b.id}-belakang`, 'floral',
          massa(b.pakisan.map(p => p.belakang).join(''), { isi: DAUN }), { opacity: '0.6' })
        + grup(`sekar-${b.id}-pakis`, 'floral',
          massa(b.pakisan.map(p => p.helai).join(''), { isi: DAUN }))
        + grup(`sekar-${b.id}-kelopak`, 'floral',
          massa(b.mawarUtama.luar + b.kuncup.map(k => k.luar).join(''), { isi: `url(#sekar-${b.id}-ramp)` }))
        + grup(`sekar-${b.id}-tengah`, 'floral',
          massa(b.mawarUtama.tengah + b.kuncup.map(k => k.tengah).join(''), { isi: AKSEN }), { opacity: '0.9' })
        + grup(`sekar-${b.id}-dalam`, 'floral',
          massa(b.mawarUtama.dalam + b.kuncup.map(k => k.dalam).join(''), { isi: GLOW }), { opacity: '0.82' })
        + grup(`sekar-${b.id}-jantung`, 'floral',
          massa(b.mawarUtama.jantung + b.kuncup.map(k => k.jantung).join(''), { isi: DALAM }), { opacity: '0.7' })
        + grup(`sekar-${b.id}-rel`, 'floral',
          garis(b.pakisan.map(p => p.urat).join(''), { opacity: 0.4 })),
    })
  }
}

/**
 * Ranting kiri dan kanan — karangan daun referensi D, dibelah di sumbu tegaknya.
 *
 * Referensinya satu path tunggal berbentuk karangan melingkar penuh dan simetris cermin.
 * Membelahnya jadi dua glyph adalah permintaan pemilik, dan itu juga yang membuat keduanya
 * bisa dipakai mengapit sebuah nama — yang tidak bisa dilakukan lingkaran utuh.
 */
{
  for (const [id, nama, a0, a1] of [
    ['ranting-kiri', 'Ranting kiri', 116, 244],
    ['ranting-kanan', 'Ranting kanan', 64, -64],
  ]) {
    const k = karangan(60, 84, 46, a0, a1, 9, 24, 8)
    tambah({
      id, nama,
      kategori: 'floral',
      w: 120, h: 168,
      peran: 'dekorasi-original',
      catatan: 'Separuh karangan daun; belahannya digambar terpisah, bukan dicerminkan.',
      defs: rampEmas(id, [10, 20, 110, 150]),
      isi:
        grup(`sekar-${id}-batang`, 'floral', massa(k.batang, { isi: DAUN }), { opacity: '0.78' })
        + grup(`sekar-${id}-belakang`, 'floral', massa(k.belakang, { isi: DAUN }), { opacity: '0.55' })
        + grup(`sekar-${id}-helai`, 'floral', massa(k.helai, { isi: DAUN }))
        + grup(`sekar-${id}-kuncup`, 'floral',
          massa(kelopak(...pada(60, 84, 46, a0), 18, 7, a0 - (a1 > a0 ? 90 : -90))
            + cakram(...pada(60, 84, 46, a1), 5), { isi: AKSEN }), { opacity: '0.88' })
        + grup(`sekar-${id}-cecek`, 'isen',
          massa(cecekBusur(60, 84, 30, a0, a1, 6, 3)), { opacity: '0.45' })
        + grup(`sekar-${id}-rel`, 'floral', garis(k.urat, { opacity: 0.4 })),
    })
  }
}

/* ── layer: lima slot ladang ornamen ────────────────────────────────────────── */

/**
 * Lima keping ladang, satu per slot `OrnamentField`.
 *
 * Rasionya **bukan selera**: `OrnamentField` memakai lebar slot sebagai `--iv-piece` lalu
 * menariknya setinggi `ratio`, jadi keping persegi yang dipasang pada slot selebar 460 px
 * tumbuh setinggi 460 px juga dan menutupi nama pasangan. Angka yang dipakai di sini menyalin
 * slot yang sudah tayang: bloom 480×260 · cascade 260×480 · crown 480×200 · cluster 320×320 ·
 * swag 600×220.
 */
{
  const susun = [
    {
      id: 'layer-mekar', nama: 'Mekar sekar', w: 480, h: 260, arah: [60, 250, 420, 40],
      bunga: [mawar(150, 150, 46), mawar(258, 118, 34), mawar(338, 166, 28)],
      pakisan: [
        pakis(196, 210, 62, 96, 6, 12), pakis(214, 214, 372, 88, 6, 12),
        pakis(230, 226, 240, 60, 5, 10), pakis(178, 222, 46, 202, 4, 9),
        pakis(300, 220, 430, 178, 4, 9),
      ],
    },
    {
      id: 'layer-jatuh', nama: 'Untaian sekar', w: 260, h: 480, arah: [130, 20, 130, 460],
      bunga: [mawar(126, 108, 40), mawar(158, 214, 28), mawar(104, 318, 22)],
      pakisan: [
        pakis(130, 36, 118, 200, 6, 12), pakis(132, 150, 226, 300, 5, 10),
        pakis(128, 170, 38, 322, 5, 10), pakis(130, 300, 150, 452, 6, 11),
      ],
    },
    {
      id: 'layer-mahkota', nama: 'Mahkota sekar', w: 480, h: 200, arah: [20, 100, 460, 100],
      damaskan: damask(240, 88, 104, 150),
      karanganan: [karangan(240, 108, 128, 188, 268, 10, 40, 13), karangan(240, 108, 128, -8, -88, 10, 40, 13)],
      bunga: [mawar(104, 76, 32), mawar(376, 76, 32), mawar(158, 118, 21), mawar(322, 118, 21)],
      pakisan: [pakis(180, 150, 62, 176, 4, 10), pakis(300, 150, 418, 176, 4, 10)],
    },
    {
      id: 'layer-rumpun', nama: 'Rumpun sekar', w: 320, h: 320, arah: [40, 40, 280, 280],
      bunga: [mawar(112, 116, 44), mawar(196, 178, 30), mawar(88, 208, 24)],
      pakisan: [
        pakis(150, 160, 288, 40, 6, 12), pakis(140, 176, 44, 292, 6, 12),
        pakis(158, 150, 276, 224, 5, 10), pakis(120, 150, 32, 62, 4, 9),
      ],
    },
    {
      id: 'layer-untai', nama: 'Penutup sekar', w: 600, h: 220, arah: [40, 40, 560, 200],
      bunga: [mawar(300, 150, 42), mawar(196, 118, 28), mawar(404, 118, 28)],
      untaian: karangan(300, 24, 148, 34, 146, 13, 34, 11),
      pakisan: [pakis(268, 168, 96, 196, 5, 11), pakis(332, 168, 504, 196, 5, 11)],
    },
  ]

  for (const b of susun) {
    const pakisan = b.pakisan ?? []
    const karanganan = [...(b.karanganan ?? []), ...(b.untaian ? [b.untaian] : [])]
    const helai = pakisan.map(p => p.helai).join('') + karanganan.map(k => k.helai).join('')
    const belakang = pakisan.map(p => p.belakang).join('') + karanganan.map(k => k.belakang).join('')
    const batang = pakisan.map(p => p.batang).join('') + karanganan.map(k => k.batang).join('')
    const tulang = [...pakisan, ...karanganan].map(x => x.urat).join('')
    tambah({
      id: b.id,
      nama: b.nama,
      kategori: 'layer',
      w: b.w, h: b.h,
      peran: 'dekorasi-original',
      catatan: 'Keping ladang; rasio menyalin slot yang sudah tayang.',
      defs: rampAir(b.id, b.arah),
      isi:
        grup(`sekar-${b.id}-batang`, 'floral', massa(batang, { isi: DAUN }), { opacity: '0.8' })
        + grup(`sekar-${b.id}-belakang`, 'floral', massa(belakang, { isi: DAUN }), { opacity: '0.58' })
        + grup(`sekar-${b.id}-helai`, 'floral', massa(helai, { isi: DAUN }))
        + (b.damaskan
          ? grup(`sekar-${b.id}-damask`, 'motif',
            massa(b.damaskan.badan + b.damaskan.inti, { isi: `url(#sekar-${b.id}-ramp)`, evenodd: true })
            + massa(b.damaskan.cuping, { isi: AKSEN }))
          : '')
        + grup(`sekar-${b.id}-kelopak`, 'floral',
          massa(b.bunga.map(m => m.luar).join(''), { isi: `url(#sekar-${b.id}-ramp)` }))
        + grup(`sekar-${b.id}-tengah`, 'floral',
          massa(b.bunga.map(m => m.tengah).join(''), { isi: AKSEN }), { opacity: '0.9' })
        + grup(`sekar-${b.id}-dalam`, 'floral',
          massa(b.bunga.map(m => m.dalam).join(''), { isi: GLOW }), { opacity: '0.82' })
        + grup(`sekar-${b.id}-jantung`, 'floral',
          massa(b.bunga.map(m => m.jantung).join(''), { isi: DALAM }), { opacity: '0.72' })
        + grup(`sekar-${b.id}-rel`, 'floral', garis(tulang, { opacity: 0.35 })),
    })
  }
}

/* ── ubin latar ─────────────────────────────────────────────────────────────── */

/**
 * Ubin damask untuk `backdrop.motif`.
 *
 * **Bukan ornamen bank, dan itu aturan DESIGN.md:392**: ubin CSS tidak bisa `currentColor` dan
 * tidak boleh di-DrawSVG. Ia tayang sebagai `mask-image` pada `.iv-section::before`, jadi
 * bentuknya ditulis hitam pekat — yang dibaca browser cuma alfanya, dan warnanya datang dari
 * `--iv-accent` saat itu juga.
 *
 * Rapport 144 satuan, diukur dari ubin pemilik: 864 px berisi enam simpul mendatar.
 */
{
  const R = 144

  /**
   * Ubinnya digambar BERONGGA, bukan bermassa, dan itu perbedaan yang menentukan.
   *
   * Versi pertama memakai `damask().badan` apa adanya — bidang penuh — dan hasilnya empat
   * lonjong hitam raksasa. Sebagai ornamen di atas kertas itu benar; sebagai latar ia jadi
   * noda, karena latar bekerja pada 5% opacity dan yang terbaca di sana hanya SILUET, bukan
   * gradasi. Referensi pemilik juga bergaris tipis, bukan berbidang.
   *
   * Jadi tiap simpul di sini adalah cincin: siluet luar ditambah siluet yang disusutkan,
   * dibaca `fill-rule="evenodd"`.
   */
  const simpul = []
  const cincinDamask = (x, y, w, h, tebal) => {
    const luar = damask(x, y, w, h)
    const dalam = damask(x, y, w - tebal * 2, h - tebal * 2.4)
    return `<path fill-rule="evenodd" d="${luar.badan}${dalam.badan}"/>`
      + `<path fill-rule="evenodd" opacity="0.72" d="${dalam.inti}"/>`
      + `<path opacity="0.6" d="${luar.cuping}"/>`
  }
  for (const [x, y] of [[0, 0], [R, 0], [0, R], [R, R], [R / 2, R / 2]]) {
    simpul.push(cincinDamask(x, y, R * 0.52, R * 0.74, 5))
  }

  /** Palang penyambung di titik silang kisi — di referensi inilah yang mengikat baris. */
  const palang = [[R / 4, R / 4], [(R * 3) / 4, R / 4], [R / 4, (R * 3) / 4], [(R * 3) / 4, (R * 3) / 4]]
    .map(([x, y]) => `<path opacity="0.5" d="${halus([[x, y - 7], [x + 13, y], [x, y + 7], [x - 13, y]], { tegangan: 0.7 })}"/>`
      + `<path opacity="0.42" d="${cakram(x, y, 2.6)}"/>`)
    .join('')

  /*
   * Komentarnya TIDAK boleh menyebut nama custom property-nya.
   *
   * Versi pertama menulis tanda hubung ganda di dalam komentar XML dan membuat berkasnya tidak
   * sah. Akibatnya persis kelas kegagalan yang paling mahal: berkasnya dijawab 200,
   * `mask-image` terpasang benar, nilai backdrop benar semua — dan latarnya kosong tanpa satu
   * pun galat. Yang menemukannya adalah membuka halamannya, bukan gerbang mana pun.
   */
  writeFileSync(join(TEKSTUR, 'damask.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${R}" height="${R}" viewBox="0 0 ${R} ${R}" fill="#000">`
    + `<!-- Ubin latar tema aruna-sekar. Dipasang sebagai mask-image; warnanya datang dari token aksen tema saat tayang. -->`
    + simpul.join('') + palang + '</svg>\n')
}

/* ── ringkasan ──────────────────────────────────────────────────────────────── */

daftar.sort((a, b) => a.id.localeCompare(b.id))

/**
 * `catalog.json` — kontrak yang dibaca `scripts/ornament-pack/pack.mjs`.
 *
 * Dibangkitkan, bukan ditulis tangan, karena `id`, `category`, dan berkas SVG-nya harus tidak
 * mungkin berselisih: importir melewati aset yang berkasnya tidak ada **tanpa suara**, dan
 * pack sunda sudah kehilangan dua aset persis begitu.
 */
/** Jangkar pakai tiap kategori — ke mana keping ini menempel di dalam section. */
const jangkar = {
  frame: 'section', divider: 'antar-blok', corner: 'sudut-section', seal: 'penutup',
  motif: 'pita', symbol: 'sisipan', monogram: 'tengah', floral: 'tepi', layer: 'ladang',
}

/**
 * Resep motion per kategori, mengikuti `references/creation-motion.md`.
 *
 * `amplitudeMeasured: false` karena angka-angka ini **diadaptasi**, bukan diukur dari klip —
 * satu-satunya pengukuran motion di repo ini ada di pack kayon, dan itu untuk template lain.
 */
const gerak = (kategori) => ({
  preset: kategori === 'layer' || kategori === 'floral' ? 'sway' : 'reveal',
  amplitude: kategori === 'layer' || kategori === 'floral' ? 1.5 : 14,
  unit: kategori === 'layer' || kategori === 'floral' ? 'deg' : 'px',
  duration: kategori === 'layer' || kategori === 'floral' ? 6 : 1.1,
  ease: kategori === 'layer' || kategori === 'floral' ? 'sine.inOut' : 'power2.out',
  stagger: kategori === 'layer' ? 0.12 : 0,
  rigid: false,
  reducedMotion: 'langsung-ke-keadaan-akhir',
  amplitudeMeasured: false,
})

const tag = {
  frame: ['frame', 'gapura', 'sekar'],
  divider: ['divider', 'sulur', 'sekar'],
  corner: ['corner', 'ukel', 'sekar'],
  seal: ['seal', 'medalion', 'sekar'],
  motif: ['motif', 'damask', 'sekar'],
  symbol: ['symbol', 'mawar', 'sekar'],
  monogram: ['monogram', 'karangan', 'sekar'],
  floral: ['floral', 'rangkaian', 'sekar'],
  layer: ['layer', 'ladang', 'sekar'],
}

writeFileSync(join(HERE, 'catalog.json'), JSON.stringify({
  schemaVersion: 1,
  id: 'sekar',
  name: 'Sekar — krem sogan, damask dan cat air bergradasi',
  scope: 'original-local-demo',
  builtAt: '2026-09-18',
  generator: 'packs/sekar/buat.mjs + packs/sekar/geometri.mjs',
  palette: {
    paper: '#F4ECE0',
    ink: '#4A3D33',
    body: '#847665',
    accent: '#C89F3B',
    glow: '#E2D0B8',
    note: 'Diukur dari piksel yang benar-benar dirender, bukan dari atribut fill sumbernya — '
      + 'lihat docs/features/ornament-builder/imported/canva-sekar/measurements.json. '
      + 'Glyph tidak membawa warna sendiri; nilainya datang dari ramp tema saat tayang.',
  },
  fonts: {
    demo: 'tidak ada; pack ini tidak membawa huruf',
    note: 'Huruf referensi tidak diidentifikasi dan tidak ditiru.',
  },
  composition: {
    anchorRule: 'Rangkaian kiri-kanan mengapit, damask mengikat latar, tumpal menggantung di sudut.',
    source: 'docs/features/ornament-builder/imported/canva-sekar/STUDI.md',
  },
  motionRecipe: {
    ease: 'power1.out untuk reveal berurutan; sine.inOut untuk gestur tunggal',
    catatan: 'Menyalin resep terukur pack kayon; pack ini tidak mengukur ulang motion.',
  },
  textures: [{
    id: 'sekar-damask',
    file: 'tekstur/damask.svg',
    rapport: 144,
    usage: 'backdrop.motif — apps/web/public/textures/sekar-damask.svg',
    note: 'BUKAN entri ornamentBank. DESIGN.md:392: ubin CSS tidak bisa currentColor dan tidak '
      + 'boleh di-DrawSVG. Rujukan warnanya raster/damask-asli.webp, milik pemilik.',
  }],
  assets: daftar.map(g => ({
    id: g.id,
    name: g.nama,
    category: g.kategori,
    tags: tag[g.kategori],
    culturalRole: g.peran,
    provenance: {
      kind: 'original',
      method: 'geometri parametrik, dihitung untuk pack ini',
      generator: 'buat.mjs + geometri.mjs',
      referenceStudy: ['docs/features/ornament-builder/imported/canva-sekar/STUDI.md'],
      tracedFrom: null,
      checkedAt: '2026-09-18',
    },
    usage: 'original-local-demo',
    style: { palette: 'ramp empat stop lewat var(--iv-orn-*)', medium: 'vektor kubik bermassa' },
    /*
     * Empat medan di bawah dituntut `scripts/validate.mjs` milik skill, dan pack ini sempat
     * tidak punya satu pun — jadi pemeriksa keamanan SVG, tabrakan id, dan checksum-nya tidak
     * pernah bisa dijalankan. Dibangkitkan, bukan ditulis tangan: `layers` dibaca balik dari
     * berkasnya dan `sha256` dihitung dari byte yang benar-benar ditulis.
     */
    layers: g.lapisan,
    anchor: jangkar[g.kategori],
    motion: gerak(g.kategori),
    variants: [{
      file: `svg/${g.id}.svg`,
      format: 'svg',
      width: g.w,
      height: g.h,
      ratio: Math.round((g.w / g.h) * 1000) / 1000,
      bytes: g.bytes,
      sha256: g.sha256,
      alpha: true,
    }],
    viewBox: `0 0 ${g.w} ${g.h}`,
    catatan: g.catatan,
  })),
}, null, 2) + '\n')

for (const g of daftar) {
  console.log(`${g.id.padEnd(30)} ${g.kategori.padEnd(9)} ${String(g.w).padStart(4)}×${String(g.h).padEnd(4)} ${String(g.bytes).padStart(6)} B`)
}
console.log(`\n${daftar.length} glyph → packs/sekar/svg/ · catalog.json · tekstur/damask.svg`)
