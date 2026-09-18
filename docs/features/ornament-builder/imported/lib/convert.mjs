#!/usr/bin/env node
/**
 * Konverter bersama: ekspor SVG Canva → format ornamen Aruna.
 *
 * Dipakai oleh tiap pack di `imported/<template>/build.mjs`, yang isinya tinggal daftar
 * glyph dan konfigurasinya. Satu tempat, karena aturan konversinya harus sama untuk semua
 * template — dan karena tiap jebakan yang ditemukan di satu template berlaku di template
 * berikutnya.
 *
 * **Tidak ada geometri yang digambar ulang.** Tiap `d` disalin karakter per karakter.
 * Yang boleh berubah hanya empat hal, semuanya dipaksa oleh sistem ornamen Aruna:
 *
 *   1. `fill` berwarna → `currentColor` dengan `opacity` per bidang nilai (ornamen monokrom).
 *   2. Bentuk yang di sumbernya dicat warna kertas di atas bentuk lain → **rongga**
 *      `fill-rule="evenodd"`. Tanpa ini, trik "siluet gelap + badan terang di atasnya"
 *      runtuh jadi gumpalan pekat begitu keduanya jadi satu warna.
 *   3. `viewBox` boleh dipersempit ketika satu berkas sumber dipecah jadi beberapa glyph.
 *      Koordinatnya tetap; yang berubah cuma jendelanya.
 *   4. `id` diberi awalan per glyph, supaya dua glyph di halaman yang sama tidak saling
 *      memotong lewat `clip-path`.
 *
 * `clipPath`, `mask`, dan `filter` semuanya **dipertahankan**, definisinya disalin ke defs
 * dengan `id` berawalan. Versi pertama konverter ini membuang `mask` dengan alasan "isinya
 * kotak lewat `feColorMatrix` yang memaksa RGB ke 1, jadi opak seluruhnya". Pada template
 * pertama alasan itu kebetulan benar dan terbukti lewat beda 0 piksel. Pada template kayon
 * wayang ia **salah**: mask di sana yang membuat sapuan lembut di tepi kanan, dan
 * membuangnya menjadikan sapuan itu tinta pekat — 1,2% piksel meleset, terlihat jelas di
 * peta beda. Aturannya sekarang: salin semuanya, biarkan renderer yang memutuskan.
 *
 * Semua klaim di atas diuji oleh `compareGeometry` dan `verbatim`, bukan dipercaya.
 */

import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(join(process.cwd(), 'package.json'))
export const sharp = require('sharp')

export const sha = (b) => createHash('sha256').update(b).digest('hex')

// ------------------------------------------------------------------ geometri

/**
 * Kotak pembatas sebuah `d`.
 *
 * Ekspor Canva selalu memakai perintah absolut `M L C Z` dengan angka yang ditulis penuh,
 * jadi seluruh pasangan koordinat bisa dibaca langsung. Untuk `C`, titik kendali ikut
 * dihitung: hasilnya kotak yang **tidak pernah lebih kecil** dari kurva sebenarnya, dan
 * untuk memisahkan kiri dari kanan itu justru sifat yang diinginkan.
 */
export function pathBBox(d) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)
  if (!numbers) return null
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = Number(numbers[i])
    const y = Number(numbers[i + 1])
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null
}

/**
 * Ekspor Canva memisahkan sepasang ornamen kiri–kanan dengan **transform grup**, bukan
 * dengan posisi pathnya: kedua salinan memakai rentang koordinat yang sama, lalu salah satu
 * digeser. Karena itu pemecahan harus tahu geseran yang berlaku pada sebuah path, dan
 * kotak pembatasnya harus ikut digeser sebelum dipakai menghitung `viewBox`.
 *
 * Hanya geseran murni yang diterima. Matriks dengan skala atau rotasi mengembalikan `null`,
 * dan pemanggilnya menolak memecah — lebih baik gagal keras daripada menulis `viewBox` yang
 * diam-diam salah.
 */
const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

const multiply = (m, n) => ({
  a: m.a * n.a + m.c * n.b,
  b: m.b * n.a + m.d * n.b,
  c: m.a * n.c + m.c * n.d,
  d: m.b * n.c + m.d * n.d,
  e: m.a * n.e + m.c * n.f + m.e,
  f: m.b * n.e + m.d * n.f + m.f,
})

