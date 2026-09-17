import { describe, expect, it } from 'vitest'
import { googleStartHref } from '../utils/google-start'

describe('tautan tombol Google', () => {
  it('membuang /v1, karena callback Google tidak berprefix seperti rute lain', () => {
    expect(googleStartHref('https://api.arunadewa.id/v1', 'arunadewa.id', '/dashboard'))
      .toBe('https://api.arunadewa.id/auth/google/start?next=%2Fdashboard')
  })

  it('mengikuti ejaan loopback halaman, seperti setiap panggilan API lainnya', () => {
    // Tanpa ini, halaman di localhost menerbitkan cookie sesi di host 127.0.0.1 dan orangnya
    // kembali ke /login tanpa satu pun pesan galat.
    expect(googleStartHref('http://127.0.0.1:3001/v1', 'localhost', '/dashboard'))
      .toBe('http://localhost:3001/auth/google/start?next=%2Fdashboard')
  })

  it('meng-encode tujuan, termasuk yang membawa query sendiri', () => {
    expect(googleStartHref('https://api.arunadewa.id/v1', 'arunadewa.id', '/order?paket=aruna'))
      .toBe('https://api.arunadewa.id/auth/google/start?next=%2Forder%3Fpaket%3Daruna')
  })
})
