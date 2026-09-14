import { describe, expect, it } from 'vitest'
import { apiBaseForPage } from '../utils/api-origin'

describe('apiBaseForPage', () => {
  it('mengikuti ejaan loopback halaman supaya cookie sesi tetap first-party', () => {
    expect(apiBaseForPage('http://127.0.0.1:3001/v1', 'localhost')).toBe('http://localhost:3001/v1')
    expect(apiBaseForPage('http://localhost:3001/v1', '127.0.0.1')).toBe('http://127.0.0.1:3001/v1')
    expect(apiBaseForPage('http://127.0.0.1:3001/v1', '[::1]')).toBe('http://[::1]:3001/v1')
  })

  it('mempertahankan port, skema dan path API', () => {
    expect(apiBaseForPage('http://127.0.0.1:3001', 'localhost')).toBe('http://localhost:3001')
    expect(apiBaseForPage('http://127.0.0.1:4000/v1/nested', 'localhost')).toBe('http://localhost:4000/v1/nested')
  })

  it('tidak menyentuh host produksi dari sisi mana pun', () => {
    expect(apiBaseForPage('https://api.arunadewa.id/v1', 'localhost')).toBe('https://api.arunadewa.id/v1')
    expect(apiBaseForPage('http://127.0.0.1:3001/v1', 'arunadewa.id')).toBe('http://127.0.0.1:3001/v1')
  })

  it('membiarkan base relatif dan host yang tidak diketahui apa adanya', () => {
    expect(apiBaseForPage('/api/v1', 'localhost')).toBe('/api/v1')
    expect(apiBaseForPage('http://127.0.0.1:3001/v1', undefined)).toBe('http://127.0.0.1:3001/v1')
    expect(apiBaseForPage('http://127.0.0.1:3001/v1', '')).toBe('http://127.0.0.1:3001/v1')
  })
})
