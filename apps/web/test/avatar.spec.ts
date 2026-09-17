import { describe, expect, it } from 'vitest'
import { avatarCount, avatarIndex } from '../utils/avatar'

const uuid = (n: number) => `3f2a${n.toString(16).padStart(4, '0')}-1c4b-4e7a-9d0f-${n.toString(16).padStart(12, '0')}`

describe('pemilihan avatar', () => {
  it('memberi jawaban yang sama untuk id yang sama, selamanya', () => {
    const id = 'a2f1c9de-0b44-4c19-90ab-7f2e1d3c4b5a'
    expect(avatarIndex(id)).toBe(avatarIndex(id))
  })

  it('selalu menunjuk avatar yang benar-benar ada', () => {
    for (let n = 0; n < 500; n += 1) {
      const index = avatarIndex(uuid(n))
      expect(Number.isInteger(index)).toBe(true)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(avatarCount)
    }
  })

  it('memakai kelima avatar, bukan menumpuk semua orang di satu gambar', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, n) => avatarIndex(uuid(n))))
    expect(seen.size).toBe(avatarCount)
  })

  /**
   * UUID berbeda sering tersusun dari karakter yang sama persis. Penjumlahan tanpa bobot
   * posisi memberi keduanya avatar yang sama, dan dua akun berbeda di satu layar jadi kembar.
   */
  it('membedakan id yang cuma tertukar urutannya', () => {
    expect(avatarIndex('abcd1234')).not.toBe(avatarIndex('1234abcd'))
  })

  it('tidak meledak untuk id yang belum ada', () => {
    expect(avatarIndex(null)).toBe(0)
    expect(avatarIndex(undefined)).toBe(0)
    expect(avatarIndex('')).toBe(0)
  })
})
