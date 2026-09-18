#!/usr/bin/env node
/**
 * Pengukur referensi Canva untuk pack `sekar`.
 *
 * **Ini bukan konverter.** Tidak ada satu path pun yang keluar dari berkas ini menuju produk;
 * lihat `PROVENANCE.md`. Yang dihasilkan hanya angka: viewBox, jumlah path, dan — yang paling
 * penting — **ramp warna yang benar-benar dirender**, diukur dari piksel, bukan dibaca dari
 * atribut `fill`.
 *
 * Kenapa dari piksel: dua referensi terberat isinya PNG cat air tertanam (atribut `fill` tidak
 * menyebut satu pun warnanya), dan satu referensi lagi memalsukan gradient dengan 774 serpih
 * terklip (atribut `fill`-nya menyebut 700+ warna yang sebenarnya satu gradasi). Membaca
 * atributnya akan salah pada keduanya, dengan cara yang berlawanan.
 *
 *   node docs/features/ornament-builder/imported/canva-sekar/studi.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const sharp = createRequire(import.meta.url)('sharp')
const HERE = dirname(fileURLToPath(import.meta.url))
const SOURCE = join(HERE, 'source')
const RASTER = join(HERE, 'raster')

const luminance = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')

/**
 * Ramp terukur: piksel dikelompokkan pada kisi 24 nilai per kanal supaya nuansa cat air yang
 * berdekatan tidak terhitung sebagai warna berbeda, lalu diurutkan menurut luminance WCAG.
 * Piksel nyaris transparan dan nyaris putih dibuang — keduanya kertas, bukan tinta.
 */
function ramp(data, info, { batas = 10 } = {}) {
  const ember = new Map()
  const n = info.channels
  let tinta = 0
  for (let i = 0; i < data.length; i += n) {
    const a = n === 4 ? data[i + 3] : 255
    if (a < 24) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (r > 244 && g > 244 && b > 244) continue
    tinta++
    const k = `${(r / 24) | 0},${(g / 24) | 0},${(b / 24) | 0}`
    const e = ember.get(k) ?? { n: 0, r: 0, g: 0, b: 0 }
    e.n++; e.r += r; e.g += g; e.b += b
    ember.set(k, e)
  }
  const total = tinta || 1
  return {
    pangsaTinta: +(tinta / (data.length / n)).toFixed(4),
    stop: [...ember.values()]
      .filter(e => e.n / total > 0.01)
      .sort((a, b) => b.n - a.n)
      .slice(0, batas)
      .map(e => ({ warna: hex([e.r / e.n, e.g / e.n, e.b / e.n]), pangsa: +(e.n / total).toFixed(3), lum: +luminance([e.r / e.n, e.g / e.n, e.b / e.n]).toFixed(3) }))
      .sort((a, b) => a.lum - b.lum),
  }
}

const hasil = []
for (const nama of readdirSync(SOURCE).sort()) {
  const p = join(SOURCE, nama)
  const ext = extname(nama)
  const teks = ext === '.svg' ? readFileSync(p, 'utf8') : ''
  const vb = teks.match(/viewBox="([^"]+)"/)?.[1] ?? null
  const png = join(RASTER, basename(nama, ext) + '.png')

  // `density` dinaikkan supaya SVG selebar 200 satuan tetap terukur pada ribuan piksel.
  const gambar = sharp(p, ext === '.svg' ? { density: 300 } : {})
  const meta = await gambar.metadata()
  const { data, info } = await gambar
    .clone().resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png({ compressionLevel: 9 }).toFile(png)

  hasil.push({
    berkas: nama,
    bytes: readFileSync(p).length,
    viewBox: vb,
    piksel: `${meta.width}×${meta.height}`,
    path: (teks.match(/<path/g) ?? []).length,
    clipPath: (teks.match(/<clipPath/g) ?? []).length,
    imageTertanam: (teks.match(/<image/g) ?? []).length,
    fillUnik: new Set(teks.match(/fill="#[0-9a-fA-F]{3,6}"/g) ?? []).size,
    ...ramp(data, info),
  })
}

writeFileSync(join(HERE, 'measurements.json'), JSON.stringify({ diukur: '2026-09-18', alat: 'sharp/librsvg', berkas: hasil }, null, 2) + '\n')
for (const h of hasil) {
  console.log(`${h.berkas.padEnd(24)} ${String(h.bytes).padStart(8)}B  path ${String(h.path).padStart(4)}  fill-unik ${String(h.fillUnik).padStart(4)}  raster ${h.imageTertanam}  tinta ${(h.pangsaTinta * 100).toFixed(1)}%`)
  console.log('   ramp ' + h.stop.map(s => `${s.warna}(${(s.pangsa * 100).toFixed(0)}%)`).join(' → '))
}
