import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import sharp from 'sharp'

/**
 * Varian turunan aset referensi: ubin pemilih dan salinan ringan untuk tamu.
 *
 * **Kenapa ini ada, dan kenapa baru sekarang.** Sejak fase 58 keenam puluh lima aset ini
 * terdaftar di `ornamentBank` dan **tidak dirujuk satu baris pun** — tidak ada tema yang
 * memakainya, tidak ada kolam varian yang menawarkannya. Beratnya karena itu hanya biaya repo,
 * dan 24,11 MB adalah angka yang bisa didiamkan. Fase 59 membuka Studio Ornamen, dan sejak itu
 * mereka bisa sampai ke undangan yang terbit: beratnya berhenti jadi biaya kami dan mulai jadi
 * biaya kuota tamu. Satu pasangan yang memilih `ref-coklat-krim-wayang-pengantin` sebagai simbol
 * mengirim 1,8 MB ke tiap tamu yang membuka undangannya di jalan.
 *
 * Dua turunan, dua masalah yang berbeda:
 * - `ubin/` (240px) untuk grid pemilih, tempat 44 aset bisa tampil sekaligus.
 * - `web/` (1200px) untuk undangan itu sendiri. `ReferenceAsset.vue` merender yang ini.
 *
 * **Sumbernya `packs/referensi/`, bukan arsip di `docs/`.** `build.mjs` membaca
 * `docs/features/ornament-builder/imported/`, yang binernya di luar git — jadi di mesin lain
 * langkahnya tidak bisa diulang sama sekali. Berkas ini hanya butuh apa yang sudah ter-commit.
 *
 * Jalankan: `pnpm ornament:reference:turunkan` (atau ikut `pnpm ornament:reference`).
 */

const root = fileURLToPath(new URL('../../', import.meta.url))
const pack = join(root, 'packs/referensi')
const publicDir = join(root, 'apps/web/public/ornaments/referensi')

/** Lebar ubin pemilih. Grid Studio tidak pernah merender aset lebih lebar dari ini. */
export const lebarUbin = 240
/**
 * Lebar salinan yang dikirim ke tamu, diturunkan dari lebar tayang sebenarnya — bukan angka bulat.
 *
 * Tempat render terbesar di undangan adalah keping ladang `OrnamentField`, yang bisa sampai
 * 600px CSS. Aset referensi **tidak boleh** masuk ke sana (`toOrnamentOverrides()` menolaknya
 * karena kelimanya berjumlah 6,43 MB dan diulang 2–6 kali per section), jadi tempat terbesar
 * yang tersisa adalah bingkai cover di sekitar 480px CSS. 960 menutupi itu pada layar 2×.
 *
 * Diukur: pada 1200 tiga aset terberat berjumlah 951 KB, pada 960 menjadi 713 KB. Selisihnya
 * tidak terlihat pada elemen selebar 480px, dan ia seperempat kuota tamu.
 */
export const lebarWeb = 960

async function webp(bytes, lebar, quality) {
  // `density` hanya berlaku untuk masukan SVG; sharp mengabaikannya untuk PNG. 150 cukup untuk
  // ubin dan menahan biaya rasterisasi berkas 600 KB yang penuh serpih terklip.
  return sharp(bytes, { density: 150 })
    .resize({ width: lebar, height: lebar * 4, fit: 'inside', withoutEnlargement: true })
    .webp({ quality, alphaQuality: 90, effort: 5 })
    .toBuffer()
}

export async function turunkan({ tulis = true } = {}) {
  const katalog = JSON.parse(readFileSync(join(pack, 'catalog.json'), 'utf8'))
  for (const dir of [join(pack, 'ubin'), join(pack, 'web'), join(publicDir, 'ubin'), join(publicDir, 'web')]) {
    mkdirSync(dir, { recursive: true })
  }

  let totalUbin = 0
  let totalWeb = 0
  let totalAsal = 0

  for (const aset of katalog.assets) {
    const asal = readFileSync(join(pack, aset.file))
    totalAsal += asal.length

    const ubin = await webp(asal, lebarUbin, 78)
    const web = await webp(asal, lebarWeb, 80)

    /*
     * Untuk SVG, yang dikirim adalah yang lebih kecil — bukan selalu vektornya.
     *
     * Aturan "vektor selalu menang" benar untuk SVG yang ditulis tangan; aset ini bukan itu.
     * Ekspor Canva tidak punya `<linearGradient>`, jadi gradasinya ditiru dengan ratusan serpih
     * terklip: `ref-emas-hitam-pita-sulur-kanan` 635 KB untuk satu pita. Di lebar tayang
     * sebenarnya, raster 1200px-nya jauh lebih ringan dan tidak terbedakan.
     */
    const pakaiVektor = aset.format === 'svg' && asal.length <= web.length
    const fileWeb = pakaiVektor ? aset.file : `${aset.id}.webp`
    const bytesWeb = pakaiVektor ? asal.length : web.length

    if (tulis) {
      writeFileSync(join(pack, 'ubin', `${aset.id}.webp`), ubin)
      writeFileSync(join(publicDir, 'ubin', `${aset.id}.webp`), ubin)
      if (!pakaiVektor) {
        writeFileSync(join(pack, 'web', fileWeb), web)
        writeFileSync(join(publicDir, 'web', fileWeb), web)
      }
    }

    aset.thumb = `ubin/${aset.id}.webp`
    aset.thumbBytes = ubin.length
    aset.web = pakaiVektor ? aset.file : `web/${fileWeb}`
    aset.webBytes = bytesWeb
    totalUbin += ubin.length
    totalWeb += bytesWeb
  }

  if (tulis) {
    writeFileSync(join(pack, 'catalog.json'), JSON.stringify(katalog, null, 2) + '\n')
    writeFileSync(join(root, 'apps/web/utils/ornament-reference.ts'), rakitRegistry(katalog.assets))
  }

  return { assets: katalog.assets, totalAsal, totalUbin, totalWeb }
}

/**
 * Registry yang diimpor `ornaments.ts`.
 *
 * Ditulis dari katalog, bukan dari proses impor, supaya `build.mjs` dan berkas ini tidak pernah
 * memancarkan bentuk yang berbeda. `asset` tetap menunjuk berkas penuh — ia yang dipakai saat
 * sebuah aset perlu dilihat utuh; `web` yang dikirim ke tamu dan `thumb` yang mengisi pemilih.
 */
export function rakitRegistry(assets) {
  const lines = assets.map(a => `  '${a.id}': { component: 'OrnamentReferenceAsset', name: ${JSON.stringify(a.name)}, category: '${a.category}', ratio: ${a.ratio}, asset: '/ornaments/referensi/${a.file}', format: '${a.format}'${a.slot ? `, slot: '${a.slot}'` : ''}, width: ${a.width}, height: ${a.height}, thumb: '/ornaments/referensi/${a.thumb}', webAsset: '/ornaments/referensi/${a.web}' },`)
  return `// Generated by scripts/ornament-reference/build.mjs. Fixed palette; source provenance in packs/referensi/catalog.json.\nexport const referenceOrnaments = {\n${lines.join('\n')}\n} as const\n`
}

const kb = n => `${(n / 1024).toFixed(0)} KB`

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await turunkan({ tulis: !process.argv.includes('--periksa') })
  console.log(`${r.assets.length} aset · asal ${kb(r.totalAsal)} → web ${kb(r.totalWeb)} (${Math.round((1 - r.totalWeb / r.totalAsal) * 100)}% lebih ringan) · ubin ${kb(r.totalUbin)}`)
}
