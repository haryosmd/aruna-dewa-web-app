import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { cleanSvg } from './svg.mjs'

const pack = 'packs/referensi'
const out = 'docs/features/ornament-builder/verification/reference'
mkdirSync(out, { recursive: true })
const assets = JSON.parse(readFileSync(join(pack, 'catalog.json'))).assets
const references = [
  'fbe39e8f-ac2c-45bd-8148-4dd5cb261b30', '5b966e48-e199-4705-95be-349dfc0a6eb2',
  '3da9de75-22de-4b2a-8f9a-1869d999a687', 'b2874fcd-b122-4701-bcc2-d59f5fc10fcd',
]
const sourceDir = process.argv[2] ?? 'docs/features/ornament-builder/sources/reference-png'
const results = { assets: [], sheets: [] }
for (const a of assets) {
  const file = join(pack, a.file)
  const actual = readFileSync(file)
  assert.deepEqual(actual, readFileSync(join('apps/web/public/ornaments/referensi', a.file)))
  const original = readFileSync(a.provenance.inputFile)
  if (a.format === 'svg') {
    assert.doesNotMatch(actual.toString(), /canva|<metadata|<image|currentColor/i)
    const paths = s => [...s.matchAll(/\bd="([^"]+)"/g)].map(m => m[1])
    assert.deepEqual(paths(actual.toString()), paths(original.toString()), `${a.id}: path changed`)
    assert.equal(actual.toString(), cleanSvg(original.toString(), a.provenance.color))
  } else {
    const decode = b => sharp(b).ensureAlpha().raw().toBuffer()
    const expected = a.provenance.nativeRaster ? await sharp(original, { density: 300 }).resize({ width: 1600 }).png().toBuffer() : original
    assert.deepEqual(await decode(actual), await decode(expected), `${a.id}: raster pixels changed`)
    const stats = await sharp(actual).stats()
    assert.ok(stats.channels[3].min < 255, `${a.id}: missing transparent pixels`)
  }
  results.assets.push({ id: a.id, geometryOrPixelsPreserved: true, productionCopyIdentical: true })
}

for (let sheet = 0; sheet < 4; sheet++) {
  const size = [270, 300, 430, 320][sheet]
  const cols = [7, 5, 3, 6][sheet]
  const rows = [6, 4, 1, 1][sheet]
  const background = sheet === 0 ? '#f2ece0' : '#f4efe4'
  const items = assets.filter(a => a.sheet === sheet)
  if (sheet === 3) for (const id of ['rangkai-mawar-kanan', 'rangkai-mawar-kiri']) {
    items.push({ ...assets.find(a => a.id === `ref-cokelat-krem-${id}`), cell: items.length })
  }
  for (const dark of [false, true]) {
    const layers = []
    for (const a of items) {
      const padding = sheet === 1 ? 28 : 24
      let render = sharp(join(pack, a.file), { density: 144 }).resize(size - padding, size - padding, { fit: 'inside' })
      // White is the comparison panel in screenshot 3, not a background baked into the SVG.
      if (sheet === 2 && a.cell === 2 && !dark) render = render.flatten({ background: '#ffffff' })
      const input = await render.png().toBuffer()
      const { width, height } = await sharp(input).metadata()
      layers.push({ input, left: (a.cell % cols) * size + Math.round((size - width) / 2), top: Math.floor(a.cell / cols) * size + Math.round((size - height) / 2) })
    }
    const output = await sharp({ create: { width: size * cols, height: size * rows, channels: 4, background: dark ? '#241e1a' : background } }).composite(layers).png().toBuffer()
    writeFileSync(join(out, `sheet-${sheet + 1}${dark ? '-dark' : ''}.png`), output)
    const ref = join(sourceDir, `codex-clipboard-${references[sheet]}.png`)
    if (dark || !existsSync(ref)) continue
    const a = await sharp(output).removeAlpha().raw().toBuffer()
    const b = await sharp(ref).removeAlpha().raw().toBuffer()
    assert.equal(a.length, b.length)
    let error = 0, changed = 0
    const diff = Buffer.alloc(a.length)
    for (let i = 0; i < a.length; i += 3) {
      let peak = 0
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(a[i + c] - b[i + c]); error += d; peak = Math.max(peak, d); diff[i + c] = Math.min(255, d * 4)
      }
      if (peak > 16) changed++
    }
    await sharp(diff, { raw: { width: size * cols, height: size * rows, channels: 3 } }).png().toFile(join(out, `diff-${sheet + 1}.png`))
    const overlay = Buffer.from(a.map((v, i) => Math.round((v + b[i]) / 2)))
    await sharp(overlay, { raw: { width: size * cols, height: size * rows, channels: 3 } }).png().toFile(join(out, `overlay-${sheet + 1}.png`))
    results.sheets.push({ sheet: sheet + 1, meanChannelErrorOutOf255: +(error / a.length).toFixed(4), pixelsAbove16Percent: +(changed / (a.length / 3) * 100).toFixed(4), comparison: 'full supplied sheet at native dimensions, including background; renderer antialiasing can differ' })
  }
}
writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify({ validatedAssets: results.assets.length, sheets: results.sheets }, null, 2))
