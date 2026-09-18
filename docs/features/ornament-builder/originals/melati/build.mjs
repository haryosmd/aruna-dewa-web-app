#!/usr/bin/env node
/**
 * Pack "Ronce Melati" — generator geometri.
 *
 * Kenapa digenerate dan bukan diketik satu-satu: pack ini berisi 30+ glyph yang harus
 * memakai **kosakata bentuk yang sama** — kuncup melati yang sama, daun yang sama, tebal
 * garis yang sama — supaya terbaca sebagai satu keluarga, bukan kumpulan clip-art. Menyalin
 * path yang sama tiga puluh kali dengan tangan adalah cara paling pasti untuk membuatnya
 * tidak konsisten. Keluarannya tetap path/group biasa yang bisa disunting; tidak ada raster
 * di dalamnya, tidak ada skrip, tidak ada URL luar.
 *
 * Aturan bentuk diambil dari DESIGN.md:
 *   - Badan bentuk `fill="currentColor"` bertanda `data-mass`. Tidak ada glyph yang seluruhnya outline.
 *   - Detail bergaris `stroke-width` 2,5–4 **dalam satuan viewBox**, bertanda `data-draw`.
 *   - Dua bidang nilai per glyph: opacity 1 dan ~0,45.
 *   - Bingkai dan cincin berongga lewat `fill-rule="evenodd"`, bukan diisi penuh.
 *
 * Jalankan dari root repo:
 *   rtk proxy node docs/features/ornament-builder/originals/melati/build.mjs
 */

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'svg')

// ------------------------------------------------------------------ dasar

const n = (v) => {
  const r = Math.round(v * 100) / 100
  return Object.is(r, -0) ? 0 : r
}

/** PRNG berbenih. Penempatan yang sedikit tidak rata terbaca lebih hidup dari yang persis rata. */
function prng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const cubic = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

const cubicTangent = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  const x = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0])
  const y = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
  return (Math.atan2(y, x) * 180) / Math.PI
}

const place = (x, y, rot = 0, scale = 1) => {
  const parts = [`translate(${n(x)} ${n(y)})`]
  if (rot) parts.push(`rotate(${n(rot)})`)
  if (scale !== 1) parts.push(`scale(${n(scale)})`)
  return parts.join(' ')
}

/**
 * Lingkaran sebagai dua busur 180°, bukan satu busur yang titik awal dan akhirnya
 * hampir berimpit. Trik "hampir berimpit" itu ill-conditioned: penyelesaian pusat
 * lingkarannya membagi dengan panjang tali busur yang mendekati nol, dan renderer
 * menjawabnya dengan bentuk yang tidak bisa diprediksi. Versi pertama pack ini memakai
 * trik itu dan `monogram-cincin` keluar sebagai dua gumpalan terisi penuh.
 */
const circlePath = (cx, cy, r, sweep = 1) =>
  `M${n(cx - r)} ${n(cy)} A${n(r)} ${n(r)} 0 1 ${sweep} ${n(cx + r)} ${n(cy)}`
  + ` A${n(r)} ${n(r)} 0 1 ${sweep} ${n(cx - r)} ${n(cy)} Z`

/** Cincin berongga: dua lingkaran berlawanan arah, tetap dengan `evenodd` sebagai jaring pengaman. */
const ringPath = (cx, cy, r, thickness) =>
  `${circlePath(cx, cy, r, 1)}${circlePath(cx, cy, r - thickness, 0)}`

const ellipsePath = (cx, cy, rx, ry, sweep = 1) =>
  `M${n(cx - rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 ${sweep} ${n(cx + rx)} ${n(cy)}`
  + ` A${n(rx)} ${n(ry)} 0 1 ${sweep} ${n(cx - rx)} ${n(cy)} Z`

const mass = (d, extra = '') => `<path data-mass="" d="${d}"${extra ? ` ${extra}` : ''}/>`
const draw = (d, w = 3, opacity = 0.45) =>
  `<path data-draw="" fill="none" stroke="currentColor" stroke-width="${n(w)}" stroke-linecap="round" opacity="${opacity}" d="${d}"/>`
const group = (id, layer, body, attrs = '') =>
  `<g id="${id}" data-layer="${layer}"${attrs ? ` ${attrs}` : ''}>${body}</g>`

// ------------------------------------------------------------------ kosakata bentuk

/**
 * Kuncup melati — satuan dasar sebuah ronce.
 * Ronce melati dirangkai dari **kuncup**, bukan bunga mekar; bentuknya lonjong meruncing
 * dengan pangkal kelopak yang sedikit melebar.
 */
function bud(len = 16, wid = 6) {
  const t = -len
  return `M0 0 C${n(-wid)} ${n(-len * 0.22)} ${n(-wid * 0.82)} ${n(-len * 0.72)} 0 ${n(t)}`
    + ` C${n(wid * 0.82)} ${n(-len * 0.72)} ${n(wid)} ${n(-len * 0.22)} 0 0 Z`
}

/** Kelopak melati mekar — bulat telur dengan ujung tumpul. */
function petal(len = 14, wid = 9) {
  return `M0 0 C${n(-wid)} ${n(-len * 0.3)} ${n(-wid * 0.92)} ${n(-len * 0.82)} 0 ${n(-len)}`
    + ` C${n(wid * 0.92)} ${n(-len * 0.82)} ${n(wid)} ${n(-len * 0.3)} 0 0 Z`
}

/** Kelopak pita yang menjuntai — kenanga. Melengkung ke satu sisi dan meruncing. */
function ribbon(len = 44, wid = 7, bend = 0.34) {
  const bx = bend * len
  return `M${n(-wid / 2)} 0 C${n(-wid * 1.05)} ${n(-len * 0.38)} ${n(bx - wid * 0.85)} ${n(-len * 0.74)} ${n(bx)} ${n(-len)}`
    + ` C${n(bx + wid * 0.75)} ${n(-len * 0.72)} ${n(wid * 1.05)} ${n(-len * 0.36)} ${n(wid / 2)} 0 Z`
}

/** Daun tak simetris dengan tulang tengah. Ujungnya meruncing, pangkalnya membulat. */
function leaf(len = 46, wid = 17, bend = 0.12) {
  const bx = bend * len
  const body = `M0 0 C${n(-wid)} ${n(-len * 0.26)} ${n(bx - wid * 0.96)} ${n(-len * 0.74)} ${n(bx)} ${n(-len)}`
    + ` C${n(bx + wid * 0.82)} ${n(-len * 0.7)} ${n(wid * 0.88)} ${n(-len * 0.24)} 0 0 Z`
  const rib = `M0 ${n(-len * 0.06)} C${n(bx * 0.25)} ${n(-len * 0.35)} ${n(bx * 0.6)} ${n(-len * 0.66)} ${n(bx * 0.94)} ${n(-len * 0.93)}`
  return { body, rib }
}

/** Bunga melati mekar: mahkota kelopak + inti bermassa + benang sari tipis. */
function bloom(radius = 13, petals = 6, rot = 0, seed = 7) {
  const rand = prng(seed)
  let out = ''
  for (let i = 0; i < petals; i++) {
    const a = rot + (360 / petals) * i + (rand() - 0.5) * 5
    const s = 0.88 + rand() * 0.24
    out += `<g transform="${place(0, 0, a, s)}">${mass(petal(radius, radius * 0.62))}</g>`
  }
  out += mass(circlePath(0, 0, radius * 0.24))
  return out
}

/**
 * Kantil/cempaka: dua lingkar tepal runcing.
 *
 * Versi pertama memakai kelopak selebar 0,46 jari-jari dan enam di tiap lingkar — cukup
 * lebar untuk saling menutup sempurna, jadi yang terender bukan bunga melainkan satu
 * gumpalan bersudut. Lebar turun ke 0,3 dan lingkar luar dibuat **lebih kecil** dari
 * lingkar dalam, jadi keduanya terbaca sebagai dua tingkat, bukan satu massa.
 */
function kantil(radius = 22, seed = 11) {
  const rand = prng(seed)
  let out = ''
  for (let i = 0; i < 6; i++) {
    const a = (360 / 6) * i + 30 + (rand() - 0.5) * 5
    out += `<g transform="${place(0, 0, a)}" opacity=".45">${mass(petal(radius * 0.66, radius * 0.26))}</g>`
  }
  for (let i = 0; i < 6; i++) {
    const a = (360 / 6) * i + (rand() - 0.5) * 5
    out += `<g transform="${place(0, 0, a)}">${mass(petal(radius, radius * 0.3))}</g>`
  }
  out += mass(circlePath(0, 0, radius * 0.2))
  return out
}

/**
 * Kenanga: mahkota pita yang menjuntai ke bawah, bukan memancar ke segala arah.
 * Rentang sudutnya 118°–242° supaya seluruh kelopak jatuh di bawah garis tengah —
 * itulah yang membedakannya dari bintang.
 */
