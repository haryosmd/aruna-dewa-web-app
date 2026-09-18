#!/usr/bin/env node
/**
 * Perakit demo offline pack Kayon.
 *
 * SVG di-inline, bukan lewat `<img>`, karena `currentColor` hanya bekerja pada SVG yang
 * benar-benar ada di dalam dokumen. Konsekuensinya satu glyph yang dipakai dua kali
 * membawa `id` yang sama dua kali — HTML tidak sah. Tiap penyisipan karena itu diberi
 * akhiran instance, dan `verify.mjs` menguji id ganda di DOM.
 *
 * Jalankan setelah `build.mjs`:
 *   rtk proxy node docs/features/ornament-builder/originals/kayon/demo.mjs
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEMO = join(HERE, 'demo')
const catalog = JSON.parse(readFileSync(join(HERE, 'catalog.json'), 'utf8'))

const esc = (v) => String(v)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

let counter = 0
/** Sisipkan glyph sebagai SVG dekoratif: aria-hidden, id di-namespace per instance. */
function inline(id, { cls = '', style = '', reveal = false, sway = false } = {}) {
  const suffix = `i${++counter}`
  let svg = readFileSync(join(HERE, 'svg', `${id}.svg`), 'utf8')
    .replaceAll(/\bid="([^"]+)"/g, (_, v) => `id="${v}-${suffix}"`)
    .replaceAll(/aria-labelledby="([^"]+)"/g, (_, v) => `aria-labelledby="${v}-${suffix}"`)
    .replace('role="img"', 'role="presentation" aria-hidden="true" focusable="false"')
  const klass = ['glyph', cls, reveal ? 'js-reveal' : '', sway ? 'js-sway' : ''].filter(Boolean).join(' ')
  return svg.replace('<svg ', `<svg class="${klass}"${style ? ` style="${style}"` : ''} `)
}

function tekstur(id) {
  return readFileSync(join(HERE, 'tekstur', `${id}.svg`), 'utf8')
    .replaceAll(/\bid="([^"]+)"/g, (_, v) => `id="${v}-t${++counter}"`)
    .replaceAll(/aria-labelledby="([^"]+)"/g, (_, v) => `aria-labelledby="${v}-t${counter}"`)
    .replace('role="img"', 'role="presentation" aria-hidden="true" focusable="false"')
}

/** Pita = ubin yang sama diulang mendatar dengan tinggi tetap, bukan satu ubin diregangkan. */
const pitaUbin = (n) => Array.from({ length: n }, () => tekstur('pita-medalion')).join('')

const byCategory = {}
for (const a of catalog.assets) (byCategory[a.category] ??= []).push(a)
const ORDER = ['frame', 'divider', 'corner', 'motif', 'layer', 'symbol', 'seal', 'monogram', 'floral']
const LABEL = {
  frame: 'Bingkai', divider: 'Pemisah', corner: 'Sudut', motif: 'Motif', layer: 'Keping ladang',
  symbol: 'Simbol', seal: 'Segel', monogram: 'Monogram', floral: 'Flora',
}

