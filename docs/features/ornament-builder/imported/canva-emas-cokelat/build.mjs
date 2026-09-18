#!/usr/bin/env node
/** Pack impor: template Canva "Emas Cokelat Tradisional Video Seluler". Bukan aset original — lihat PROVENANCE.md. */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPack } from '../lib/pack.mjs'
const HERE = dirname(fileURLToPath(import.meta.url))

await buildPack(HERE, {
  id: 'canva-emas-cokelat',
  name: 'Impor Canva — Emas Cokelat',
  template: 'Emas Cokelat Tradisional Undangan Pernikahan Video Seluler',
  builtAt: '2026-09-18',
  license: 'lihat PROVENANCE.md — bukan aset original, belum disetujui untuk produksi',
  palette: { source: ['#efdeca', '#f6e9d7'], note: 'Sulur memakai satu warna; sisanya berwarna penuh sebagai raster.' },
  glyphs: [
    // Sepasang sudut gunungan emas. Tidak ada celah alpha yang bersih di tengahnya — ada
    // kabut tipis yang menyeberang — jadi potongnya di titik tengah dan kabut itu ikut terbelah.
    { id: 'sudut-gunungan-kiri', name: 'Sudut gunungan kiri', file: 'sudut-gunungan-emas.svg', category: 'corner', anchor: 'sudut', raster: true, crop: { x: 120, y: 0, w: 465, h: 563 } },
    { id: 'sudut-gunungan-kanan', name: 'Sudut gunungan kanan', file: 'sudut-gunungan-emas.svg', category: 'corner', anchor: 'sudut', raster: true, crop: { x: 585, y: 0, w: 465, h: 563 } },
    {
      // Sepasang sulur bercermin, celah bersih di x 473–621, tapi keduanya tanpa transform —
      // jadi pemecahannya menurut sumbu, bukan menurut grup.
      file: 'sulur-krem.svg',
      category: 'floral',
      anchor: 'tepi',
      layer: 'scroll',
      tiers: { '#efdeca': 1 },
      split: {
        by: 'axis',
        axis: 'x',
        at: 547,
        parts: [
          { id: 'sulur-krem-kiri', name: 'Sulur krem kiri', side: 'low' },
          { id: 'sulur-krem-kanan', name: 'Sulur krem kanan', side: 'high' },
        ],
      },
    },
    {
      file: 'sulur-tipis.svg',
      category: 'divider',
      anchor: 'antar-blok',
      layer: 'scroll',
      tiers: { '#f6e9d7': 1 },
      split: {
        by: 'transform',
        parts: [
          { id: 'sulur-tipis-kiri', name: 'Sulur tipis kiri', match: 'matrix(1, 0, 0, 1, 0.000000000000000222, 1)' },
          { id: 'sulur-tipis-kanan', name: 'Sulur tipis kanan', match: 'matrix(1, 0, 0, 1, 733, 0)' },
        ],
      },
    },
    { id: 'lengkung-latar', name: 'Lengkung latar', file: 'lengkung-latar.svg', category: 'frame', anchor: 'latar', raster: true, wash: true, note: 'Bidang latar berbentuk lengkung, bukan ornamen bergaris.' },
    {
      id: 'cahaya-lembut',
      name: 'Cahaya lembut',
      file: 'cahaya-lembut.svg',
      category: 'motif',
      anchor: 'latar',
      raster: true,
      crop: { x: 0, y: 0, w: 210, h: 349 },
      note: 'Sumbernya memuat dua nyala identik (x 19–182 dan 598–762); hanya satu yang diambil.',
    },
    {
      id: 'pengantin-jawa',
      name: 'Pengantin Jawa',
      file: 'pengantin-jawa.svg',
      category: 'symbol',
      anchor: 'kepala',
      raster: true,
      note: 'Sepasang utuh. Dua potongan per tokoh juga disediakan; lihat catatan di PROVENANCE.md.',
    },
    {
      id: 'pengantin-pria',
      name: 'Pengantin pria',
      file: 'pengantin-jawa.svg',
      category: 'symbol',
      anchor: 'kepala',
      raster: true,
      crop: { x: 120, y: 0, w: 462, h: 877 },
      note: 'Dipotong di x=582. Kedua tokoh saling menimpa di sana, jadi potongan ini kehilangan ujung tangan kanannya dan membawa sedikit ujung kain mempelai wanita.',
    },
    {
      id: 'pengantin-wanita',
      name: 'Pengantin wanita',
      file: 'pengantin-jawa.svg',
      category: 'symbol',
      anchor: 'kepala',
      raster: true,
      crop: { x: 582, y: 0, w: 462, h: 877 },
      note: 'Dipotong di x=582; membawa serta tangan mempelai pria yang memang melingkari lengannya.',
    },
  ],
})
