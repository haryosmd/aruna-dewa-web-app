#!/usr/bin/env node
/**
 * Pembangun pack ornamen `kayon` — fase 32.
 *
 * Kosakata bentuknya dipelajari dari satu desain undangan Canva milik pemilik akun
 * (`sources/canva-cokelat-krem/`): siluet gunungan/kayon, isian ukel, pita medalion,
 * kipas patran, dan bunga. Yang diambil adalah kosakata dan proporsinya. Tidak ada
 * piksel, path, atau aset referensi yang masuk ke sini — semua bentuk dihitung di
 * `geometry.mjs`.
 *
 *   node build.mjs
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  cakram, cincin, daun, inside, kayonOutline, mawar, offsetInward,
  patran, poly, round2 as n, tumpal, ukel, ukelBertangkai,
} from './geometry.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const SVG_DIR = join(HERE, 'svg')
const TEX_DIR = join(HERE, 'tekstur')
mkdirSync(SVG_DIR, { recursive: true })
mkdirSync(TEX_DIR, { recursive: true })

const CHECKED_AT = '2026-09-17'
const assets = []

/** Bungkus jadi berkas SVG utuh. Setiap id diawali `kayon-<slug>-` agar unik global. */
function svg({ id, title, w, h, body }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="currentColor" ` +
    `role="img" aria-labelledby="kayon-${id}-title">` +
    `<title id="kayon-${id}-title">${title}</title>${body}</svg>`
  )
}

const layer = (id, slot, body) => `<g id="kayon-${id}-${slot}" data-layer="${slot}">${body}</g>`
const mass = (d, opacity = 1, extra = '') =>
  `<path data-mass="" ${extra}${opacity === 1 ? '' : `opacity="${opacity}" `}d="${d}"/>`
const draw = (d, width = 3, opacity = 1) =>
  `<path data-draw="" fill="none" stroke="currentColor" stroke-width="${width}" ` +
  `stroke-linecap="round" stroke-linejoin="round"${opacity === 1 ? '' : ` opacity="${opacity}"`} d="${d}"/>`
/** Cincin selalu evenodd — tanpa itu bandnya terisi penuh dan jadi cakram. */
const ring = (r, band, opacity = 1) =>
  `<path data-mass="" fill-rule="evenodd"${opacity === 1 ? '' : ` opacity="${opacity}"`} d="${cincin(r, band)}"/>`
const at = (x, y, body, rot = 0, sc = 1) =>
  `<g transform="translate(${n(x)} ${n(y)})${rot ? ` rotate(${n(rot)})` : ''}` +
  `${sc !== 1 ? ` scale(${n(sc)})` : ''}">${body}</g>`

/* ── bentuk turunan yang dipakai ulang ─────────────────────────────────────── */

/** Band gunungan berongga: siluet luar + siluet yang di-offset ke dalam, evenodd. */
function kayonBand(w, h, band) {
  const outer = kayonOutline(w, h)
  const innerPts = offsetInward(outer, band)
  return { d: `${poly(outer)}${poly(innerPts)}`, outer, inner: innerPts }
}

/**
 * Isian ukel di dalam siluet gunungan, mengikuti tulang diagonal seperti referensi.
 * Tiap curl hanya dipasang kalau pusatnya jatuh di dalam siluet dalam — jadi isiannya
 * tidak pernah menembus band.
 */
function isianUkel(w, h, innerPts, { rows = 7, cols = 4, size = 0.085 } = {}) {
  const parts = []
  let i = 0
  const muat = (x, y, rad) =>
    inside(innerPts, x, y) &&
    [[rad, 0], [-rad, 0], [0, rad], [0, -rad]].every(([dx, dy]) => inside(innerPts, x + dx, y + dy))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols) * w + (r % 2 ? w / (cols * 3.6) : -w / (cols * 4.6))
      const y = (0.3 + (0.62 * r) / Math.max(1, rows - 1)) * h
      const dir = (c + r) % 2 ? 1 : -1
      const r0 = Math.min(w, h) * size * (0.82 + 0.36 * ((r * 3 + c) % 3) / 2)
      if (!muat(x, y, r0 * 1.15)) continue
      const tilt = (dir > 0 ? -0.35 : Math.PI + 0.35) + ((r * 5 + c * 3) % 7 - 3) * 0.22
      parts.push(
        at(x, y, mass(ukelBertangkai({
          len: r0 * 1.5, r0, turns: 0.78, w0: r0 * 0.34, dir, tilt,
        }), (i++ % 3 === 2) ? 0.45 : 1)),
      )
    }
  }
  return parts.join('')
}

/** Tulang diagonal gunungan: garis tebal dari pangkal ke puncak, seperti di referensi. */
const tulangKayon = (w, h) =>
  draw(`M${n(w * 0.2)} ${n(h * 0.9)}Q${n(w * 0.42)} ${n(h * 0.52)} ${n(w * 0.52)} ${n(h * 0.08)}`, 4)

/** Sepasang ukel punggung-ke-punggung — unit pemisah dan pengisi pita medalion. */
const ukelKembar = (r0, w0) =>
  mass(ukelBertangkai({ len: r0 * 1.5, r0, turns: 0.88, w0, dir: -1, tilt: Math.PI })) +
  mass(ukelBertangkai({ len: r0 * 1.5, r0, turns: 0.88, w0, dir: 1, tilt: 0 }))

/** Satu unit pita medalion: cakram di tengah, ukel kembar dan kipas patran di sisinya. */
function unitMedalion(unit, hh) {
  const r = hh * 0.4
  return (
    at(unit / 2, hh / 2, ring(r, r * 0.26)) +
    at(unit / 2, hh / 2, mass(cakram(r * 0.16), 0.45)) +
    at(unit / 2, hh / 2, ukelKembar(hh * 0.24, hh * 0.09), 0, 1) +
    at(unit / 2, hh * 0.1, patran(5, hh * 0.26, 132, 0.2), 90, 1) +
    at(unit / 2, hh * 0.9, patran(5, hh * 0.26, 132, 0.2), -90, 1) +
    at(unit * 0.02, hh / 2, mass(cakram(hh * 0.055), 0.45)) +
    at(unit * 0.98, hh / 2, mass(cakram(hh * 0.055), 0.45))
  )
}