/**
 * Matriks gabungan dari sebuah rantai `transform`.
 *
 * Versi pertama fungsi ini hanya menerima geseran murni dan menolak sisanya, karena pada dua
 * template pertama memang hanya itu yang muncul. Template berikutnya membawa **skala,
 * cermin, dan rotasi** — `matrix(-0.169, 0, 0, 0.169, …)` untuk salinan yang dicerminkan,
 * `matrix(0, 0.749, -0.749, 0, …)` untuk gunungan yang diputar seperempat. Menolak semuanya
 * berarti menolak memecah berkas yang justru paling butuh dipecah, jadi sekarang matriksnya
 * dihitung penuh dan kotak pembatas ditransformasi lewat keempat sudutnya.
 */
export function parseMatrix(transform) {
  if (!transform) return IDENTITY
  let m = IDENTITY
  for (const token of transform.matchAll(/(matrix|translate|scale|rotate)\(([^)]*)\)/g)) {
    const n = token[2].split(/[\s,]+/).filter(Boolean).map(Number)
    let next
    if (token[1] === 'matrix') next = { a: n[0], b: n[1], c: n[2], d: n[3], e: n[4], f: n[5] }
    else if (token[1] === 'translate') next = { ...IDENTITY, e: n[0] || 0, f: n[1] || 0 }
    else if (token[1] === 'scale') next = { ...IDENTITY, a: n[0], d: n.length > 1 ? n[1] : n[0] }
    else {
      const r = ((n[0] || 0) * Math.PI) / 180
      next = { a: Math.cos(r), b: Math.sin(r), c: -Math.sin(r), d: Math.cos(r), e: 0, f: 0 }
    }
    if (Object.values(next).some((v) => !Number.isFinite(v))) return null
    m = multiply(m, next)
  }
  return m
}

/** Kotak pembatas setelah transformasi: keempat sudut dipetakan, lalu dikotakkan lagi. */
const applyMatrix = (bbox, m) => {
  if (!bbox || !m) return bbox
  const corners = [
    [bbox.minX, bbox.minY], [bbox.maxX, bbox.minY], [bbox.minX, bbox.maxY], [bbox.maxX, bbox.maxY],
  ].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f])
  const xs = corners.map((c) => c[0])
  const ys = corners.map((c) => c[1])
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

const union = (a, b) => !a ? b : !b ? a : {
  minX: Math.min(a.minX, b.minX),
  minY: Math.min(a.minY, b.minY),
  maxX: Math.max(a.maxX, b.maxX),
  maxY: Math.max(a.maxY, b.maxY),
}

/** Luminance relatif (sRGB, WCAG). Dipakai untuk memetakan ilustrasi berwarna ke satu tinta. */
export function luminance(hex) {
  const v = hex.replace('#', '')
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/**
 * Peta otomatis warna → bidang nilai, untuk ilustrasi berwarna yang tidak mungkin dipetakan
 * dengan tangan. Makin gelap warnanya, makin pekat tintanya; dikuantisasi ke enam langkah
 * supaya hasilnya terbaca sebagai cetakan bertingkat, bukan gradasi berlumpur.
 */
export function luminanceTiers(colors, { floor = 0.1, ceiling = 1, steps = 8, gamma = 1.9 } = {}) {
  const tiers = {}
  for (const color of colors) {
    // `gamma` melebarkan jarak antar-nilai di paruh terang. Tanpa itu sebuah ilustrasi yang
    // warnanya rata-rata gelap — seperti rumah kayu berpelitur — keluar sebagai satu siluet
    // pekat: semua warnanya jatuh di 0,6–1,0 dan bedanya hilang begitu hue dibuang.
    const raw = floor + (ceiling - floor) * (1 - luminance(color)) ** gamma
    tiers[color] = Math.max(floor, Math.round(raw * steps) / steps)
  }
  return tiers
}

// ------------------------------------------------------------------ konversi

const PATH_RE = /<path fill="(#[0-9a-fA-F]+)"\s+d="([^"]+)"/g

/** Daftar path di badan gambar, berurut sesuai urutan cat. */
export function readPaths(svgText) {
  const body = svgText.includes('</defs>') ? svgText.slice(svgText.indexOf('</defs>') + 7) : svgText
  return [...body.matchAll(PATH_RE)].map((m) => ({ fill: m[1].toLowerCase(), d: m[2], bbox: pathBBox(m[2]) }))
}

