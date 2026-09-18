import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { cleanSvg } from './svg.mjs'
import { turunkan } from './derive.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const imported = join(root, 'docs/features/ornament-builder/imported')
const out = join(root, 'packs/referensi')
const publicDir = join(root, 'apps/web/public/ornaments/referensi')
const demoDir = join(root, 'docs/features/ornament-builder/originals/melati/demo/referensi')
for (const dir of [out, publicDir, demoDir]) mkdirSync(dir, { recursive: true })
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const assets = []
const sheets = [
  ['merah-emas', 'coklat-krim', 'emas-hitam', 'putih-cokelat', 'emas-cokelat', 'putih-hijau'],
  ['cokelat-krem', 'krem-wayang', 'rumah-jawa-barat'],
]

async function add({ id, name, category, source, options, provenance, sheet, cell, anchor, nativeRaster = false }) {
  const bytes = readFileSync(source)
  const svg = source.endsWith('.svg') && !nativeRaster
  const output = svg ? Buffer.from(cleanSvg(bytes.toString(), options)) : nativeRaster
    ? await sharp(bytes, { density: 300 }).resize({ width: 1600 }).png().toBuffer()
    : await sharp(bytes).png().toBuffer()
  const file = `${id}.${svg ? 'svg' : 'png'}`
  const meta = await sharp(output).metadata()
  const viewBox = svg ? output.toString().match(/viewBox="([^"]+)"/)[1].split(/[\s,]+/).map(Number) : null
  const width = viewBox ? viewBox[2] : meta.width
  const height = viewBox ? viewBox[3] : meta.height
  writeFileSync(join(out, file), output)
  copyFileSync(join(out, file), join(publicDir, file))
  copyFileSync(join(out, file), join(demoDir, file))
  assets.push({ id, name, category, file, format: svg ? 'svg' : 'png', width, height, ratio: width / height,
    ...(category === 'layer' ? { slot: ['bloom', 'cascade', 'crown', 'cluster', 'swag'].includes(anchor) ? anchor : 'cluster' } : {}),
    palette: 'fixed-reference', sha256: sha(output), bytes: output.length, sheet, cell,
    provenance: { ...provenance, inputFile: relative(root, source), sourceSha256: sha(bytes), derivative: true, editorMetadataRemoved: true,
      geometry: svg ? 'existing paths preserved; no tracing or simplification' : nativeRaster ? 'source composite rasterized with original canvas; no trimming' : 'original raster pixels retained in lossless PNG',
      nativeRaster,
      color: options ?? 'original bitmap colors', integrationRequestedAt: '2026-09-18' } })
}

for (const [sheet, packs] of sheets.entries()) {
  let cell = 0
  for (const pack of packs) {
    const dir = join(imported, `canva-${pack}`)
    const catalog = JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8'))
    for (const asset of catalog.assets) {
      const variant = asset.variants.find(v => v.format === 'svg') ?? asset.variants.find(v => v.format === 'png')
      const nativeRaster = ['rangkai-mawar-kiri', 'rangkai-mawar-kanan', 'rumah-joglo'].includes(asset.id)
      await add({ id: `ref-${pack}-${asset.id}`, name: asset.name, category: asset.category,
        source: join(dir, nativeRaster ? asset.provenance.sourceFile : variant.file), nativeRaster, options: { ink: '#3c2e24' },
        provenance: { sourcePack: catalog.id, sourceFile: asset.provenance.sourceFile, sourceTemplate: catalog.origin.template,
          authorship: 'owner-provided Canva export; not claimed as newly drawn', license: 'source license not independently verified' },
        sheet, cell: cell++, anchor: asset.anchor })
    }
  }
}