function kenanga(len = 72, seed = 17) {
  const rand = prng(seed)
  let out = ''
  for (let i = 0; i < 4; i++) {
    const a = 138 + (i / 3) * 84
    out += `<g transform="${place(0, 0, a, 0.78)}" opacity=".45">${mass(ribbon(len * 0.92, len * 0.1, 0.3))}</g>`
  }
  for (let i = 0; i < 5; i++) {
    const a = 118 + (i / 4) * 124 + (rand() - 0.5) * 6
    out += `<g transform="${place(0, 0, a)}">${mass(ribbon(len * (0.86 + rand() * 0.24), len * 0.11, 0.34))}</g>`
  }
  out += mass(circlePath(0, 0, len * 0.11))
  return out
}

/** Sedap malam: bintang tabung kecil di sepanjang tangkai tegak. */
function tuberose(height = 120, seed = 3) {
  const rand = prng(seed)
  let out = draw(`M0 0 C${n(height * 0.05)} ${n(-height * 0.3)} ${n(-height * 0.05)} ${n(-height * 0.68)} ${n(height * 0.02)} ${n(-height)}`, 3.6, 1)
  const count = 8
  for (let i = 0; i < count; i++) {
    const t = 0.12 + (i / (count - 1)) * 0.86
    const y = -height * t
    const side = i % 2 === 0 ? -1 : 1
    const r = 17 - t * 5.5
    const x = side * (6 + rand() * 3)
    out += `<g transform="${place(x, y, side * (30 + rand() * 12), 1)}">`
    for (let p = 0; p < 5; p++) out += `<g transform="${place(0, 0, (360 / 5) * p)}">${mass(petal(r, r * 0.7))}</g>`
    out += mass(circlePath(0, 0, r * 0.24))
    out += '</g>'
  }
  return out
}

/**
 * Merpati. Disusun dari massa terpisah (badan, kepala, paruh, ekor, sayap), bukan satu
 * path pintar — versi pertama memakai satu path dan terender sebagai bulan sabit.
 * Bentuknya kaku: sayap dan ekor tidak pernah ditekuk oleh motion.
 */
function dove(scale = 1) {
  const body = ellipsePath(0, 0, 30, 16)
  const tail = 'M-22 -6 L-58 -22 L-52 2 L-24 6 Z'
  const head = circlePath(28, -16, 11)
  const beak = 'M38 -18 L52 -14 L38 -10 Z'
  const wingLeaf = leaf(40, 15, 0.18)
  return `<g transform="${place(0, 0, 0, scale)}">`
    + mass(tail) + mass(body) + mass(head) + mass(beak)
    + `<g transform="${place(2, -4, -44)}" opacity=".45">${mass(wingLeaf.body)}</g>`
    + `<g transform="${place(-2, 2, -22, 0.86)}">${mass(wingLeaf.body)}${draw(wingLeaf.rib, 2.5, 0.45)}</g>`
    + '</g>'
}

/**
 * Untaian ronce: benang sebagai `data-draw`, kuncup bermassa dipasang di sepanjangnya
 * berselang-seling kiri-kanan dengan ujung mengarah keluar dari benang.
 */
function strand(p0, p1, p2, p3, { count = 9, len = 15, wid = 5.5, seed = 5, thread = 3, from = 0.06, to = 0.97, flower = 0 } = {}) {
  const rand = prng(seed)
  let out = draw(`M${n(p0[0])} ${n(p0[1])} C${n(p1[0])} ${n(p1[1])} ${n(p2[0])} ${n(p2[1])} ${n(p3[0])} ${n(p3[1])}`, thread, 0.45)
  for (let i = 0; i < count; i++) {
    const t = from + ((to - from) * i) / Math.max(1, count - 1)
    const [x, y] = cubic(p0, p1, p2, p3, t)
    const tang = cubicTangent(p0, p1, p2, p3, t)
    const side = i % 2 === 0 ? 1 : -1
    const a = tang + 90 + side * (52 + rand() * 20)
    const s = 0.82 + rand() * 0.3
    const isFlower = flower > 0 && i % flower === 0
    out += `<g transform="${place(x, y, a, s)}">`
    out += isFlower ? bloom(len * 0.72, 6, rand() * 60, 13 + i) : mass(bud(len, wid))
    out += '</g>'
  }
  return out
}

/** Ranting berdaun: tangkai melengkung dengan daun berpasangan yang mengecil ke ujung. */
function sprig(p0, p1, p2, p3, { pairs = 5, len = 40, wid = 15, seed = 9, stem = 3.4, taper = 0.55, from = 0.12, to = 0.94, tip = true } = {}) {
  const rand = prng(seed)
  let out = draw(`M${n(p0[0])} ${n(p0[1])} C${n(p1[0])} ${n(p1[1])} ${n(p2[0])} ${n(p2[1])} ${n(p3[0])} ${n(p3[1])}`, stem, 1)
  for (let i = 0; i < pairs; i++) {
    const t = from + ((to - from) * i) / Math.max(1, pairs - 1)
    const [x, y] = cubic(p0, p1, p2, p3, t)
    const tang = cubicTangent(p0, p1, p2, p3, t)
    const scale = 1 - taper * (i / Math.max(1, pairs - 1))
    for (const side of [-1, 1]) {
      const a = tang + 90 + side * (40 + rand() * 16)
      const l = leaf(len * scale * (0.9 + rand() * 0.2), wid * scale, side * 0.16)
      out += `<g transform="${place(x, y, a)}">${mass(l.body)}${draw(l.rib, 2.5, 0.45)}</g>`
    }
  }
  if (tip) {
    const tang = cubicTangent(p0, p1, p2, p3, 1)
    const l = leaf(len * (1 - taper) * 0.95, wid * (1 - taper), 0.1)
    out += `<g transform="${place(p3[0], p3[1], tang + 90)}">${mass(l.body)}${draw(l.rib, 2.5, 0.45)}</g>`
  }
  return out
}

/** Sulur: spiral membuka yang berakhir pada satu kuncup. Tulang punggung semua glyph sudut. */
function tendril(x, y, rot, scale, { turns = 1.25, radius = 26, seed = 21 } = {}) {
  const rand = prng(seed)
  const steps = 26
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const a = t * turns * Math.PI * 2
    const r = radius * (1 - t * 0.82)
    const px = Math.cos(a) * r - radius
    const py = Math.sin(a) * r
    d += `${i === 0 ? 'M' : 'L'}${n(px)} ${n(py)}`
  }
  const budScale = 0.62 + rand() * 0.2
  return `<g transform="${place(x, y, rot, scale)}">${draw(d, 3.6, 1)}`
    + `<g transform="${place(-radius * 1.9, 0, 12, budScale)}">${mass(bud(17, 6.4))}</g></g>`
}

/** Anyaman janur: dua arah pita yang saling menindih. Pita bermassa, sela sebagai rongga. */
function weave(w, h, { strap = 11, gap = 20, seed = 4 } = {}) {
  let out = ''
  for (let i = -Math.ceil(h / gap) - 1; i <= Math.ceil(w / gap) + 1; i++) {
    const x = i * gap
    out += mass(`M${n(x)} 0 L${n(x + strap)} 0 L${n(x + strap + h)} ${n(h)} L${n(x + h)} ${n(h)} Z`)
  }
  let back = ''
  for (let i = -1; i <= Math.ceil((w + h) / gap) + 1; i++) {
    const x = i * gap
    back += mass(`M${n(x)} 0 L${n(x + strap)} 0 L${n(x + strap - h)} ${n(h)} L${n(x - h)} ${n(h)} Z`)
  }
  return `<g opacity=".45">${back}</g><g>${out}</g>`
}

// ------------------------------------------------------------------ pembungkus berkas

const files = []