/* ── katalog aset ──────────────────────────────────────────────────────────── */

function add(spec) {
  const text = svg(spec)
  const file = `svg/${spec.id}.svg`
  writeFileSync(join(HERE, file), text)
  assets.push({
    id: spec.id,
    name: spec.title,
    category: spec.category,
    tags: spec.tags,
    culturalRole: spec.culturalRole,
    provenance: {
      kind: 'original',
      method: 'geometri parametrik, dihitung untuk pack ini',
      generator: 'build.mjs + geometry.mjs',
      referenceStudy: [
        'docs/features/ornament-builder/sources/canva-cokelat-krem/MOTION.md',
        'docs/features/ornament-builder/sources/canva-cokelat-krem/README.md',
        'docs/features/ornament-builder/originals/kayon/CULTURE.md',
      ],
      tracedFrom: null,
      checkedAt: CHECKED_AT,
    },
    usage: 'original-local-demo',
    style: {
      palette: 'monokrom currentColor',
      medium: 'vektor bermassa',
      inkFields: [1, 0.45],
    },
    layers: spec.layers,
    anchor: spec.anchor,
    motion: spec.motion,
    variants: [{
      file,
      format: 'svg',
      width: spec.w,
      height: spec.h,
      ratio: Math.round((spec.w / spec.h) * 1000) / 1000,
      bytes: Buffer.byteLength(text),
      sha256: createHash('sha256').update(text).digest('hex'),
      alpha: true,
    }],
  })
}

/** Resep motion, diturunkan dari pengukuran klip di `sources/canva-cokelat-krem/MOTION.md`. */
const M = {
  gerbang: { preset: 'gate', amplitude: 24, unit: 'px', duration: 1.0, ease: 'sine.inOut', stagger: 0, rigid: true, reducedMotion: 'langsung-ke-keadaan-akhir', amplitudeMeasured: false },
  pindah: { preset: 'sceneChange', amplitude: 18, unit: 'px', duration: 0.3, ease: 'power1.inOut', stagger: 0, rigid: true, reducedMotion: 'langsung-ke-keadaan-akhir', amplitudeMeasured: false },
  reveal: { preset: 'reveal', amplitude: 14, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: true, reducedMotion: 'langsung-ke-keadaan-akhir', amplitudeMeasured: false },
  bloom: { preset: 'bloomIn', amplitude: 16, unit: 'px', duration: 0.9, ease: 'power1.out', stagger: 0.5, rigid: false, reducedMotion: 'langsung-ke-keadaan-akhir', amplitudeMeasured: false },
  diam: { preset: 'none', amplitude: 0, unit: 'px', duration: 0, ease: 'none', stagger: 0, rigid: true, reducedMotion: 'tidak-bergerak', amplitudeMeasured: false },
}

/* ── FRAME ─────────────────────────────────────────────────────────────────── */

{
  const w = 420, h = 560, band = 24
  const { d, inner } = kayonBand(w, h, band)
  add({
    id: 'bingkai-kayon', title: 'Bingkai kayon', category: 'frame',
    tags: ['frame', 'gunungan', 'kayon', 'jawa', 'tatahan'], culturalRole: 'arsitektur-kultural',
    layers: ['frame', 'scroll'], anchor: 'section', motion: M.gerbang, w, h,
    body:
      layer('bingkai-kayon', 'frame', mass(d, 1, 'fill-rule="evenodd" ')) +
      layer('bingkai-kayon', 'scroll',
        isianUkel(w, h, inner, { rows: 7, cols: 4, size: 0.075 }) +
        at(w * 0.5, h * 0.9, ukelKembar(26, 10)) +
        at(w * 0.5, h * 0.14, patran(5, 34, 120), 90) +
        at(band + 16, h * 0.68, mass(ukelBertangkai({ len: 28.0, r0: 20, turns: 0.88, w0: 7, dir: -1, tilt: Math.PI }), 0.45)) +
        at(w - band - 16, h * 0.68, mass(ukelBertangkai({ len: 28.0, r0: 20, turns: 0.88, w0: 7, dir: 1, tilt: 0 }), 0.45)) +
        (inside(inner, w / 2, h * 0.5) ? '' : '')),
  })
}

{
  // Varian bersih: di referensi kartu nama justru gunungan TANPA tatahan — tatahan
  // hidup di rumpun bawah. Satu bingkai berisi saja karena itu tidak cukup.
  const w = 420, h = 560, band = 24
  const { d } = kayonBand(w, h, band)
  add({
    id: 'bingkai-kayon-polos', title: 'Bingkai kayon polos', category: 'frame',
    tags: ['frame', 'gunungan', 'kayon', 'polos', 'kartu-nama'], culturalRole: 'arsitektur-kultural',
    layers: ['frame', 'scroll'], anchor: 'section', motion: M.gerbang, w, h,
    body:
      layer('bingkai-kayon-polos', 'frame', mass(d, 1, 'fill-rule="evenodd" ')) +
      layer('bingkai-kayon-polos', 'scroll',
        at(w * 0.5, h * 0.09, patran(5, 30, 118), 90) +
        at(w * 0.5, h * 0.9, ukelKembar(24, 9)) +
        at(band + 22, h * 0.7, mass(cakram(6), 0.45)) +
        at(w - band - 22, h * 0.7, mass(cakram(6), 0.45))),
  })
}