/**
 * Rencana rongga.
 *
 * Aturannya satu kalimat: **tiap path berwarna `cut` menjadi lubang pada path `into`
 * terakhir sebelum dirinya**; yang tidak punya host sebelum dirinya dibuang, karena di
 * sumbernya ia dicat langsung di atas kertas dan tidak menggambar apa pun.
 */
function planKnockout(paths, knockout) {
  const plan = new Map()
  if (!knockout) return plan
  let host = null
  const absorbed = new Map()
  for (const p of paths) {
    if (p.fill === knockout.into) { host = p; continue }
    if (p.fill !== knockout.cut) continue
    if (!host) { plan.set(p.d, { drop: true }); continue }
    plan.set(p.d, { drop: true })
    absorbed.set(host.d, [...(absorbed.get(host.d) || []), p])
  }
  for (const [hostD, holes] of absorbed) {
    plan.set(hostD, { holes: holes.map((h) => h.d), overlapping: anyOverlap(holes.map((h) => h.bbox)) })
  }
  return plan
}

/**
 * Dua rongga yang saling menumpuk membatalkan satu sama lain di `fill-rule="evenodd"`:
 * daerah irisannya disilangi dua kali dan kembali terisi. Di sumbernya itu tidak terjadi,
 * karena di sana keduanya cuma dicat warna kertas dua kali.
 *
 * Ini bukan kasus sudut. Ketiga kayon wayang punya sembilan sulur putih yang bersentuhan
 * di batang tengahnya, dan versi pertama konverter mengeluarkan batang itu sebagai garis
 * pekat yang tidak ada di aslinya — 1,8% piksel meleset, terlihat jelas di peta beda.
 * Karena itu: rongga bertumpuk memakai `<mask>`, rongga terpisah tetap `evenodd` yang lebih
 * ringan dan lebih mudah disunting. Pengujiannya memakai kotak pembatas, jadi ia konservatif
 * — kadang memilih mask untuk bentuk yang sebenarnya tidak beririsan, tidak pernah sebaliknya.
 */
function anyOverlap(boxes) {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (!a || !b) continue
      if (a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY) return true
    }
  }
  return false
}

/**
 * @param {object} options
 * @param {string} options.prefix      awalan untuk tiap `id`
 * @param {object|'luminance'} options.tiers  peta warna → opacity
 * @param {string} options.layer       nama `data-layer`
 * @param {object} [options.knockout]  `{ cut, into }`
 * @param {(bbox) => boolean} [options.select]  saring path untuk pemecahan kiri/kanan
 * @param {number} [options.pad]       padding viewBox saat dipersempit
 * @param {boolean} [options.keepColor] pertahankan warna sumber (varian ilustrasi)
 */
