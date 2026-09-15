import { describe, expect, it } from 'vitest'
import { convertedName, maxPhotoEdge, targetSize } from '../utils/image-normalize'

describe('normalisasi foto sebelum unggah', () => {
  it('tidak pernah memperbesar foto yang sudah kecil', () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 })
    expect(targetSize(maxPhotoEdge, 1200)).toEqual({ width: maxPhotoEdge, height: 1200 })
  })

  it('menurunkan sisi terpanjang ke batas dan menjaga rasionya', () => {
    expect(targetSize(4032, 3024)).toEqual({ width: 2000, height: 1500 })
    // Potret: yang dibatasi tingginya, bukan lebarnya.
    expect(targetSize(3024, 4032)).toEqual({ width: 1500, height: 2000 })
  })

  it('tidak pernah menghasilkan sisi nol pada foto panorama ekstrem', () => {
    const size = targetSize(20000, 3)
    expect(size.width).toBe(2000)
    expect(size.height).toBeGreaterThanOrEqual(1)
  })

  it('mengganti ekstensi, bukan menempelinya', () => {
    expect(convertedName('IMG_0421.HEIC', 'image/webp')).toBe('IMG_0421.webp')
    expect(convertedName('prewed.jpg', 'image/webp')).toBe('prewed.webp')
    expect(convertedName('tanpa-ekstensi', 'image/webp')).toBe('tanpa-ekstensi.webp')
  })

  /*
   * `toBlob` boleh mengabaikan jenis yang diminta dan mengembalikan PNG — spesifikasinya
   * mengizinkan, dan WebKit memakainya. Sebelum ini hasilnya tetap dinamai `.webp` dan
   * dilabeli `image/webp`, jadi pemeriksaan magic-byte di server menolak **setiap** unggahan
   * dari browser tanpa encoder WebP: "Isi berkas tidak cocok dengan jenis media yang diklaim".
   */
  it('menamai berkas menurut jenis yang benar-benar dihasilkan', () => {
    expect(convertedName('prewed.jpg', 'image/png')).toBe('prewed.png')
    expect(convertedName('IMG_0421.HEIC', 'image/jpeg')).toBe('IMG_0421.jpg')
  })

  it('membiarkan nama aslinya kalau jenisnya tidak dikenal', () => {
    expect(convertedName('prewed.jpg', 'application/octet-stream')).toBe('prewed.jpg')
    expect(convertedName('prewed.jpg', '')).toBe('prewed.jpg')
  })
})
