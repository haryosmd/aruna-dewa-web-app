#!/usr/bin/env node
/**
 * Pack `pusaka` — empat keping yang lahir dari sebuah kekurangan, bukan dari sebuah tema.
 *
 * Fase 58 memensiunkan keluarga bingkai, segel, dan simbol keluaran forge atas penilaian
 * pemilik. Sesudahnya `ornament-variants.spec.ts` menagih apa yang memang seharusnya ditagih:
 * tiap kolam wajib menawarkan **alternatif**, bukan satu pilihan. Diukur sesudah forge keluar,
 * seluruh bank hanya punya tujuh segel non-forge untuk lima tema yang masing-masing butuh dua —
 * kurang tiga. Bingkai kurang satu.
 *
 * Pack ini mengisi persis kekurangan itu: tiga segel dan satu bingkai, tidak lebih. Ia memakai
 * kosakata dan mesin `packs/sekar/geometri.mjs` yang sudah diterima pemilik, dan tiap keping
 * mendarat di ketebalan tema tujuannya lewat `strokeGlyph` di importir.
 *
 *   node packs/pusaka/buat.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { busur, cakram, cincin, daun, kelopak, n, pada, tumpal, ukel } from '../sekar/geometri.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const SVG = join(HERE, 'svg')
mkdirSync(SVG, { recursive: true })

const AKSEN = 'var(--iv-orn-accent, currentColor)'
const GLOW = 'var(--iv-orn-glow, currentColor)'
const DALAM = 'var(--iv-orn-deep, currentColor)'

const massa = (d, { isi, evenodd = false } = {}) =>
  `<path data-mass=""${evenodd ? ' fill-rule="evenodd"' : ''}${isi ? ` fill="${isi}"` : ''} d="${d}"/>`
const garis = (d, { opacity = 0.5, lebar = 3 } = {}) =>
  `<path data-draw="" fill="none" stroke="currentColor" stroke-width="${lebar}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" d="${d}"/>`
const grup = (id, lapis, isi, { opacity } = {}) =>
  `<g id="${id}" data-layer="${lapis}"${opacity ? ` opacity="${opacity}"` : ''}>${isi}</g>`
const ramp = (id, [x1, y1, x2, y2], stop) =>
  `<linearGradient id="pusaka-${id}-ramp" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">`
  + stop.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + '</linearGradient>'

const daftar = []
function tambah({ id, nama, kategori, w, h, catatan, defs, isi }) {
  const penuh = `pusaka-${id}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="currentColor" role="img" aria-labelledby="${penuh}-title">`
    + `<title id="${penuh}-title">${nama}</title><defs>${defs}</defs>${isi}</svg>\n`
  const berkas = join(SVG, `${penuh}.svg`)
  writeFileSync(berkas, svg)
  daftar.push({
    id: penuh, nama, kategori, w, h, catatan,
    bytes: Buffer.byteLength(svg),
    lapisan: [...new Set([...svg.matchAll(/data-layer="([^"]+)"/g)].map(m => m[1]))],
    sha256: createHash('sha256').update(readFileSync(berkas)).digest('hex'),
  })
}

const cecekBusur = (cx, cy, r, a0, a1, jml, uk) =>
  Array.from({ length: jml }, (_, i) => {
    const [x, y] = pada(cx, cy, r, a0 + ((a1 - a0) * i) / Math.max(1, jml - 1))
    return cakram(x, y, uk)
  }).join('')

/** Segel tumpal berjajar — gerigi tumpal mengelilingi cincin. Untuk `aruna-wastra`. */
{
  // Delapan gerigi, bukan dua belas, dan lebih ramping: dua belas tumpal gemuk di atas cincin
  // tebal terbaca sebagai gigi roda, bukan sebagai renda tepi.
  const gerigi = Array.from({ length: 8 }, (_, i) => {
    const a = (360 / 8) * i
    // Gerigi menghadap KELUAR. Menghadap ke dalam, ia duduk di atas cincin dan terbaca roda.
    const [x, y] = pada(100, 100, 60, a)
    return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(a - 90)})">${massa(tumpal(0, 0, 24, 30), { isi: AKSEN })}</g>`
  }).join('')
  tambah({
    id: 'segel-tumpal-jajar',
    nama: 'Segel tumpal berjajar',
    kategori: 'seal',
    w: 200, h: 200,
    catatan: 'Gerigi tumpal mengelilingi cincin; alternatif segel untuk tema beretnik bidang besar.',
    defs: ramp('segel-tumpal-jajar', [100, 30, 100, 170], [['0', AKSEN], ['1', 'currentColor']]),
    isi:
      grup('pusaka-segel-tumpal-jajar-gerigi', 'seal', gerigi, { opacity: '0.85' })
      + grup('pusaka-segel-tumpal-jajar-cincin', 'seal',
        massa(cincin(100, 100, 60, 7), { isi: 'url(#pusaka-segel-tumpal-jajar-ramp)', evenodd: true }))
      + grup('pusaka-segel-tumpal-jajar-inti', 'seal',
        massa(cincin(100, 100, 36, 5) + cakram(100, 100, 9), { isi: DALAM, evenodd: true }), { opacity: '0.7' })
      + grup('pusaka-segel-tumpal-jajar-cecek', 'isen',
        massa(cecekBusur(100, 100, 48, 0, 337.5, 16, 3)), { opacity: '0.45' })
      + grup('pusaka-segel-tumpal-jajar-rel', 'seal',
        garis(`M${100 + 74} 100${busur(100, 100, 74, 0, 360)}`, { opacity: 0.4 })),
  })
}