/* ── bungkus: tiruan susunan undangan, bukan salinan desainnya ──────────────── */
const bungkus = `
<section class="wrap" aria-labelledby="bungkus-judul">
  <h2 id="bungkus-judul">Bungkus</h2>
  <p class="lead">Susunan yang sama yang dipelajari dari referensi: pita medalion mengapit
    di kepala dan kaki, latar wash hangat, kartu kayon di tengah, rumpun kayon menahan tepi
    bawah. Teks dicat sejak awal dan tidak ikut dianimasikan.</p>
  <div class="kartu" data-scene>
    <div class="pita pita-atas" aria-hidden="true">${pitaUbin(14)}</div>
    <div class="isi">
      <p class="kicker">Undangan Pernikahan</p>
      <div class="bingkai">
        ${inline('bidang-kayon', { cls: 'bingkai-svg alas', reveal: true })}
        ${inline('bingkai-kayon-polos', { cls: 'bingkai-svg garis', reveal: true })}
        <div class="nama">
          <p class="nm">Daniel</p>
          <p class="amp">&amp;</p>
          <p class="nm">Samira</p>
          <p class="tgl">20 · Des · 2027</p>
        </div>
      </div>
      <div class="sudut sudut-kiri">${inline('sudut-mawar', { reveal: true, sway: true })}</div>
      <div class="sudut sudut-kanan">${inline('layer-sulur-mawar', { reveal: true, sway: true })}</div>
    </div>
    <div class="rumpun" aria-hidden="true">
      <span class="tumpuk">${inline('bidang-rumpun-kayon', { cls: 'alas', reveal: true })}${inline('layer-rumpun-kayon', { cls: 'garis', reveal: true })}</span>
      <span class="tumpuk balik">${inline('bidang-rumpun-kayon', { cls: 'alas', reveal: true })}${inline('layer-rumpun-kayon', { cls: 'garis', reveal: true })}</span>
    </div>
    <div class="pita pita-bawah" aria-hidden="true">${pitaUbin(14)}</div>
  </div>
</section>`

/* ── galeri ────────────────────────────────────────────────────────────────── */
const galeri = ORDER.map((cat) => `
<section class="kategori" aria-labelledby="kat-${cat}">
  <h3 id="kat-${cat}">${LABEL[cat]} <span class="hitung">${byCategory[cat].length}</span></h3>
  <ul class="grid">
    ${byCategory[cat].map((a) => `
    <li class="sel">
      <div class="panggung">${inline(a.id, { reveal: true })}</div>
      <p class="nama-glyph">${esc(a.name)}</p>
      <p class="meta"><code>${esc(a.id)}</code></p>
      <p class="meta">${esc(a.variants[0].width)}×${esc(a.variants[0].height)} · ${esc(a.motion.preset)}
        · ${esc(a.motion.ease)}${a.motion.duration ? ` · ${String(a.motion.duration).replace('.', ',')} s` : ''}</p>
      <p class="meta lapis">lapis: ${a.layers.map(esc).join(' · ')} · jangkar: ${esc(a.anchor)}</p>
    </li>`).join('')}
  </ul>
</section>`).join('')

const teksturBagian = `
<section class="kategori" aria-labelledby="kat-tekstur">
  <h3 id="kat-tekstur">Tekstur latar <span class="hitung">${catalog.tekstur.length}</span></h3>
  <p class="lead">Ini <strong>bukan</strong> ornamen. <code>DESIGN.md</code>: tekstur dipasang sebagai
    <code>mask-image</code> pada <code>.iv-section::before</code> dan diwarnai
    <code>--iv-accent</code> saat runtime; ia tidak bisa <code>currentColor</code> dan tidak boleh
    di-DrawSVG. Karena itu ia hidup di <code>tekstur/</code>, di luar <code>ornamentBank</code>.</p>
  <ul class="grid grid-tekstur">
    ${catalog.tekstur.map((t) => `
    <li class="sel">
      <div class="panggung panggung-ubin">${tekstur(t.id)}</div>
      <p class="nama-glyph">${esc(t.name)}</p>
      <p class="meta"><code>${esc(t.file)}</code></p>
      <p class="meta">${esc(t.catatan)}</p>
    </li>`).join('')}
  </ul>
</section>`

/* ── panel motion ──────────────────────────────────────────────────────────── */
const r = catalog.motionRecipe
const motionBagian = `
<section class="kategori" aria-labelledby="kat-motion">
  <h3 id="kat-motion">Resep motion</h3>
  <p class="lead">Angka di tabel ini diukur dari klip referensi, bukan dipilih.
    Sumbernya <code>${esc(r.source)}</code>.</p>
  <table>
    <caption>Yang terukur, dan apa artinya di pack ini</caption>
    <tbody>
      <tr><th scope="row">Ease gestur</th><td>${esc(r.ease)}</td></tr>
      <tr><th scope="row">Durasi gestur</th><td>${esc(r.durasiGestur)}</td></tr>
      <tr><th scope="row">Jarak antar-gestur</th><td>${esc(r.jarakAntarGestur)}</td></tr>
      <tr><th scope="row">Pangsa diam</th><td>${esc(r.pangsaDiam)}</td></tr>
      <tr><th scope="row">Zona teks</th><td>tidak dianimasikan</td></tr>
    </tbody>
  </table>
  <p class="lead"><button type="button" id="jeda" aria-pressed="false">Jeda gerak ambient</button>
    <span id="status-motion" role="status"></span></p>
</section>`

