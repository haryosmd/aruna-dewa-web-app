import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('docs/features/ornament-builder/originals/sunda');
const dir=path.join(root,'demo');
await fs.mkdir(dir,{recursive:true});
let instance=0;
async function glyph(name) {
  let s=await fs.readFile(path.join(root,'svg',name+'.svg'),'utf8');
  const prefix=`demo-${++instance}-`;
  s=s.replaceAll('sunda-',prefix+'sunda-').replace('role="img"','aria-hidden="true"');
  return s;
}
const names=['julang-ngapak','angklung','anyaman-bambu','bingkai-sunda','divider-sunda','sudut-daun'];
const labels=['Julang Ngapak','Angklung','Anyaman bambu','Bingkai taman','Pucuk & pertemuan','Sudut dedaunan'];
const cards=[];
for(let i=0;i<names.length;i++) cards.push(`<article class="specimen"><div class="specimen-art">${await glyph(names[i])}</div><div class="specimen-label"><span>0${i+1} / ${labels[i]}</span><a href="../svg/${names[i]}.svg" download aria-label="Unduh ${labels[i]} SVG">SVG ↗</a></div></article>`);
for(const [i,name,label] of [[7,'rangkaian-bunga','Rangkaian melati'],[8,'layer-dedaunan','Dedaunan taman']])cards.push(`<article class="specimen"><div class="specimen-art"><img src="../${name}.webp" alt="${label}" loading="lazy"></div><div class="specimen-label"><span>0${i} / ${label}</span><a href="../${name==='rangkaian-bunga'?name+'-final':name}.png" download aria-label="Unduh ${label} PNG">PNG ↗</a></div></article>`);
const html=`<!doctype html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sunda — Taman Pasundan · Aruna Dewa</title><link rel="stylesheet" href="style.css"><script defer src="gsap.min.js"></script><script defer src="motion.js"></script></head>
<body>
<a class="skip" href="#cerita">Lewati sampul</a>
<header class="masthead"><a href="#">ARUNA DEWA <span>/ TAMAN PASUNDAN</span></a><button id="motion-toggle" type="button" aria-pressed="false" hidden>Jeda animasi</button></header>
<main>
<section class="cover scene" aria-labelledby="couple">
  <div class="cover-line" aria-hidden="true"></div>
  <div class="botanical botanical-left depth" data-depth="-12" aria-hidden="true"><img class="sway" src="../layer-dedaunan.webp" alt=""></div>
  <div class="botanical botanical-right depth" data-depth="16" aria-hidden="true"><img class="sway" src="../rangkaian-bunga.webp" alt=""></div>
  <div class="cover-copy"><p class="eyebrow reveal">SEBUAH JANJI, SEBUAH RUMAH</p><p class="prelude reveal">The wedding of</p><h1 id="couple" class="reveal">Nara <em>&</em> Dewa</h1><p class="date reveal">MINGGU, 20 DESEMBER 2026</p><div class="house reveal" aria-hidden="true">${await glyph('julang-ngapak')}</div><p class="welcome reveal">Dari dua perjalanan,<br>menuju satu tempat pulang.</p><a class="open-link" href="#cerita">Buka kisah kami <span aria-hidden="true">↓</span></a></div>
  <p class="cover-foot">BANDUNG, JAWA BARAT</p>
</section>
<section id="cerita" class="story scene" aria-labelledby="story-title">
  <div class="story-corner depth" data-depth="8" aria-hidden="true">${await glyph('sudut-daun')}</div>
  <p class="eyebrow reveal">TUMBUH BERSAMA</p><h2 id="story-title" class="reveal">Sehangat rumah.<br>Seteduh taman.</h2><p class="story-text reveal">Di antara hal-hal sederhana, kami menemukan arti kebersamaan. Kini, dengan penuh syukur, kami mengundang Anda menjadi bagian dari awal perjalanan kami.</p><div class="divider reveal" aria-hidden="true">${await glyph('divider-sunda')}</div>
</section>
<section class="occasion scene" aria-labelledby="occasion-title"><div class="weave" aria-hidden="true">${await glyph('anyaman-bambu')}</div><div class="occasion-heading"><p class="eyebrow reveal">HARI YANG DINANTIKAN</p><h2 id="occasion-title" class="reveal">Merayakan<br>sebuah permulaan.</h2><div class="instrument reveal" aria-hidden="true">${await glyph('angklung')}</div></div><div class="event-card reveal"><p class="eyebrow">MINGGU / 20.12.2026</p><h3>Akad & resepsi</h3><div class="event-row"><span>Akad nikah</span><strong>09.00 WIB</strong></div><div class="event-row"><span>Resepsi</span><strong>11.00–14.00 WIB</strong></div><p class="venue">Taman Pasundan</p><p>Bandung, Jawa Barat</p><p class="sample-note">Nama, tempat, dan acara pada demo ini fiktif.</p></div></section>
<section id="koleksi" class="collection" aria-labelledby="collection-title"><div class="collection-heading"><div><p class="eyebrow">ORIGINAL ORNAMENT COLLECTION / 01</p><h2 id="collection-title">Akar budaya.<br>Ruang untuk berkarya.</h2></div><p>Enam vektor berlapis dan dua ilustrasi botani transparan. Rumah dan angklung menjadi titik identitas; dedaunan dan bunga menjadi pendamping.</p></div><div class="specimen-grid">${cards.join('\n')}</div><div class="collection-links"><a href="../catalog.json">Metadata koleksi ↗</a><a href="../../../sources/index.html">Arsip referensi ↗</a></div></section>
</main><footer><span>ARUNA DEWA</span><span>Taman Pasundan · Studi ornamen original</span></footer>
</body></html>`;
await fs.writeFile(path.join(dir,'index.html'),html);
await fs.copyFile('apps/web/node_modules/gsap/dist/gsap.min.js',path.join(dir,'gsap.min.js'));
console.log('Demo generated with locally installed GSAP');