{
  const w = 460, h = 520, band = 14
  const a = kayonBand(w * 0.52, h * 0.94, band)
  const b = kayonBand(w * 0.52, h * 0.94, band)
  add({
    id: 'bingkai-kayon-kembar', title: 'Bingkai kayon kembar', category: 'frame',
    tags: ['frame', 'gunungan', 'sepasang', 'jawa'], culturalRole: 'arsitektur-kultural',
    layers: ['frame', 'scroll'], anchor: 'section', motion: M.gerbang, w, h,
    body:
      layer('bingkai-kayon-kembar', 'frame',
        at(w * 0.02, h * 0.06, mass(a.d, 1, 'fill-rule="evenodd" ')) +
        at(w * 0.46, h * 0.06, mass(b.d, 1, 'fill-rule="evenodd" '))) +
      layer('bingkai-kayon-kembar', 'scroll',
        at(w * 0.02, h * 0.06, isianUkel(w * 0.52, h * 0.94, a.inner, { rows: 5, cols: 3, size: 0.1 })) +
        at(w * 0.46, h * 0.06, isianUkel(w * 0.52, h * 0.94, b.inner, { rows: 5, cols: 3, size: 0.1 })) +
        at(w * 0.5, h * 0.62, ukelKembar(22, 8.5)) +
        at(w * 0.5, h * 0.94, mass(cakram(7), 0.45))),
  })
}

{
  const w = 380, h = 380
  add({
    id: 'bingkai-medalion', title: 'Bingkai medalion', category: 'frame',
    tags: ['frame', 'medalion', 'cincin', 'pita'], culturalRole: 'dekorasi-original',
    layers: ['frame', 'scroll'], anchor: 'section', motion: M.reveal, w, h,
    body:
      layer('bingkai-medalion', 'frame',
        at(w / 2, h / 2, ring(168, 12) + ring(140, 3.5, 0.45))) +
      layer('bingkai-medalion', 'scroll',
        Array.from({ length: 8 }, (_, i) =>
          at(w / 2, h / 2, at(0, -154, patran(4, 26, 110), 0, 1), i * 45)).join('') +
        Array.from({ length: 8 }, (_, i) =>
          at(w / 2, h / 2, at(0, -178, mass(cakram(4.5), 0.45)), i * 45 + 22.5)).join('')),
  })
}

{
  const w = 380, h = 520, band = 16
  add({
    id: 'bingkai-tumpal', title: 'Bingkai tumpal', category: 'frame',
    tags: ['frame', 'tumpal', 'geometris', 'pita'], culturalRole: 'dekorasi-original',
    layers: ['frame', 'band'], anchor: 'section', motion: M.reveal, w, h,
    body:
      layer('bingkai-tumpal', 'frame',
        mass(`${poly([[0, 0], [w, 0], [w, h], [0, h]])}${poly([[band, band], [band, h - band], [w - band, h - band], [w - band, band]])}`, 1, 'fill-rule="evenodd" ')) +
      layer('bingkai-tumpal', 'band',
        at(band, band, mass(tumpal(w - band * 2, 26, 9), 0.45)) +
        at(w - band, h - band, mass(tumpal(w - band * 2, 26, 9), 0.45), 180) +
        at(w / 2, band + 40, ukelKembar(19, 7))),
  })
}

{
  const w = 440, h = 300, band = 14
  add({
    id: 'bingkai-lung', title: 'Bingkai lung-lungan', category: 'frame',
    tags: ['frame', 'lung-lungan', 'sulur', 'landscape'], culturalRole: 'dekorasi-original',
    layers: ['frame', 'scroll'], anchor: 'section', motion: M.reveal, w, h,
    body:
      layer('bingkai-lung', 'frame',
        mass(`${poly([[0, 0], [w, 0], [w, h], [0, h]])}${poly([[band, band], [band, h - band], [w - band, h - band], [w - band, band]])}`, 1, 'fill-rule="evenodd" ')) +
      layer('bingkai-lung', 'scroll',
        [[band, band, 1, 0], [w - band, band, -1, 90], [w - band, h - band, -1, 180], [band, h - band, 1, 270]]
          .map(([x, y, dir, rot]) => at(x, y, at(0, 0, mass(ukel({ r0: 30, turns: 1.3, decay: 0.55, w0: 10, w1: 1.2, dir, phase: dir > 0 ? 0.3 : -0.3 })), rot))).join('')),
  })
}

/* ── BIDANG ALAS ───────────────────────────────────────────────────────────── */

/**
 * Referensi memakai gunungan dua warna: isian tan hangat di dalam garis cokelat gelap.
 * Satu glyph tidak boleh membawa dua warna — `DESIGN.md`: ornamen satu warna,
 * `currentColor`. Jadi warna keduanya datang dari **glyph kedua**: siluet padat yang
 * dipasang di belakang bingkai dan diwarnai sendiri oleh pemanggilnya. Bentuknya persis
 * siluet yang sama, jadi keduanya selalu bertumpuk rapat.
 */
{
  const w = 420, h = 560
  add({
    id: 'bidang-kayon', title: 'Bidang kayon', category: 'motif',
    tags: ['motif', 'gunungan', 'kayon', 'alas', 'dua-warna'], culturalRole: 'arsitektur-kultural',
    layers: ['field'], anchor: 'section', motion: M.gerbang, w, h,
    body: layer('bidang-kayon', 'field', mass(poly(kayonOutline(w, h)))),
  })
}

{
  const w = 460, h = 340
  add({
    id: 'bidang-rumpun-kayon', title: 'Bidang rumpun kayon', category: 'motif',
    tags: ['motif', 'gunungan', 'kayon', 'rumpun', 'alas', 'dua-warna'],
    culturalRole: 'arsitektur-kultural',
    layers: ['field'], anchor: 'bottom-left', motion: M.reveal, w, h,
    body: layer('bidang-rumpun-kayon', 'field',
      at(8, h - 214, mass(poly(kayonOutline(150, 210)))) +
      at(126, h - 284, mass(poly(kayonOutline(196, 280)))) +
      at(328, h - 172, mass(poly(kayonOutline(120, 168))))),
  })
}