const palet = catalog.palette
const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pack Kayon — ${catalog.assets.length} ornamen original</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<a class="lewati" href="#galeri">Lewati ke galeri</a>
<header>
  <p class="eyebrow">Aruna Dewa · pack ornamen original</p>
  <h1>Kayon</h1>
  <p class="lead">${esc(catalog.name)}. ${catalog.assets.length} glyph SVG dan
    ${catalog.tekstur.length} ubin tekstur, seluruhnya dihitung secara parametrik
    di <code>geometry.mjs</code> — tidak ada path, piksel, atau aset referensi yang disalin ke sini.</p>
  <ul class="palet">
    ${['paper', 'ink', 'tan', 'rose'].map((k) => `
    <li><span class="swatch" style="background:${esc(palet[k])}"></span>
      <code>${esc(palet[k])}</code> <span class="meta">${k}</span></li>`).join('')}
  </ul>
  <p class="meta">${esc(palet.note)}</p>
</header>
<main>
${bungkus}
${motionBagian}
<div id="galeri">
${galeri}
${teksturBagian}
</div>
</main>
<footer>
  <p class="meta">Dibangun ${esc(catalog.builtAt)} · skema katalog v${catalog.schemaVersion} ·
    pemakaian: <code>${esc(catalog.scope)}</code>. Demo ini offline: GSAP disalin lokal,
    tidak ada permintaan jaringan.</p>