/** Segel sulur bintang — ukel berputar di dalam mahkota kelopak. Untuk `aruna-pelita`. */
{
  /*
   * Kelopak berselang-seling panjangnya, dan itu memperbaiki kesalahan yang terlihat.
   *
   * Versi pertama memakai sepuluh kelopak sama panjang dan sama lebar mengelilingi cakram
   * pejal, dan hasilnya terbaca sebagai RODA GIGI, bukan medalion — persis kelas cacat yang
   * sedang diperbaiki fase ini. Panjang yang bergantian dan kelopak yang lebih ramping
   * memulihkan bacaannya sebagai mahkota.
   */
  const mahkota = Array.from({ length: 16 }, (_, i) =>
    kelopak(100, 100, i % 2 ? 58 : 80, i % 2 ? 7 : 10, (360 / 16) * i - 90)).join('')
  const sulur = Array.from({ length: 6 }, (_, i) =>
    ukel(...pada(100, 100, 40, (360 / 6) * i), 13, { putaran: 1, awal: (360 / 6) * i + 90, arah: 1 })).join('')
  tambah({
    id: 'segel-sulur-bintang',
    nama: 'Segel sulur bintang',
    kategori: 'seal',
    w: 200, h: 200,
    catatan: 'Mahkota berkelopak sepuluh dengan enam ukel berputar di jantungnya.',
    defs: ramp('segel-sulur-bintang', [40, 40, 160, 160], [['0', GLOW], ['0.5', AKSEN], ['1', 'currentColor']]),
    isi:
      grup('pusaka-segel-sulur-bintang-mahkota', 'seal',
        massa(mahkota, { isi: 'url(#pusaka-segel-sulur-bintang-ramp)' }))
      + grup('pusaka-segel-sulur-bintang-plat', 'seal',
        massa(cincin(100, 100, 46, 9) + cincin(100, 100, 30, 6), { isi: AKSEN, evenodd: true }), { opacity: '0.9' })
      + grup('pusaka-segel-sulur-bintang-cecek', 'isen',
        massa(cecekBusur(100, 100, 38, 0, 330, 12, 3.4)), { opacity: '0.5' })
      + grup('pusaka-segel-sulur-bintang-rel', 'seal', garis(sulur, { opacity: 0.55 })),
  })
}

/** Segel karangan tipis — cincin hairline dengan lima daun. Untuk `aruna-hening`. */
{
  const helai = Array.from({ length: 5 }, (_, i) => {
    const a = -90 + (360 / 5) * i
    const [x0, y0] = pada(100, 100, 46, a)
    const [x1, y1] = pada(100, 100, 72, a - 16)
    return daun(x0, y0, x1, y1, 11)
  }).join('')
  tambah({
    id: 'segel-karangan-tipis',
    nama: 'Segel karangan tipis',
    kategori: 'seal',
    w: 200, h: 200,
    catatan: 'Cincin tipis dengan lima daun; ditahan untuk tema editorial.',
    defs: ramp('segel-karangan-tipis', [100, 28, 100, 172], [['0', AKSEN], ['1', 'currentColor']]),
    isi:
      grup('pusaka-segel-karangan-tipis-helai', 'floral',
        massa(helai, { isi: 'url(#pusaka-segel-karangan-tipis-ramp)' }))
      + grup('pusaka-segel-karangan-tipis-cincin', 'seal',
        massa(cincin(100, 100, 46, 6), { evenodd: true }))
      + grup('pusaka-segel-karangan-tipis-cecek', 'isen',
        massa(cecekBusur(100, 100, 34, 0, 324, 10, 3)), { opacity: '0.42' })
      + grup('pusaka-segel-karangan-tipis-rel', 'seal',
        garis(`M${100 + 62} 100${busur(100, 100, 62, 0, 360)}`, { opacity: 0.35 })),
  })
}