/* ── DIVIDER ───────────────────────────────────────────────────────────────── */

{
  const w = 420, h = 74
  add({
    id: 'pemisah-medalion', title: 'Pemisah pita medalion', category: 'divider',
    tags: ['divider', 'medalion', 'pita', 'berulang'], culturalRole: 'dekorasi-original',
    layers: ['band'], anchor: 'section', motion: M.reveal, w, h,
    body: layer('pemisah-medalion', 'band',
      Array.from({ length: 4 }, (_, i) => at(i * (w / 4), 0, unitMedalion(w / 4, h))).join('')),
  })
}

{
  const w = 340, h = 76
  add({
    id: 'pemisah-ukel', title: 'Pemisah ukel', category: 'divider',
    tags: ['divider', 'ukel', 'sulur', 'simetris'], culturalRole: 'dekorasi-original',
    layers: ['scroll'], anchor: 'section', motion: M.reveal, w, h,
    body: layer('pemisah-ukel', 'scroll',
      at(w / 2, h / 2, ukelKembar(28, 10.5)) +
      at(w / 2, h / 2, mass(cakram(6), 0.45)) +
      draw(`M18 ${h / 2}H${n(w / 2 - 56)}`, 3) + draw(`M${n(w / 2 + 56)} ${h / 2}H${w - 18}`, 3) +
      at(12, h / 2, mass(cakram(4.5), 0.45)) + at(w - 12, h / 2, mass(cakram(4.5), 0.45))),
  })
}

{
  const w = 320, h = 86
  add({
    id: 'pemisah-patran', title: 'Pemisah patran', category: 'divider',
    tags: ['divider', 'patran', 'daun', 'kipas'], culturalRole: 'flora-pendamping',
    layers: ['leaf'], anchor: 'section', motion: M.bloom, w, h,
    body: layer('pemisah-patran', 'leaf',
      at(w / 2, h * 0.62, patran(7, 46, 158, 0.24), -90) +
      at(w / 2, h * 0.62, mass(cakram(7))) +
      at(w * 0.24, h * 0.62, mass(daun(52, 9), 0.45), 186) +
      at(w * 0.76, h * 0.62, mass(daun(52, 9), 0.45), -6)),
  })
}

{
  const w = 300, h = 120
  const { d } = kayonBand(58, 78, 5)
  add({
    id: 'pemisah-kayon', title: 'Pemisah kayon', category: 'divider',
    tags: ['divider', 'gunungan', 'kayon', 'jawa'], culturalRole: 'arsitektur-kultural',
    layers: ['frame', 'scroll'], anchor: 'section', motion: M.reveal, w, h,
    body:
      layer('pemisah-kayon', 'frame', at(w / 2 - 29, h * 0.2, mass(d, 1, 'fill-rule="evenodd" '))) +
      layer('pemisah-kayon', 'scroll',
        draw(`M26 ${n(h * 0.6)}H${n(w / 2 - 44)}`, 3) + draw(`M${n(w / 2 + 44)} ${n(h * 0.6)}H${w - 26}`, 3) +
        at(w * 0.16, h * 0.6, mass(ukelBertangkai({ len: 21.0, r0: 15, turns: 0.88, w0: 5.5, dir: -1, tilt: Math.PI }), 0.45)) +
        at(w * 0.84, h * 0.6, mass(ukelBertangkai({ len: 21.0, r0: 15, turns: 0.88, w0: 5.5, dir: 1, tilt: 0 }), 0.45))),
  })
}

{
  const w = 300, h = 46
  add({
    id: 'pemisah-cecek', title: 'Pemisah cecek', category: 'divider',
    tags: ['divider', 'cecek', 'titik', 'minimal'], culturalRole: 'dekorasi-original',
    layers: ['band'], anchor: 'section', motion: M.reveal, w, h,
    body: layer('pemisah-cecek', 'band',
      draw(`M14 ${h / 2}H${w - 14}`, 2.8, 0.45) +
      [0.5, 0.26, 0.74, 0.08, 0.92].map((t, i) =>
        at(w * t, h / 2, mass(cakram(i === 0 ? 8 : 5), i === 0 ? 1 : 0.45))).join('')),
  })
}

{
  const w = 360, h = 60
  add({
    id: 'pemisah-tumpal', title: 'Pemisah tumpal', category: 'divider',
    tags: ['divider', 'tumpal', 'geometris'], culturalRole: 'dekorasi-original',
    layers: ['band'], anchor: 'section', motion: M.reveal, w, h,
    body: layer('pemisah-tumpal', 'band',
      at(0, h * 0.24, mass(tumpal(w, 22, 12))) +
      at(0, h * 0.78, mass(tumpal(w, 18, 10), 0.45)) +
      draw(`M0 ${n(h * 0.14)}H${w}`, 3)),
  })
}

/* ── CORNER ────────────────────────────────────────────────────────────────── */

{
  const s = 190
  add({
    id: 'sudut-ukel', title: 'Sudut ukel', category: 'corner',
    tags: ['corner', 'ukel', 'sulur'], culturalRole: 'dekorasi-original',
    layers: ['scroll'], anchor: 'corner', motion: M.reveal, w: s, h: s,
    body: layer('sudut-ukel', 'scroll',
      draw(`M16 16C16 84 46 132 ${s - 22} ${s - 26}`, 4) +
      at(48, 52, mass(ukelBertangkai({ len: 47.6, r0: 34, turns: 0.88, w0: 12, dir: 1, tilt: 0 }))) +
      at(112, 122, mass(ukelBertangkai({ len: 33.6, r0: 24, turns: 0.88, w0: 8.5, dir: -1, tilt: Math.PI }), 0.45)) +
      at(24, 118, mass(daun(44, 9), 0.45), 70)),
  })
}

