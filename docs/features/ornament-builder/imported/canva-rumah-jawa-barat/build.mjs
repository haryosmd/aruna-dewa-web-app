#!/usr/bin/env node
/**
 * Pack impor: template Canva "Rumah Adat Jawa Barat Infografis Ilustratif".
 *
 * **Bukan aset original.** Aturannya di `../lib/convert.mjs` dan `../lib/pack.mjs`;
 * batas lisensinya di `PROVENANCE.md`.
 *
 *   rtk proxy node docs/features/ornament-builder/imported/canva-rumah-jawa-barat/build.mjs
 */

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPack } from '../lib/pack.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

await buildPack(HERE, {
  id: 'canva-rumah-jawa-barat',
  name: 'Impor Canva — Rumah Jawa Barat',
  template: 'Rumah Adat Jawa Barat Infografis Ilustratif',
  builtAt: '2026-09-18',
  license: 'lihat PROVENANCE.md — bukan aset original, belum disetujui untuk produksi',
  palette: {
    source: ['#af4c0f', '#3a1b09', '#422424', '#6e2711', '#872a0c', '#943314', '#ab4728', '#b75030', '#d9947d', '#eba892', '#e8b577', '#f5c790', '#341b1b', '#564c4c', '#6c6666', '#7d7474'],
    note: 'Warna sumber; glyph SVG memakai currentColor.',
  },
  glyphs: [
    {
      /**
       * Sepasang ukiran sudut dalam satu berkas — dan keduanya memakai rentang koordinat
       * yang sama, dibedakan hanya oleh geseran grupnya. Dipecah jadi dua glyph berdiri
       * sendiri supaya sudut kiri dan kanan bisa dipasang terpisah: di ponsel sering hanya
       * salah satunya yang muat, dan satu berkas berisi keduanya memaksa keduanya ikut.
       */
      file: 'sudut-ukiran.svg',
      category: 'corner',
      anchor: 'sudut',
      layer: 'carving',
      tiers: { '#af4c0f': 1 },
      split: {
        by: 'transform',
        parts: [
          { id: 'sudut-ukiran-kiri', name: 'Sudut ukiran kiri', match: 'matrix(1, 0, 0, 1, 0, 0)' },
          { id: 'sudut-ukiran-kanan', name: 'Sudut ukiran kanan', match: 'matrix(1, 0, 0, 1, 360, 0)' },
        ],
      },
    },
    {
      /**
       * Ilustrasi berwarna penuh, 15 warna. Tidak mungkin dipetakan dengan tangan, jadi
       * tiap warna diturunkan ke bidang nilai berdasarkan luminance-nya: makin gelap
       * warnanya, makin pekat tintanya. Bangunan tetap kaku — tidak pernah ditekuk motion.
       */
      id: 'rumah-julang-ngapak',
      name: 'Rumah Julang Ngapak',
      file: 'rumah-julang-ngapak.svg',
      category: 'venue',
      anchor: 'seksi-acara',
      layer: 'building',
      tiers: 'luminance',
    },
  ],
})