export function convertSvg(svgText, options) {
  const { prefix, layer, knockout, select, pad = 0, keepColor = false, title } = options
  const sourceViewBox = svgText.match(/viewBox="([^"]+)"/)[1]
  const defs = svgText.includes('<defs>') ? svgText.slice(svgText.indexOf('<defs>') + 6, svgText.indexOf('</defs>')) : ''
  const body = (svgText.includes('</defs>') ? svgText.slice(svgText.indexOf('</defs>') + 7) : svgText)
    .replace(/<\/svg>\s*$/, '')

  const paths = readPaths(svgText)
  const colors = [...new Set(paths.map((p) => p.fill))]
  const tiers = options.tiers === 'luminance'
    ? luminanceTiers(colors)
    : (options.tiers?.mode === 'luminance' ? luminanceTiers(colors, options.tiers) : options.tiers)
  const plan = planKnockout(paths, knockout)

  /**
   * `<defs>` dipangkas ke blok yang benar-benar dirujuk, lalu ditelusuri: sebuah `mask` bisa
   * menunjuk `filter` yang menunjuk yang lain, jadi rantainya diikuti sampai habis.
   *
   * Menyalin seluruh defs apa adanya — yang dilakukan versi sebelumnya — punya dua akibat
   * buruk pada berkas campuran vektor+bitmap: glyph vektor sekecil satu path ikut membawa
   * **1,1 MB** base64 milik mask gambar yang tidak pernah dipakainya, dan `<image>` di dalam
   * defs itu membuatnya ditolak validator. Blok yang masih memuat `<image>` setelah
   * penelusuran dibuang dan dicatat, bukan diam-diam ikut.
   */
  const defBlocks = new Map()
  for (const m of defs.matchAll(/<(clipPath|mask|filter|linearGradient|radialGradient|pattern|symbol)\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/\1>/g)) {
    defBlocks.set(m[2], m[0])
  }
  const collectDefs = (seedIds) => {
    const keep = new Set()
    const queue = [...seedIds]
    while (queue.length) {
      const id = queue.pop()
      if (keep.has(id) || !defBlocks.has(id)) continue
      keep.add(id)
      for (const r of defBlocks.get(id).matchAll(/url\(#([^)]+)\)/g)) queue.push(r[1])
    }
    return keep
  }

  const used = new Set()
  const unknownFills = new Set()
  const kept = []
  let pathCount = 0

  const stack = []
  const maskDefs = []
  let unsupportedTransform = null
  // Wilayah mask memakai seluruh viewBox sumber: ia harus menutupi host beserta rongganya,
  // dan viewBox sumber dijamin melakukannya.
  const [sx, sy, sw, sh] = sourceViewBox.split(/[\s,]+/).map(Number)
  const maskBox = { x: sx, y: sy, w: sw, h: sh }

  const out = body.replace(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g, (whole, closing, name, attrs, selfClosing) => {
    if (name === 'g') {
      if (closing) { stack.pop(); return '</g>' }
      // `<g …/>` tidak pernah masuk tumpukan. Versi pertama mendorongnya dan tidak pernah
      // mengeluarkannya lagi, jadi keluarannya kelebihan satu `<g>` tanpa penutup — SVG yang
      // tidak sah, dan renderernya menolak seluruh berkas dengan "Premature end of data".
      if (selfClosing) return whole
      const clip = (attrs.match(/clip-path="url\(#([^)]+)\)"/) || [])[1]
      const mask = (attrs.match(/mask="url\(#([^)]+)\)"/) || [])[1]
      const transform = (attrs.match(/transform="([^"]+)"/) || [])[1]
      stack.push(transform || null)
      const parts = []
      if (clip) { used.add(clip); parts.push(`clip-path="url(#${prefix}${clip})"`) }
      if (mask) { used.add(mask); parts.push(`mask="url(#${prefix}${mask})"`) }
      if (transform) parts.push(`transform="${transform}"`)
      return `<g${parts.length ? ` ${parts.join(' ')}` : ''}>`
    }
    if (name === 'path' && !closing) {
      const fill = ((attrs.match(/fill="(#[0-9a-fA-F]+)"/) || [])[1] || '').toLowerCase()
      const d = (attrs.match(/ d="([^"]+)"/) || [])[1]
      if (!d) return ''
      const chain = stack.filter(Boolean)
      const matrix = parseMatrix(chain.join(' '))
      if (!matrix && select) { unsupportedTransform = chain.join(' '); return '' }
      const bbox = applyMatrix(pathBBox(d), matrix || IDENTITY)
      if (select && bbox && !select({ bbox, transform: chain.join(' ') })) return ''
      const step = plan.get(d)
      if (step?.drop) return ''
      if (!keepColor && !(fill in tiers)) { unknownFills.add(fill); return '' }
      pathCount++
      kept.push(bbox)
      const sourceRule = (attrs.match(/fill-rule="([^"]+)"/) || [])[1]
      const paint = keepColor ? ` fill="${fill}"` : ''
      const opacity = keepColor ? 1 : tiers[fill]

      let shape = d
      let rule = sourceRule
      let maskRef = ''
      if (step?.holes) {
        if (step.overlapping) {
          const maskId = `${prefix}mask${maskDefs.length + 1}`
          maskDefs.push(`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="${maskBox.x}" y="${maskBox.y}" width="${maskBox.w}" height="${maskBox.h}">`
            + `<rect x="${maskBox.x}" y="${maskBox.y}" width="${maskBox.w}" height="${maskBox.h}" fill="#ffffff"/>`
            + step.holes.map((h) => `<path d="${h}" fill="#000000"/>`).join('')
            + '</mask>')
          maskRef = ` mask="url(#${maskId})"`
        } else {
          shape = [d, ...step.holes].join(' ')
          rule = 'evenodd'
        }
      }

      return `<path data-mass=""${paint} d="${shape}"`
        + (rule && rule !== 'nonzero' ? ` fill-rule="${rule}"` : '')
        + (opacity === 1 ? '' : ` opacity="${opacity}"`)
        + maskRef
        + '/>'
    }
    // `<image>` tidak pernah boleh masuk ornamen vektor — validator skill menolaknya, dan
    // sumber yang memang bitmap ditangani jalur raster, bukan di sini.
    if (name === 'image') return ''
    return whole
  })

  // Jendela dipersempit hanya kalau sebagian path disaring keluar.
  let viewBox = sourceViewBox
  if (select) {
    const box = kept.reduce((acc, b) => union(acc, b), null)
    if (box) {
      viewBox = [
        Math.round((box.minX - pad) * 100) / 100,
        Math.round((box.minY - pad) * 100) / 100,
        Math.round((box.maxX - box.minX + pad * 2) * 100) / 100,
        Math.round((box.maxY - box.minY + pad * 2) * 100) / 100,
      ].join(' ')
    }
  }

  const titleId = `${prefix}title`
  const referenced = [...out.matchAll(/url\(#([^)]+)\)/g)]
    .map((m) => m[1])
    .filter((id) => id.startsWith(prefix))
    .map((id) => id.slice(prefix.length))
  const droppedDefs = []
  const keptDefs = [...collectDefs(referenced)]
    .map((id) => defBlocks.get(id))
    .filter((block) => {
      if (!block.includes('<image')) return true
      droppedDefs.push((block.match(/id="([^"]+)"/) || [])[1])
      return false
    })
    .map((block) => block
      .replace(/id="([^"]+)"/g, (_, value) => `id="${prefix}${value}"`)
      .replace(/url\(#([^)]+)\)/g, (_, value) => `url(#${prefix}${value})`))
  // Rujukan ke blok yang dibuang ikut dilepas dari badan gambar. Sebuah `mask="url(#x)"`
  // yang menunjuk definisi tak ada adalah rujukan tidak sah, dan renderer boleh menjawabnya
  // dengan menyembunyikan seluruh elemennya — kegagalan diam yang persis ingin dihindari.
  const bodyOut = droppedDefs.reduce(
    (text, id) => text.replace(new RegExp(`\\s(?:mask|clip-path|filter)="url\\(#${prefix}${id}\\)"`, 'g'), ''),
    out,
  )
  const defsMarkup = keptDefs.join('') + maskDefs.join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${keepColor ? '' : ' fill="currentColor"'} role="img" aria-labelledby="${titleId}">`
    + `<title id="${titleId}">${title}</title>`
    + (defsMarkup.trim() ? `<defs>${defsMarkup}</defs>` : '')
    + `<g id="${prefix}${layer}" data-layer="${layer}">${bodyOut}</g>`
    + '</svg>\n'

  const [, , vw, vh] = viewBox.split(/[\s,]+/).map(Number)
  return { svg, viewBox, width: vw, height: vh, pathCount, unknownFills: [...unknownFills], tiers, unsupportedTransform, droppedDefs }
}

/**
 * Tiap `d` yang ditulis harus muncul **apa adanya** di berkas sumber. Path gabungan
 * diperiksa per potongan. Bukti ini tidak bergantung pada renderer mana pun.
 */
export function verbatim(svg, sourceText) {
  // Path di dalam `<mask>` ikut diperiksa: ia juga geometri sumber yang disalin.
  const emitted = [...svg.matchAll(/<path (?:data-mass=""(?: fill="[^"]*")?|)\s*d="([^"]+)"/g)].map((m) => m[1])
  if (!emitted.length) return false
  return emitted.every((d) => {
    if (sourceText.includes(d)) return true
    return d.split(/(?= M )/).map((s) => s.replace(/^ /, '')).every((piece) => sourceText.includes(piece))
  })
}

// ------------------------------------------------------------------ pembandingan

/**
 * Siluet: semua yang tergambar dijadikan hitam pekat, supaya yang dibandingkan cuma
 * bentuknya. `width`/`height` di elemen akar dibuang dan ukuran render dihitung ulang dari
 * `viewBox` — kalau tidak, sumber (yang punya `width="578"`) dan hasil (yang tidak punya)
 * dirender pada tinggi yang berbeda satu piksel dan pembandingnya gugur sebelum mulai.
 *
 * `paperFill` menyamakan sisi sumber dengan glyph ber-rongga: warna yang di hasil menjadi
 * lubang dicat putih di sumbernya, sehingga keduanya sama-sama menghasilkan cincin.
 */
export async function silhouette(svgText, width, { paperFill = null, viewBox = null } = {}) {
  const box = (viewBox || svgText.match(/viewBox="([^"]+)"/)[1]).split(/[\s,]+/).map(Number)
  const height = Math.max(1, Math.round((width * box[3]) / box[2]))
  /**
   * Isi `<mask>` **tidak boleh** ikut diratakan. Putih dan hitam di dalamnya bukan warna
   * tinta melainkan instruksi tembus-pandang; meratakannya membuat rect penutup jadi hitam,
   * seluruh host ikut tersembunyi, dan pembandingnya melaporkan 25% beda yang sepenuhnya
   * artefak alat ukur. Blok mask karena itu dikeluarkan dulu dan dikembalikan utuh.
   */
  const masks = []
  const withoutMasks = svgText.replace(/<mask[\s\S]*?<\/mask>/g, (m) => {
    masks.push(m)
    return `<!--MASK${masks.length - 1}-->`
  })
  const flat = withoutMasks
    .replace(/<svg([^>]*)>/, (_, attrs) => {
      let next = attrs.replace(/\s(width|height)="[^"]*"/g, '')
      if (viewBox) next = next.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`)
      return `<svg${next}>`
    })
    .replace(/fill="#[0-9a-fA-F]{3,8}"/g, (m) => (paperFill && m.toLowerCase() === `fill="${paperFill}"` ? 'fill="#ffffff"' : 'fill="#000000"'))
    .replace(/fill="currentColor"/g, 'fill="#000000"')
    .replace(/opacity="[^"]*"/g, 'opacity="1"')
    .replace(/<!--MASK(\d+)-->/g, (_, i) => masks[Number(i)])
  return sharp(Buffer.from(flat), { density: 200 })
    .resize(width, height, { fit: 'fill' })
    .flatten({ background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
}

export async function compareGeometry(sourceText, svg, { width = 700, paperFill = null, viewBox = null } = {}) {
  const [x, y] = await Promise.all([
    silhouette(sourceText, width, { paperFill, viewBox }),
    silhouette(svg, width),
  ])
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) {
    return { comparable: false, reason: `ukuran render beda: ${x.info.width}×${x.info.height} vs ${y.info.width}×${y.info.height}` }
  }
  let differing = 0
  let inked = 0
  for (let i = 0; i < x.data.length; i++) {
    if (x.data[i] < 200) inked++
    if (Math.abs(x.data[i] - y.data[i]) > 8) differing++
  }
  return {
    comparable: true,
    pixels: x.data.length,
    inkedPixels: inked,
    differingPixels: differing,
    differingPercent: Number(((differing / x.data.length) * 100).toFixed(4)),
  }
}

/** Peta beda, supaya selisih yang tersisa bisa dilihat dan bukan cuma dihitung. */
export async function writeDiff(sourceText, svg, file, { width = 700, paperFill = null, viewBox = null } = {}) {
  const [x, y] = await Promise.all([
    silhouette(sourceText, width, { paperFill, viewBox }),
    silhouette(svg, width),
  ])
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return false
  const rgb = Buffer.alloc(x.data.length * 3, 255)
  for (let i = 0; i < x.data.length; i++) {
    const diff = Math.abs(x.data[i] - y.data[i]) > 8
    const shade = x.data[i] < 200 ? 210 : 255
    rgb[i * 3] = diff ? 220 : shade
    rgb[i * 3 + 1] = diff ? 30 : shade
    rgb[i * 3 + 2] = diff ? 30 : shade
  }
  await sharp(rgb, { raw: { width: x.info.width, height: x.info.height, channels: 3 } }).png().toFile(file)
  return true
}

// ------------------------------------------------------------------ raster

/**
 * Render sebuah SVG jadi PNG ber-alpha.
 *
 * Jalur utamanya `sharp` (librsvg). Librsvg punya batas ukuran dokumen XML yang keras, dan
 * satu berkas di template "Emas Cokelat" melewatinya — 10 MB base64 dalam satu atribut,
 * ditolak dengan "Huge input lookup". Untuk berkas seperti itu Chromium lewat Playwright
 * dipakai sebagai cadangan; ia sudah jadi dependency repo ini dan tidak punya batas tersebut.
 * Yang dipakai dicatat di `renderer`, supaya tidak ada aset yang asal-usul rendernya kabur.
 */
async function renderPng(sourceText, width, height) {
  try {
    const buffer = await sharp(Buffer.from(sourceText), { density: 300 })
      .resize(width, height, { fit: 'fill' })
      .png()
      .toBuffer()
    return { buffer, renderer: 'librsvg' }
  } catch (error) {
    const { chromium } = await import('@playwright/test')
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
      const encoded = Buffer.from(sourceText, 'utf8').toString('base64')
      await page.setContent(
        `<style>html,body{margin:0;background:transparent}img{display:block;width:${width}px;height:${height}px}</style>`
        + `<img src="data:image/svg+xml;base64,${encoded}">`,
        { waitUntil: 'load' },
      )
      await page.waitForFunction(() => { const i = document.querySelector('img'); return i && i.complete && i.naturalWidth > 0 })
      const buffer = await page.screenshot({ omitBackground: true, type: 'png' })
      return { buffer, renderer: `chromium (librsvg menolak: ${String(error.message).split(':')[0]})` }
    } finally {
      await browser.close()
    }
  }
}

/**
 * Panggang SVG ber-`<image>` jadi potongan ber-alpha. Penyiapan aset, bukan vektorisasi.
 *
 * `crop` memotong satu bagian dari gambar yang sama, dinyatakan dalam satuan `viewBox`
 * sumbernya — itulah cara memecah aset raster yang memuat dua benda terpisah (misalnya
 * sepasang cincin di atas dan rangkaian bunga di bawah) tanpa menyentuh pikselnya.
 */
export async function bakeRaster(sourceText, { width = 1600, crop = null, trim = true, stripVector = false } = {}) {
  // Beberapa sumber mencampur vektor dan bitmap dalam satu berkas — misalnya sudut bergaris
  // yang vektor di samping sapuan kuas yang raster. `stripVector` membuang path berwarna
  // sebelum memanggang, supaya potongan rasternya bersih dan bagian vektornya tetap bisa
  // dikeluarkan sebagai glyph `currentColor` sendiri dari berkas yang sama.
  if (stripVector) {
    sourceText = sourceText.replace(/<path fill="#[0-9a-fA-F]+"[^>]*\/>/g, '')
  }
  const box = sourceText.match(/viewBox="([^"]+)"/)[1].split(/[\s,]+/).map(Number)
  const scale = width / box[2]
  const fullHeight = Math.max(1, Math.round(box[3] * scale))
  const { buffer: full, renderer } = await renderPng(sourceText, width, fullHeight)

  let base = sharp(full)
  if (crop) {
    // Dijepit terhadap tepi gambar, termasuk offsetnya. Tanpa itu sebuah potongan yang
    // menyentuh tepi kanan meminta area di luar gambar dan `sharp` menolak dengan
    // "bad extract area" — yang benar memang menolak, jadi jepitannya yang diperbaiki.
    const left = Math.min(width - 1, Math.max(0, Math.round((crop.x - box[0]) * scale)))
    const top = Math.min(fullHeight - 1, Math.max(0, Math.round((crop.y - box[1]) * scale)))
    base = base.extract({
      left,
      top,
      width: Math.max(1, Math.min(width - left, Math.round(crop.w * scale))),
      height: Math.max(1, Math.min(fullHeight - top, Math.round(crop.h * scale))),
    })
  }
  let cropped = await base.png().toBuffer()

  // Potongan yang dipangkas sering menyisakan pita transparan; dibuang supaya rasio asetnya
  // menggambarkan isinya, bukan sisa kanvas sumbernya.
  //
  // `trim` dijalankan pada instance `sharp` yang baru, bukan disambung setelah `extract` di
  // pipeline yang sama — disambung, ia menghitung area pangkas terhadap gambar yang belum
  // dipotong dan gagal dengan "bad extract area". Kalau potongannya ternyata kosong, versi
  // tak-terpangkas yang dipakai, bukan proses yang berhenti.
  if (trim) {
    try {
      cropped = await sharp(cropped).trim({ threshold: 1 }).png().toBuffer()
    } catch {
      // biarkan `cropped` apa adanya
    }
  }

  const variants = []
  for (const [format, opts] of [['png', {}], ['webp', { quality: 92 }]]) {
    const out = await sharp(cropped).toFormat(format, opts).toBuffer()
    const meta = await sharp(out).metadata()
    const stats = await sharp(out).stats()
    variants.push({
      format,
      buffer: out,
      width: meta.width,
      height: meta.height,
      alpha: Boolean(meta.hasAlpha) && stats.channels[3].min === 0,
      renderer,
    })
  }
  return variants
}

export const readSource = (dir, file) => readFileSync(join(dir, file), 'utf8')
