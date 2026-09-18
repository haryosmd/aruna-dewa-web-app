/**
 * Primitif geometri pack `kayon`.
 *
 * Semua bentuk di sini dihitung, bukan ditrace. Tidak ada titik yang disalin dari
 * gambar referensi; yang diambil dari referensi adalah *kosakata* bentuknya
 * (siluet gunungan, ukel, patran, medalion) dan proporsinya yang terbaca dari frame.
 *
 * Aturan `DESIGN.md` yang dipatuhi semua keluaran di sini:
 *   - badan bentuk `fill="currentColor"` bertanda `data-mass`
 *   - garis bertanda `data-draw`, `stroke-width` 2,5–4 dalam satuan viewBox
 *   - dua bidang nilai per glyph: opacity 1 dan 0,45
 *   - bingkai berongga lewat `fill-rule="evenodd"`, bukan dengan mengisi dalamnya
 */

const n = (v) => {
  const r = Math.round(v * 100) / 100
  return Object.is(r, -0) ? 0 : r
}

export const poly = (pts, close = true) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${n(p[0])} ${n(p[1])}`).join('') + (close ? 'Z' : '')

/** Evaluasi satu segmen kubik. */
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

/** Sampel rantai kubik `[[p0,p1,p2,p3], ...]` menjadi poligon. */
export function sampleCubics(chain, per = 22) {
  const out = []
  for (const seg of chain) {
    for (let i = 0; i < per; i++) out.push(cubic(seg[0], seg[1], seg[2], seg[3], i / per))
  }
  return out
}

/**
 * Offset poligon tertutup ke dalam sejauh `d` lewat bisektor sudut.
 * Dipakai untuk membuat band bingkai yang tebalnya rata — bukan hasil menskalakan
 * bentuk terhadap pusatnya, yang selalu menebalkan ujung yang jauh dari pusat.
 */
export function offsetInward(pts, d) {
  const m = pts.length
  const out = []
  for (let i = 0; i < m; i++) {
    const p = pts[i]
    const a = pts[(i - 1 + m) % m]
    const b = pts[(i + 1) % m]
    const n1 = norm([p[1] - a[1], a[0] - p[0]])
    const n2 = norm([b[1] - p[1], p[0] - b[0]])
    let bis = norm([n1[0] + n2[0], n1[1] + n2[1]])
    if (!bis) bis = n1
    const cos = bis[0] * n1[0] + bis[1] * n1[1]
    const scale = Math.min(3, 1 / Math.max(0.35, cos))
    out.push([p[0] - bis[0] * d * scale, p[1] - bis[1] * d * scale])
  }
  return out
}

function norm(v) {
  const l = Math.hypot(v[0], v[1])
  return l < 1e-9 ? null : [v[0] / l, v[1] / l]
}

/** Uji titik-dalam-poligon (ray casting). Dipakai agar filigree tetap di dalam siluet. */
export function inside(pts, x, y) {
  let hit = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/**
 * Siluet gunungan/kayon dalam kotak `w × h`, puncak di atas.
 * Titik terlebarnya di 72% tinggi — proporsi yang terbaca dari frame referensi,
 * bukan angka dari dokumen mana pun.
 */
export function kayonOutline(w, h, per = 26) {
  const x = (u) => u * w
  const y = (v) => v * h
  const chain = [
    [[x(0.5), y(0)], [x(0.66), y(0.1)], [x(0.86), y(0.36)], [x(0.96), y(0.62)]],
    [[x(0.96), y(0.62)], [x(1.0), y(0.78)], [x(0.95), y(0.92)], [x(0.78), y(0.99)]],
    [[x(0.78), y(0.99)], [x(0.66), y(1.03)], [x(0.34), y(1.03)], [x(0.22), y(0.99)]],
    [[x(0.22), y(0.99)], [x(0.05), y(0.92)], [x(0), y(0.78)], [x(0.04), y(0.62)]],
    [[x(0.04), y(0.62)], [x(0.14), y(0.36)], [x(0.34), y(0.1)], [x(0.5), y(0)]],
  ]
  return sampleCubics(chain, per)
}

/**
 * Ukel — sulur melingkar yang meruncing, digambar sebagai pita bermassa.
 * Tepi luar mengikuti spiral logaritmik r = r0·e^(k·θ); tepi dalamnya spiral yang
 * sama dikurangi lebar yang ikut menyusut, lalu keduanya ditutup jadi satu bidang.
 * Hasilnya bentuk berisi, bukan stroke — syarat "ornamen bermassa" di `DESIGN.md`.
 */
export function ukel({ r0 = 30, turns = 0.85, decay = 0.42, w0 = null, w1 = null, dir = 1, phase = 0 }) {
  const W0 = w0 ?? r0 * 0.3
  const W1 = w1 ?? r0 * 0.04
  const total = turns * Math.PI * 2
  const k = Math.log(decay) / total
  const steps = Math.max(26, Math.round(total / 0.07))
  const outer = []
  const inner = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const th = total * t
    const r = r0 * Math.exp(k * th)
    const a = phase + dir * th
    const wid = W0 + (W1 - W0) * t
    outer.push([Math.cos(a) * r, Math.sin(a) * r])
    inner.push([Math.cos(a) * (r - wid), Math.sin(a) * (r - wid)])
  }
  return poly(outer.concat(inner.reverse()))
}

/**
 * Ukel bertangkai: pita meruncing yang tumbuh dari pangkal lalu melingkar.
 * Di referensi, tiap sulur selalu punya batang yang mengalir ke curl-nya; curl
 * telanjang terbaca sebagai spiral teknis, bukan ornamen.
 */
export function ukelBertangkai({ len = 40, r0 = 26, turns = 0.85, decay = 0.42, w0 = null, dir = 1, tilt = 0 }) {
  const W0 = w0 ?? r0 * 0.34
  const a0 = tilt - dir * Math.PI / 2
  const cx = Math.cos(tilt) * len
  const cy = Math.sin(tilt) * len
  const start = [cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0]
  const chainOuter = [[[0, 0], [cx * 0.4, cy * 0.4], [start[0] * 0.72, start[1] * 0.72], start]]
  const stem = sampleCubics(chainOuter, 14)
  const nrm = [Math.sin(tilt) * dir, -Math.cos(tilt) * dir]
  const back = stem.map((p, i) => {
    const t = 1 - i / (stem.length - 1)
    const wid = W0 * (0.35 + 0.65 * (1 - t))
    return [p[0] + nrm[0] * wid, p[1] + nrm[1] * wid]
  }).reverse()
  return poly(stem.concat(back)) + ukelAt(cx, cy, { r0, turns, decay, w0: W0, dir, phase: a0 })
}

function ukelAt(x, y, opts) {
  const d = ukel(opts)
  return d.replace(/([ML])(-?[\d.]+) (-?[\d.]+)/g, (_, cmd, px, py) =>
    `${cmd}${Math.round((Number(px) + x) * 100) / 100} ${Math.round((Number(py) + y) * 100) / 100}`)
}

/** Daun/patran tunggal: dua busur bertemu di dua ujung runcing. */
export function daun(len, wid, bend = 0.22) {
  const chain = [
    [[0, 0], [len * 0.22, -wid * (1 + bend)], [len * 0.72, -wid], [len, 0]],
    [[len, 0], [len * 0.72, wid * 0.72], [len * 0.22, wid * (0.72 + bend)], [0, 0]],
  ]
  return poly(sampleCubics(chain, 16))
}

/** Kipas patran: bilah daun yang menyebar dari satu pangkal. */
export function patran(count, len, spread, wid = 0.16) {
  const parts = []
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const a = (-spread / 2 + spread * t) * (Math.PI / 180)
    const l = len * (0.58 + 0.42 * Math.sin(Math.PI * t)) * (i % 2 ? 0.82 : 1)
    parts.push(
      `<g transform="rotate(${n((a * 180) / Math.PI) + 90})"><path data-mass=""` +
      `${i % 2 ? ' opacity="0.45"' : ''} d="${daunTegak(l, l * wid)}"/></g>`,
    )
  }
  return parts.join('')
}

/**
 * Cincin berongga. Kedua lingkaran digambar searah, jadi bidangnya HARUS
 * dirender `fill-rule="evenodd"` — dengan nonzero ia jadi cakram padat.
 * `cincinMass()` memasangnya sendiri supaya kesalahan itu tidak bisa terulang.
 */
export function cincin(r, band) {
  const ring = (rad) => {
    const c = rad * 0.5523
    return (
      `M0 ${n(-rad)}C${n(c)} ${n(-rad)} ${n(rad)} ${n(-c)} ${n(rad)} 0` +
      `C${n(rad)} ${n(c)} ${n(c)} ${n(rad)} 0 ${n(rad)}` +
      `C${n(-c)} ${n(rad)} ${n(-rad)} ${n(c)} ${n(-rad)} 0` +
      `C${n(-rad)} ${n(-c)} ${n(-c)} ${n(-rad)} 0 ${n(-rad)}Z`
    )
  }
  return ring(r) + ring(r - band)
}

/** Lingkaran penuh (titik cecek, cakram medalion). */
export const cakram = (r) => {
  const c = r * 0.5523
  return (
    `M0 ${n(-r)}C${n(c)} ${n(-r)} ${n(r)} ${n(-c)} ${n(r)} 0` +
    `C${n(r)} ${n(c)} ${n(c)} ${n(r)} 0 ${n(r)}` +
    `C${n(-c)} ${n(r)} ${n(-r)} ${n(c)} ${n(-r)} 0` +
    `C${n(-r)} ${n(-c)} ${n(-c)} ${n(-r)} 0 ${n(-r)}Z`
  )
}

/** Tumpal — gigi segitiga, dipakai sebagai pita tepi. */
export function tumpal(w, h, count) {
  const step = w / count
  const pts = [[0, h]]
  for (let i = 0; i < count; i++) {
    pts.push([i * step + step / 2, 0], [(i + 1) * step, h])
  }
  return poly(pts)
}

/**
 * Mawar bergaya cetak: tiga busur pita yang saling memeluk.
 * Bukan mawar cat air seperti referensi — pack ini satu warna, jadi bunga itu
 * diterjemahkan jadi massa berlapis, bukan gradasi.
 */
export function mawar(r, kelopak = 6) {
  const parts = []
  for (let i = 0; i < kelopak; i++) {
    const rot = (360 / kelopak) * i
    parts.push(
      `<path data-mass="" transform="rotate(${round2(rot)}) translate(0 ${round2(-r * 0.52)})" ` +
      `d="${daunTegak(r * 0.72, r * 0.3)}"/>`,
    )
  }
  for (let i = 0; i < kelopak; i++) {
    const rot = (360 / kelopak) * i + 180 / kelopak
    parts.push(
      `<path data-mass="" opacity="0.45" transform="rotate(${round2(rot)}) translate(0 ${round2(-r * 0.34)})" ` +
      `d="${daunTegak(r * 0.46, r * 0.2)}"/>`,
    )
  }
  parts.push(`<path data-mass="" d="${cakram(r * 0.26)}"/>`)
  parts.push(`<path data-mass="" opacity="0.45" d="${cakram(r * 0.12)}"/>`)
  return parts.join('')
}

/** Kelopak/daun tegak: runcing di atas, membulat di pangkal. */
export function daunTegak(len, wid) {
  const chain = [
    [[0, 0], [-wid, -len * 0.26], [-wid * 0.86, -len * 0.74], [0, -len]],
    [[0, -len], [wid * 0.86, -len * 0.74], [wid, -len * 0.26], [0, 0]],
  ]
  return poly(sampleCubics(chain, 16))
}

export const round2 = n
