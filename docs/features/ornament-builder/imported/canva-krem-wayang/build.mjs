#!/usr/bin/env node
/**
 * Pack impor: template Canva "Krem Ilustrasi Vintage Rumah Jawa dengan Ornamen Wayang
 * Wallpaper Telepon".
 *
 * **Bukan aset original.** Aturannya di `../lib/convert.mjs` dan `../lib/pack.mjs`;
 * batas lisensinya di `PROVENANCE.md`.
 *
 *   rtk proxy node docs/features/ornament-builder/imported/canva-krem-wayang/build.mjs
 */

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPack } from '../lib/pack.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * Ketiga kayon disusun terbalik dari daun sulur di pack cokelat-krem: di sana badan terang
 * ditumpuk di atas siluet gelap, di sini **sulurnya yang putih** dicat di atas badan
 * berwarna. Aturan rongga yang sama menyelesaikan keduanya — tiap bentuk berwarna kertas
 * menjadi lubang pada bentuk berwarna terakhir sebelum dirinya — dan path putih paling awal,
 * yang di sumbernya dicat langsung di atas kertas putih, dibuang karena memang tidak
 * menggambar apa pun.
 */
const kayon = (id, name, file, ink) => ({
  id,
  name,
  file,
  category: 'symbol',
  anchor: 'kepala',
  layer: 'kayon',
  tiers: { [ink]: 1, '#ffffff': 1 },
  knockout: { cut: '#ffffff', into: ink },
})

await buildPack(HERE, {
  id: 'canva-krem-wayang',
  name: 'Impor Canva — Krem Wayang',
  template: 'Krem Ilustrasi Vintage Rumah Jawa dengan Ornamen Wayang Wallpaper Telepon',
  builtAt: '2026-09-18',
  license: 'lihat PROVENANCE.md — bukan aset original, belum disetujui untuk produksi',
  palette: {
    source: ['#f0c8b1', '#ffe7d9', '#ffffff'],
    note: 'Warna sumber; glyph SVG memakai currentColor.',
  },
  glyphs: [
    kayon('kayon-sulur', 'Kayon sulur', 'kayon-sulur.svg', '#f0c8b1'),
    kayon('kayon-pohon-kiri', 'Kayon pohon kiri', 'kayon-pohon-a.svg', '#ffe7d9'),
    kayon('kayon-pohon-kanan', 'Kayon pohon kanan', 'kayon-pohon-b.svg', '#ffe7d9'),
    {
      id: 'lampion-ronce-kiri',
      name: 'Lampion ronce kiri',
      file: 'lampion-kiri.svg',
      category: 'layer',
      anchor: 'cascade',
      raster: true,
    },
    {
      id: 'lampion-ronce-kanan',
      name: 'Lampion ronce kanan',
      file: 'lampion-kanan.svg',
      category: 'layer',
      anchor: 'cascade',
      raster: true,
    },
    {
      id: 'pita-tekstur',
      name: 'Pita tekstur kertas',
      file: 'pita-tekstur.svg',
      category: 'divider',
      anchor: 'antar-blok',
      raster: true,
    },
    {
      id: 'rumah-joglo',
      name: 'Rumah joglo',
      file: 'rumah-joglo.svg',
      category: 'venue',
      anchor: 'seksi-acara',
      raster: true,
    },
  ],
})
