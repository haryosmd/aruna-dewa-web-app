#!/usr/bin/env node
/** Pack impor: template Canva "Coklat dan Krim Aesthetic Bunga". Bukan aset original — lihat PROVENANCE.md. */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPack } from '../lib/pack.mjs'
const HERE = dirname(fileURLToPath(import.meta.url))

await buildPack(HERE, {
  id: 'canva-coklat-krim',
  name: 'Impor Canva — Coklat Krim',
  template: 'Coklat dan Krim Aesthetic Bunga Undangan Pernikahan Invitation',
  builtAt: '2026-09-18',
  license: 'lihat PROVENANCE.md — bukan aset original, belum disetujui untuk produksi',
  palette: { source: ['#957149'], note: 'Bagian vektornya satu warna; wayang dan sapuan kuas berwarna penuh sebagai raster.' },
  glyphs: [
    {
      /**
       * Berkas sumbernya adalah papan nama contoh: "Olivia ⬥ Morgan". Yang diambil **hanya
       * gunungan di tengahnya** — 77 path tanpa transform. Huruf-hurufnya masing-masing satu
       * grup `translate`, dan nama contoh sebuah template bukan ornamen: memasukkannya berarti
       * menyimpan nama orang lain sebagai aset.
       */
      file: 'nameplate-gunungan.svg',
      category: 'monogram',
      anchor: 'kepala',
      layer: 'gunungan',
      tiers: { '#957149': 1 },
      split: {
        by: 'transform',
        parts: [{ id: 'gunungan-monogram', name: 'Gunungan monogram', match: '' }],
      },
      note: 'Hanya gunungan tengahnya yang diambil; nama contoh "Olivia"/"Morgan" sengaja tidak diimpor.',
    },
    {
      file: 'wayang-sudut.svg',
      category: 'corner',
      anchor: 'sudut',
      layer: 'scroll',
      tiers: { '#957149': 1 },
      split: {
        by: 'transform',
        parts: [
          { id: 'sudut-garis-atas', name: 'Sudut garis atas', match: '' },
          { id: 'sudut-sulur-bawah', name: 'Sudut sulur bawah', match: 'matrix(1, 0, 0, 1, 58, 145)' },
        ],
      },
    },
    {
      id: 'wayang-pengantin',
      name: 'Wayang sepasang',
      file: 'wayang-sudut.svg',
      category: 'symbol',
      anchor: 'kepala',
      raster: true,
      stripVector: true,
      note: 'Dua tokoh wayang yang tongkat dan busurnya saling menyilang; tidak dipecah per tokoh.',
    },
    {
      file: 'sudut-kuas.svg',
      category: 'corner',
      anchor: 'sudut',
      layer: 'scroll',
      tiers: { '#957149': 1 },
      split: {
        by: 'transform',
        parts: [{ id: 'sudut-garis-halus', name: 'Sudut garis halus', match: 'matrix(1, 0, 0, 1, 0.000000000000000111, 0)' }],
      },
    },
    {
      id: 'sapuan-kuas',
      name: 'Sapuan kuas',
      file: 'sudut-kuas.svg',
      category: 'motif',
      anchor: 'latar',
      raster: true,
      stripVector: true,
      crop: { x: 225, y: 0, w: 280, h: 238 },
      wash: true,
    },
  ],
})
