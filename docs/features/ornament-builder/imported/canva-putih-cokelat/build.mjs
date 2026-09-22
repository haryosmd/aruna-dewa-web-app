#!/usr/bin/env node
/** Pack impor: template Canva "Putih Cokelat Elegan Klasik". Bukan aset original — lihat PROVENANCE.md. */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPack } from '../lib/pack.mjs'
const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * Kelompok ini hampir seluruhnya **ukiran relief berwarna** — badan emas dengan bayangan
 * gelap di atasnya. Diturunkan ke satu warna, relief seperti itu runtuh jadi siluet: yang
 * membentuknya memang perbedaan warna, bukan perbedaan bentuk. Karena itu yang disajikan
 * raster ber-alpha yang setia, bukan glyph `currentColor` yang menyesatkan. Satu-satunya
 * pengecualian `motif-latar`, yang memang dua warna datar.
 */
await buildPack(HERE, {
  id: 'canva-putih-cokelat',
  name: 'Impor Canva — Putih Cokelat',
  template: 'Putih Cokelat Elegan Klasik Undangan Pernikahan Mobile Video',
  builtAt: '2026-09-18',
  license: 'lihat PROVENANCE.md — bukan aset original, belum disetujui untuk produksi',
  palette: { source: ['#080706', '#8a613a', '#e9c594', '#a48b61', '#4f3d34'], note: 'Ukiran relief disajikan berwarna penuh sebagai raster; hanya motif latar yang jadi glyph currentColor.' },
  glyphs: [
    { id: 'mahkota-ukir', name: 'Mahkota ukir', file: 'mahkota-ukir.svg', category: 'frame', anchor: 'kepala', raster: true },
    // Sepasang sudut dengan celah bersih di x 324–405.
    { id: 'sudut-ukir-kiri', name: 'Sudut ukir kiri', file: 'sudut-ukir.svg', category: 'corner', anchor: 'sudut', raster: true, crop: { x: 0, y: 0, w: 364, h: 324 } },
    { id: 'sudut-ukir-kanan', name: 'Sudut ukir kanan', file: 'sudut-ukir.svg', category: 'corner', anchor: 'sudut', raster: true, crop: { x: 365, y: 0, w: 364, h: 324 } },
    // Dua paruh bercermin yang bertemu di puncak x=405 (satuan viewBox 810×405). Fase 59
    // sengaja tidak memecahnya; pemilik memutuskan sebaliknya pada 2026-09-19 (fase 70):
    // sebagai keping sudut kiri/kanan ia bisa dipasang di slot Sudut, sedangkan sebagai
    // bingkai utuh ia bersaing di slot Bingkai yang tidak pernah ia menangkan.
    { id: 'bingkai-ukir-kiri', name: 'Bingkai ukir kiri', file: 'bingkai-ukir.svg', category: 'corner', anchor: 'sudut', raster: true, crop: { x: 0, y: 0, w: 405, h: 405 } },
    { id: 'bingkai-ukir-kanan', name: 'Bingkai ukir kanan', file: 'bingkai-ukir.svg', category: 'corner', anchor: 'sudut', raster: true, crop: { x: 405, y: 0, w: 405, h: 405 } },
    // Dua benda terpisah dalam satu berkas, dengan celah bersih di y 82–126.
    { id: 'cincin-kawin', name: 'Cincin kawin', file: 'cincin-bunga.svg', category: 'symbol', anchor: 'kepala', raster: true, crop: { x: 0, y: 0, w: 465, h: 100 } },
    { id: 'rangkai-bunga', name: 'Rangkai bunga', file: 'cincin-bunga.svg', category: 'layer', anchor: 'crown', raster: true, crop: { x: 0, y: 110, w: 465, h: 240 } },
    {
      /** Tiga salinan ubin yang sama berjajar; yang diambil satu, karena ubin memang diulang oleh CSS. */
      file: 'motif-latar.svg',
      category: 'motif',
      anchor: 'latar',
      layer: 'tile',
      tiers: { '#4f3d34': 1, '#a48b61': 0.45 },
      split: {
        by: 'transform',
        parts: [{ id: 'motif-latar', name: 'Motif latar', match: 'matrix(1, 0, 0, 1, 0, 0)' }],
      },
      note: 'Sumbernya memuat tiga salinan ubin yang sama; hanya satu yang diambil.',
    },
  ],
})
