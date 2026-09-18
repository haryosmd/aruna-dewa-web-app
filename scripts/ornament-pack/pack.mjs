import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Impor pack ornamen hasil fitur ornament-builder menjadi komponen produksi.
 *
 * **Ini bukan penggambar; ini penerjemah.** Geometrinya sudah ada dan sudah divalidasi di
 * pack — 92 glyph original yang selama ini menganggur di `docs/`, yang seluruhnya
 * ter-gitignore, jadi ia hanya hidup di satu mesin dan tidak punya salinan di remote. Yang
 * kurang cuma satu hal: tidak ada yang pernah memindahkannya ke `apps/web`.
 *
 * Yang dikerjakan berkas ini persis tiga: menyalin isi `<svg>` apa adanya, menukar
 * `currentColor` dengan ramp empat stop milik tema, dan menuliskan entri banknya. Bentuknya
 * tidak disentuh sama sekali — kalau sebuah glyph terlihat salah, yang diperbaiki adalah SVG
 * sumbernya di `packs/`, lalu impor dijalankan ulang.
 *
 * **Penandanya berbeda dari forge, dan itu batas yang dijaga tes.** Glyph forge boleh ditimpa
 * `pnpm ornament:forge --tulis` kapan saja; glyph pack tidak boleh, karena sumbernya bukan
 * resep melainkan berkas SVG. `forge-idempotent.spec.ts` menegakkan bahwa kedua himpunan itu
 * tidak pernah beririsan.
 */

export const PENANDA = 'diimpor oleh scripts/ornament-pack'

const akar = fileURLToPath(new URL('../../', import.meta.url))
const tujuan = `${akar}apps/web/components/ornament/`

/** Pack yang ikut diimpor, beserta awalan id dan nama komponennya. */
export const packs = ['melati', 'kayon', 'sunda', 'sekar']

/**
 * Slot ladang untuk glyph berkategori `layer`.
 *
 * Dipetakan dengan tangan dan bukan ditebak dari rasio: slot menentukan JANGKAR keping di
 * dalam section (`bloom` bertumpu di tepi bawah, `cascade` menggantung dari atas), dan itu
 * sifat komposisi, bukan sifat kotak pembatas. Glyph layer yang tidak ada di sini tetap
 * diimpor sebagai kolam, hanya saja belum bisa dipakai sebuah tema.
 */
const slotLayer = {
  // Dipasangkan menurut RASIO viewBox-nya, bukan menurut nama. `OrnamentField` memakai
  // `--iv-piece` sebagai lebar dan `ratio` entri sebagai aspek, jadi keping persegi yang
  // dipasang di slot selebar 460px tumbuh setinggi 460px juga — `melati-layer-mekar` di slot
  // `bloom` menutupi nama pasangan. Slot lama: bloom 1,85 · cascade 0,54 · crown 2,4 ·
  // cluster 1,0 · swag 2,7.
  'melati-layer-karangan': 'bloom',
  'melati-layer-mekar': 'bloom',
  'melati-layer-untai-tunggal': 'cascade',
  'melati-layer-ronce-gantung': 'cascade',
  'melati-layer-untaian': 'crown',
  'melati-layer-rumpun': 'cluster',
  'kayon-layer-rumpun-kayon': 'bloom',
  'kayon-layer-kayon-tunggal': 'cascade',
  'kayon-layer-pita-medalion': 'crown',
  'kayon-layer-patran-gantung': 'crown',
  'kayon-layer-dedaunan': 'cluster',
  'kayon-layer-sulur-mawar': 'swag',
  'sunda-layer-dedaunan': 'cluster',
  // Pack `sekar` menggambar kelimanya lengkap, jadi temanya tidak perlu meminjam satu slot pun
  // seperti `aruna-bloom` meminjam `swag` dari botanical.
  'sekar-layer-mekar': 'bloom',
  'sekar-layer-jatuh': 'cascade',
  'sekar-layer-mahkota': 'crown',
  'sekar-layer-rumpun': 'cluster',
  'sekar-layer-untai': 'swag',
}

const pascal = (s) => s.split(/[^a-z0-9]+/i).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('')

/**
 * Menukar `currentColor` dengan ramp ornamen.
 *
 * Badan bermassa memakai `body`, lapisan garis memakai `deep` — aturan DESIGN.md yang sama
 * yang dipakai forge: *"Aksen adalah massa; garis adalah `deep`."* Cadangan `currentColor`
 * wajib ikut, karena empat belas tempat di undangan memaksa `color:` sendiri dan tidak tahu
 * apa-apa tentang ramp ini.
 */