{
  const s = 220
  const { d, inner } = kayonBand(120, 158, 8.5)
  add({
    id: 'sudut-kayon', title: 'Sudut kayon', category: 'corner',
    tags: ['corner', 'gunungan', 'kayon', 'jawa'], culturalRole: 'arsitektur-kultural',
    layers: ['frame', 'scroll'], anchor: 'corner', motion: M.reveal, w: s, h: s,
    body:
      layer('sudut-kayon', 'frame', at(14, s - 168, mass(d, 1, 'fill-rule="evenodd" '))) +
      layer('sudut-kayon', 'scroll',
        at(14, s - 168, isianUkel(120, 158, inner, { rows: 5, cols: 3, size: 0.115 })) +
        at(14, s - 168, tulangKayon(120, 158)) +
        at(150, 64, mass(ukelBertangkai({ len: 36.4, r0: 26, turns: 0.88, w0: 9, dir: 1, tilt: 0 }), 0.45))),
  })
}

{
  const s = 180
  add({
    id: 'sudut-patran', title: 'Sudut patran', category: 'corner',
    tags: ['corner', 'patran', 'daun'], culturalRole: 'flora-pendamping',
    layers: ['leaf'], anchor: 'corner', motion: M.bloom, w: s, h: s,
    body: layer('sudut-patran', 'leaf',
      at(22, 22, patran(6, 116, 82), 45) +
      at(22, 22, mass(cakram(9))) +
      at(96, 96, mass(daun(52, 11), 0.45), 45)),
  })
}

{
  const s = 180
  add({
    id: 'sudut-medalion', title: 'Sudut medalion', category: 'corner',
    tags: ['corner', 'medalion', 'cincin'], culturalRole: 'dekorasi-original',
    layers: ['frame', 'scroll'], anchor: 'corner', motion: M.reveal, w: s, h: s,
    body:
      layer('sudut-medalion', 'frame', at(58, 58, ring(44, 11) + mass(cakram(9), 0.45))) +
      layer('sudut-medalion', 'scroll',
        at(58, 58, at(0, -58, patran(4, 30, 110))) +
        at(58, 58, at(-58, 0, patran(4, 30, 110), -90)) +
        at(132, 132, mass(ukelBertangkai({ len: 30.8, r0: 22, turns: 0.88, w0: 8, dir: 1, tilt: 0 }), 0.45))),
  })
}

{
  const s = 200
  add({
    id: 'sudut-mawar', title: 'Sudut mawar', category: 'corner',
    tags: ['corner', 'bunga', 'mawar', 'sulur'], culturalRole: 'flora-pendamping',
    layers: ['floral', 'leaf'], anchor: 'corner', motion: M.bloom, w: s, h: s,
    body:
      layer('sudut-mawar', 'leaf',
        draw(`M12 40C60 46 112 86 ${s - 20} ${s - 24}`, 3.4, 0.45) +
        at(52, 56, mass(daun(58, 12), 0.45), 34) +
        at(118, 122, mass(daun(46, 10), 0.45), 58) +
        at(30, 96, mass(daun(40, 9), 0.45), 104)) +
      layer('sudut-mawar', 'floral',
        at(64, 46, mawar(30)) +
        at(126, 104, mawar(19)) +
        at(38, 126, mass(cakram(8), 0.45))),
  })
}

/* ── MOTIF ─────────────────────────────────────────────────────────────────── */

add({
  id: 'motif-ukel', title: 'Motif ukel', category: 'motif',
  tags: ['motif', 'ukel', 'tunggal'], culturalRole: 'dekorasi-original',
  layers: ['scroll'], anchor: 'inline', motion: M.reveal, w: 120, h: 120,
  body: layer('motif-ukel', 'scroll',
    at(60, 60, mass(ukelBertangkai({ len: 61.6, r0: 44, turns: 0.88, w0: 15, dir: 1, tilt: 0 }))) +
    at(60, 60, mass(cakram(5), 0.45))),
})

add({
  id: 'motif-medalion', title: 'Motif medalion', category: 'motif',
  tags: ['motif', 'medalion', 'cincin', 'pusat'], culturalRole: 'dekorasi-original',
  layers: ['frame', 'scroll'], anchor: 'inline', motion: M.reveal, w: 140, h: 140,
  body:
    layer('motif-medalion', 'frame', at(70, 70, ring(58, 14))) +
    layer('motif-medalion', 'scroll',
      at(70, 70, ukelKembar(17, 7)) +
      Array.from({ length: 8 }, (_, i) => at(70, 70, at(0, -50, mass(daun(22, 5), 0.45), -90), i * 45)).join('')),
})

add({
  id: 'motif-patran', title: 'Motif patran', category: 'motif',
  tags: ['motif', 'patran', 'kipas', 'daun'], culturalRole: 'flora-pendamping',
  layers: ['leaf'], anchor: 'inline', motion: M.bloom, w: 140, h: 120,
  body: layer('motif-patran', 'leaf',
    at(70, 106, patran(7, 82, 160, 0.26), -90) +
    at(70, 108, mass(cakram(10))) +
    at(70, 108, mass(cakram(4), 0.45))),
})

add({
  id: 'motif-tumpal', title: 'Motif tumpal', category: 'motif',
  tags: ['motif', 'tumpal', 'geometris'], culturalRole: 'dekorasi-original',
  layers: ['band'], anchor: 'inline', motion: M.reveal, w: 140, h: 120,
  body: layer('motif-tumpal', 'band',
    at(10, 40, mass(tumpal(120, 40, 4))) +
    at(10, 40, mass(tumpal(120, 46, 3), 0.45)) +
    [24, 70, 116].map((x) => at(x, 104, mass(cakram(6), 0.45))).join('')),
})

