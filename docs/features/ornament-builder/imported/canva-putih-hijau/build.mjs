#!/usr/bin/env node
/** Pack impor: template Canva "Putih Hijau Bunga Floral Minimalist". Bukan aset original — lihat PROVENANCE.md. */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPack } from '../lib/pack.mjs'
const HERE = dirname(fileURLToPath(import.meta.url))

await buildPack(HERE, {
  id: 'canva-putih-hijau',
  name: 'Impor Canva — Putih Hijau',
  template: 'Putih Hijau Bunga Floral Minimalist Undangan Pernikahan Instagram Story',
  builtAt: '2026-09-18',
  license: 'lihat PROVENANCE.md — bukan aset original, belum disetujui untuk produksi',
  palette: { source: ['#5b6b43'], note: 'Hati memakai satu warna; sudut bunga berwarna penuh sebagai raster.' },
  glyphs: [
    // Sepasang sudut bunga dalam satu berkas, dengan celah bersih di x 462–507.
    { id: 'sudut-bunga-kiri', name: 'Sudut bunga kiri', file: 'sudut-bunga-putih.svg', category: 'corner', anchor: 'sudut', raster: true, crop: { x: 0, y: 0, w: 466, h: 429 } },
    { id: 'sudut-bunga-kanan', name: 'Sudut bunga kanan', file: 'sudut-bunga-putih.svg', category: 'corner', anchor: 'sudut', raster: true, crop: { x: 503, y: 0, w: 466, h: 429 } },
    { id: 'hati-rangkai-a', name: 'Hati rangkai A', file: 'hati-a.svg', category: 'symbol', anchor: 'sela-teks', layer: 'heart', tiers: { '#5b6b43': 1 } },
    { id: 'hati-rangkai-b', name: 'Hati rangkai B', file: 'hati-b.svg', category: 'symbol', anchor: 'sela-teks', layer: 'heart', tiers: { '#5b6b43': 1 } },
  ],
})
