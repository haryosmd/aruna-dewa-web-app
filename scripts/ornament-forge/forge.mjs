import { PENANDA, bacaLama, tulisGlyph } from './emit.mjs'
import { bingkai, idBingkai } from './resep/bingkai.mjs'
import { idPemisah, pemisah } from './resep/pemisah.mjs'
import { idMotif, motif } from './resep/motif.mjs'
import { idSegel, segel } from './resep/segel.mjs'
import { idSimbol, simbol } from './resep/simbol.mjs'
import { idSudut, sudut } from './resep/sudut.mjs'
import { paramUntuk } from './resep/tema.mjs'

/**
 * Pembangkit bank ornamen.
 *
 * Berkas `.vue` hasilnya **di-commit**, bukan dibangkitkan saat build. Alasannya: arsitektur
 * runtime (`OrnamentGlyph` + `import.meta.glob` eager) tidak perlu tahu apa pun tentang forge,
 * dan tinjauan kode tetap melihat bentuk yang benar-benar dikirim ke tamu — bukan resep yang
 * menghasilkannya.
 */

const resep = {
  frame: { id: idBingkai, buat: bingkai },
  divider: { id: idPemisah, buat: pemisah },
  corner: { id: idSudut, buat: sudut },
  motif: { id: idMotif, buat: motif },
  symbol: { id: idSimbol, buat: simbol },
  seal: { id: idSegel, buat: segel },
}

export function bangkitkan({ tulis = false } = {}) {
  const hasil = []
  for (const [kategori, { id, buat }] of Object.entries(resep)) {
    for (const glyph of id) {
      const p = paramUntuk(glyph)
      const r = buat(glyph)
      const komentar = ` * ${p.catatan ?? `Ornamen ${kategori} bank.`}\n *\n * ${PENANDA} — jangan sunting berkas ini dengan tangan;\n * ubah resepnya lalu jalankan \`pnpm ornament:forge\`.${p.tema ? `\n * Tema: ${p.tema} · mahkota: ${p.mahkota} · isen: ${p.isen} · garis: ${p.stroke}` : `\n * Tanpa tema · mahkota: ${p.mahkota} · isen: ${p.isen} · garis: ${p.stroke}`}`
      const lama = bacaLama(r.file)
      const keluar = { ...r, komentar: `/**\n${komentar}\n */`, kategori, glyph }
      if (tulis) keluar.tulisan = tulisGlyph(keluar)
      keluar.baru = !lama
      hasil.push(keluar)
    }
  }
  return hasil
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tulis = process.argv.includes('--tulis')
  const hasil = bangkitkan({ tulis })
  for (const h of hasil) {
    const n = h.tulisan?.bytes ?? h.bagian.join('').length
    console.log(`${h.glyph.padEnd(16)} ${h.file.padEnd(14)} ${String(n).padStart(6)} byte${tulis ? ' ditulis' : ''}`)
  }
  console.log(`\n${hasil.length} glyph${tulis ? ' ditulis' : ' (uji kering — pakai --tulis untuk menulis)'}`)
}
