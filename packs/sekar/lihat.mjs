#!/usr/bin/env node
/**
 * Lembar kontak lokal pack `sekar` — untuk melihat bentuknya saat menggambar.
 *
 * Lembar kontak yang mengikat tetap `pnpm ornament:sheet`, yang merender komponen sungguhan
 * pada dua latar dan dua lebar. Berkas ini hanya mempercepat putaran menggambar: ia menukar
 * `var(--iv-orn-*)` dengan ramp terukur dari referensi, karena librsvg tidak mengevaluasi
 * custom property dan tanpa penukaran ini tiap gradasi akan dirender hitam.
 *
 *   node packs/sekar/lihat.mjs [gelap]
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const sharp = createRequire(import.meta.url)('sharp')
const HERE = dirname(fileURLToPath(import.meta.url))
const gelap = process.argv.includes('gelap')

/** Ramp terukur dari `imported/canva-sekar/measurements.json`, bukan dikarang. */
const terang = { deep: '#4a3d33', body: '#847665', accent: '#c89f3b', glow: '#e2d0b8', kertas: '#f4ece0' }
const malam = { deep: '#c8b79c', body: '#e2d0b8', accent: '#e6bd49', glow: '#f6ead6', kertas: '#2a231d' }
const ramp = gelap ? malam : terang

const warnai = (svg) => svg
  .replace(/var\(--iv-orn-deep, currentColor\)/g, ramp.deep)
  .replace(/var\(--iv-orn-accent, currentColor\)/g, ramp.accent)
  .replace(/var\(--iv-orn-glow, currentColor\)/g, ramp.glow)
  .replace(/currentColor/g, ramp.body)

const berkas = readdirSync(join(HERE, 'svg')).filter(f => f.endsWith('.svg')).sort()
const ubin = 250
const kolom = 5
const baris = Math.ceil(berkas.length / kolom)

const keping = []
for (const [i, f] of berkas.entries()) {
  const svg = warnai(readFileSync(join(HERE, 'svg', f), 'utf8'))
  const png = await sharp(Buffer.from(svg), { density: 400 })
    .resize({ width: ubin - 20, height: ubin - 44, fit: 'inside' })
    .png().toBuffer()
  const m = await sharp(png).metadata()
  keping.push({
    input: png,
    left: (i % kolom) * ubin + Math.round((ubin - m.width) / 2),
    top: Math.floor(i / kolom) * ubin + 30 + Math.round((ubin - 44 - m.height) / 2),
  })
  keping.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ubin}" height="22"><text x="${ubin / 2}" y="15" font-family="Helvetica" font-size="12" fill="${gelap ? '#ddd' : '#333'}" text-anchor="middle">${f.replace('sekar-', '').replace('.svg', '')}</text></svg>`),
    left: (i % kolom) * ubin,
    top: Math.floor(i / kolom) * ubin + 6,
  })
}

const keluar = join(HERE, `.lembar-${gelap ? 'gelap' : 'terang'}.png`)
await sharp({ create: { width: kolom * ubin, height: baris * ubin, channels: 3, background: ramp.kertas } })
  .composite(keping).png().toFile(keluar)
console.log(`${berkas.length} glyph → ${keluar}`)