function warnai(svg) {
  return svg
    .replace(/stroke="currentColor"/g, 'stroke="var(--iv-orn-deep, currentColor)"')
    .replace(/fill="currentColor"/g, 'fill="var(--iv-orn-body, currentColor)"')
}

/**
 * Ketebalan garis target tiap pack.
 *
 * **Diseragamkan, dan itu syarat masuk, bukan selera.** `gerbangKohesi` menuntut seluruh
 * glyph satu tema berbagi SATU ketebalan garis, dan `ornament-variants.spec.ts` mengukur
 * ulang tiap kandidat kolam dengan mesin yang sama. Pack digambar dengan ketebalan yang
 * berbeda-beda — `melati-sudut-melati` sendirian memakai 3,4 dan 2,5 — jadi tanpa langkah ini
 * tidak ada satu pun tema yang bisa dibangun darinya.
 *
 * Yang hilang lebih sedikit daripada yang terlihat: hierarki garis di pack ini sudah dibawa
 * `opacity` (detail halus memakai 0,45), bukan oleh ketebalan. Itu juga cara forge
 * membedakannya — satu `p.stroke` per tema untuk semua garis.
 *
 * `sekar` 3,2 dan angkanya dipilih supaya kolamnya TIDAK bercampur. Kolam varian harus disjoint
 * antar tema hidup dan seketebalan temanya sendiri (`ornament-variants.spec.ts`); pada 3 ia akan
 * seketebalan bloom, pada 3,5 seketebalan wastra dan pelita — dan kolam yang bisa dicampur
 * adalah kolam yang cepat atau lambat akan dicampur. 3,2 membuat tema ini hanya bisa menarik
 * dari packnya sendiri, yang memang membawa dua kandidat untuk keempat slotnya.
 */
const strokePack = { melati: 3, kayon: 3.5, sunda: 3, sekar: 3.2 }

/**
 * Menyesuaikan penulisan markup dengan aturan lint repo.
 *
 * SVG pack ditulis rapat (`<path d="…"/>`), sementara `vue/html-closing-bracket-spacing`
 * menuntut spasi sebelum kurung tutup elemen kosong. Dikerjakan di sini dan bukan dengan
 * `eslint --fix` pada hasilnya, karena hasilnya dibangkitkan: perbaikan apa pun di sana akan
 * hilang pada impor berikutnya.
 */
const rapikan = (svg) => svg.replace(/([^\s])\/>/g, '$1 />')

/** Menyeragamkan `stroke-width` sebuah SVG ke ketebalan target packnya. */
function seragamkanGaris(svg, pack) {
  return svg.replace(/stroke-width="[\d.]+"/g, `stroke-width="${strokePack[pack] ?? 3}"`)
}

/** Isi `<svg>` sebuah berkas pack, tanpa `<title>` dan atribut yang tidak dipakai bank. */
function isiSvg(raw) {
  const buka = raw.match(/<svg[^>]*>/)
  const viewBox = (buka[0].match(/viewBox="([^"]+)"/) || [])[1]
  const dalam = raw.slice(raw.indexOf('>', raw.indexOf('<svg')) + 1, raw.lastIndexOf('</svg>'))
  return { viewBox, dalam: dalam.replace(/<title[^>]*>[\s\S]*?<\/title>/g, '').trim() }
}

