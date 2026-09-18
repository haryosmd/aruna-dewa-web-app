import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../../apps/web/components/ornament/', import.meta.url))

/**
 * Penanda bahwa sebuah komponen dibangkitkan forge.
 *
 * Bukan hiasan: `apps/web/test/forge-idempotent.spec.ts` menjalankan forge lalu membandingkan
 * hasilnya dengan berkas yang ter-commit. Tanpa penanda ini, suntingan tangan pada glyph yang dibangkitkan akan hilang
 * diam-diam pada `pnpm ornament:forge` berikutnya — dan yang hilang adalah perbaikan yang
 * sudah lolos tinjauan.
 */
export const PENANDA = 'dibangkitkan oleh scripts/ornament-forge'

/**
 * Empat stop ramp warna ornamen, dipancarkan sebagai `var()` dengan `currentColor` sebagai
 * cadangan.
 *
 * **Cadangannya wajib, dan bukan formalitas.** 133 glyph lama dan empat belas tempat yang
 * memaksa `color:` sendiri tidak tahu apa-apa tentang ramp ini; tanpa cadangan mereka akan
 * kehilangan warnanya seluruhnya. Dengan cadangan, glyph yang belum digubah tetap satu tinta
 * persis seperti sebelumnya, dan yang sudah digubah ikut ramp temanya.
 *
 * Nilainya diturunkan `apps/web/utils/ornament-palette.ts` dan dipancarkan `themeStyle()`.
 */
const cat = (nama) => `var(--iv-orn-${nama}, currentColor)`

const mass = (d, opacity = 1, extra = '') =>
  `<path data-mass=""${extra}${opacity === 1 ? '' : ` opacity="${opacity}"`} d="${d}" />`

/** Massa berongga. Cincin dan bingkai WAJIB `evenodd` — dengan nonzero ia jadi bidang padat. */
const massHollow = (d, opacity = 1) => mass(d, opacity, ' fill-rule="evenodd"')

/**
 * Lapisan garis.
 *
 * Bawaannya `deep`, dan itu aturan, bukan selera: **`accent` tidak pernah boleh jadi
 * satu-satunya warna sebuah garis.** Diukur pada sembilan tema, `accent` serendah 2,32:1
 * terhadap latarnya dan 1,68:1 terhadap `primary` — cukup untuk bidang seluas band, tidak
 * cukup untuk garis selebar tiga satuan viewBox. Aksen adalah massa; garis adalah `deep`.
 */
const draw = (d, width = 3, opacity = 0.6, nama = 'deep') =>
  `<path data-draw="" fill="none" stroke="${cat(nama)}" stroke-width="${width}" ` +
  `stroke-linecap="round" stroke-linejoin="round"${opacity === 1 ? '' : ` opacity="${opacity}"`} d="${d}" />`

const grup = (isi, opacity = 1, nama = 'body') =>
  `<g fill="${cat(nama)}"${opacity === 1 ? '' : ` opacity="${opacity}"`}>${isi}</g>`

/**
 * Merakit isi satu komponen ornamen, tanpa menyentuh disk.
 *
 * Indentasi dan susunannya dibuat sama dengan glyph yang digambar tangan, supaya diff antara
 * yang lama dan yang dibangkitkan terbaca sebagai perubahan bentuk — bukan sebagai perubahan
 * gaya penulisan yang menenggelamkannya.
 *
 * Dipisah dari penulisannya supaya `forge-idempotent.spec.ts` bisa membandingkan hasil resep
 * dengan berkas ter-commit tanpa menimpa apa pun. Selama keduanya satu fungsi, satu-satunya
 * cara menguji kesamaan itu adalah dengan benar-benar menulis ke pohon kerja lebih dulu —
 * yaitu tes yang merusak persis hal yang ia periksa.
 *
 * @param {{ viewBox: string, komentar: string, bagian: (string | false | null | undefined)[], props?: string | null, par?: string | null }} glyph
 * @returns {string}
 */
export function rakitGlyph({ viewBox, komentar, bagian, props = null, par = null }) {
  const badan = bagian
    .filter(Boolean)
    .map(b => `    ${b}`)
    .join('\n')

  const skrip = props
    ? `<script setup lang="ts">\n${komentar}\n\ndefineProps<${props}>()\n</script>`
    : `<script setup lang="ts">\n${komentar}\n</script>`

  /*
   * `preserveAspectRatio` hanya dipancarkan kalau resepnya memintanya, dan hanya keping
   * ladang yang memintanya. Keping ladang dipotong oleh section induknya dengan bleed
   * negatif, jadi ia HARUS `slice` pada jangkar yang benar — `xMidYMax` untuk yang bertumpu
   * di tepi bawah, `xMidYMin` untuk yang menggantung di tepi atas. Ornamen lain memakai
   * `meet` bawaan, dan menambahkan atribut ini pada mereka akan mengubah tata letak 105
   * glyph yang sudah benar.
   */
  const rasio = par ? ` preserveAspectRatio="${par}"` : ''
  return `${skrip}\n\n<template>\n  <svg viewBox="${viewBox}"${rasio} aria-hidden="true">\n${badan}\n  </svg>\n</template>\n`
}

/** Menulis satu komponen ornamen. */
export function tulisGlyph(glyph) {
  const isi = rakitGlyph(glyph)
  mkdirSync(dir, { recursive: true })
  writeFileSync(dir + glyph.file + '.vue', isi)
  return { file: glyph.file, bytes: Buffer.byteLength(isi, 'utf8') }
}

/** Isi berkas yang sudah ada, untuk membandingkan sebelum menimpa. */
export function bacaLama(file) {
  try { return readFileSync(dir + file + '.vue', 'utf8') } catch { return null }
}

export { mass, massHollow, draw, grup, cat, dir }
