#!/usr/bin/env node
/**
 * Perakit pack impor. Tiap `imported/<template>/build.mjs` tinggal memanggil `buildPack()`
 * dengan daftar glyphnya; seluruh aturan konversi, pemeriksaan, dan bentuk `catalog.json`
 * hidup di sini dan di `convert.mjs`.
 *
 * Tiga bentuk entri:
 *
 *   vektor      `{ id, name, file, category, anchor, layer, tiers, knockout? }`
 *   pecahan     `{ file, split: { axis, at, parts: [{ id, name, side, … }] } }`
 *               satu berkas sumber berisi sepasang kiri–kanan dipotong jadi dua glyph
 *               berdiri sendiri, masing-masing dengan `viewBox` yang dirapatkan ke isinya.
 *   raster      `{ id, name, file, raster: true, anchor }`
 *               untuk sumber yang bunganya memang bitmap `<image>` di dalam SVG.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  bakeRaster, compareGeometry, convertSvg, pathBBox, readPaths, readSource, sha, verbatim, writeDiff,
} from './convert.mjs'

const MOTION_BY_CATEGORY = {
  frame: { preset: 'reveal', amplitude: 14, rigid: true },
  divider: { preset: 'reveal', amplitude: 12, rigid: false },
  corner: { preset: 'reveal', amplitude: 14, rigid: false },
  floral: { preset: 'reveal+sway', amplitude: 16, rigid: false },
  layer: { preset: 'cascadeIn', amplitude: 18, rigid: false },
  motif: { preset: 'static', amplitude: 0, rigid: true },
  symbol: { preset: 'reveal', amplitude: 14, rigid: true },
  venue: { preset: 'reveal', amplitude: 14, rigid: true },
  seal: { preset: 'reveal', amplitude: 10, rigid: true },
}

const motionFor = (category) => ({
  ...(MOTION_BY_CATEGORY[category] || MOTION_BY_CATEGORY.symbol),
  unit: 'px',
  duration: 0.9,
  ease: 'power1.out',
  stagger: 0.5,
  reducedMotion: 'langsung-ke-keadaan-akhir',
  // Amplitudo tidak pernah terukur dari preview; lihat sources/canva/MOTION-DALAM.md.
  amplitudeMeasured: false,
})

const provenanceFor = (pack, file) => ({
  kind: 'imported',
  method: 'ekspor SVG Canva, path disalin tanpa perubahan koordinat',
  sourceFile: `source/${file}`,
  sourceTemplate: pack.template,
  exportedBy: 'pemilik, dari akun Canva Pro',
  tracedFrom: null,
  redrawn: false,
  checkedAt: pack.builtAt,
})

export async function buildPack(here, pack) {
  const SOURCE = join(here, 'source')
  const SVG_OUT = join(here, 'svg')
  const RASTER_OUT = join(here, 'raster')
  const DIFF_OUT = join(here, 'diff')
  for (const dir of [SVG_OUT, RASTER_OUT, DIFF_OUT]) mkdirSync(dir, { recursive: true })

  const assets = []
  const report = { geometry: [], raster: [], split: [] }
  let failed = false

  for (const entry of pack.glyphs) {
    const sourceText = readSource(SOURCE, entry.file)

    // ---------------------------------------------------------- raster
    if (entry.raster) {
      const baked = await bakeRaster(sourceText, { width: entry.width || 1600, crop: entry.crop || null, trim: entry.trim !== false, stripVector: Boolean(entry.stripVector) })
      const variants = baked.map((v) => {
        const file = `raster/${entry.id}.${v.format}`
        writeFileSync(join(here, file), v.buffer)
        return {
          file,
          format: v.format,
          width: v.width,
          height: v.height,
          ratio: Number((v.width / v.height).toFixed(3)),
          bytes: v.buffer.length,
          sha256: sha(v.buffer),
          alpha: v.alpha,
          renderer: v.renderer,
        }
      })
      if (!variants.every((v) => v.alpha)) {
        console.error(`${entry.id}: varian raster tanpa alpha yang terpakai`)
        failed = true
      }
      report.raster.push({
        id: entry.id,
        renderer: variants[0].renderer,
        cropped: Boolean(entry.crop),
        variants: variants.map((v) => `${v.format} ${v.width}×${v.height} ${v.bytes}B alpha=${v.alpha}`),
      })
      assets.push({
        id: entry.id,
        name: entry.name,
        category: entry.category || 'layer',
        tags: [entry.category || 'layer', 'raster', 'impor-canva', pack.id, ...(entry.crop ? ['pecahan'] : [])],
        culturalRole: 'impor-pihak-ketiga',
        provenance: {
          ...provenanceFor(pack, entry.file),
          method: 'ekspor SVG Canva dipanggang jadi raster ber-alpha; gambarnya memang bitmap di dalam SVG sumbernya',
          renderer: variants[0].renderer,
          ...(entry.crop ? { crop: `dipotong dari berkas yang sama pada x=${entry.crop.x} y=${entry.crop.y} w=${entry.crop.w} h=${entry.crop.h} (satuan viewBox sumber); piksel tidak disentuh` } : {}),
          ...(entry.stripVector ? { stripVector: 'path vektor dibuang sebelum dipanggang; bagian vektornya keluar sebagai glyph tersendiri dari berkas yang sama' } : {}),
          ...(entry.note ? { note: entry.note } : {}),
        },
        usage: 'imported-local-demo',
        license: pack.license,
        style: {
          palette: 'berwarna penuh',
          medium: entry.wash ? 'raster wash (semi-transparan, tidak pernah pekat)' : 'raster ber-alpha',
          inkFields: null,
        },
        layers: ['cutout'],
        anchor: entry.anchor,
        motion: motionFor(entry.category || 'layer'),
        variants,
      })
      continue
    }

    // ---------------------------------------------------------- pecahan kiri/kanan
    const targets = entry.split
      ? entry.split.parts.map((part) => ({ ...entry, ...part, split: entry.split }))
      : [entry]

    /**
     * Dua cara memecah, dan yang pertama yang paling sering benar untuk ekspor Canva:
     *
     *   `by: 'transform'` — sepasang kiri–kanan disimpan sebagai dua grup dengan geseran
     *     berbeda, memakai rentang koordinat yang **sama**. Memecahnya berdasarkan posisi
     *     path karena itu mustahil; yang membedakan cuma transform grupnya.
     *   `by: 'axis'` — dua bagian yang memang terpisah secara koordinat.
     */
    const selectorFor = (target) => {
      if (!target.split) return null
      if (target.split.by === 'transform') {
        return ({ transform }) => transform.replace(/\s+/g, ' ').trim() === target.match.replace(/\s+/g, ' ').trim()
      }
      return ({ bbox }) => {
        const centre = target.split.axis === 'y' ? (bbox.minY + bbox.maxY) / 2 : (bbox.minX + bbox.maxX) / 2
        return target.side === 'low' ? centre < target.split.at : centre >= target.split.at
      }
    }

    /**
     * Semua bagian dikonversi lebih dulu, baru dibandingkan.
     *
     * Alasannya satu: **jendela antar-bagian bisa saling tumpang tindih.** Tiga gunungan
     * yang berdiri berdampingan punya kotak yang beririsan, jadi merender sumber pada
     * jendela salah satu bagian ikut memunculkan dua bagian lain — dan pembandingnya
     * melaporkan 25% meleset untuk path yang sebenarnya identik. Kalau jendelanya beririsan,
     * pembandingan piksel memang tidak sebanding dan dilaporkan begitu; buktinya bersandar
     * pada pemeriksaan "koordinat utuh", yang tidak bergantung renderer sama sekali.
     */
    const converts = targets.map((target) => ({ target, select: selectorFor(target) }))
    for (const item of converts) {
      item.converted = convertSvg(sourceText, {
        prefix: `${pack.id}-${item.target.id}-`,
        title: item.target.name,
        layer: item.target.layer || 'ink',
        tiers: item.target.tiers,
        knockout: item.target.knockout,
        select: item.select,
        pad: item.target.pad ?? 0,
      })
    }
    const windows = converts.map((c) => c.converted.viewBox.split(/[\s,]+/).map(Number))
    const overlaps = windows.map((w, i) => windows.some((o, j) => j !== i
      && w[0] < o[0] + o[2] && o[0] < w[0] + w[2]
      && w[1] < o[1] + o[3] && o[1] < w[1] + w[3]))

    for (const [index, item] of converts.entries()) {
      const target = item.target
      const select = item.select
      const windowOverlaps = converts.length > 1 && overlaps[index]

      const converted = item.converted || convertSvg(sourceText, {
        prefix: `${pack.id}-${target.id}-`,
        title: target.name,
        layer: target.layer || 'ink',
        tiers: target.tiers,
        knockout: target.knockout,
        select,
        pad: target.pad ?? 0,
      })

      if (converted.unsupportedTransform) {
        console.error(`${target.id}: transform bukan geseran murni (${converted.unsupportedTransform}) — pemecahan ditolak`)
        failed = true
      }
      if (select && converted.pathCount === 0) {
        console.error(`${target.id}: pemecahan tidak menyisakan satu path pun`)
        failed = true
      }
      if (converted.unknownFills.length) {
        console.error(`${target.id}: warna tanpa pemetaan — ${converted.unknownFills.join(', ')}`)
        failed = true
      }

      writeFileSync(join(SVG_OUT, `${target.id}.svg`), converted.svg)

      /**
       * Glyph pecahan dibandingkan terhadap sumbernya **pada jendela yang sama**, supaya yang
       * diukur bentuknya dan bukan pergeseran jendela.
       *
       * Pada berkas campuran vektor+bitmap, sisi sumber juga dibersihkan dari `<image>` lebih
       * dulu. Tanpa itu pembandingnya menghitung bitmap yang memang bukan bagian glyph ini —
       * sudut bergaris di atas gambar wayang tercatat 21% meleset padahal path-nya identik.
       * Yang diukur harus sebanding, bukan sekadar terukur.
       */
      const mixed = sourceText.includes('<image')
      const reference = mixed ? sourceText.replace(/<image[^>]*\/>/g, '') : sourceText
      const paper = target.knockout?.cut ?? null
      const geometry = windowOverlaps
        ? { comparable: false, reason: 'jendela bagian ini beririsan dengan bagian lain dari berkas yang sama' }
        : await compareGeometry(reference, converted.svg, { paperFill: paper, viewBox: select ? converted.viewBox : null })
      if (!windowOverlaps) {
        await writeDiff(reference, converted.svg, join(DIFF_OUT, `${target.id}.png`), {
          paperFill: paper,
          viewBox: select ? converted.viewBox : null,
        })
      }

      const ok = verbatim(converted.svg, sourceText)
      if (!ok) { console.error(`${target.id}: ada koordinat yang tidak ditemukan apa adanya di sumber`); failed = true }
      if (select) report.split.push({ file: target.file, id: target.id, paths: converted.pathCount, viewBox: converted.viewBox })
      report.geometry.push({
        id: target.id,
        paths: converted.pathCount,
        pathsVerbatim: ok,
        knockout: Boolean(paper),
        cropped: Boolean(select),
        imageStripped: mixed,
        ...geometry,
      })

      const bytes = Buffer.from(converted.svg, 'utf8')
      assets.push({
        id: target.id,
        name: target.name,
        category: target.category,
        tags: [target.category, 'impor-canva', pack.id, ...(target.split ? ['pecahan'] : [])].filter(Boolean),
        culturalRole: 'impor-pihak-ketiga',
        provenance: {
          ...provenanceFor(pack, target.file),
          ...(target.note ? { note: target.note } : {}),
          ...(target.split
            ? { split: `dipecah dari satu berkas sumber pada ${target.split.axis} = ${target.split.at}; viewBox dirapatkan ke isinya, koordinat tidak digeser` }
            : {}),
        },
        usage: 'imported-local-demo',
        license: pack.license,
        style: {
          palette: 'monokrom currentColor',
          medium: 'vektor',
          inkFields: [...new Set(Object.values(converted.tiers))].sort((a, b) => b - a),
        },
        layers: [target.layer || 'ink'],
        anchor: target.anchor,
        motion: motionFor(target.category),
        variants: [{
          file: `svg/${target.id}.svg`,
          format: 'svg',
          width: Math.round(converted.width),
          height: Math.round(converted.height),
          ratio: Number((converted.width / converted.height).toFixed(3)),
          bytes: bytes.length,
          sha256: sha(bytes),
          alpha: true,
        }],
      })
    }
  }

  writeFileSync(join(here, 'catalog.json'), `${JSON.stringify({
    schemaVersion: 1,
    id: pack.id,
    name: pack.name,
    scope: 'imported-local-demo',
    builtAt: pack.builtAt,
    origin: {
      template: pack.template,
      exportedBy: 'pemilik, dari akun Canva Pro',
      warning: 'Bukan aset original. Aturan AGENTS.md/DESIGN.md tentang aset pihak ketiga tetap berlaku sampai pemilik memutuskan sebaliknya secara tertulis. Lihat PROVENANCE.md.',
    },
    palette: pack.palette,
    assets,
  }, null, 2)}\n`)

  console.log(`${pack.id}: ${assets.length} aset`)
  if (report.split.length) {
    console.log('\nPemecahan berkas sumber:')
    for (const s of report.split) console.log(`  ${s.file} → ${s.id.padEnd(22)} ${String(s.paths).padStart(3)} path · viewBox ${s.viewBox}`)
  }
  if (report.geometry.length) {
    console.log('\nKesetiaan geometri (siluet sumber vs hasil, lebar render 700px):')
    for (const g of report.geometry) {
      const notes = [g.knockout ? 'rongga' : null, g.cropped ? 'dipecah' : null, g.imageStripped ? 'bitmap dikecualikan' : null].filter(Boolean).join(' · ')
      console.log(g.comparable
        ? `  ${g.id.padEnd(24)} ${String(g.paths).padStart(3)} path · beda ${g.differingPixels}/${g.pixels} (${g.differingPercent}%) · koordinat utuh: ${g.pathsVerbatim ? 'ya' : 'TIDAK'}${notes ? ` · ${notes}` : ''}`
        : `  ${g.id.padEnd(24)} tidak terbandingkan: ${g.reason}`)
    }
  }
  if (report.raster.length) {
    console.log('\nRaster:')
    for (const r of report.raster) {
      console.log(`  ${r.id.padEnd(24)} ${r.variants.join(' · ')}${r.cropped ? ' · dipotong' : ''}`)
      if (!r.renderer.startsWith('librsvg')) console.log(`  ${' '.repeat(24)} renderer: ${r.renderer}`)
    }
  }
  if (failed) process.exitCode = 1
  return { assets, report }
}

export { pathBBox, readPaths, readSource }
