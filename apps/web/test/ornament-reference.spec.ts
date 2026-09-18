import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { referenceOrnaments } from '../utils/ornament-reference'
import { ornamentBank, isOrnamentId } from '../utils/ornaments'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const catalog = JSON.parse(readFileSync(`${root}packs/referensi/catalog.json`, 'utf8')) as {
  assets: {
    id: keyof typeof referenceOrnaments; file: string; sha256: string; format: string; ratio: number
    width: number; height: number; bytes: number
    thumb: string; thumbBytes: number; web: string; webBytes: number
  }[]
}

const kb = (n: number) => `${Math.round(n / 1024)} KB`

describe('fixed-reference ornament bank', () => {
  it('registers all 58 reference ornaments and 7 color variants through the shared renderer', () => {
    expect(catalog.assets).toHaveLength(65)
    expect(Object.keys(referenceOrnaments)).toHaveLength(65)
    for (const asset of catalog.assets) {
      expect(isOrnamentId(asset.id)).toBe(true)
      expect(ornamentBank[asset.id]).toEqual(referenceOrnaments[asset.id])
      expect(existsSync(`${root}apps/web/components/ornament/ReferenceAsset.vue`)).toBe(true)
    }
  })

  it.each(catalog.assets)('$id preserves the verified file, aspect ratio and SVG/raster type', (asset) => {
    const entry = referenceOrnaments[asset.id]
    const data = readFileSync(`${root}apps/web/public${entry.asset}`)
    expect(createHash('sha256').update(data).digest('hex')).toBe(asset.sha256)
    expect(entry.format).toBe(asset.format)
    expect(entry.ratio).toBe(asset.ratio)
    expect(entry.ratio).toBeGreaterThan(0)
    if (entry.format === 'svg') {
      expect(data.toString()).not.toMatch(/<image\b|<script\b|<metadata\b|currentColor|canva/i)
      expect(data.toString()).toContain('viewBox=')
    } else {
      expect(data.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    }
  })
})

/**
 * Varian turunan: ubin pemilih dan salinan yang benar-benar dikirim ke tamu.
 *
 * Diuji **tanpa hash**, dan itu disengaja. Keluaran libvips tidak dijamin identik byte-per-byte
 * antar versi atau platform, jadi hash di sini akan mengubah pemutakhiran sharp di CI jadi build
 * merah yang tidak punya cacat di belakangnya. Yang diperiksa adalah sifat yang benar-benar kami
 * andalkan: berkasnya ada, benar-benar WebP, dan cukup kecil.
 */
describe('varian turunan aset referensi', () => {
  it('memberi tiap aset satu ubin dan satu salinan web', () => {
    for (const asset of catalog.assets) {
      const entry = referenceOrnaments[asset.id]
      expect(entry.thumb, asset.id).toBe(`/ornaments/referensi/${asset.thumb}`)
      expect(entry.webAsset, asset.id).toBe(`/ornaments/referensi/${asset.web}`)
      expect(existsSync(`${root}apps/web/public${entry.thumb}`), asset.id).toBe(true)
      expect(existsSync(`${root}apps/web/public${entry.webAsset}`), asset.id).toBe(true)
    }
  })

  it('membawa dimensi intrinsik supaya tata letak tidak melompat', () => {
    // `ReferenceAsset.vue` merender `<img>`. Tanpa `width`/`height` tiap aset adalah sumber CLS,
    // dan itu tidak pernah terlihat sampai fase 59 hanya karena tak satu pun bisa dicapai.
    for (const asset of catalog.assets) {
      const entry = referenceOrnaments[asset.id]
      expect(entry.width, asset.id).toBe(asset.width)
      expect(entry.height, asset.id).toBe(asset.height)
      expect(entry.width / entry.height).toBeCloseTo(asset.ratio, 6)
    }
  })

  it.each(catalog.assets)('$id menurunkan ubin WebP di bawah pagu', (asset) => {
    const data = readFileSync(`${root}apps/web/public/ornaments/referensi/${asset.thumb}`)
    // RIFF....WEBP
    expect(data.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(data.subarray(8, 12).toString('ascii')).toBe('WEBP')
    expect(data.length, `${asset.id} ${kb(data.length)}`).toBeLessThanOrEqual(48_000)
  })

  it('memangkas berat yang dikirim tamu, dan angkanya ditulis', () => {
    /*
     * Angka yang membenarkan seluruh langkah ini.
     *
     * Sampai fase 58 keenam puluh lima aset tidak bisa dicapai siapa pun, jadi 24 MB hanya biaya
     * repo. Studio Ornamen membuatnya bisa terbit — dan tanpa varian `web`, satu pasangan yang
     * memilih wayang pengantin sebagai simbol mengirim 1,8 MB ke tiap tamu di data seluler.
     */
    const asal = catalog.assets.reduce((n, a) => n + a.bytes, 0)
    const web = catalog.assets.reduce((n, a) => n + a.webBytes, 0)
    const ubin = catalog.assets.reduce((n, a) => n + a.thumbBytes, 0)

    expect(asal, kb(asal)).toBeGreaterThan(20 * 1024 * 1024)
    expect(web, `web ${kb(web)}`).toBeLessThan(4 * 1024 * 1024)
    expect(ubin, `ubin ${kb(ubin)}`).toBeLessThan(1024 * 1024)

    // Tidak ada satu aset pun yang sendirian memberatkan sebuah undangan.
    const terberat = Math.max(...catalog.assets.map(a => a.webBytes))
    expect(terberat, kb(terberat)).toBeLessThan(400_000)
  })

  it('tidak pernah menunjuk berkas penuh sebagai yang dikirim tamu, kecuali memang lebih ringan', () => {
    for (const asset of catalog.assets) {
      expect(asset.webBytes, asset.id).toBeLessThanOrEqual(asset.bytes)
    }
  })
})
