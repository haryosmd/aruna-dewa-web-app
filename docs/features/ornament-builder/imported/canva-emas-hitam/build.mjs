#!/usr/bin/env node
/** Pack impor: template Canva "Emas dan Hitam Tradisional Adat Jawa". Bukan aset original — lihat PROVENANCE.md. */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPack } from '../lib/pack.mjs'
const HERE = dirname(fileURLToPath(import.meta.url))

const GOLD = { '#857a58': 1 }
const GUNUNGAN = { '#423d35': 1, '#8c8153': 0.62, '#ccb554': 0.38, '#dbcd93': 0.24 }

await buildPack(HERE, {
  id: 'canva-emas-hitam',
  name: 'Impor Canva — Emas Hitam',
  template: 'Emas dan Hitam Tradisional Adat Jawa Undangan Pernikahan Brosur',
  builtAt: '2026-09-18',
  license: 'lihat PROVENANCE.md — bukan aset original, belum disetujui untuk produksi',
  palette: { source: ['#857a58', '#392a1e', '#423d35', '#8c8153', '#ccb554', '#dbcd93'], note: 'Warna sumber; glyph memakai currentColor.' },
  glyphs: [
    {
      // Sepasang sudut daun dengan celah bersih di x 185–187.
      file: 'bingkai-daun.svg',
      category: 'corner',
      anchor: 'sudut',
      layer: 'leaf',
      tiers: GOLD,
      split: {
        by: 'transform',
        parts: [
          { id: 'sudut-daun-kiri', name: 'Sudut daun kiri', match: 'matrix(1, 0, 0, 1, 0.000000000000000111, 0)' },
          { id: 'sudut-daun-kanan', name: 'Sudut daun kanan', match: 'matrix(1, 0, 0, 1, 187, 0)' },
        ],
      },
    },
    {
      /**
       * Berkas ini memuat 284 path daun yang **sama persis** dengan `bingkai-daun.svg`,
       * ditambah gunungan 10 path di tengah. Yang diambil hanya gunungannya; daunnya sudah
       * keluar dari berkas sebelumnya dan mengimpornya dua kali cuma menggandakan aset.
       */
      file: 'bingkai-daun-gunungan.svg',
      category: 'symbol',
      anchor: 'kepala',
      layer: 'gunungan',
      tiers: GUNUNGAN,
      split: {
        by: 'transform',
        parts: [{ id: 'gunungan-bingkai', name: 'Gunungan bingkai', match: 'matrix(1, 0, 0, 1, 124, 33)' }],
      },
      note: 'Hanya gunungan tengahnya; daun kiri-kanannya identik dengan bingkai-daun.svg.',
    },
    { id: 'mega-mendung-a', name: 'Mega mendung A', file: 'mega-mendung-a.svg', category: 'motif', anchor: 'latar', layer: 'cloud', tiers: { '#392a1e': 1 } },
    { id: 'mega-mendung-b', name: 'Mega mendung B', file: 'mega-mendung-b.svg', category: 'motif', anchor: 'latar', layer: 'cloud', tiers: { '#392a1e': 1 } },
    {
      // Tiga grup transform, tapi dua di antaranya sama-sama membentuk sisi kiri; dipecah
      // menurut sumbu supaya hasilnya dua sudut utuh, bukan tiga potongan.
      file: 'pita-sulur.svg',
      category: 'corner',
      anchor: 'sudut',
      layer: 'scroll',
      tiers: GOLD,
      split: {
        by: 'axis',
        axis: 'x',
        at: 187.5,
        parts: [
          { id: 'pita-sulur-kiri', name: 'Pita sulur kiri', side: 'low' },
          { id: 'pita-sulur-kanan', name: 'Pita sulur kanan', side: 'high' },
        ],
      },
    },
    {
      file: 'pita-tipis.svg',
      category: 'divider',
      anchor: 'antar-blok',
      layer: 'scroll',
      tiers: GOLD,
      split: {
        by: 'transform',
        parts: [
          { id: 'pita-tipis-kiri', name: 'Pita tipis kiri', match: 'matrix(1, 0, 0, 1, 3, 0.000000000000000899)' },
          { id: 'pita-tipis-kanan', name: 'Pita tipis kanan', match: '' },
        ],
      },
    },
    { id: 'gunungan-emas', name: 'Gunungan emas', file: 'gunungan-emas.svg', category: 'symbol', anchor: 'kepala', layer: 'gunungan', tiers: GUNUNGAN },
    {
      file: 'gunungan-sayap.svg',
      category: 'symbol',
      anchor: 'kepala',
      layer: 'gunungan',
      tiers: GUNUNGAN,
      split: {
        by: 'transform',
        parts: [
          { id: 'gunungan-sayap-kiri', name: 'Gunungan sayap kiri', match: 'matrix(1, 0, 0, 1, 0, 79)' },
          { id: 'gunungan-sayap-kanan', name: 'Gunungan sayap kanan', match: 'matrix(1, 0, 0, 1, 237, 79)' },
          { id: 'gunungan-sayap-tengah', name: 'Gunungan sayap tengah', match: '' },
        ],
      },
    },
  ],
})
