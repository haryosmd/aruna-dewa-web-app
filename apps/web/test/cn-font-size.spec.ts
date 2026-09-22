import { describe, expect, it } from 'vitest'

import { cn } from '../utils/cn'

/*
 * `tailwind-merge` tidak tahu token mana yang ukuran huruf dan mana yang warna — keduanya
 * berejaan `text-…`. Tanpa pendaftaran, `cn('text-white', 'text-ui')` membuang `text-white`, dan
 * tombol primary dasbor berganti jadi tinta gelap di atas terakota: kontras 3,45:1, tertangkap axe.
 *
 * Kerugiannya tidak simetris, dan itu sebabnya cacat ini bertahan lama: ukuran yang hilang cuma
 * terbaca sebagai huruf yang agak besar, sementara warna yang hilang terbaca sebagai kontras yang
 * gagal. Tes ini menjaga keduanya.
 */
describe('cn() mengenali ukuran huruf kustom', () => {
  it('tidak membuang warna saat ukurannya token kustom', () => {
    expect(cn('bg-primary text-white text-ui')).toContain('text-white')
    expect(cn('text-caption text-ink-muted')).toContain('text-caption')
  })

  it('tetap membuat ukuran terakhir menang atas ukuran sebelumnya', () => {
    expect(cn('text-ui text-ui-lg')).toBe('text-ui-lg')
    expect(cn('text-sm text-caption')).toBe('text-caption')
    expect(cn('text-h3 text-body-lg')).toBe('text-body-lg')
  })

  it('tetap membuat warna terakhir menang atas warna sebelumnya', () => {
    expect(cn('text-ink text-ink-muted')).toBe('text-ink-muted')
  })
})