add({
  id: 'motif-cecek', title: 'Motif cecek', category: 'motif',
  tags: ['motif', 'cecek', 'titik', 'isen'], culturalRole: 'dekorasi-original',
  layers: ['band'], anchor: 'inline', motion: M.reveal, w: 140, h: 140,
  body: layer('motif-cecek', 'band',
    Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 5 }, (_, c) => {
        const x = 22 + c * 24 + (r % 2 ? 12 : 0)
        const y = 22 + r * 24
        if (x > 130) return ''
        const mid = r === 2 && c === 2
        return at(x, y, mass(cakram(mid ? 9 : 5.5), mid ? 1 : 0.45))
      }).join('')).join('')),
})

/* ── LAYER (keping ladang ornamen) ─────────────────────────────────────────── */

{
  const w = 460, h = 340
  const a = kayonBand(150, 210, 10)
  const b = kayonBand(196, 280, 12.5)
  const c = kayonBand(120, 168, 8.5)
  add({
    id: 'layer-rumpun-kayon', title: 'Rumpun kayon', category: 'layer',
    tags: ['layer', 'gunungan', 'kayon', 'rumpun', 'jawa'], culturalRole: 'arsitektur-kultural',
    layers: ['frame', 'scroll'], anchor: 'bottom-left', motion: M.reveal, w, h,
    body:
      layer('layer-rumpun-kayon', 'frame',
        at(8, h - 214, mass(a.d, 1, 'fill-rule="evenodd" ')) +
        at(126, h - 284, mass(b.d, 1, 'fill-rule="evenodd" ')) +
        at(328, h - 172, mass(c.d, 1, 'fill-rule="evenodd" '))) +
      layer('layer-rumpun-kayon', 'scroll',
        at(8, h - 214, isianUkel(150, 210, a.inner, { rows: 5, cols: 3, size: 0.1 }) + tulangKayon(150, 210)) +
        at(126, h - 284, isianUkel(196, 280, b.inner, { rows: 5, cols: 3, size: 0.085 }) + tulangKayon(196, 280)) +
        at(328, h - 172, isianUkel(120, 168, c.inner, { rows: 5, cols: 3, size: 0.1 }) + tulangKayon(120, 168))),
  })
}

{
  const w = 260, h = 360
  const { d, inner } = kayonBand(236, 330, 15)
  add({
    id: 'layer-kayon-tunggal', title: 'Kayon tunggal', category: 'layer',
    tags: ['layer', 'gunungan', 'kayon', 'tunggal'], culturalRole: 'arsitektur-kultural',
    layers: ['frame', 'scroll'], anchor: 'mid-right', motion: M.reveal, w, h,
    body:
      layer('layer-kayon-tunggal', 'frame', at(12, 14, mass(d, 1, 'fill-rule="evenodd" '))) +
      layer('layer-kayon-tunggal', 'scroll',
        at(12, 14, isianUkel(236, 330, inner, { rows: 8, cols: 4, size: 0.085 })) +
        at(12, 14, tulangKayon(236, 330))),
  })
}

{
  const w = 340, h = 300
  add({
    id: 'layer-sulur-mawar', title: 'Sulur mawar', category: 'layer',
    tags: ['layer', 'bunga', 'mawar', 'sulur', 'karangan'], culturalRole: 'flora-pendamping',
    layers: ['floral', 'leaf'], anchor: 'top-right', motion: M.bloom, w, h,
    body:
      layer('layer-sulur-mawar', 'leaf',
        draw('M20 30C96 62 168 128 300 268', 3.6, 0.45) +
        draw('M44 96C118 106 186 168 236 266', 3, 0.45) +
        [[72, 62, 30], [150, 130, 42], [222, 200, 34], [60, 132, 96], [196, 108, -22], [268, 236, 52]]
          .map(([x, y, r]) => at(x, y, mass(daun(58, 12), 0.45), r)).join('')) +
      layer('layer-sulur-mawar', 'floral',
        at(96, 74, mawar(40)) + at(186, 156, mawar(30)) +
        at(262, 232, mawar(23)) + at(44, 148, mawar(17)) +
        at(140, 40, mass(cakram(10), 0.45))),
  })
}

{
  const w = 300, h = 260
  add({
    id: 'layer-patran-gantung', title: 'Patran gantung', category: 'layer',
    tags: ['layer', 'patran', 'daun', 'gantung'], culturalRole: 'flora-pendamping',
    layers: ['leaf'], anchor: 'top-center', motion: M.bloom, w, h,
    body: layer('layer-patran-gantung', 'leaf',
      draw('M20 12H280', 3.4) +
      [50, 110, 170, 230].map((x, i) =>
        at(x, 12, patran(5, 92 - i * 8, 62) + mass(cakram(7), 0.45), 90)).join('') +
      [86, 146, 206].map((x) => at(x, 12, mass(daun(52, 9), 0.45), 90)).join('')),
  })
}

{
  const w = 420, h = 150
  add({
    id: 'layer-pita-medalion', title: 'Pita medalion', category: 'layer',
    tags: ['layer', 'medalion', 'pita', 'tepi'], culturalRole: 'dekorasi-original',
    layers: ['band'], anchor: 'bottom-center', motion: M.reveal, w, h,
    body: layer('layer-pita-medalion', 'band',
      Array.from({ length: 3 }, (_, i) => at(i * (w / 3), 8, unitMedalion(w / 3, 96))).join('') +
      at(0, 116, mass(tumpal(w, 24, 12), 0.45)) +
      draw(`M0 112H${w}`, 3)),
  })
}