/** Bingkai kubah — pelana melengkung dengan bahu bertakik. Untuk `aruna-pelita`. */
{
  const kubah = (r, x0, x1, y) => `M${n(x0)} ${n(y)}${busur(150, y, r, 180, 360)}L${n(x1)} 396`
  const luar = `${kubah(126, 24, 276, 168)}L24 396Z`
  const dalam = `${kubah(112, 38, 262, 168)}L38 382Z`
  tambah({
    id: 'bingkai-kubah',
    nama: 'Bingkai kubah',
    kategori: 'frame',
    w: 300, h: 420,
    catatan: 'Kubah berbahu takik; alternatif bingkai untuk tema emas malam.',
    defs: ramp('bingkai-kubah', [150, 30, 150, 400], [['0', AKSEN], ['0.5', 'currentColor'], ['1', DALAM]]),
    isi:
      grup('pusaka-bingkai-kubah-band', 'frame',
        massa(luar + dalam, { isi: 'url(#pusaka-bingkai-kubah-ramp)', evenodd: true }))
      + grup('pusaka-bingkai-kubah-mahkota', 'crown',
        massa(kelopak(150, 54, 26, 10, -90) + kelopak(150, 54, 18, 8, -126) + kelopak(150, 54, 18, 8, -54),
          { isi: AKSEN }), { opacity: '0.9' })
      + grup('pusaka-bingkai-kubah-cecek', 'isen',
        massa(cecekBusur(150, 168, 98, 188, 352, 9, 4) + cakram(46, 330, 4.5) + cakram(254, 330, 4.5)),
        { opacity: '0.45' })
      + grup('pusaka-bingkai-kubah-rel', 'frame',
        garis(`M56 380L56 168${busur(150, 168, 94, 180, 360)}L244 380`, { opacity: 0.45 })
        + garis(ukel(70, 214, 16, { putaran: 1.25, awal: 180, arah: 1 }), { opacity: 0.5 })
        + garis(ukel(230, 214, 16, { putaran: 1.25, awal: 0, arah: -1 }), { opacity: 0.5 })),
  })
}

const jangkar = { seal: 'penutup', frame: 'section' }
const gerak = () => ({
  preset: 'reveal', amplitude: 14, unit: 'px', duration: 1.1, ease: 'power2.out',
  stagger: 0, rigid: false, reducedMotion: 'langsung-ke-keadaan-akhir', amplitudeMeasured: false,
})

writeFileSync(join(HERE, 'catalog.json'), JSON.stringify({
  schemaVersion: 1,
  id: 'pusaka',
  name: 'Pusaka — pengisi kolam varian sesudah forge dipensiunkan',
  scope: 'original-local-demo',
  builtAt: '2026-09-18',
  generator: 'packs/pusaka/buat.mjs + packs/sekar/geometri.mjs',
  palette: { note: 'Tidak membawa warna sendiri; seluruhnya var(--iv-orn-*).' },
  fonts: { demo: 'tidak ada' },
  composition: { anchorRule: 'Segel di penutup, bingkai membingkai section.', source: 'packs/pusaka/CULTURE.md' },
  motionRecipe: { ease: 'power2.out', catatan: 'Menyalin resep reveal; tidak diukur ulang.' },
  assets: daftar.map(g => ({
    id: g.id, name: g.nama, category: g.kategori,
    tags: [g.kategori, 'pusaka'],
    culturalRole: 'dekorasi-original',
    provenance: {
      kind: 'original', method: 'geometri parametrik', generator: 'buat.mjs + sekar/geometri.mjs',
      referenceStudy: ['packs/sekar/CULTURE.md'], tracedFrom: null, checkedAt: '2026-09-18',
    },
    usage: 'original-local-demo',
    style: { palette: 'ramp var(--iv-orn-*)', medium: 'vektor kubik bermassa' },
    layers: g.lapisan, anchor: jangkar[g.kategori], motion: gerak(),
    variants: [{
      file: `svg/${g.id}.svg`, format: 'svg', width: g.w, height: g.h,
      ratio: Math.round((g.w / g.h) * 1000) / 1000, bytes: g.bytes, sha256: g.sha256, alpha: true,
    }],
    viewBox: `0 0 ${g.w} ${g.h}`, catatan: g.catatan,
  })),
}, null, 2) + '\n')

for (const g of daftar) console.log(`${g.id.padEnd(30)} ${g.kategori.padEnd(6)} ${g.w}×${g.h} ${String(g.bytes).padStart(6)} B`)