</footer>
<script src="gsap.min.js"></script>
<script src="motion.js"></script>
</body>
</html>`

writeFileSync(join(DEMO, 'index.html'), html)

writeFileSync(join(DEMO, 'style.css'), `:root{
  --paper:${palet.paper}; --ink:${palet.ink}; --tan:${palet.tan}; --rose:${palet.rose};
  --muted:#6B5B52; --garis:#E0D4C6;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font:16px/1.65 Georgia,'Times New Roman',serif;padding:0 0 4rem}
h1,h2,h3{font-weight:400;letter-spacing:.01em;margin:0 0 .4rem}
h1{font-size:2.6rem}
header,main,footer{max-width:1080px;margin:0 auto;padding:0 1rem}
header{padding-top:2.5rem;padding-bottom:1.5rem}
.eyebrow,.meta,.hitung{font:13px/1.5 Arial,Helvetica,sans-serif;color:var(--muted)}
.eyebrow{text-transform:uppercase;letter-spacing:.14em;margin:0 0 .4rem}
.lead{max-width:62ch;margin:.6rem 0}
.lewati{position:absolute;left:-9999px}
.lewati:focus{position:static;display:inline-block;margin:.5rem 1rem;padding:.4rem .8rem;
  background:var(--ink);color:var(--paper)}
.palet{display:flex;flex-wrap:wrap;gap:1rem;list-style:none;padding:0;margin:1.2rem 0 .4rem}
.palet li{display:flex;align-items:center;gap:.45rem;font:13px/1 Arial,Helvetica,sans-serif}
.swatch{width:28px;height:28px;border-radius:50%;border:1px solid var(--garis);display:inline-block}

/* bungkus */
.wrap{margin:2.5rem 0}
.kartu{position:relative;overflow:hidden;border:1px solid var(--garis);
  background:
    radial-gradient(120% 70% at 18% 8%, #F6E4D6 0%, rgba(246,228,214,0) 58%),
    radial-gradient(90% 60% at 88% 24%, #EFD9D3 0%, rgba(239,217,211,0) 62%),
    var(--paper);
  padding:0;color:var(--ink)}
.pita{color:var(--ink);opacity:.9;line-height:0;display:flex;overflow:hidden}
.pita svg{height:58px;width:auto;flex:0 0 auto;display:block}
.isi{position:relative;padding:2.2rem 1rem 1rem;text-align:center}
.kicker{font:600 13px/1 Arial,Helvetica,sans-serif;letter-spacing:.22em;
  text-transform:uppercase;color:var(--muted);margin:0 0 1.4rem}
.bingkai{position:relative;width:min(300px,76vw);margin:0 auto;color:var(--ink)}
.bingkai-svg{width:100%;height:auto;display:block}
/* Dua warna dari dua glyph: bidang alas di belakang diwarnai tan, garisnya tinta.
   Satu glyph tetap satu warna — DESIGN.md. */
.alas{color:var(--tan)}
.bingkai .alas{position:absolute;inset:0}
.bingkai .garis{position:relative}
.nama{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:.1rem;padding:18% 12% 22%}
/* Pelat terang di balik nama: di referensi badan kartu bersih, tatahan hanya
   mengelilinginya. Tanpa pelat ini isian ukel menabrak teks. */
.nama::before{content:"";position:absolute;left:8%;right:8%;top:16%;bottom:18%;z-index:0;
  background:radial-gradient(58% 52% at 50% 48%, rgba(252,250,246,.97) 0%,
    rgba(252,250,246,.9) 52%, rgba(252,250,246,0) 100%)}
.nama>*{position:relative;z-index:1}
.nm{font-size:clamp(1.5rem,6vw,2.1rem);margin:0;font-style:italic}
.amp{margin:0;color:var(--rose);font-size:1.2rem}
.tgl{font:12px/1 Arial,Helvetica,sans-serif;letter-spacing:.2em;color:var(--muted);margin:.7rem 0 0}
.sudut{position:absolute;color:var(--rose);opacity:.85;width:34%;max-width:170px}
.sudut svg{width:100%;height:auto;display:block}
.sudut-kiri{top:8%;left:2%}
.sudut-kanan{top:4%;right:1%;transform:scaleX(-1)}
/* Rumpun menahan tepi bawah dan sengaja dibiarkan terpotong kartu (bleed),
   persis seperti keping ladang ornamen di renderer undangan. */
.rumpun{color:var(--ink);line-height:0;margin-top:-1.5rem;display:flex;
  justify-content:space-between;align-items:flex-end;overflow:hidden}
.tumpuk{position:relative;display:block;width:min(56%,420px);margin-bottom:-6%}
.tumpuk.balik{transform:scaleX(-1);width:min(38%,280px)}
.tumpuk svg{width:100%;height:auto;display:block}
.tumpuk .alas{position:absolute;inset:0}

/* galeri */
.kategori{margin:2.6rem 0 0;border-top:1px solid var(--garis);padding-top:1.4rem}
.hitung{margin-left:.4rem}
.grid{list-style:none;padding:0;margin:1.2rem 0 0;display:grid;gap:1.2rem;
  grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
.sel{border:1px solid var(--garis);padding:.9rem;background:#FCF9F4}
.panggung{display:grid;place-items:center;min-height:170px;color:var(--ink);margin-bottom:.7rem}
.panggung svg{max-width:100%;max-height:170px;height:auto;display:block}
.panggung-ubin{min-height:120px;background:var(--paper);align-content:center}
.panggung-ubin svg{max-height:120px}
.nama-glyph{margin:0 0 .2rem;font-size:1.02rem}
.meta{margin:.15rem 0}
.lapis{color:#7D6E64}
code{font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;background:#F2EAE0;padding:.1em .34em}
table{border-collapse:collapse;margin:1rem 0;width:100%;max-width:640px}
caption{text-align:left;font:13px/1.5 Arial,Helvetica,sans-serif;color:var(--muted);padding-bottom:.4rem}
th,td{border:1px solid var(--garis);padding:.5rem .7rem;text-align:left;
  font:14px/1.5 Arial,Helvetica,sans-serif}
th{background:#F5EDE3;font-weight:600;width:40%}
button{font:14px/1 Arial,Helvetica,sans-serif;padding:.55rem .9rem;border:1px solid var(--ink);
  background:var(--ink);color:var(--paper);cursor:pointer}
button[aria-pressed="true"]{background:var(--paper);color:var(--ink)}
button:disabled{border-color:var(--garis);background:var(--garis);color:var(--muted);cursor:default}
#status-motion{margin-left:.6rem;font:13px/1 Arial,Helvetica,sans-serif;color:var(--muted)}
footer{margin-top:3rem;border-top:1px solid var(--garis);padding-top:1rem}
@media (prefers-reduced-motion: reduce){.glyph{transform:none!important;opacity:1!important}}
`)

writeFileSync(join(DEMO, 'motion.js'), `/**
 * Motion demo pack Kayon.
 *
 * Nilainya datang dari pengukuran di sources/canva-cokelat-krem/motion/measurements.json:
 *   - reveal berurutan: power1.out, 0,9 s, stagger 0,5 s
 *   - gestur tunggal : sine.inOut, 0,30 s
 * Tiga hal yang bukan hiasan dan diuji verify.mjs: keadaan akhir tetap terbaca tanpa JS,
 * prefers-reduced-motion tidak menjalankan tween sama sekali, dan tween ambient berhenti
 * ketika adegannya keluar layar.
 */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  var tombol = document.getElementById('jeda')
  var status = document.getElementById('status-motion')
  var ambient = []
  var dijeda = false

  if (!window.gsap) {
    if (status) status.textContent = 'GSAP tidak termuat — halaman tetap terbaca dalam keadaan akhir.'
    return
  }
  if (reduce.matches) {
    if (tombol) { tombol.disabled = true; tombol.setAttribute('aria-disabled', 'true') }
    if (status) status.textContent = 'Gerak dimatikan: sistem meminta reduced motion.'
    return
  }

  gsap.set('.js-reveal', { opacity: 0, y: 14 })
  var pengamat = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return
      var keping = e.target.querySelectorAll('.js-reveal')
      var target = keping.length ? keping : [e.target]
      gsap.to(target, { opacity: 1, y: 0, duration: 0.9, ease: 'power1.out', stagger: 0.5 })
      pengamat.unobserve(e.target)
    })
  }, { rootMargin: '0px 0px -12% 0px' })
  document.querySelectorAll('.sel, .kartu').forEach(function (n) { pengamat.observe(n) })

  document.querySelectorAll('.js-sway').forEach(function (n, i) {
    ambient.push(gsap.to(n, {
      y: '+=9', rotation: 1.2, duration: 6, ease: 'sine.inOut',
      yoyo: true, repeat: -1, delay: i * 0.5, transformOrigin: '50% 10%',
    }))
  })

  // Jeda offscreen: tween ambient tidak boleh terus berjalan saat adegannya tak terlihat.
  var adegan = document.querySelector('[data-scene]')
  if (adegan) {
    new IntersectionObserver(function (entries) {
      var terlihat = entries[0].isIntersecting
      ambient.forEach(function (t) { terlihat && !dijeda ? t.resume() : t.pause() })
      document.body.dataset.ambient = terlihat && !dijeda ? 'jalan' : 'jeda'
    }, { threshold: 0.05 }).observe(adegan)
  }

  if (tombol) {
    tombol.addEventListener('click', function () {
      dijeda = !dijeda
      tombol.setAttribute('aria-pressed', String(dijeda))
      ambient.forEach(function (t) { dijeda ? t.pause() : t.resume() })
      document.body.dataset.ambient = dijeda ? 'jeda' : 'jalan'
      status.textContent = dijeda ? 'Gerak ambient dijeda.' : 'Gerak ambient jalan.'
    })
  }
  document.body.dataset.ambient = 'jalan'
})()
`)

copyFileSync(join(HERE, '..', 'melati', 'demo', 'gsap.min.js'), join(DEMO, 'gsap.min.js'))
console.log(`demo/index.html — ${catalog.assets.length} glyph, ${catalog.tekstur.length} tekstur, ${counter} penyisipan SVG`)