{
  const w = 300, h = 300
  add({
    id: 'layer-dedaunan', title: 'Dedaunan', category: 'layer',
    tags: ['layer', 'daun', 'rumpun', 'tepi'], culturalRole: 'flora-pendamping',
    layers: ['leaf'], anchor: 'mid-left', motion: M.bloom, w, h,
    body: layer('layer-dedaunan', 'leaf',
      draw('M16 284C48 200 62 112 120 24', 3.6, 0.45) +
      draw('M16 284C86 236 140 176 196 96', 3, 0.45) +
      [[46, 216, -48], [72, 160, -34], [104, 106, -24], [136, 60, -14],
       [78, 240, -6], [130, 196, -14], [176, 140, -22], [214, 92, -30]]
        .map(([x, y, r], i) => at(x, y, mass(daun(72 - i * 3, 14 - i * 0.6), i % 3 === 0 ? 1 : 0.45), r)).join('')),
  })
}

/* ── SYMBOL / SEAL / MONOGRAM / FLORAL ─────────────────────────────────────── */

{
  const { d, inner } = kayonBand(110, 150, 8)
  add({
    id: 'simbol-kayon', title: 'Simbol kayon', category: 'symbol',
    tags: ['symbol', 'gunungan', 'kayon', 'ikon'], culturalRole: 'arsitektur-kultural',
    layers: ['frame', 'scroll'], anchor: 'inline', motion: M.pindah, w: 130, h: 170,
    body:
      layer('simbol-kayon', 'frame', at(10, 10, mass(d, 1, 'fill-rule="evenodd" '))) +
      layer('simbol-kayon', 'scroll',
        at(10, 10, isianUkel(110, 150, inner, { rows: 4, cols: 3, size: 0.12 })) +
        at(10, 10, tulangKayon(110, 150))),
  })
}

add({
  id: 'simbol-cincin', title: 'Simbol cincin medalion', category: 'symbol',
  tags: ['symbol', 'cincin', 'medalion'], culturalRole: 'dekorasi-original',
  layers: ['frame'], anchor: 'inline', motion: M.pindah, w: 120, h: 120,
  body: layer('simbol-cincin', 'frame',
    at(60, 60, ring(48, 13) + ring(30, 4, 0.45) + mass(cakram(6)))),
})

add({
  id: 'simbol-mawar', title: 'Simbol mawar', category: 'symbol',
  tags: ['symbol', 'bunga', 'mawar'], culturalRole: 'flora-pendamping',
  layers: ['floral'], anchor: 'inline', motion: M.bloom, w: 120, h: 120,
  body: layer('simbol-mawar', 'floral',
    at(60, 58, mawar(42)) + at(60, 106, mass(daun(34, 8), 0.45), -70) + at(60, 106, mass(daun(34, 8), 0.45), -110)),
})

{
  const { d } = kayonBand(74, 100, 6)
  add({
    id: 'segel-kayon', title: 'Segel kayon', category: 'seal',
    tags: ['seal', 'gunungan', 'kayon', 'gerbang'], culturalRole: 'arsitektur-kultural',
    layers: ['frame', 'scroll'], anchor: 'inline', motion: M.gerbang, w: 200, h: 200,
    body:
      layer('segel-kayon', 'frame',
        at(100, 100, ring(88, 14) + ring(66, 3.5, 0.45)) +
        at(63, 52, mass(d, 1, 'fill-rule="evenodd" '))) +
      layer('segel-kayon', 'scroll',
        at(100, 100, ukelKembar(20, 7.5)) +
        Array.from({ length: 12 }, (_, i) => at(100, 100, at(0, -78, mass(cakram(4), 0.45)), i * 30)).join('')),
  })
}

add({
  id: 'segel-medalion', title: 'Segel medalion', category: 'seal',
  tags: ['seal', 'medalion', 'patran'], culturalRole: 'dekorasi-original',
  layers: ['frame', 'leaf'], anchor: 'inline', motion: M.gerbang, w: 200, h: 200,
  body:
    layer('segel-medalion', 'frame', at(100, 100, ring(84, 15) + mass(cakram(14)))) +
    layer('segel-medalion', 'leaf',
      Array.from({ length: 10 }, (_, i) => at(100, 100, at(0, -60, patran(3, 34, 96)), i * 36)).join('') +
      at(100, 100, mass(cakram(30), 0.45))),
})

{
  const { d } = kayonBand(176, 236, 12)
  add({
    id: 'monogram-kayon', title: 'Monogram kayon', category: 'monogram',
    tags: ['monogram', 'gunungan', 'kayon', 'inisial'], culturalRole: 'arsitektur-kultural',
    layers: ['frame', 'scroll'], anchor: 'inline', motion: M.gerbang, w: 200, h: 260,
    body:
      layer('monogram-kayon', 'frame', at(12, 12, mass(d, 1, 'fill-rule="evenodd" '))) +
      layer('monogram-kayon', 'scroll',
        at(100, 44, patran(5, 30, 118), 90) +
        at(100, 224, ukelKembar(20, 7.5)) +
        at(30, 150, mass(ukelBertangkai({ len: 23.8, r0: 17, turns: 0.88, w0: 6, dir: -1, tilt: Math.PI }), 0.45)) +
        at(170, 150, mass(ukelBertangkai({ len: 23.8, r0: 17, turns: 0.88, w0: 6, dir: 1, tilt: 0 }), 0.45))),
  })
}

add({
  id: 'monogram-medalion', title: 'Monogram medalion', category: 'monogram',
  tags: ['monogram', 'medalion', 'cincin', 'inisial'], culturalRole: 'dekorasi-original',
  layers: ['frame', 'scroll'], anchor: 'inline', motion: M.gerbang, w: 220, h: 220,
  body:
    layer('monogram-medalion', 'frame', at(110, 110, ring(98, 12) + ring(78, 3.5, 0.45))) +
    layer('monogram-medalion', 'scroll',
      at(110, 22, patran(5, 34, 124), 90) +
      at(110, 198, ukelKembar(22, 8)) +
      at(18, 110, mass(cakram(6), 0.45)) + at(202, 110, mass(cakram(6), 0.45))),
})

