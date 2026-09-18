#!/usr/bin/env node
/** Pack impor: template Canva "Merah Emas Tradisional Pernikahan Undangan". Bukan aset original — lihat PROVENANCE.md. */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPack } from '../lib/pack.mjs'
const HERE = dirname(fileURLToPath(import.meta.url))

await buildPack(HERE, {
  id: 'canva-merah-emas',
  name: 'Impor Canva — Merah Emas',
  template: 'Merah Emas Tradisional Pernikahan Undangan',
  builtAt: '2026-09-18',
  license: 'lihat PROVENANCE.md — bukan aset original, belum disetujui untuk produksi',
  palette: { source: ['merah', 'emas'], note: 'Ilustrasi berwarna penuh; disajikan sebagai raster ber-alpha.' },
  glyphs: [
    {
      id: 'kayon-sudut-merah',
      name: 'Kayon sudut merah',
      file: 'kayon-sudut-merah.svg',
      category: 'corner',
      anchor: 'tepi-kiri',
      raster: true,
      // Tidak dipecah: kayon di atas dan sulur batik di bawah **saling menimpa** di
      // y≈170–200 (profil alpha sumbernya menerus 0–237 tanpa celah). Memotongnya berarti
      // mengiris kedua bentuk, bukan memisahkannya.
      note: 'Tidak dipecah — kayon dan sulur batiknya bertumpuk, tidak ada celah untuk memotong.',
    },
  ],
})
