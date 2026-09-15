import { describe, expect, it } from 'vitest'
import { mediaAssetIdFromUrl, validateMediaFile } from '../utils/media-file'

function fileOf(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type })
  // `size` tidak bisa disetel lewat konstruktor tanpa mengalokasikan byte sungguhan.
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validasi berkas media di klien', () => {
  it('meloloskan foto yang benar', () => {
    expect(validateMediaFile(fileOf('prewed.jpg', 'image/jpeg', 2_000_000), 'image')).toBeNull()
    expect(validateMediaFile(fileOf('cover.webp', 'image/webp', 400_000), 'image')).toBeNull()
  })

  it('menolak jenis yang dulu lolos accept="image/*" lalu ditolak server', () => {
    expect(validateMediaFile(fileOf('nikah.gif', 'image/gif', 500_000), 'image'))
      .toBe('nikah.gif — jenis berkas harus JPG, JPEG, PNG, atau WebP')
    expect(validateMediaFile(fileOf('logo.svg', 'image/svg+xml', 4_000), 'image')).toContain('jenis berkas harus')
  })

  it('menyebut nama berkas dan ukurannya, bukan cuma "terlalu besar"', () => {
    // Satu jatuhan bisa berisi sepuluh foto; pesan tanpa nama tidak memberi tahu yang mana.
    expect(validateMediaFile(fileOf('prewed-04.jpg', 'image/jpeg', 14_900_000), 'image'))
      .toBe('prewed-04.jpg — 14,2 MB, maksimal 10,0 MB')
  })

  it('menolak berkas kosong', () => {
    expect(validateMediaFile(fileOf('kosong.png', 'image/png', 0), 'image')).toBe('kosong.png — berkasnya kosong')
  })

  it('meloloskan ekstensi benar yang tipenya tidak dilaporkan ponsel', () => {
    expect(validateMediaFile(fileOf('foto.webp', 'application/octet-stream', 300_000), 'image')).toBeNull()
    expect(validateMediaFile(fileOf('lagu.mp3', '', 3_000_000), 'audio')).toBeNull()
    // Tapi tipe yang jelas-jelas salah tetap ditolak walau ekstensinya benar.
    expect(validateMediaFile(fileOf('lagu.mp3', 'video/mp4', 3_000_000), 'audio')).toContain('harus MP3')
  })

  it('memisahkan aset unggahan dari URL lain, supaya hanya milik kita yang ikut dihapus', () => {
    const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
    expect(mediaAssetIdFromUrl(`https://api.aruna.test/v1/public/media/${id}`)).toBe(id)
    expect(mediaAssetIdFromUrl('https://images.unsplash.com/photo-123.jpg')).toBeNull()
    expect(mediaAssetIdFromUrl('/images/couple.webp')).toBeNull()
  })
})