add({
  id: 'mawar-mekar', title: 'Mawar mekar', category: 'floral',
  tags: ['floral', 'bunga', 'mawar', 'tangkai'], culturalRole: 'flora-pendamping',
  layers: ['floral', 'leaf'], anchor: 'inline', motion: M.bloom, w: 160, h: 220,
  body:
    layer('mawar-mekar', 'leaf',
      draw('M80 212C80 156 76 118 82 78', 3.4, 0.45) +
      at(80, 168, mass(daun(52, 11), 0.45), -28) +
      at(80, 140, mass(daun(46, 10), 0.45), 208)) +
    layer('mawar-mekar', 'floral',
      at(82, 66, mawar(46)) + at(38, 112, mawar(20)) + at(126, 104, mawar(17))),
})

add({
  id: 'tangkai-daun', title: 'Tangkai daun', category: 'floral',
  tags: ['floral', 'daun', 'tangkai'], culturalRole: 'flora-pendamping',
  layers: ['leaf'], anchor: 'inline', motion: M.bloom, w: 140, h: 220,
  body: layer('tangkai-daun', 'leaf',
    draw('M70 210C70 150 66 100 74 18', 3.6) +
    [[70, 180, -32], [70, 146, 212], [69, 112, -26], [70, 80, 206], [72, 50, -22]]
      .map(([x, y, r], i) => at(x, y, mass(daun(56 - i * 5, 12 - i), i % 2 ? 0.45 : 1), r)).join('') +
    at(74, 16, mass(cakram(7), 0.45))),
})

/* ── TEKSTUR (backdrop mask, BUKAN ornamen) ────────────────────────────────── */

/**
 * Ini bukan anggota `ornamentBank`. `DESIGN.md`: tekstur dipasang sebagai `mask-image`
 * di `.iv-section::before` dan diwarnai `--iv-accent` runtime; ia tidak bisa
 * `currentColor` dan tidak boleh di-DrawSVG. Ditulis terpisah di `tekstur/`.
 */
const tekstur = []
function addTekstur(id, title, w, h, body, catatan) {
  const text = svg({ id, title, w, h, body })
  const file = `tekstur/${id}.svg`
  writeFileSync(join(HERE, file), text)
  tekstur.push({
    id, name: title, file, width: w, height: h,
    bytes: Buffer.byteLength(text),
    sha256: createHash('sha256').update(text).digest('hex'),
    usage: 'backdrop-mask', catatan,
  })
}

addTekstur('pita-medalion', 'Pita medalion (ubin mendatar)', 140, 96,
  unitMedalion(140, 96),
  'Ubin mendatar seamless: unit berulang tiap 140px. Padanan pita batik di kepala dan kaki referensi.')

addTekstur('cecek-ukel', 'Cecek ukel (ubin sebar)', 160, 160,
  [[40, 40, 1], [120, 120, -1]].map(([x, y, dir]) =>
    at(x, y, mass(ukel({ r0: 20, turns: 1.2, decay: 0.55, w0: 7, w1: 0.9, dir, phase: dir > 0 ? -1.6 : 1.6 })))).join('') +
  [[120, 40], [40, 120], [80, 80], [0, 0], [160, 0], [0, 160], [160, 160]]
    .map(([x, y]) => at(x, y, mass(cakram(5)))).join(''),
  'Ubin sebar 160×160, seamless di keempat sisi karena titik sudutnya diulang penuh.')

addTekstur('tumpal-tepi', 'Tumpal tepi (ubin mendatar)', 160, 64,
  mass(tumpal(160, 44, 4)) + mass(tumpal(160, 22, 4)) ,
  'Ubin tepi mendatar; dipakai di kepala atau kaki section, bukan sebagai latar penuh.')

/* ── katalog ───────────────────────────────────────────────────────────────── */

const catalog = {
  schemaVersion: 1,
  id: 'kayon',
  name: 'Kayon — cokelat krem, gunungan dan pita medalion',
  scope: 'original-local-demo',
  builtAt: CHECKED_AT,
  palette: {
    paper: '#F4EFE7',
    ink: '#2A1F1B',
    tan: '#DFCCBB',
    rose: '#8C4F55',
    note: 'Palet demo pack, diukur dari frame referensi (lihat sources/canva-cokelat-krem/WARNA.md). ' +
      'Token aplikasi tidak diubah; glyph memakai currentColor dan tidak membawa warna sendiri.',
  },
  fonts: {
    demo: 'Georgia / Arial bawaan sistem, supaya demo jalan offline',
    recommendation: 'Belum ditentukan. Font referensi TIDAK teridentifikasi — lihat LIMITS.md.',
    note: 'Tidak ada biner font yang disalin ke pack ini.',
  },
  composition: {
    anchorRule: 'Rumpun kayon di tepi bawah, pita medalion di kepala dan kaki, zona teks tidak dianimasikan.',
    source: 'sources/canva-cokelat-krem/MOTION.md — densitas baris bawah 1,09–1,29 vs baris atas 0,70–0,92',
  },
  motionRecipe: {
    ease: 'sine.inOut untuk gestur tunggal; power1.out untuk reveal berurutan',
    durasiGestur: '0,30 s (median segmen terukur); 0,93–1,03 s untuk dua gestur besar',
    jarakAntarGestur: '3,2–5,3 s',
    pangsaDiam: '87,3% frame di bawah ambang gerak',
    source: 'sources/canva-cokelat-krem/motion/measurements.json',
  },
  assets,
  tekstur,
}
writeFileSync(join(HERE, 'catalog.json'), JSON.stringify(catalog, null, 2))

console.log(`aset SVG: ${assets.length}`)
console.log(`tekstur : ${tekstur.length}`)
const perKategori = {}
for (const a of assets) perKategori[a.category] = (perKategori[a.category] ?? 0) + 1
console.log('kategori:', JSON.stringify(perKategori))
