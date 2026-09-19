import { copyKeys, copyLimit, copySchema } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { copyDefaults, copyGroups, jumlahCopyDiubah, pilihCopy, resolveCopy } from '../utils/invitation-copy'

/**
 * Lapisan kata-kata (fase 69): kontrak menutup daftar kuncinya, berkas ini menjaga agar tiap kunci
 * punya bawaan, label, dan satu tempat di form — kunci yang lolos schema tapi tidak punya salah
 * satunya adalah kalimat yang bisa disimpan tapi tidak pernah bisa disunting atau dirender.
 */
describe('kosakata kata-kata', () => {
  it('memberi tiap kunci satu bawaan yang tidak melampaui batasnya', () => {
    for (const key of copyKeys) {
      expect(copyDefaults[key], key).toBeTruthy()
      expect(copyDefaults[key].length, key).toBeLessThanOrEqual(copyLimit(key))
    }
  })

  it('menaruh tiap kunci di tepat satu grup form, dan tidak ada kunci asing di form', () => {
    const diForm = copyGroups.flatMap(group => group.fields.map(field => field.key))
    expect([...diForm].sort()).toEqual([...copyKeys].sort())
    expect(new Set(diForm).size).toBe(diForm.length)
    for (const group of copyGroups) for (const field of group.fields) expect(field.label, field.key).toBeTruthy()
  })

  it('membatasi label dan tombol lebih ketat daripada kalimat', () => {
    expect(copyLimit('gate.open')).toBe(40)
    expect(copyLimit('rsvp.title')).toBe(80)
    expect(copyLimit('gate.noGuest')).toBe(240)
  })
})

describe('resolveCopy', () => {
  it('membuang kunci asing, non-string, kosong, dan yang kepanjangan', () => {
    expect(resolveCopy({ 'gate.open': ' Buka ', 'x.y': 'z', 'rsvp.yes': 3, 'rsvp.no': '   ', 'gate.kicker': 'a'.repeat(41) }))
      .toEqual({ 'gate.open': 'Buka' })
  })

  it('menerima bukan-objek sebagai kosong', () => {
    expect(resolveCopy(undefined)).toEqual({})
    expect(resolveCopy('teks')).toEqual({})
    expect(resolveCopy(['gate.open'])).toEqual({})
  })
})

describe('pilihCopy dan hitungan', () => {
  it('memakai milik pasangan bila ada, bawaan bila tidak', () => {
    expect(pilihCopy({ 'gate.open': 'Buka' }, 'gate.open')).toBe('Buka')
    expect(pilihCopy({}, 'gate.open')).toBe('Buka Undangan')
    expect(pilihCopy(undefined, 'gate.greeting')).toBe('Kepada Yth.')
  })

  it('menghitung hanya yang benar-benar berbeda dari bawaan', () => {
    expect(jumlahCopyDiubah({ 'gate.open': 'Buka', 'gate.greeting': 'Kepada Yth.' })).toBe(1)
    expect(jumlahCopyDiubah(undefined)).toBe(0)
  })

  it('schema menolak kunci asing dan yang kepanjangan, menerima yang sah', () => {
    expect(copySchema.safeParse({ 'gate.open': 'Buka' }).success).toBe(true)
    expect(copySchema.safeParse({ 'gate.open': 'a'.repeat(41) }).success).toBe(false)
    expect(copySchema.safeParse({ asing: 'x' }).success).toBe(false)
  })
})
