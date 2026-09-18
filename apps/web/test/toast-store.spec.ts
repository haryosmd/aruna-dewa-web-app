// @vitest-environment happy-dom
//
// Butuh `window` supaya cabang pewaktu di `show()` benar-benar dimasuki — di lingkungan node
// store-nya sengaja tidak memasang `setTimeout` sama sekali (lihat alasannya di `stores/toast.ts`).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useToastStore } from '../stores/toast'

describe('antrean toast', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => { vi.useRealTimers() })

  it('menaruh yang terbaru di depan', () => {
    const toast = useToastStore()
    toast.show('success', 'Pertama')
    toast.show('error', 'Kedua')

    expect(toast.entries.map(e => e.title)).toEqual(['Kedua', 'Pertama'])
    expect(toast.entries[0]!.tone).toBe('error')
  })

  it('pergi sendiri setelah durasi bawaan', () => {
    const toast = useToastStore()
    toast.show('success', 'Draft tersimpan.')

    vi.advanceTimersByTime(3999)
    expect(toast.entries).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(toast.entries).toHaveLength(0)
  })

  it('menghormati durasi yang diminta pemanggil', () => {
    const toast = useToastStore()
    toast.show('error', 'http://contoh', { description: 'Salin manual.', duration: 10000 })

    vi.advanceTimersByTime(4000)
    expect(toast.entries).toHaveLength(1)

    vi.advanceTimersByTime(6000)
    expect(toast.entries).toHaveLength(0)
  })

  it('durasi 0 berarti menetap sampai ditutup', () => {
    const toast = useToastStore()
    const key = toast.show('message', 'Menunggu', { duration: 0 })

    vi.advanceTimersByTime(60_000)
    expect(toast.entries).toHaveLength(1)

    toast.dismiss(key)
    expect(toast.entries).toHaveLength(0)
  })

  it('menahan tiga sekaligus dan membuang yang paling tua', () => {
    const toast = useToastStore()
    for (const judul of ['Satu', 'Dua', 'Tiga']) toast.show('success', judul)
    toast.show('success', 'Empat', { duration: 0 })

    expect(toast.entries.map(e => e.title)).toEqual(['Empat', 'Tiga', 'Dua'])

    vi.advanceTimersByTime(60_000)
    expect(toast.entries.map(e => e.title)).toEqual(['Empat'])
  })

  /*
   * Diukur lewat `getTimerCount()`, bukan lewat isi daftarnya, dan itu bukan pilihan gaya.
   *
   * `key` unik, jadi pewaktu yatim milik toast yang sudah terdorong keluar tidak pernah membuat
   * daftarnya salah — ia hanya memanggil `dismiss()` untuk kunci yang sudah tidak ada. Assert
   * berbasis isi daftar karena itu tetap hijau walau pembatalannya dihapus; sudah dicoba saat tes
   * ini ditulis, dan versi pertamanya memang tidak menguji apa pun. Yang bisa dilihat hanya
   * pewaktunya sendiri.
   */
  it('membatalkan pewaktu toast yang terdorong keluar oleh batas tampil', () => {
    const toast = useToastStore()
    for (const judul of ['Satu', 'Dua', 'Tiga']) toast.show('success', judul)
    expect(vi.getTimerCount()).toBe(3)

    toast.show('success', 'Empat', { duration: 0 })
    expect(vi.getTimerCount()).toBe(2)
  })

  it('dismiss aman dipanggil dua kali dan untuk kunci yang tidak dikenal', () => {
    const toast = useToastStore()
    const key = toast.show('success', 'Tamu ditambahkan.')

    toast.dismiss(key)
    toast.dismiss(key)
    toast.dismiss(9999)

    expect(toast.entries).toHaveLength(0)
  })
})
