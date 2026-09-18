#!/usr/bin/env node
/**
 * Pack impor: template Canva "Cokelat Krem Elegan Tradisional Undangan Pernikahan Video Seluler".
 *
 * **Bukan aset original.** Aturan konversi, pemeriksaan, dan bentuk katalognya ada di
 * `../lib/convert.mjs` dan `../lib/pack.mjs`; berkas ini hanya daftar glyph dan pemetaan
 * warnanya. Batas lisensi ada di `PROVENANCE.md` — baca itu lebih dulu.
 *
 *   rtk proxy node docs/features/ornament-builder/imported/canva-cokelat-krem/build.mjs
 */

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPack } from '../lib/pack.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

await buildPack(HERE, {
  id: 'canva-cokelat-krem',
  name: 'Impor Canva — Cokelat Krem',
  template: 'Cokelat Krem Elegan Tradisional Undangan Pernikahan Video Seluler',
  builtAt: '2026-09-17',
  license: 'lihat PROVENANCE.md — bukan aset original, belum disetujui untuk produksi',
  palette: {
    source: ['#483534', '#544541', '#ebd5c4', '#f0e4db'],
    note: 'Warna sumber disimpan di sini; glyph SVG memakai currentColor.',
  },
  glyphs: [
    {
      id: 'kayon-gunungan',
      name: 'Kayon gunungan',
      file: 'gunungan.svg',
      category: 'frame',
      anchor: 'section',
      layer: 'silhouette',
      tiers: { '#ffffff': 1 },
    },
    {
      id: 'daun-sulur-kiri',
      name: 'Daun sulur kiri',
      file: 'daun-sulur-a.svg',
      category: 'floral',
      anchor: 'tepi',
      layer: 'leaf',
      // Badan krem di sumbernya menutupi siluet gelap; dalam monokrom ia harus jadi rongga.
      tiers: { '#ebd5c4': 0.32, '#483534': 1, '#544541': 0.7 },
      knockout: { cut: '#ebd5c4', into: '#483534' },
    },
    {
      id: 'daun-sulur-kanan',
      name: 'Daun sulur kanan',
      file: 'daun-sulur-b.svg',
      category: 'floral',
      anchor: 'tepi',
      layer: 'leaf',
      tiers: { '#ebd5c4': 0.32, '#483534': 1, '#544541': 0.7 },
      knockout: { cut: '#ebd5c4', into: '#483534' },
    },
    {
      id: 'pita-ceplok',
      name: 'Pita ceplok',
      file: 'pita-ceplok.svg',
      category: 'divider',
      anchor: 'antar-blok',
      layer: 'band',
      tiers: { '#f0e4db': 0.32, '#483534': 1 },
    },
    {
      id: 'rangkai-mawar-kiri',
      name: 'Rangkai mawar kiri',
      file: 'rangkai-mawar-a.svg',
      category: 'layer',
      anchor: 'cluster',
      raster: true,
    },
    {
      id: 'rangkai-mawar-kanan',
      name: 'Rangkai mawar kanan',
      file: 'rangkai-mawar-b.svg',
      category: 'layer',
      anchor: 'cluster',
      raster: true,
    },
  ],
})
