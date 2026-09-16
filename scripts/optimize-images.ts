/**
 * Membuat varian kecil foto landing dari berkas aslinya.
 *
 * Enam berkas di `apps/web/public/images` dipakai dua kali dengan tuntutan yang bertolak
 * belakang. Di landing mereka jadi cover kartu tema: lebar sekitar 272 px, `opacity-45`,
 * tertutup gradient. Di `/i/demo` berkas yang SAMA jadi foto undangan sungguhan — cover
 * selebar viewport, galeri, dan cerita (`apps/web/composables/useDocument.ts`). Mengecilkan
 * berkas aslinya akan menghemat landing sambil merusak etalase produk, jadi yang dibuat di
 * sini adalah salinan kecil, dan yang asli tidak pernah disentuh.
 *
 * Jalankan: `pnpm images:optimize`
 * WAJIB dijalankan ulang setiap kali ada berkas di `images/` yang diganti atau ditambah.
 *
 * Keluarannya di-commit seperti aset lain — tidak ada langkah build yang membuatnya, dan
 * landing akan 404 kalau berkasnya hilang.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const SOURCE = 'apps/web/public/images'

/**
 * Dua tingkat, karena keduanya tayang dengan cara yang berbeda.
 *
 * Cover kartu tema tayang `opacity-45` di balik gradient pada lebar ~272 px; 700 px sudah
 * memberi ruang untuk layar 2x, dan `quality: 65` tidak terlihat di balik lapisan itu.
 * Hero tayang penuh, tanpa lapisan apa pun, dan dialah elemen LCP halaman — 900 px cukup
 * untuk bingkai `max-w-md` di layar 2x, dan `quality: 80` menjaga wajah tetap bersih.
 *
 * Sumbernya webp lossy, jadi ini encode generasi kedua. Itu sebabnya hero tidak ikut turun
 * ke 65: kehilangan generasi kedua baru terlihat kalau gambarnya memang dipandang.
 */
const CARD = { width: 700, quality: 65 }
const HERO = { width: 900, quality: 80 }

/** Keenam berkas yang dipakai `themePresentation.cover` di `apps/web/utils/theme.ts`. */
const covers = ['adat-jawa', 'couple', 'hero', 'rings', 'rumah-gadang', 'venue']

function kb(bytes: number) {
  return `${Math.round(bytes / 1024)} KB`
}

async function variant(name: string, destination: string, { width, quality }: { width: number, quality: number }) {
  const source = join(SOURCE, `${name}.webp`)
  if (!existsSync(source)) throw new Error(`${source} tidak ada.`)

  const input = readFileSync(source)
  // `withoutEnlargement` supaya berkas yang sudah lebih kecil dari target tidak dibesarkan
  // dan kehilangan ketajaman tanpa alasan.
  const out = await sharp(input)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toBuffer()

  writeFileSync(destination, out)
  const saved = Math.round((1 - out.byteLength / input.byteLength) * 100)
  console.log(`  ✓ ${destination.replace('apps/web/public', '')} — ${kb(input.byteLength)} → ${kb(out.byteLength)} (−${saved}%)`)
  return { before: input.byteLength, after: out.byteLength }
}

async function main() {
  const cardDir = join(SOURCE, 'card')
  mkdirSync(cardDir, { recursive: true })

  let before = 0
  let after = 0

  console.log(`Cover kartu tema — ${CARD.width} px, quality ${CARD.quality}:`)
  for (const name of covers) {
    const size = await variant(name, join(cardDir, `${name}.webp`), CARD)
    before += size.before
    after += size.after
  }

  console.log(`\nHero landing — ${HERO.width} px, quality ${HERO.quality}:`)
  const hero = await variant('hero', join(SOURCE, 'hero-landing.webp'), HERO)
  before += hero.before
  after += hero.after

  console.log(`\nJalur kritis landing: ${kb(before)} → ${kb(after)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
