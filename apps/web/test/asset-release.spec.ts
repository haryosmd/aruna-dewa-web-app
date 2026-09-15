import { describe, expect, it } from 'vitest'
import { releasableUrls, stillQueued } from '../utils/asset-release'

const asset = (id: string) => `http://127.0.0.1:3001/v1/public/media/${id}`
const a = asset('11111111-1111-4111-8111-111111111111')
const b = asset('22222222-2222-4222-8222-222222222222')

const dokumen = (...urls: string[]) => JSON.stringify({ sections: [{ data: { images: urls } }] })

describe('aturan pelepasan aset', () => {
  it('melepas aset yang sudah tidak disebut dokumen tersimpan', () => {
    expect(releasableUrls([a], dokumen())).toEqual([a])
  })

  /*
   * Foto yang sama boleh dipakai di cover dan di galeri sekaligus. Menghapusnya dari salah
   * satu tidak boleh membuang berkasnya — undangan yang sudah disebar akan kehilangan cover.
   */
  it('menahan aset yang masih disebut di tempat lain', () => {
    expect(releasableUrls([a], dokumen(a))).toEqual([])
    expect(stillQueued([a], dokumen(a))).toEqual([a])
  })

  it('mengabaikan URL yang bukan aset unggahan kita', () => {
    const luar = 'https://images.unsplash.com/photo-123.jpg'
    expect(releasableUrls([luar], dokumen())).toEqual([])
    // Dan tidak disimpan untuk percobaan berikutnya: tidak ada yang bisa dihapus untuknya.
    expect(stillQueued([luar], dokumen(luar))).toEqual([])
  })

  it('memilah antrean campuran dalam satu putaran', () => {
    expect(releasableUrls([a, b], dokumen(b))).toEqual([a])
    expect(stillQueued([a, b], dokumen(b))).toEqual([b])
  })

  it('tidak melepas URL yang sama dua kali walau mengantre dua kali', () => {
    expect(releasableUrls([a, a], dokumen())).toEqual([a])
  })

  it('antrean kosong tidak menghasilkan apa-apa', () => {
    expect(releasableUrls([], dokumen(a))).toEqual([])
    expect(stillQueued([], dokumen(a))).toEqual([])
  })
})