export function impor({ tulis = false } = {}) {
  const hasil = []
  for (const pack of packs) {
    const dir = `${akar}packs/${pack}/`
    const katalog = JSON.parse(readFileSync(`${dir}catalog.json`, 'utf8'))
    const berkas = new Set(readdirSync(`${dir}svg`).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)))

    for (const aset of katalog.assets) {
      // Pack sunda menamai asetnya `sunda-angklung` di katalog tapi `angklung.svg` di disk.
      // Dicocokkan dua arah supaya penamaan pack yang berbeda tidak diam-diam melewatkan glyph.
      const nama = berkas.has(aset.id)
        ? aset.id
        : berkas.has(aset.id.replace(`${pack}-`, '')) ? aset.id.replace(`${pack}-`, '') : null
      if (!nama) continue
      const raw = readFileSync(`${dir}svg/${nama}.svg`, 'utf8')
      const mentah = isiSvg(raw)
      const viewBox = mentah.viewBox
      const dalam = rapikan(warnai(seragamkanGaris(mentah.dalam, pack)))
      const [, , w, h] = viewBox.split(/\s+/).map(Number)

      // Id pack sudah diawali nama packnya sendiri di sebagian katalog (`sunda-*`); jangan
      // menggandakannya, karena id bank adalah kunci publik yang masuk `theme.ts`.
      const id = aset.id.startsWith(`${pack}-`) ? aset.id : `${pack}-${aset.id}`
      const file = pascal(id)

      /*
       * Rujukan kultural ikut ke komentar komponen, dan itu bukan basa-basi:
       * `ornament-quality.spec.ts` menolak komentar yang menyebut upacara, lambang, atau
       * makna tanpa membawa sumbernya di komentar yang sama. `culturalRole` di katalog pack
       * adalah klaim seperti itu, jadi ia hanya boleh ikut bersama berkas budaya dan tanggal
       * periksanya.
       */
      const periksa = aset.provenance?.checkedAt
      const sumber = `Peran kultural dirujuk \`packs/${pack}/CULTURE.md\``
        + (periksa ? `; diperiksa ${periksa}.` : '.')

      const isi = `<script setup lang="ts">
/**
 * ${aset.name} — ${aset.culturalRole ?? 'ornamen'}, pack ${pack}.
 *
 * ${sumber}
 *
 * ${PENANDA} dari \`packs/${pack}/svg/${aset.id}.svg\`; jangan sunting berkas ini dengan
 * tangan — ubah SVG sumbernya lalu jalankan \`pnpm ornament:pack --tulis\`.
 */
</script>

<template>
  <svg viewBox="${viewBox}" fill="var(--iv-orn-body, currentColor)" aria-hidden="true">
    ${dalam}
  </svg>
</template>
`
      hasil.push({ pack, id, file, kategori: aset.category, ratio: w / h, w, h, slot: slotLayer[id], isi, bytes: Buffer.byteLength(isi, 'utf8'), nama: aset.name })
      if (tulis) {
        mkdirSync(tujuan, { recursive: true })
        writeFileSync(`${tujuan}${file}.vue`, isi)
      }
    }
  }
  return hasil
}

/** Awal dan akhir blok entri pack di dalam `ornamentBank`. */
const MULAI = '  /* ── pack: diimpor scripts/ornament-pack — jangan sunting tangan ── */'
const SELESAI = '  /* ── /pack ── */'

/**
 * Menulis ulang blok entri pack di `apps/web/utils/ornaments.ts`.
 *
 * Diganti seluruhnya, bukan ditambahi, dan itu yang memberi idempotensi: menjalankan ulang
 * impor setelah sebuah glyph dicabut dari `packs/` membuat entrinya ikut lenyap, dan tiap
 * tema yang masih menunjuknya langsung jadi error typecheck alih-alih regresi visual senyap.
 *
 * Entrinya ditulis sebagai literal objek — `bacaBank()` di `verify.mjs` membacanya dengan
 * regex, jadi bentuk penulisannya adalah bagian dari kontrak, bukan selera.
 */
export function tulisBank(hasil) {
  const berkas = `${akar}apps/web/utils/ornaments.ts`
  const src = readFileSync(berkas, 'utf8')

  const baris = hasil.map((h) => {
    const slot = h.slot ? `, slot: '${h.slot}'` : ''
    const rasio = Number.isInteger(h.ratio) ? String(h.ratio) : `${h.w} / ${h.h}`
    return `  '${h.id}': { component: 'Ornament${h.file}', name: '${h.nama.replace(/'/g, "\\'")}', category: '${h.kategori}', ratio: ${rasio}${slot} },`
  })

  const blok = [MULAI, ...baris, SELESAI].join('\n')
  const awal = src.indexOf(MULAI)
  const akhir = src.indexOf(SELESAI)

  const keluar = awal >= 0 && akhir > awal
    ? src.slice(0, awal) + blok + src.slice(akhir + SELESAI.length)
    : src.replace('} as const satisfies Record<string, OrnamentEntry>', `${blok}\n} as const satisfies Record<string, OrnamentEntry>`)

  writeFileSync(berkas, keluar)
  return baris.length
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tulis = process.argv.includes('--tulis')
  const hasil = impor({ tulis })
  if (tulis) console.log(`entri bank: ${tulisBank(hasil)}`)
  for (const h of hasil) console.log(`${h.id.padEnd(30)} ${h.file.padEnd(28)} ${h.kategori.padEnd(9)} ${String(h.bytes).padStart(6)}B`)
  console.log(`\n${hasil.length} glyph${tulis ? ' ditulis' : ' (uji kering — pakai --tulis)'}`)
}