function svg(id, name, width, height, body, { note } = {}) {
  const titleId = `melati-${id}-title`
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="currentColor" role="img" aria-labelledby="${titleId}">`
    + `<title id="${titleId}">${name}</title>`
    + body
    + '</svg>'
  const text = `${doc}\n`
  const bytes = Buffer.from(text, 'utf8')
  const layers = [...new Set([...body.matchAll(/data-layer="([^"]+)"/g)].map((m) => m[1]))]
  files.push({
    id,
    name,
    width,
    height,
    note,
    layers,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  })
  writeFileSync(join(OUT, `${id}.svg`), text)
}

mkdirSync(OUT, { recursive: true })

// ================================================================== FRAME (5)

// 1 — Bingkai ronce: gerbang lengkung dengan dua untai kuncup menjuntai di sisi dalam.
{
  const W = 420
  const H = 588
  const band = `M210 26 C316 26 386 96 386 200 L386 548 L356 548 L356 200 C356 116 296 56 210 56`
    + ` C124 56 64 116 64 200 L64 548 L34 548 L34 200 C34 96 104 26 210 26 Z`
  const body = group('melati-bingkai-ronce-band', 'frame', mass(band))
    + group('melati-bingkai-ronce-untai', 'strand',
      strand([78, 150], [96, 260], [92, 380], [80, 512], { count: 9, len: 16, wid: 6, seed: 31, flower: 4 })
      + strand([342, 150], [324, 260], [328, 380], [340, 512], { count: 9, len: 16, wid: 6, seed: 37, flower: 4 }))
    + group('melati-bingkai-ronce-puncak', 'crown',
      `<g transform="${place(210, 92)}">${bloom(18, 6, 12, 41)}</g>`
      + `<g transform="${place(174, 104, -30, 0.85)}">${mass(leaf(42, 15, 0.14).body)}</g>`
      + `<g transform="${place(246, 104, 30, 0.85)}">${mass(leaf(42, 15, -0.14).body)}</g>`)
  svg('bingkai-ronce', 'Bingkai ronce', W, H, body)
}

// 2 — Bingkai segi: karangan bersudut tujuh, rumpun bunga pada dua busur berlawanan.
{
  const W = 420
  const H = 420
  const cx = 210
  const cy = 210
  const R = 168
  const pts = []
  for (let i = 0; i < 7; i++) {
    const a = (-90 + (360 / 7) * i) * (Math.PI / 180)
    pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R])
  }
  const ring = (inset) => {
    const p = pts.map(([x, y]) => [cx + (x - cx) * inset, cy + (y - cy) * inset])
    return `M${p.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`
  }
  const bandPath = `${ring(1)}${ring(0.955)}`
  let clusters = ''
  const rand = prng(57)
  for (const [i0, i1] of [[4, 6], [0, 2]]) {
    for (let k = 0; k <= 7; k++) {
      const t = k / 7
      const a0 = -90 + (360 / 7) * i0
      const a1 = -90 + (360 / 7) * i1
      const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180
      const rr = R * (0.99 + (rand() - 0.5) * 0.09)
      const x = cx + Math.cos(a) * rr
      const y = cy + Math.sin(a) * rr
      const rot = (a * 180) / Math.PI + 90
      if (k % 3 === 0) clusters += `<g transform="${place(x, y, rot + 180, 0.95)}">${bloom(14, 6, rand() * 40, 60 + k)}</g>`
      else if (k % 3 === 1) {
        const l = leaf(40, 15, 0.15)
        clusters += `<g transform="${place(x, y, rot + 150, 0.9)}">${mass(l.body)}${draw(l.rib, 2.5, 0.45)}</g>`
      } else clusters += `<g transform="${place(x, y, rot + 200, 0.9)}">${mass(bud(17, 6.4))}</g>`
    }
  }
  const body = group('melati-bingkai-segi-band', 'frame', mass(bandPath, 'fill-rule="evenodd"'))
    + group('melati-bingkai-segi-dalam', 'frame', draw(ring(0.86), 2.5, 0.45))
    + group('melati-bingkai-segi-rumpun', 'floral', clusters)
  svg('bingkai-segi', 'Bingkai segi melati', W, H, body)
}

// 3 — Bingkai kembar mayang: gerbang runcing, janur menyilang di puncak.
{
  const W = 420
  const H = 588
  const outer = 'M210 18 L388 176 L388 556 L358 556 L358 190 L210 58 L62 190 L62 556 L32 556 L32 176 Z'
  const rand = prng(77)
  let fronds = ''
  for (let i = 0; i < 4; i++) {
    const s = 1 - i * 0.18
    fronds += `<g transform="${place(210, 74, -24 - i * 22, s)}">${mass(ribbon(104, 8, -0.26))}</g>`
    fronds += `<g transform="${place(210, 74, 24 + i * 22, s)}">${mass(ribbon(104, 8, 0.26))}</g>`
  }
  let side = ''
  for (let i = 0; i < 4; i++) {
    const y = 250 + i * 78
    side += `<g transform="${place(62, y, 96, 0.85 - i * 0.07)}">${mass(bud(18, 6.6))}</g>`
    side += `<g transform="${place(358, y, -96, 0.85 - i * 0.07)}">${mass(bud(18, 6.6))}</g>`
    if (i % 2 === 0) {
      side += `<g transform="${place(62, y + 38, 112, 0.8)}">${bloom(12, 6, rand() * 40, 90 + i)}</g>`
      side += `<g transform="${place(358, y + 38, -112, 0.8)}">${bloom(12, 6, rand() * 40, 95 + i)}</g>`
    }
  }
  const body = group('melati-bingkai-mayang-band', 'frame', mass(outer))
    + group('melati-bingkai-mayang-janur', 'crown', fronds + `<g transform="${place(210, 70)}">${mass(bud(30, 11))}</g>`)
    + group('melati-bingkai-mayang-sisi', 'floral', side)
    + group('melati-bingkai-mayang-kaki', 'frame',
      draw('M92 556 L328 556', 3, 0.45) + mass('M194 544 L210 528 L226 544 L210 560 Z'))
  svg('bingkai-kembar-mayang', 'Bingkai kembar mayang', W, H, body)
}

// 4 — Bingkai oval kantil.
{
  const W = 420
  const H = 588
  const ov = (rx, ry, sweep = 1) => ellipsePath(210, 294, rx, ry, sweep)
  const band = `${ov(170, 262, 1)}${ov(156, 248, 0)}`
  let garland = ''
  const rand = prng(101)
  for (let i = 0; i < 9; i++) {
    const a = 148 + i * 8.5
    const rad = (a * Math.PI) / 180
    const x = 210 + Math.cos(rad) * 163
    const y = 294 + Math.sin(rad) * 255
    garland += `<g transform="${place(x, y, a + 90, 0.86 + rand() * 0.2)}">${i % 3 === 0 ? kantil(30, 40 + i) : mass(bud(22, 8))}</g>`
  }
  for (let i = 0; i < 6; i++) {
    const a = -34 + i * 8.5
    const rad = (a * Math.PI) / 180
    const x = 210 + Math.cos(rad) * 163
    const y = 294 + Math.sin(rad) * 255
    garland += `<g transform="${place(x, y, a + 90, 0.86)}">${mass(bud(20, 7.2))}</g>`
  }
  const body = group('melati-bingkai-oval-band', 'frame', mass(band, 'fill-rule="evenodd"'))
    + group('melati-bingkai-oval-dalam', 'frame', draw(ov(140, 232), 2.5, 0.4))
    + group('melati-bingkai-oval-kantil', 'floral', garland)
  svg('bingkai-oval-kantil', 'Bingkai oval kantil', W, H, body)
}

// 5 — Bingkai anyaman: bidang janur teranyam sebagai pita kepala dan kaki.
{
  const W = 420
  const H = 588
  const band = 'M30 26 L390 26 L390 562 L360 562 L360 56 L60 56 L60 562 L30 562 Z'
  const body = group('melati-bingkai-anyam-band', 'frame', mass(band))
    + `<g id="melati-bingkai-anyam-kepala" data-layer="weave" clip-path="url(#melati-bingkai-anyam-clip)">`
    + `<clipPath id="melati-bingkai-anyam-clip"><rect x="60" y="56" width="300" height="46"/></clipPath>`
    + `<g transform="${place(24, 56)}">${weave(372, 46, { strap: 12, gap: 26, seed: 9 })}</g></g>`
    + group('melati-bingkai-anyam-kaki', 'strand',
      strand([72, 540], [160, 500], [260, 500], [348, 540], { count: 11, len: 15, wid: 5.6, seed: 63, flower: 5 }))
    + group('melati-bingkai-anyam-sisi', 'strand',
      strand([60, 126], [74, 240], [70, 360], [60, 476], { count: 8, len: 15, wid: 5.6, seed: 65, flower: 4 })
      + strand([360, 126], [346, 240], [350, 360], [360, 476], { count: 8, len: 15, wid: 5.6, seed: 69, flower: 4 }))
    + group('melati-bingkai-anyam-sudut', 'floral',
      `<g transform="${place(60, 118, 168, 1)}">${bloom(16, 6, 10, 71)}</g>`
      + `<g transform="${place(360, 118, 192, 1)}">${bloom(16, 6, -10, 73)}</g>`)
  svg('bingkai-anyaman', 'Bingkai anyaman janur', W, H, body)
}

// ================================================================== DIVIDER (5)

const dividerW = 480
const dividerH = 60

// 6 — Pemisah ronce lurus.
svg('pemisah-ronce', 'Pemisah ronce', dividerW, dividerH,
  group('melati-pemisah-ronce-untai', 'strand',
    strand([24, 30], [150, 30], [330, 30], [456, 30], { count: 13, len: 16, wid: 5.8, seed: 12, flower: 4 }))
  + group('melati-pemisah-ronce-pusat', 'floral', `<g transform="${place(240, 30)}">${bloom(15, 6, 8, 17)}</g>`))

// 7 — Pemisah kenanga: dua kelopak pita menjuntai dari satu titik.
svg('pemisah-kenanga', 'Pemisah kenanga', dividerW, dividerH,
  group('melati-pemisah-kenanga-bunga', 'floral',
    `<g transform="${place(240, 12)}">${kenanga(46, 23)}</g>`
    + `<g transform="${place(188, 16, -16, 0.72)}">${kenanga(42, 25)}</g>`
    + `<g transform="${place(292, 16, 16, 0.72)}">${kenanga(42, 27)}</g>`
    + `<g transform="${place(150, 20, -30, 0.5)}">${kenanga(40, 29)}</g>`
    + `<g transform="${place(330, 20, 30, 0.5)}">${kenanga(40, 31)}</g>`)
  + group('melati-pemisah-kenanga-garis', 'rule', draw('M34 26 L156 26M324 26 L446 26', 3, 0.45))
  + group('melati-pemisah-kenanga-ujung', 'floral',
    `<g transform="${place(28, 26, -96, 0.8)}">${mass(bud(18, 6.6))}</g>`
    + `<g transform="${place(452, 26, 96, 0.8)}">${mass(bud(18, 6.6))}</g>`))

// 8 — Pemisah janur teranyam.
svg('pemisah-janur', 'Pemisah janur', dividerW, dividerH,
  `<clipPath id="melati-pemisah-janur-clip"><rect x="60" y="16" width="360" height="28"/></clipPath>`
  + `<g id="melati-pemisah-janur-anyam" data-layer="weave" clip-path="url(#melati-pemisah-janur-clip)">`
  + `<g transform="${place(40, 16)}">${weave(400, 28, { strap: 9, gap: 20, seed: 6 })}</g></g>`
  + group('melati-pemisah-janur-ujung', 'floral',
    `<g transform="${place(44, 30, -90, 0.9)}">${mass(bud(20, 7))}</g>`
    + `<g transform="${place(436, 30, 90, 0.9)}">${mass(bud(20, 7))}</g>`))

// 9 — Pemisah titik: paling ringan, untuk section bertulisan padat.
{
  let body = mass('M240 20 L252 30 L240 40 L228 30 Z')
  for (const [x, s] of [[196, 0.8], [284, 0.8], [160, 0.6], [320, 0.6]]) {
    body += mass(`M${n(x)} ${n(30 - 7 * s)} L${n(x + 7 * s)} 30 L${n(x)} ${n(30 + 7 * s)} L${n(x - 7 * s)} 30 Z`)
  }
  svg('pemisah-titik', 'Pemisah titik melati', dividerW, dividerH,
    group('melati-pemisah-titik-manik', 'rule', body)
    + group('melati-pemisah-titik-garis', 'rule', draw('M36 30 L140 30M340 30 L444 30', 2.8, 0.4)))
}

// 10 — Pemisah sulur bercermin.
svg('pemisah-sulur', 'Pemisah sulur melati', dividerW, dividerH,
  group('melati-pemisah-sulur-kiri', 'scroll',
    tendril(196, 30, 180, 0.78, { turns: 1.3, radius: 26, seed: 33 })
    + sprig([196, 30], [166, 12], [126, 12], [96, 26], { pairs: 3, len: 24, wid: 9, seed: 35, stem: 3, taper: 0.4 }))
  + group('melati-pemisah-sulur-kanan', 'scroll',
    tendril(284, 30, 0, 0.78, { turns: 1.3, radius: 26, seed: 33 })
    + sprig([284, 30], [314, 12], [354, 12], [384, 26], { pairs: 3, len: 24, wid: 9, seed: 35, stem: 3, taper: 0.4 }))
  + group('melati-pemisah-sulur-inti', 'floral', `<g transform="${place(240, 30)}">${bloom(13, 6, 14, 29)}</g>`))

// ================================================================== CORNER (5)

const cornerSize = 180

// 11 — Sudut sulur melati.
svg('sudut-sulur', 'Sudut sulur melati', cornerSize, cornerSize,
  group('melati-sudut-sulur-tulang', 'scroll',
    draw('M14 14 C14 78 40 128 104 156', 4, 1)
    + tendril(104, 156, 6, 1, { turns: 1.35, radius: 28, seed: 45 }))
  + group('melati-sudut-sulur-ranting', 'floral',
    sprig([16, 20], [52, 46], [64, 92], [58, 138], { pairs: 4, len: 34, wid: 13, seed: 47, stem: 3.2, taper: 0.5 }))
  + group('melati-sudut-sulur-bunga', 'floral',
    `<g transform="${place(30, 34)}">${bloom(16, 6, 22, 49)}</g>`
    + `<g transform="${place(72, 118, 34, 0.8)}">${mass(bud(18, 6.8))}</g>`))

// 12 — Sudut kantil.
svg('sudut-kantil', 'Sudut kantil', cornerSize, cornerSize,
  group('melati-sudut-kantil-tulang', 'scroll', draw('M10 96 C44 96 78 72 96 10', 3.6, 0.45))
  + group('melati-sudut-kantil-bunga', 'floral',
    `<g transform="${place(48, 48, 18)}">${kantil(34, 51)}</g>`
    + `<g transform="${place(104, 96, 62, 0.66)}">${kantil(30, 53)}</g>`
    + `<g transform="${place(102, 30, -34, 0.56)}">${kantil(26, 57)}</g>`
    + `<g transform="${place(24, 104, 196, 0.8)}">${mass(bud(22, 8))}</g>`
    + `<g transform="${place(136, 58, 64, 0.7)}">${mass(bud(20, 7.4))}</g>`)
  + group('melati-sudut-kantil-daun', 'floral',
    sprig([12, 126], [54, 122], [92, 140], [126, 166], { pairs: 3, len: 34, wid: 13, seed: 55, stem: 3.2, taper: 0.42 })))

// 13 — Sudut anyaman.
svg('sudut-anyam', 'Sudut anyaman', cornerSize, cornerSize,
  `<clipPath id="melati-sudut-anyam-clip"><path d="M8 8 L132 8 L132 40 L40 40 L40 132 L8 132 Z"/></clipPath>`
  + `<g id="melati-sudut-anyam-pita" data-layer="weave" clip-path="url(#melati-sudut-anyam-clip)">`
  + `<g transform="${place(-20, 8)}">${weave(176, 32, { strap: 9, gap: 20, seed: 8 })}</g>`
  + `<g transform="${place(8, 152) } rotate(-90)">${weave(176, 32, { strap: 9, gap: 20, seed: 8 })}</g></g>`
  + group('melati-sudut-anyam-ujung', 'floral',
    `<g transform="${place(140, 24, 96, 0.9)}">${mass(bud(20, 7.2))}</g>`
    + `<g transform="${place(24, 140, 186, 0.9)}">${mass(bud(20, 7.2))}</g>`
    + `<g transform="${place(24, 24, 45, 0.9)}">${bloom(14, 6, 0, 59)}</g>`))

// 14 — Sudut ceplok: pola geometris bersudut, kerabat terdekat pekerjaan batik.
{
  let body = ''
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r + c > 2) continue
      const x = 30 + c * 56
      const y = 30 + r * 56
      const s = 1 - (r + c) * 0.16
      body += `<g transform="${place(x, y, 0, s)}">`
      body += mass('M0 -22 L9 -9 L22 0 L9 9 L0 22 L-9 9 L-22 0 L-9 -9 Z')
      body += draw('M0 -13 L7 -7 L13 0 L7 7 L0 13 L-7 7 L-13 0 L-7 -7 Z', 2.5, 0.45)
      body += '</g>'
    }
  }
  svg('sudut-ceplok', 'Sudut ceplok', cornerSize, cornerSize,
    group('melati-sudut-ceplok-pola', 'motif', body)
    + group('melati-sudut-ceplok-tepi', 'rule', draw('M10 150 L150 10', 3, 0.35)))
}

// 15 — Sudut ronce menggantung.
svg('sudut-ronce', 'Sudut ronce', cornerSize, cornerSize,
  group('melati-sudut-ronce-untai', 'strand',
    strand([6, 10], [70, 22], [120, 60], [150, 150], { count: 8, len: 15, wid: 5.6, seed: 67, flower: 3 }))
  + group('melati-sudut-ronce-pangkal', 'floral',
    `<g transform="${place(16, 16, 42)}">${bloom(15, 6, 18, 69)}</g>`
    + `<g transform="${place(54, 12, 96, 0.72)}">${mass(bud(18, 6.6))}</g>`))

// ================================================================== FLORAL (6)

// 16–18 — tangkai tunggal, tiga panjang.
svg('tangkai-melati', 'Tangkai melati', 200, 320,
  group('melati-tangkai-melati-ranting', 'floral',
    sprig([100, 312], [84, 226], [118, 140], [98, 44], { pairs: 6, len: 42, wid: 16, seed: 71, stem: 3.6, taper: 0.5 }))
  + group('melati-tangkai-melati-bunga', 'floral',
    `<g transform="${place(98, 40)}">${bloom(18, 6, 10, 73)}</g>`
    + `<g transform="${place(70, 96, -38, 0.78)}">${bloom(14, 6, 0, 75)}</g>`
    + `<g transform="${place(132, 158, 42, 0.66)}">${mass(bud(20, 7.4))}</g>`))

svg('tangkai-kenanga', 'Tangkai kenanga', 200, 320,
  group('melati-tangkai-kenanga-ranting', 'floral',
    sprig([104, 312], [120, 228], [86, 150], [104, 76], { pairs: 4, len: 38, wid: 14, seed: 81, stem: 3.6, taper: 0.46, tip: false }))
  + group('melati-tangkai-kenanga-bunga', 'floral',
    `<g transform="${place(104, 70)}">${kenanga(76, 83)}</g>`
    + `<g transform="${place(62, 130, -20, 0.72)}">${kenanga(70, 85)}</g>`
    + `<g transform="${place(146, 172, 18, 0.62)}">${kenanga(66, 87)}</g>`))

svg('tangkai-sedap-malam', 'Tangkai sedap malam', 200, 320,
  group('melati-tangkai-sedap-utama', 'floral', `<g transform="${place(104, 312)}">${tuberose(268, 91)}</g>`)
  + group('melati-tangkai-sedap-daun', 'floral',
    sprig([104, 310], [90, 266], [74, 232], [56, 204], { pairs: 2, len: 52, wid: 16, seed: 93, stem: 3, taper: 0.3 })))

// 19 — Rumpun kantil.
svg('rumpun-kantil', 'Rumpun kantil', 240, 240,
  group('melati-rumpun-kantil-daun', 'floral',
    sprig([120, 236], [72, 186], [46, 130], [40, 74], { pairs: 4, len: 44, wid: 17, seed: 95, stem: 3.4, taper: 0.46 })
    + sprig([120, 236], [170, 190], [198, 140], [204, 86], { pairs: 4, len: 44, wid: 17, seed: 97, stem: 3.4, taper: 0.46 }))
  + group('melati-rumpun-kantil-bunga', 'floral',
    `<g transform="${place(120, 96)}">${kantil(30, 99)}</g>`
    + `<g transform="${place(72, 148, -26, 0.62)}">${kantil(26, 101)}</g>`
    + `<g transform="${place(172, 152, 24, 0.56)}">${kantil(26, 103)}</g>`))

// 20 — Dedaunan pandan: tiga helai panjang, tanpa bunga.
{
  let body = ''
  const blades = [[-14, 1], [2, 0.86], [16, 0.72], [-28, 0.64]]
  for (const [rot, s] of blades) {
    const l = leaf(230 * s, 30 * s, 0.22)
    body += `<g transform="${place(120, 300, rot, 1)}">${mass(l.body)}${draw(l.rib, 3, 0.45)}</g>`
  }
  svg('dedaunan-pandan', 'Dedaunan pandan', 240, 320, group('melati-dedaunan-pandan-helai', 'floral', body))
}

// 21 — Ranting kuncup rendah, untuk sela paragraf.
svg('ranting-kuncup', 'Ranting kuncup', 200, 200,
  group('melati-ranting-kuncup-ranting', 'floral',
    sprig([12, 176], [62, 150], [112, 136], [176, 112], { pairs: 4, len: 32, wid: 12, seed: 105, stem: 3.2, taper: 0.44 }))
  + group('melati-ranting-kuncup-kuncup', 'floral',
    `<g transform="${place(176, 108, 62, 0.9)}">${mass(bud(20, 7.2))}</g>`
    + `<g transform="${place(118, 130, 30, 0.7)}">${mass(bud(18, 6.6))}</g>`))

// ================================================================== LAYER (6)

// 22 — cascade: ronce jatuh dari tepi atas.
{
  let body = ''
  const rand = prng(111)
  for (let i = 0; i < 5; i++) {
    const x = 34 + i * 48
    const drop = 190 + rand() * 120
    body += strand([x, 0], [x + 14, drop * 0.36], [x - 12, drop * 0.72], [x + 6, drop],
      { count: 7 + Math.floor(rand() * 3), len: 16, wid: 6, seed: 120 + i, flower: i % 2 === 0 ? 3 : 0 })
  }
  svg('layer-ronce-gantung', 'Ronce gantung', 260, 360, group('melati-layer-ronce-untai', 'strand', body))
}

// 23 — crown: karangan melengkung untuk kepala section.
{
  let body = sprig([20, 176], [96, 52], [324, 52], [400, 176], { pairs: 7, len: 40, wid: 15, seed: 131, stem: 3.6, taper: 0.4, from: 0.06, to: 0.94, tip: false })
  body += `<g transform="${place(210, 66)}">${bloom(19, 6, 14, 133)}</g>`
  body += `<g transform="${place(150, 80, -28, 0.7)}">${bloom(15, 6, 0, 135)}</g>`
  body += `<g transform="${place(270, 80, 28, 0.7)}">${bloom(15, 6, 0, 137)}</g>`
  svg('layer-karangan', 'Karangan melati', 420, 200, group('melati-layer-karangan-rangkai', 'floral', body))
}

// 24 — cluster: rumpun sudut.
svg('layer-rumpun', 'Rumpun melati', 240, 240,
  group('melati-layer-rumpun-ranting', 'floral',
    sprig([16, 224], [80, 196], [120, 132], [128, 46], { pairs: 5, len: 40, wid: 15, seed: 141, stem: 3.4, taper: 0.48 })
    + sprig([16, 224], [88, 224], [156, 200], [214, 152], { pairs: 4, len: 36, wid: 14, seed: 143, stem: 3.4, taper: 0.46 }))
  + group('melati-layer-rumpun-bunga', 'floral',
    `<g transform="${place(128, 42)}">${bloom(18, 6, 16, 145)}</g>`
    + `<g transform="${place(206, 146, 44, 0.74)}">${bloom(15, 6, 0, 147)}</g>`
    + `<g transform="${place(76, 128, -30, 0.6)}">${mass(bud(19, 7))}</g>`))

// 25 — swag: untaian melengkung antar dua titik.
svg('layer-untaian', 'Untaian melati', 480, 200,
  group('melati-layer-untaian-tali', 'strand',
    strand([16, 26], [140, 172], [340, 172], [464, 26], { count: 17, len: 17, wid: 6.2, seed: 151, flower: 4 }))
  + group('melati-layer-untaian-simpul', 'floral',
    `<g transform="${place(20, 22, -40)}">${bloom(15, 6, 0, 153)}</g>`
    + `<g transform="${place(460, 22, 40)}">${bloom(15, 6, 0, 155)}</g>`))

// 26 — bloom: mekar penuh untuk jangkar tunggal.
svg('layer-mekar', 'Mekar kantil', 300, 300,
  group('melati-layer-mekar-daun', 'floral',
    (() => {
      let s = ''
      const rand = prng(163)
      for (let i = 0; i < 7; i++) {
        const a = 26 + i * 51
        const rad = ((a - 90) * Math.PI) / 180
        const l = leaf(96 + rand() * 24, 30, 0.18)
        s += `<g transform="${place(150 + Math.cos(rad) * 44, 150 + Math.sin(rad) * 44, a, 1)}">${mass(l.body)}${draw(l.rib, 2.8, 0.45)}</g>`
      }
      return s
    })())
  + group('melati-layer-mekar-kuncup', 'floral',
    (() => {
      let s = ''
      for (let i = 0; i < 5; i++) {
        const a = 52 + i * 72
        const rad = ((a - 90) * Math.PI) / 180
        s += `<g transform="${place(150 + Math.cos(rad) * 62, 150 + Math.sin(rad) * 62, a, 0.9)}">${mass(bud(22, 8))}</g>`
      }
      return s
    })())
  + group('melati-layer-mekar-bunga', 'floral', `<g transform="${place(150, 150)}">${kantil(40, 161)}</g>`))

// 27 — cascade ringan: satu untai tunggal panjang.
svg('layer-untai-tunggal', 'Untai tunggal', 120, 400,
  group('melati-layer-untai-tunggal-untai', 'strand',
    strand([60, 0], [92, 120], [28, 260], [66, 392], { count: 13, len: 17, wid: 6.2, seed: 171, flower: 4 })))

// ================================================================== MONOGRAM (3)

// 28 — dua cincin bertaut diikat ronce.
{
  const body = group('melati-monogram-cincin-cincin', 'ring',
    mass(ringPath(96, 120, 54, 10), 'fill-rule="evenodd"')
    + mass(ringPath(148, 120, 54, 10), 'fill-rule="evenodd"'))
    + group('melati-monogram-cincin-ronce', 'strand',
      strand([40, 158], [92, 212], [152, 212], [204, 158], { count: 9, len: 14, wid: 5.2, seed: 181, flower: 4 }))
    + group('melati-monogram-cincin-daun', 'floral',
      `<g transform="${place(122, 42)}">${bloom(15, 6, 12, 183)}</g>`)
  svg('monogram-cincin', 'Monogram cincin ronce', 244, 244, body)
}

// 29 — perisai/kartus dengan ruang inisial.
{
  const shell = 'M122 14 C176 14 214 52 214 112 C214 178 176 214 122 230 C68 214 30 178 30 112 C30 52 68 14 122 14 Z'
    + 'M122 32 C78 32 48 62 48 112 C48 166 80 196 122 210 C164 196 196 166 196 112 C196 62 166 32 122 32 Z'
  const body = group('melati-monogram-perisai-kartus', 'frame', mass(shell, 'fill-rule="evenodd"'))
    + group('melati-monogram-perisai-mahkota', 'floral',
      `<g transform="${place(122, 26)}">${bloom(16, 6, 0, 191)}</g>`
      + `<g transform="${place(92, 40, -42, 0.66)}">${mass(leaf(36, 13, 0.14).body)}</g>`
      + `<g transform="${place(152, 40, 42, 0.66)}">${mass(leaf(36, 13, -0.14).body)}</g>`)
    + group('melati-monogram-perisai-kaki', 'strand',
      strand([64, 214], [92, 240], [152, 240], [180, 214], { count: 7, len: 13, wid: 5, seed: 193 }))
  svg('monogram-perisai', 'Monogram perisai melati', 244, 260, body)
}

// 30 — lingkar ronce untuk inisial di tengah.
{
  const rand = prng(201)
  let body = ''
  for (let i = 0; i < 22; i++) {
    const a = -90 + (360 / 22) * i
    const rad = (a * Math.PI) / 180
    const x = 122 + Math.cos(rad) * 96
    const y = 122 + Math.sin(rad) * 96
    const s = 0.84 + rand() * 0.26
    body += `<g transform="${place(x, y, a + 90, s)}">${i % 4 === 0 ? bloom(11, 6, 0, 210 + i) : mass(bud(15, 5.6))}</g>`
  }
  svg('monogram-lingkar', 'Monogram lingkar ronce', 244, 244,
    group('melati-monogram-lingkar-untai', 'strand',
      draw(circlePath(122, 122, 96), 2.5, 0.35) + body))
}

// ================================================================== MOTIF (4)

// 31 — ceplok melati: ubin berulang.
{
  const tile = (x, y, s, seed) => `<g transform="${place(x, y, 0, s)}">`
    + mass('M0 -34 C10 -18 18 -10 34 0 C18 10 10 18 0 34 C-10 18 -18 10 -34 0 C-18 -10 -10 -18 0 -34 Z'
      + 'M0 -25 C7 -13 13 -7 25 0 C13 7 7 13 0 25 C-7 13 -13 7 -25 0 C-13 -7 -7 -13 0 -25 Z', 'fill-rule="evenodd"')
    + `${bloom(13, 6, 0, seed)}</g>`
  let body = ''
  let k = 0
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      body += tile(40 + c * 80, 40 + r * 80, 1, 220 + k++)
    }
  }
  let mesh = ''
  for (let i = 0; i <= 4; i++) mesh += `M0 ${n(i * 40)} L160 ${n(i * 40)}M${n(i * 40)} 0 L${n(i * 40)} 160`
  svg('motif-ceplok', 'Motif ceplok melati', 160, 160,
    group('melati-motif-ceplok-jala', 'motif', draw(mesh, 2.5, 0.25))
    + group('melati-motif-ceplok-ubin', 'motif', body))
}

// 32 — anyaman janur sebagai ubin.
svg('motif-anyaman', 'Motif anyaman janur', 160, 160,
  `<clipPath id="melati-motif-anyaman-clip"><rect width="160" height="160"/></clipPath>`
  + `<g id="melati-motif-anyaman-pita" data-layer="motif" clip-path="url(#melati-motif-anyaman-clip)">`
  + `<g transform="${place(-40, 0)}">${weave(240, 160, { strap: 14, gap: 34, seed: 11 })}</g></g>`)

// 33 — deret kuncup diagonal.
{
  let body = ''
  let ghost = ''
  const rand = prng(231)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = 20 + c * 40 + (r % 2 ? 20 : 0)
      const y = 20 + r * 40
      const g = `<g transform="${place(x, y, 32 + rand() * 20, 0.9)}">${mass(bud(17, 6.4))}</g>`
      // Selang-seling dua bidang nilai: tanpa ini ubinnya hanya punya satu nilai tinta.
      if ((r + c) % 2) ghost += g
      else body += g
    }
  }
  svg('motif-kuncup', 'Motif kuncup', 160, 160,
    group('melati-motif-kuncup-samar', 'motif', ghost, 'opacity=".45"')
    + group('melati-motif-kuncup-deret', 'motif', body))
}

// 34 — motif tumpal melati: segitiga berjajar dengan kuncup di dalamnya.
{
  let body = ''
  for (let i = 0; i < 4; i++) {
    const x = i * 40
    body += mass(`M${n(x)} 160 L${n(x + 20)} 56 L${n(x + 40)} 160 Z`
      + `M${n(x + 8)} 152 L${n(x + 20)} 74 L${n(x + 32)} 152 Z`, 'fill-rule="evenodd"')
    body += `<g transform="${place(x + 20, 148, 0, 0.9)}">${mass(bud(40, 11))}</g>`
  }
  svg('motif-tumpal', 'Motif tumpal melati', 160, 160,
    group('melati-motif-tumpal-gigi', 'motif', body)
    + group('melati-motif-tumpal-garis', 'rule', draw('M0 40 L160 40', 3, 0.4)))
}

// ================================================================== SYMBOL (4)

// 35 — kembar mayang.
{
  let fronds = ''
  for (let i = 0; i < 4; i++) {
    const s = 1 - i * 0.16
    fronds += `<g transform="${place(100, 132, -26 - i * 24, s)}">${mass(ribbon(112, 9, -0.24))}</g>`
    fronds += `<g transform="${place(100, 132, 26 + i * 24, s)}">${mass(ribbon(112, 9, 0.24))}</g>`
  }
  svg('kembar-mayang', 'Kembar mayang', 200, 280,
    group('melati-kembar-mayang-janur', 'crown', fronds)
    + group('melati-kembar-mayang-batang', 'stem',
      mass('M92 132 L108 132 L104 268 L96 268 Z') + draw('M74 268 L126 268', 3.4, 1))
    + group('melati-kembar-mayang-bunga', 'floral',
      `<g transform="${place(100, 124)}">${bloom(17, 6, 10, 241)}</g>`
      + `<g transform="${place(74, 176, -24, 0.66)}">${mass(bud(20, 7.4))}</g>`
      + `<g transform="${place(126, 200, 24, 0.66)}">${mass(bud(20, 7.4))}</g>`))
}

// 36 — janur kuning melengkung: penanda gerbang.
{
  let body = draw('M100 268 C100 196 96 140 100 64', 4, 1)
  for (let i = 0; i < 7; i++) {
    const t = i / 6
    const y = 250 - t * 180
    const s = 0.5 + t * 0.6
    body += `<g transform="${place(100, y, -72, s)}">${mass(ribbon(78, 9, -0.3))}</g>`
    body += `<g transform="${place(100, y, 72, s)}">${mass(ribbon(78, 9, 0.3))}</g>`
  }
  body += `<g transform="${place(100, 58)}">${mass(bud(30, 11))}</g>`
  svg('janur-kuning', 'Janur kuning', 200, 280, group('melati-janur-kuning-helai', 'crown', body))
}

// 37 — payung teduh: payung upacara, bentuk kaku.
{
  let ribs = ''
  for (let i = 0; i < 6; i++) {
    const x = 28 + i * 28.8
    ribs += draw(`M100 62 L${n(x)} 128`, 2.5, 0.45)
  }
  let fringe = ''
  for (let i = 0; i < 9; i++) {
    const x = 22 + i * 19.5
    fringe += `<g transform="${place(x, 128, 0, 0.62)}">${mass(bud(22, 8))}</g>`
  }
  svg('payung-teduh', 'Payung teduh', 200, 280,
    group('melati-payung-kubah', 'dome',
      mass('M100 44 C158 44 186 88 192 128 C160 112 140 130 100 130 C60 130 40 112 8 128 C14 88 42 44 100 44 Z'))
    + group('melati-payung-rusuk', 'rule', ribs)
    + group('melati-payung-ronce', 'strand', fringe)
    + group('melati-payung-tiang', 'stem', mass('M96 52 L104 52 L102 264 L98 264 Z') + mass('M100 28 L108 42 L100 56 L92 42 Z')))
}

// 38 — sepasang merpati sederhana, bermassa dan kaku.
{
  svg('merpati-sepasang', 'Sepasang merpati', 260, 200,
    group('melati-merpati-kiri', 'bird', `<g transform="${place(76, 80, -10)}">${dove(1)}</g>`)
    + group('melati-merpati-kanan', 'bird', `<g transform="${place(184, 80, 10)} scale(-1 1)">${dove(1)}</g>`)
    + group('melati-merpati-ronce', 'strand',
      strand([64, 126], [100, 176], [160, 176], [196, 126], { count: 9, len: 14, wid: 5.2, seed: 251, flower: 3 })))
}

// ================================================================== SEAL (3)

// 39 — segel melati.
{
  const rim = ringPath(80, 80, 72, 16)
  let teeth = ''
  for (let i = 0; i < 24; i++) {
    const a = (360 / 24) * i
    teeth += `<g transform="${place(80, 80, a)}">${mass('M0 -78 L5 -70 L-5 -70 Z')}</g>`
  }
  svg('segel-melati', 'Segel melati', 160, 160,
    group('melati-segel-melati-gigi', 'seal', teeth, 'opacity=".45"')
    + group('melati-segel-melati-cincin', 'seal', mass(rim, 'fill-rule="evenodd"'))
    + group('melati-segel-melati-inti', 'floral', `<g transform="${place(80, 80)}">${bloom(30, 6, 12, 261)}</g>`))
}

// 40 — segel janur.
svg('segel-janur', 'Segel janur', 160, 160,
  group('melati-segel-janur-cincin', 'seal',
    mass(ringPath(80, 80, 72, 14), 'fill-rule="evenodd"'))
  + `<clipPath id="melati-segel-janur-clip"><circle cx="80" cy="80" r="52"/></clipPath>`
  + `<g id="melati-segel-janur-anyam" data-layer="weave" clip-path="url(#melati-segel-janur-clip)">`
  + `<g transform="${place(0, 28)}">${weave(160, 104, { strap: 12, gap: 28, seed: 13 })}</g></g>`)

// 41 — segel kuncup: paling sederhana, untuk tempat kecil.
{
  let ring = ''
  for (let i = 0; i < 12; i++) {
    const a = (360 / 12) * i
    const rad = (a * Math.PI) / 180
    ring += `<g transform="${place(80 + Math.cos(rad) * 54, 80 + Math.sin(rad) * 54, a + 90, 0.9)}">${mass(bud(17, 6.4))}</g>`
  }
  svg('segel-kuncup', 'Segel kuncup', 160, 160,
    group('melati-segel-kuncup-lingkar', 'seal', draw(circlePath(80, 80, 54), 2.5, 0.35) + ring)
    + group('melati-segel-kuncup-inti', 'floral', `<g transform="${place(80, 80)}">${bloom(22, 6, 0, 271)}</g>`))
}

// ================================================================== VENUE (1)

// 42 — pendopo joglo. Bangunan kaku: tidak pernah ditekuk oleh motion.
{
  const roof = 'M100 18 L176 74 L154 74 L100 36 L46 74 L24 74 Z'
  const roof2 = 'M100 60 L192 130 L166 130 L100 82 L34 130 L8 130 Z'
  let pillars = ''
  for (const x of [34, 74, 126, 166]) pillars += mass(`M${n(x - 6)} 130 L${n(x + 6)} 130 L${n(x + 4)} 232 L${n(x - 4)} 232 Z`)
  svg('pendopo-joglo', 'Pendopo joglo', 200, 260,
    group('melati-pendopo-atap', 'roof', mass(roof) + mass(roof2))
    + group('melati-pendopo-tiang', 'pillar', pillars)
    + group('melati-pendopo-lantai', 'base', mass('M8 232 L192 232 L192 244 L8 244 Z'))
    + group('melati-pendopo-hias', 'floral',
      `<g transform="${place(100, 52)}">${mass(bud(26, 9))}</g>`
      + draw('M34 148 L166 148', 3, 0.45)))
}

// ================================================================== TAMBAHAN (3)

// 43 — pemisah kantil.
svg('pemisah-kantil', 'Pemisah kantil', dividerW, dividerH,
  group('melati-pemisah-kantil-bunga', 'floral',
    `<g transform="${place(240, 30)}">${kantil(26, 281)}</g>`
    + `<g transform="${place(186, 30, -14, 0.62)}">${kantil(24, 283)}</g>`
    + `<g transform="${place(294, 30, 14, 0.62)}">${kantil(24, 285)}</g>`)
  + group('melati-pemisah-kantil-daun', 'floral',
    sprig([146, 30], [116, 14], [80, 14], [44, 28], { pairs: 3, len: 26, wid: 10, seed: 287, stem: 3, taper: 0.42 })
    + sprig([334, 30], [364, 14], [400, 14], [436, 28], { pairs: 3, len: 26, wid: 10, seed: 287, stem: 3, taper: 0.42 })))

// 44 — sudut melati sederhana, untuk tempat sempit.
svg('sudut-melati', 'Sudut melati', cornerSize, cornerSize,
  group('melati-sudut-melati-ranting', 'floral',
    sprig([10, 10], [66, 34], [104, 76], [128, 132], { pairs: 4, len: 32, wid: 12, seed: 291, stem: 3.4, taper: 0.46 }))
  + group('melati-sudut-melati-bunga', 'floral',
    `<g transform="${place(22, 22, 44)}">${bloom(17, 6, 12, 293)}</g>`
    + `<g transform="${place(132, 140, 58, 0.72)}">${bloom(14, 6, 0, 295)}</g>`))

// 45 — motif jala melati.
{
  let mesh = ''
  for (let i = -2; i <= 6; i++) {
    mesh += `M${n(i * 40)} 0 L${n(i * 40 + 160)} 160M${n(i * 40)} 160 L${n(i * 40 + 160)} 0`
  }
  let dots = ''
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) dots += `<g transform="${place(20 + c * 40, 20 + r * 40, 0, 0.72)}">${bloom(12, 6, (r + c) * 9, 301 + r * 4 + c)}</g>`
  }
  svg('motif-jala', 'Motif jala melati', 160, 160,
    `<clipPath id="melati-motif-jala-clip"><rect width="160" height="160"/></clipPath>`
    + `<g id="melati-motif-jala-jala" data-layer="motif" clip-path="url(#melati-motif-jala-clip)">${draw(mesh, 2.5, 0.3)}</g>`
    + group('melati-motif-jala-bunga', 'motif', dots))
}

// ------------------------------------------------------------------ katalog

/**
 * Metadata per glyph: `[id, kategori, anchor, peranBudaya, tag…]`.
 *
 * `peranBudaya` memisahkan empat hal yang gampang tercampur, dan pemisahan itu yang
 * menjaga `CULTURE.md` tetap jujur:
 *   flora-upacara     — tanaman yang memang dipakai di pernikahan Indonesia
 *   bahan-upacara     — bahan/kerajinan yang memang dipakai (janur, anyaman)
 *   perangkat-upacara — perangkat upacara yang punya nama sendiri
 *   arsitektur        — bangunan
 *   hiasan-original   — bentuk hias yang dikarang untuk pack ini, tanpa klaim makna
 */
const META = [
  ['bingkai-ronce', 'frame', 'section', 'flora-upacara', 'melati', 'ronce', 'lengkung'],
  ['bingkai-segi', 'frame', 'foto', 'hiasan-original', 'karangan', 'geometris', 'segi-tujuh'],
  ['bingkai-kembar-mayang', 'frame', 'section', 'perangkat-upacara', 'janur', 'gerbang'],
  ['bingkai-oval-kantil', 'frame', 'foto', 'flora-upacara', 'kantil', 'oval'],
  ['bingkai-anyaman', 'frame', 'section', 'bahan-upacara', 'janur', 'anyaman'],

  ['pemisah-ronce', 'divider', 'antar-blok', 'flora-upacara', 'melati', 'ronce'],
  ['pemisah-kenanga', 'divider', 'antar-blok', 'flora-upacara', 'kenanga'],
  ['pemisah-janur', 'divider', 'antar-blok', 'bahan-upacara', 'janur', 'anyaman'],
  ['pemisah-titik', 'divider', 'antar-blok', 'hiasan-original', 'minimal', 'manik'],
  ['pemisah-sulur', 'divider', 'antar-blok', 'hiasan-original', 'sulur', 'cermin'],
  ['pemisah-kantil', 'divider', 'antar-blok', 'flora-upacara', 'kantil'],

  ['sudut-sulur', 'corner', 'sudut', 'hiasan-original', 'sulur', 'spiral'],
  ['sudut-kantil', 'corner', 'sudut', 'flora-upacara', 'kantil'],
  ['sudut-anyam', 'corner', 'sudut', 'bahan-upacara', 'janur', 'anyaman'],
  ['sudut-ceplok', 'corner', 'sudut', 'hiasan-original', 'geometris', 'ceplok'],
  ['sudut-ronce', 'corner', 'sudut', 'flora-upacara', 'melati', 'ronce'],
  ['sudut-melati', 'corner', 'sudut', 'flora-upacara', 'melati', 'ringkas'],

  ['tangkai-melati', 'floral', 'tepi', 'flora-upacara', 'melati', 'tangkai'],
  ['tangkai-kenanga', 'floral', 'tepi', 'flora-upacara', 'kenanga', 'tangkai'],
  ['tangkai-sedap-malam', 'floral', 'tepi', 'flora-upacara', 'sedap-malam', 'tangkai'],
  ['rumpun-kantil', 'floral', 'tepi', 'flora-upacara', 'kantil', 'rumpun'],
  ['dedaunan-pandan', 'floral', 'tepi', 'flora-upacara', 'pandan', 'daun'],
  ['ranting-kuncup', 'floral', 'sela-teks', 'flora-upacara', 'melati', 'kuncup'],

  ['layer-ronce-gantung', 'layer', 'cascade', 'flora-upacara', 'melati', 'ronce', 'gantung'],
  ['layer-karangan', 'layer', 'crown', 'flora-upacara', 'melati', 'karangan'],
  ['layer-rumpun', 'layer', 'cluster', 'flora-upacara', 'melati', 'rumpun'],
  ['layer-untaian', 'layer', 'swag', 'flora-upacara', 'melati', 'untaian'],
  ['layer-mekar', 'layer', 'bloom', 'flora-upacara', 'kantil', 'mekar'],
  ['layer-untai-tunggal', 'layer', 'cascade', 'flora-upacara', 'melati', 'ronce'],

  ['monogram-cincin', 'monogram', 'kepala', 'hiasan-original', 'cincin', 'inisial'],
  ['monogram-perisai', 'monogram', 'kepala', 'hiasan-original', 'kartus', 'inisial'],
  ['monogram-lingkar', 'monogram', 'kepala', 'flora-upacara', 'melati', 'inisial'],

  ['motif-ceplok', 'motif', 'latar', 'hiasan-original', 'geometris', 'ubin'],
  ['motif-anyaman', 'motif', 'latar', 'bahan-upacara', 'janur', 'ubin'],
  ['motif-kuncup', 'motif', 'latar', 'flora-upacara', 'melati', 'ubin'],
  ['motif-tumpal', 'motif', 'pita', 'hiasan-original', 'tumpal', 'segitiga'],
  ['motif-jala', 'motif', 'latar', 'hiasan-original', 'jala', 'ubin'],

  ['kembar-mayang', 'symbol', 'kepala', 'perangkat-upacara', 'janur', 'kembar-mayang'],
  ['janur-kuning', 'symbol', 'tepi', 'perangkat-upacara', 'janur', 'penanda'],
  ['payung-teduh', 'symbol', 'kepala', 'perangkat-upacara', 'payung'],
  ['merpati-sepasang', 'symbol', 'kepala', 'hiasan-original', 'merpati', 'sepasang'],

  ['segel-melati', 'seal', 'penutup', 'hiasan-original', 'segel', 'melati'],
  ['segel-janur', 'seal', 'penutup', 'bahan-upacara', 'segel', 'anyaman'],
  ['segel-kuncup', 'seal', 'penutup', 'flora-upacara', 'segel', 'kuncup'],

  ['pendopo-joglo', 'venue', 'seksi-acara', 'arsitektur', 'pendopo', 'joglo'],
]

/**
 * Resep motion per kategori. Angkanya datang dari `sources/canva/MOTION-DALAM.md`:
 * `power1.out` (lima dari sembilan klip), masuk 0,9 s, stagger 0,5 s (`t50` klip botanical),
 * seluruh gerak masuk tuntas di bawah 2,5 s. Amplitudo **tidak** terukur — itu pilihan,
 * dan ditandai begitu di `amplitudeMeasured`.
 */
const MOTION = {
  frame: { preset: 'reveal', amplitude: 14, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: true },
  divider: { preset: 'reveal', amplitude: 12, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: false },
  corner: { preset: 'reveal', amplitude: 14, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: false },
  floral: { preset: 'reveal+sway', amplitude: 16, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: false, sway: { amplitude: 1.5, unit: 'deg', duration: 6, ease: 'sine.inOut' } },
  layer: { preset: 'cascadeIn', amplitude: 18, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: false, sway: { amplitude: 1.5, unit: 'deg', duration: 6, ease: 'sine.inOut' } },
  monogram: { preset: 'reveal', amplitude: 12, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: false },
  motif: { preset: 'static', amplitude: 0, unit: 'px', duration: 0, ease: 'none', stagger: 0, rigid: true },
  symbol: { preset: 'reveal', amplitude: 14, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: true },
  seal: { preset: 'reveal', amplitude: 10, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: true },
  venue: { preset: 'reveal', amplitude: 14, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: true },
}

const byId = new Map(files.map((f) => [f.id, f]))
const missing = META.filter(([id]) => !byId.has(id)).map(([id]) => id)
const unlisted = files.filter((f) => !META.some(([id]) => id === f.id)).map((f) => f.id)
if (missing.length || unlisted.length) {
  console.error(`metadata tidak cocok — hilang: ${missing.join(', ') || '-'} · tanpa metadata: ${unlisted.join(', ') || '-'}`)
  process.exitCode = 1
}

const assets = META.filter(([id]) => byId.has(id)).map(([id, category, anchor, culturalRole, ...tags]) => {
  const f = byId.get(id)
  const motion = { ...MOTION[category], reducedMotion: 'langsung-ke-keadaan-akhir', amplitudeMeasured: false }
  return {
    id,
    name: f.name,
    category,
    tags: [category, culturalRole, ...tags],
    culturalRole,
    provenance: {
      kind: 'original',
      method: 'geometri parametrik, digambar untuk pack ini',
      generator: 'build.mjs',
      referenceStudy: [
        'docs/features/ornament-builder/sources/canva/MOTION-DALAM.md',
        'docs/features/ornament-builder/originals/melati/CULTURE.md',
      ],
      tracedFrom: null,
      checkedAt: '2026-09-17',
    },
    usage: 'original-local-demo',
    style: { palette: 'monokrom currentColor', medium: 'vektor bermassa', inkFields: [1, 0.45] },
    layers: f.layers,
    anchor,
    motion,
    variants: [{
      file: `svg/${id}.svg`,
      format: 'svg',
      width: f.width,
      height: f.height,
      ratio: Math.round((f.width / f.height) * 1000) / 1000,
      bytes: f.bytes,
      sha256: f.sha256,
      alpha: true,
    }],
  }
})

writeFileSync(join(HERE, 'catalog.json'), `${JSON.stringify({
  schemaVersion: 1,
  id: 'melati',
  name: 'Ronce Melati',
  scope: 'original-local-demo',
  builtAt: '2026-09-17',
  palette: {
    paper: '#FBF7EF',
    ink: '#22301F',
    sage: '#6D8065',
    gold: '#A9873F',
    note: 'Palet demo pack. Token aplikasi tidak diubah; glyph memakai currentColor.',
  },
  fonts: {
    demo: 'Georgia / Arial bawaan sistem, supaya demo jalan offline',
    recommendation: 'Cormorant Garamond + Plus Jakarta Sans dari sumber resmi berlisensi',
    note: 'Belum diuji di demo; tidak ada biner font yang disalin ke pack ini.',
  },
  composition: {
    anchorRule: 'Ornamen di tepi dan sudut; zona teks tidak dianimasikan.',
    source: 'sources/canva/MOTION-DALAM.md — densitas pusat 0,00 pada klip botanical',
  },
  assets,
}, null, 2)}\n`)

// ------------------------------------------------------------------ ringkas

console.log(`${files.length} glyph ditulis ke ${OUT}`)
const perCategory = {}
for (const a of assets) perCategory[a.category] = (perCategory[a.category] || 0) + 1
console.log(Object.entries(perCategory).map(([k, v]) => `${k} ${v}`).join(' · '))
console.log(`catalog.json: ${assets.length} aset, ${assets.reduce((t, a) => t + a.variants[0].bytes, 0)} byte SVG`)
