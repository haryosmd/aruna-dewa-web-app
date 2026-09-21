import { describe, expect, it } from 'vitest'

import { cropRect, type CropRect } from '../utils/image-normalize'

/*
 * `cropRect` dipisah dari canvas dengan sengaja (pola `targetSize`): perhitungan kotak pangkas
 * adalah tempat bug pangkas biasanya hidup, dan ia tidak butuh browser untuk diuji.
 *
 * Yang dijaga di sini bukan "rumusnya benar" melainkan "nilai yang tidak masuk akal tidak
 * pernah sampai ke `drawImage`": canvas melempar pada lebar 0, dan menggambar di luar batas
 * menghasilkan pita transparan yang terlihat seperti foto rusak.
 */
const foto = { width: 4000, height: 3000 }
const kotak = (rect: Partial<CropRect>): CropRect => ({ x: 0, y: 0, width: 1, height: 1, ...rect })

describe('cropRect', () => {
  it('menerjemahkan kotak ternormalisasi ke piksel foto aslinya', () => {
    expect(cropRect(foto, kotak({ x: 0.25, y: 0.5, width: 0.5, height: 0.25 })))
      .toEqual({ x: 1000, y: 1500, width: 2000, height: 750 })
  })

  it('kotak penuh mengembalikan foto utuh', () => {
    expect(cropRect(foto, kotak({}))).toEqual({ x: 0, y: 0, width: 4000, height: 3000 })
  })

  it('memotong kotak yang melewati tepi, bukan menolaknya', () => {
    // Pointer event bisa mendarat satu piksel di luar gambar; menolak seluruh pangkasan
    // karena itu akan terasa seperti bug, bukan seperti penjagaan.
    expect(cropRect(foto, kotak({ x: 0.8, width: 0.5 }))).toEqual({ x: 3200, y: 0, width: 800, height: 3000 })
    expect(cropRect(foto, kotak({ y: 0.9, height: 0.4 }))).toEqual({ x: 0, y: 2700, width: 4000, height: 300 })
  })

  it('menjinakkan koordinat negatif', () => {
    expect(cropRect(foto, kotak({ x: -0.5, y: -1, width: 0.5, height: 0.5 })))
      .toEqual({ x: 0, y: 0, width: 2000, height: 1500 })
  })

  it('kotak yang menyusut jadi nol dikembalikan sebagai foto utuh — canvas melempar pada 0x0', () => {
    expect(cropRect(foto, kotak({ width: 0, height: 0 }))).toEqual({ x: 0, y: 0, width: 4000, height: 3000 })
    expect(cropRect(foto, kotak({ x: 1, width: 0.2 }))).toEqual({ x: 0, y: 0, width: 4000, height: 3000 })
  })

  it('NaN dan Infinity tidak pernah lolos ke canvas', () => {
    expect(cropRect(foto, kotak({ x: Number.NaN, width: Number.POSITIVE_INFINITY })))
      .toEqual({ x: 0, y: 0, width: 4000, height: 3000 })
  })

  it('foto tanpa ukuran dikembalikan apa adanya, bukan dibagi nol', () => {
    expect(cropRect({ width: 0, height: 0 }, kotak({ x: 0.2, width: 0.5 }))).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('hasil pangkas tidak pernah melampaui foto aslinya', () => {
    for (const rect of [kotak({ x: 0.33, y: 0.66, width: 0.9, height: 0.9 }), kotak({ x: 0.999, y: 0.999, width: 1, height: 1 })]) {
      const hasil = cropRect(foto, rect)
      expect(hasil.x + hasil.width).toBeLessThanOrEqual(foto.width)
      expect(hasil.y + hasil.height).toBeLessThanOrEqual(foto.height)
    }
  })
})
