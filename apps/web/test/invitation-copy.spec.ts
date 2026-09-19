import { copyKeys, copyLimit, copySchema, sectionTypes } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { copyClustersFor, copyDefaults, copyGroups, copyGroupsFor, copyKeysFor, jumlahCopyDiubah, jumlahCopyDiubahDi, pilihCopy, resolveCopy } from '../utils/invitation-copy'

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

/**
 * Form bagian (fase 71): tiap grup tampil di tepat satu form bagian — `gate` menumpang di cover —
 * dan kolom-kolomnya dikelompokkan menurut fungsi tanpa judul payung.
 */
describe('copyGroupsFor dan kelompok per fungsi', () => {
  it('menaruh amplop pembuka di form cover, dan bagian tanpa tulisan sistem tidak dapat apa-apa', () => {
    expect(copyGroupsFor('cover').map(group => group.section)).toEqual(['gate', 'cover'])
    expect(copyGroupsFor('rsvp').map(group => group.section)).toEqual(['rsvp'])
    expect(copyGroupsFor('closing')).toEqual([])
    expect(copyGroupsFor('music')).toEqual([])
  })

  it('setiap grup tampil di tepat satu form bagian', () => {
    const semua = sectionTypes.flatMap(section => copyGroupsFor(section))
    expect(semua).toEqual(copyGroups)
  })

  it('kunci per bagian hanya milik bagian itu, dan hitungannya tidak membaca bagian lain', () => {
    for (const key of copyKeysFor('rsvp')) expect(key.startsWith('rsvp.')).toBe(true)
    expect(jumlahCopyDiubahDi({ 'rsvp.yes': 'Datang', 'gate.open': 'Buka', 'rsvp.no': 'Berhalangan' }, copyKeysFor('rsvp'))).toBe(1)
  })

  it('mengelompokkan kolom menurut fungsi, urut kemunculan pertama, tanpa kelompok kosong', () => {
    const rsvp = copyClustersFor('rsvp')
    expect(rsvp.map(cluster => cluster.judul)).toEqual(['Judul & pengantar', 'Pilihan jawaban', 'Tombol', 'Pesan setelah menjawab'])
    expect(rsvp.flatMap(cluster => cluster.fields.map(field => field.key)).sort()).toEqual([...copyKeysFor('rsvp')].sort())
    for (const section of sectionTypes) for (const cluster of copyClustersFor(section)) expect(cluster.fields.length, cluster.judul).toBeGreaterThan(0)
  })

  it('tidak memakai istilah desain sebagai label kolom', () => {
    for (const group of copyGroups) for (const field of group.fields) expect(field.label.toLowerCase(), field.key).not.toMatch(/kicker/)
  })
})
