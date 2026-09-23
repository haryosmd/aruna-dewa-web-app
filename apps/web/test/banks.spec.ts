import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { bankIds, matchBankAlias } from '@aruna/contracts'

import { bankPresentation } from '../utils/banks'

/**
 * Fase 82 — daftar bank dan tile lambangnya. Bank baru yang lupa diberi presentasi atau berkas
 * logo akan tampil sebagai gambar rusak di kartu hadiah tamu; itu yang dijaga di sini.
 */
const publik = (path: string) => fileURLToPath(new URL(`../public${path}`, import.meta.url))

describe('daftar bank', () => {
  it('tiap bankId punya presentasi dan berkas tile-nya ada', () => {
    for (const id of bankIds) {
      const bank = bankPresentation[id]
      expect(bank, id).toBeDefined()
      expect(existsSync(publik(bank.logo)), bank.logo).toBe(true)
    }
  })
})

describe('menebak bank dari nama yang diketik', () => {
  it.each([
    ['Bank Danamon', 'danamon'],
    ['DANA', 'dana'],
    ['CIMB Niaga', 'cimb'],
    ['GoPay', 'gopay'],
    ['Go-Pay', 'gopay'],
    ['BNI', 'bni'],
    ['Bank Negara Indonesia', 'bni'],
    ['digibank by DBS', 'digibank'],
    ['HSBC', 'hsbc'],
    ['OVO', 'ovo'],
    ['Bank BCA', 'bca'],
    ['Jenius', 'jenius'],
    ['Bank Kampung', 'other'],
  ])('%s → %s', (nama, id) => {
    expect(matchBankAlias(nama)).toBe(id)
  })
})