// Supplied image 3: preserve the source's filled cream body and soft mask shading.
for (const [index, variant] of [
  { id: 'daun-krem', name: 'Daun sulur — krem', source: 'source/daun-sulur-a.svg', options: {} },
  { id: 'daun-gading', name: 'Daun sulur — gading', source: 'svg/daun-sulur-kiri.svg', options: { ink: '#483534', maskOpacity: 1 } },
  { id: 'daun-abu', name: 'Daun sulur — abu-abu', source: 'svg/daun-sulur-kiri.svg', options: { ink: '#d2d2d2', maskOpacity: 1, solidShadow: true } },
].entries()) {
  await add({ id: `ref-${variant.id}`, name: variant.name, category: 'floral',
    source: join(imported, 'canva-cokelat-krem', variant.source), options: variant.options,
    provenance: { sourcePack: 'canva-cokelat-krem', sourceFile: 'source/daun-sulur-a.svg', authorship: 'owner-provided Canva export; not newly drawn' },
    sheet: 2, cell: index })
}

// Supplied image 4: the warmer brown and the original shaded leaf body.
for (const [index, [assetId, sourceFile]] of [['daun-sulur-kanan', 'daun-sulur-b.svg'], ['daun-sulur-kiri', 'daun-sulur-a.svg'], ['kayon-gunungan', null], ['pita-ceplok', null]].entries()) {
  const base = assets.find(a => a.id === `ref-cokelat-krem-${assetId}`)
  await add({ id: `${base.id}-hangat`, name: `${base.name} — cokelat hangat`, category: base.category,
    source: join(out, base.file),
    options: { colors: { '#3c2e24': '#3a2f28' }, ...(sourceFile ? { maskOpacity: 1 } : {}) },
    provenance: base.provenance, sheet: 3, cell: index })
}

const catalog = { schemaVersion: 1, id: 'referensi', name: 'Referensi pemilik — warna asli', assets }
writeFileSync(join(out, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n')

/*
 * Varian turunan ditulis `derive.mjs`, dan registry `ornament-reference.ts` ikut ditulis di sana.
 *
 * Satu penulis, bukan dua. Kalau berkas ini memancarkan registry sendiri tanpa `thumb`/`webAsset`,
 * menjalankan `pnpm ornament:reference` akan diam-diam mencabut kedua field itu — dan gejalanya
 * bukan galat melainkan undangan yang mulai mengirim berkas 1,8 MB ke tamu lagi.
 */
const turunan = await turunkan({ tulis: true })
console.log(`turunan: web ${Math.round(turunan.totalWeb / 1024)} KB · ubin ${Math.round(turunan.totalUbin / 1024)} KB`)

const tile = a => `<figure><div class="art"><img src="${a.file}" alt="${a.name}" width="${a.width}" height="${a.height}" loading="lazy"></div><figcaption>${a.name}<small>${a.format.toUpperCase()} · ${a.id}</small></figcaption></figure>`
writeFileSync(join(demoDir, 'index.html'), `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bank ornamen — referensi pemilik</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f4efe4;color:#3c2e24;font:16px system-ui}header,section{padding:24px;max-width:1600px;margin:auto}h1{font-size:28px}a{color:inherit}button{font:inherit;padding:10px 18px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}figure{margin:0;border:1px solid #8e857955;border-radius:8px;overflow:hidden}.art{height:260px;padding:12px;display:block;overflow:hidden}.art img{display:block;width:100%;height:100%;object-fit:contain}figcaption{padding:12px;font-size:14px}small{display:block;font-size:11px;margin-top:6px;overflow-wrap:anywhere}body.dark{background:#241e1a;color:#f4efe4}body.dark .art{background:#241e1a}</style>
<header><a href="../index.html#impor">← Ronce Melati</a><h1>Bank ornamen · ${assets.length} aset</h1><p>Bentuk sumber dipertahankan. Palet mengikuti empat PNG referensi; SVG vektor dan PNG transparan tersedia terpisah.</p><button type="button" onclick="document.body.classList.toggle('dark')">Ganti latar terang / gelap</button></header>
${['Referensi 1', 'Referensi 2', 'Varian daun · referensi 3', 'Cokelat hangat · referensi 4'].map((name, i) => `<section><h2>${name}</h2><div class="grid">${assets.filter(a => a.sheet === i).map(tile).join('\n')}</div></section>`).join('\n')}</html>`)
console.log(`${assets.length} assets: ${assets.filter(a => a.format === 'svg').length} SVG, ${assets.filter(a => a.format === 'png').length} PNG. Bank and local preview written.`)
