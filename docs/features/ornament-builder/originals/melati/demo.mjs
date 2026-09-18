#!/usr/bin/env node
/**
 * Perakit demo offline pack Ronce Melati.
 *
 * SVG di-inline, bukan dipasang lewat `<img>`, karena `currentColor` hanya bekerja pada SVG
 * yang benar-benar ada di dalam dokumen. Konsekuensinya: sebuah glyph yang muncul dua kali
 * membawa `id` yang sama dua kali, dan itu HTML yang tidak sah sekaligus membuat
 * `clip-path: url(#…)` menunjuk ke elemen yang salah. Tiap penyisipan karena itu diberi
 * akhiran instance, dan `validate.mjs` menguji tabrakan id di sisi berkas aslinya.
 *
 * Jalankan setelah `build.mjs`:
 *   rtk proxy node docs/features/ornament-builder/originals/melati/demo.mjs
 */

import { copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEMO = join(HERE, 'demo')
const catalog = JSON.parse(readFileSync(join(HERE, 'catalog.json'), 'utf8'))

/**
 * Pack impor Canva ditampilkan di halaman yang sama, tapi **di seksinya sendiri dan dengan
 * peringatannya sendiri**. Ia tidak boleh masuk `catalog.json` pack melati: seluruh klaim
 * pack itu adalah "digambar dari nol", dan satu aset impor yang menyelinap ke dalamnya
 * membuat provenance 45 glyph lainnya ikut tidak bisa dipercaya.
 */
const IMPORTED_ROOT = join(HERE, '..', '..', 'imported')
const IMPORTED_HREF = '../../../imported'
const importedPacks = readdirSync(IMPORTED_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== 'lib')
  .map((e) => e.name)
  .sort()
  .flatMap((name) => {
    try {
      return [{ name, dir: join(IMPORTED_ROOT, name), catalog: JSON.parse(readFileSync(join(IMPORTED_ROOT, name, 'catalog.json'), 'utf8')) }]
    } catch {
      return []
    }
  })
const importedCount = importedPacks.reduce((n, p) => n + p.catalog.assets.length, 0)

const esc = (v) => String(v)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

let counter = 0

/**
 * Sisipkan satu glyph sebagai SVG dekoratif.
 * Dekoratif berarti: `aria-hidden`, tidak bisa difokus, tidak punya nama aksesibel, dan
 * tidak menangkap pointer (`.orn` di CSS). Namanya dibaca dari teks di sekitarnya.
 */
function inline(id, { className = '', style = '', depth = null, sway = false, reveal = false, dir = null } = {}) {
  const suffix = `i${++counter}`
  let svg = readFileSync(join(dir || join(HERE, 'svg'), `${id}.svg`), 'utf8').trim()
  svg = svg
    .replace(/ role="img"/, '')
    .replace(/ aria-labelledby="[^"]*"/, ' aria-hidden="true" focusable="false"')
    .replace(/<title[^>]*>.*?<\/title>/, '')
    .replace(/id="([^"]+)"/g, (_, value) => `id="${value}-${suffix}"`)
    .replace(/url\(#([^)]+)\)/g, (_, value) => `url(#${value}-${suffix})`)
  const classes = ['orn', className, sway ? 'sway' : '', reveal ? 'reveal' : '', depth !== null ? 'depth' : '']
    .filter(Boolean).join(' ')
  const attrs = [`class="${classes}"`, 'aria-hidden="true"']
  if (style) attrs.push(`style="${style}"`)
  if (depth !== null) attrs.push(`data-depth="${depth}"`)
  return `<span ${attrs.join(' ')}>${svg}</span>`
}

const byCategory = new Map()
for (const asset of catalog.assets) {
  if (!byCategory.has(asset.category)) byCategory.set(asset.category, [])
  byCategory.get(asset.category).push(asset)
}

const CATEGORY_LABEL = {
  frame: 'Bingkai', divider: 'Pemisah', corner: 'Sudut', floral: 'Flora',
  layer: 'Keping ladang', monogram: 'Monogram', motif: 'Motif', symbol: 'Lambang',
  seal: 'Segel', venue: 'Tempat',
}

const gallery = [...byCategory.entries()].map(([category, assets]) => `
      <div class="group-head">
        <h3>${esc(CATEGORY_LABEL[category] || category)}</h3>
        <span>${assets.length} glyph</span>
      </div>
      <div class="gallery">
        ${assets.map((a) => `<figure class="tile">
          <div class="frame-box">${inline(a.id)}</div>
          <dl>
            <dt>${esc(a.name)}</dt>
            <dd>${esc(a.id)}</dd>
            <dd>${a.variants[0].width}×${a.variants[0].height} · ${esc(a.culturalRole)}</dd>
          </dl>
        </figure>`).join('\n        ')}
      </div>`).join('\n')

/**
 * Seksi impor. Aset vektornya di-inline seperti glyph lain; dua rangkaian mawar dipasang
 * sebagai `<img>` karena ia memang raster — bunganya bitmap di dalam SVG sumbernya.
 */
const importedSection = !importedPacks.length ? '' : `
  <section class="scene wrap" id="impor">
    <p><a href="referensi/index.html"><strong>Buka bank ornamen sesuai PNG — 65 aset SVG/PNG dan varian warna</strong></a></p>
    <h2>Impor dari Canva — ${importedCount} aset</h2>
    <p class="warn">
      <strong>Bukan aset original.</strong> Geometri di seksi ini milik ${importedPacks.length} template Canva,
      diekspor pemilik dari akun Canva Pro-nya. Tidak satu koordinat pun diubah — itu memang
      tujuannya — tapi status lisensinya berbeda dari ${catalog.assets.length} glyph original di halaman ini.
      Baca <code>imported/&lt;pack&gt;/PROVENANCE.md</code> sebelum memakainya di produksi.
    </p>
${importedPacks.map((pack) => `
    <div class="group-head">
      <h3>${esc(pack.catalog.name)}</h3>
      <span>${pack.catalog.assets.length} aset · ${esc(pack.catalog.origin.template)}</span>
    </div>
    <div class="gallery">
      ${pack.catalog.assets.map((a) => {
        const svgVariant = a.variants.find((v) => v.format === 'svg')
        const raster = a.variants.find((v) => v.format === 'webp')
        const box = svgVariant
          ? inline(a.id, { dir: join(pack.dir, 'svg') })
          : `<img class="orn" src="${IMPORTED_HREF}/${pack.name}/${raster.file}" alt="" aria-hidden="true" width="${raster.width}" height="${raster.height}" loading="lazy">`
        const shown = svgVariant || raster
        const split = a.tags.includes('pecahan') ? ' · dipecah' : ''
        return `<figure class="tile imported">
          <div class="frame-box">${box}</div>
          <dl>
            <dt>${esc(a.name)}</dt>
            <dd>${esc(a.id)}</dd>
            <dd>${shown.width}×${shown.height} · ${a.variants.map((v) => v.format).join('/')}${split}</dd>
          </dl>
        </figure>`
      }).join('\n      ')}
    </div>`).join('\n')}
  </section>`

const motionRows = [
  ['Ease masuk', 'power1.out', 'Lima dari sembilan klip Canva, residual RMS terkecil'],
  ['Durasi masuk', '0,9 detik', 'Median segmen utama dibagi jumlah keping per adegan'],
  ['Stagger', '0,5 detik', '<code>t50</code> klip botanical, dua selang berturut-turut'],
  ['Keping ber-reveal per adegan', 'maksimal 4', '0,5 × 3 + 0,9 = 2,4 detik, tepat di bawah anggaran 2,5 detik'],
  ['Sway flora', '±1,5° · 6 detik · sine.inOut', 'Pilihan, bukan hasil ukur — amplitudo tidak terpisahkan dari opacity'],
  ['Parallax', '8–16 px', 'Pilihan'],
  ['Zona teks', 'tidak dianimasikan', 'Densitas gerak 0,00 di zona teks klip botanical'],
].map(([k, v, why]) => `<tr><td>${k}</td><td><strong>${v}</strong></td><td>${why}</td></tr>`).join('\n          ')

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ronce Melati — demo pack ornamen Aruna Dewa</title>
<meta name="description" content="Demo offline pack ornamen original Ronce Melati: ${catalog.assets.length} glyph SVG bermassa, dengan resep motion dari pengukuran${importedCount ? `, plus ${importedCount} aset impor Canva yang ditandai terpisah` : ''}.">
<link rel="stylesheet" href="style.css">
</head>
<body>
<button id="motion-toggle" type="button" hidden aria-pressed="false">Jeda animasi</button>

<header class="cover scene">
  <div class="field" aria-hidden="true">
    ${inline('layer-ronce-gantung', { style: 'top:0;left:4%;width:26%', depth: 10, sway: true })}
    ${inline('layer-untai-tunggal', { style: 'top:0;right:7%;width:12%', depth: 14, sway: true })}
    ${inline('sudut-sulur', { style: 'bottom:2%;left:2%;width:22%', depth: 8 })}
    ${inline('sudut-ronce', { style: 'bottom:2%;right:2%;width:22%;rotate:90deg', depth: 8 })}
  </div>
  <div class="cover-frame">
    ${inline('bingkai-ronce', { reveal: true })}
    <div class="cover-text">
      <p class="eyebrow">Pack ornamen original</p>
      <h1 class="names">Ronce<br>Melati</h1>
      <p class="meta">${catalog.assets.length} glyph · ${byCategory.size} keluarga · digambar 2026-09-17</p>
    </div>
  </div>
</header>

<main>
  <section class="scene wrap" id="kenapa">
    <h2>Kenapa bentuknya begini</h2>
    <p class="lede">
      Satuan dasar pack ini adalah <strong>kuncup</strong>, bukan bunga mekar — karena ronce melati
      memang dirangkai dari kuncup. Sebuah untaian yang digambar dengan bunga mekar akan salah
      sejak satuannya. Uraian sumbernya ada di <code>CULTURE.md</code>.
    </p>
    ${inline('pemisah-ronce', { className: 'rule', reveal: true })}
    <div class="cards">
      <article class="card">
        ${inline('sudut-sulur', { className: 'corner tl' })}
        <h3>Bermassa, bukan outline</h3>
        <p>Badan bentuk <code>data-mass</code>, detail bergaris <code>data-draw</code> 2,5–4 satuan viewBox,
        dua bidang nilai per glyph. Aturan yang sama dengan ornamen aplikasi.</p>
      </article>
      <article class="card">
        ${inline('sudut-melati', { className: 'corner tl' })}
        <h3>Satu kosakata</h3>
        <p>Kuncup, kelopak, pita, daun, dan sulur yang sama dipakai ulang di ${catalog.assets.length} glyph,
        karena semuanya lahir dari satu generator.</p>
      </article>
      <article class="card">
        ${inline('sudut-kantil', { className: 'corner tl' })}
        <h3>Ornamen bergerak, teks tidak</h3>
        <p>Diukur, bukan diasumsikan: satu klip referensi mencatat gerak <strong>0,00</strong> di zona teksnya.</p>
      </article>
    </div>
  </section>

  <section class="scene wrap" id="acara">
    <div class="field" aria-hidden="true">
      ${inline('tangkai-melati', { style: 'top:6%;left:-2%;width:18%', depth: 12, sway: true })}
      ${inline('tangkai-kenanga', { style: 'bottom:4%;right:-1%;width:18%', depth: 16, sway: true })}
    </div>
    <h2>Akad &amp; Resepsi</h2>
    <p class="lede">Teks contoh. Semua nama, tanggal, dan tempat di halaman ini fiktif dan hanya untuk
    menguji bahwa ornamen tidak pernah menutupi bacaan.</p>
    <div class="cards">
      <article class="card">
        ${inline('pendopo-joglo', { className: 'corner br' })}
        <h3>Akad nikah</h3>
        <p>Sabtu, 12 September 2026 · 08.00 WIB<br>Pendopo Tamansari, Yogyakarta</p>
      </article>
      <article class="card">
        ${inline('payung-teduh', { className: 'corner br' })}
        <h3>Resepsi</h3>
        <p>Sabtu, 12 September 2026 · 11.00 WIB<br>Pendopo Tamansari, Yogyakarta</p>
      </article>
    </div>
    ${inline('pemisah-kenanga', { className: 'rule', reveal: true })}
  </section>

  <section class="scene wrap" id="motion">
    <h2>Resep motion, dan dari mana angkanya</h2>
    <p class="lede">
      Tidak satu pun angka di tabel ini dipilih karena terasa enak. Yang terukur diberi sumbernya;
      yang memang pilihan ditulis sebagai pilihan.
    </p>
    <table>
      <thead><tr><th scope="col">Parameter</th><th scope="col">Nilai</th><th scope="col">Dari mana</th></tr></thead>
      <tbody>
          ${motionRows}
      </tbody>
    </table>
  </section>

${importedSection}

  <section class="scene wrap" id="galeri">
    <h2>Seluruh ${catalog.assets.length} glyph</h2>
    <p class="lede">Dikelompokkan menurut keluarga <code>DESIGN.md</code>. Tiap keping memakai
    <code>currentColor</code>, jadi warnanya mengikuti teks di sekitarnya.</p>
${gallery}
  </section>
</main>

<footer class="wrap">
  <p>
    Demo lokal, offline, bukan route aplikasi. Pack ini <strong>belum</strong> dipasang sebagai tema —
    lihat <code>docs/ROADMAP.md</code> fase 31. Huruf demo memakai Georgia/Arial bawaan sistem;
    tidak ada biner font yang disalin ke sini.
  </p>
  <p>
    Provenance tiap aset: <code>catalog.json</code> · sumber budaya: <code>CULTURE.md</code> ·
    pengukuran motion: <code>../../sources/canva/MOTION-DALAM.md</code>
  </p>
</footer>

<script src="gsap.min.js"></script>
<script src="motion.js"></script>
</body>
</html>
`

writeFileSync(join(DEMO, 'index.html'), html)
copyFileSync(join(HERE, '..', 'sunda', 'demo', 'gsap.min.js'), join(DEMO, 'gsap.min.js'))
console.log(`demo/index.html ditulis · ${counter} penyisipan SVG · ${catalog.assets.length} aset original${importedCount ? ` + ${importedCount} aset impor dari ${importedPacks.length} template` : ''}`)
