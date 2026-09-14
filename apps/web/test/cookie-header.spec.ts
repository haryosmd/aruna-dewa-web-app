import { describe, expect, it } from 'vitest'
import { mergeCookieHeader } from '../utils/cookie-header'

describe('mergeCookieHeader', () => {
  it('membuang atribut Set-Cookie dan menyisakan nama=nilai', () => {
    expect(mergeCookieHeader(undefined, ['aruna_access=abc; Path=/; HttpOnly; Max-Age=900'])).toBe('aruna_access=abc')
  })

  it('menimpa cookie lama dengan yang baru diterbitkan', () => {
    const merged = mergeCookieHeader('aruna_access=lama; aruna_refresh=lama-refresh', [
      'aruna_access=baru; Path=/; HttpOnly',
      'aruna_refresh=baru-refresh; Path=/; HttpOnly',
    ])
    expect(merged).toBe('aruna_access=baru; aruna_refresh=baru-refresh')
  })

  it('membiarkan cookie milik pihak lain apa adanya', () => {
    expect(mergeCookieHeader('tema=gelap; aruna_access=lama', ['aruna_access=baru; Path=/'])).toBe('tema=gelap; aruna_access=baru')
  })

  it('menjaga nilai yang mengandung tanda sama dengan', () => {
    expect(mergeCookieHeader(undefined, ['aruna_refresh=sid.tok==; Path=/'])).toBe('aruna_refresh=sid.tok==')
  })

  it('menerima header kosong dan spasi berlebih', () => {
    expect(mergeCookieHeader('  ', [])).toBe('')
    expect(mergeCookieHeader(' a=1 ;  b=2 ', [])).toBe('a=1; b=2')
  })
})
