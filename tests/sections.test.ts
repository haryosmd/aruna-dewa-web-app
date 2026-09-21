import { describe, it, expect } from 'vitest'
import {
  createDefaultDocument, createLegacyDocument, invitationDocumentSchema, migrateLegacyDocument,
  sectionFields, sectionDataSchema, v2SectionTypes, eleganceSectionTypes, sectionMeta, sectionFeature, sectionTypes,
  isRequiredSection, styledFieldKeys, dateParts, catalog,
} from '../packages/contracts/src/index'

describe('struktur bagian Elegance (fase 72)', () => {
  it('dokumen baru = v2 dengan dua belas bagian Elegance urut, lalu bagian ekstra mati', () => {
    const d = createDefaultDocument('Dea', 'Haryo', 'aruna-bloom', { date: '2026-10-03' })
    expect(d.schemaVersion).toBe(2)
    expect(d.sections.slice(0, 12).map(s => s.type)).toEqual([...eleganceSectionTypes])
    expect(d.sections.slice(12).every(s => !s.enabled)).toBe(true)
    expect(invitationDocumentSchema.parse(d)).toEqual(d)
    const env = d.sections[0]!.data
    expect(env.title).toBe('Dea & Haryo')
    expect(env.sealMonogram).toBe('D & H')
    expect(env.date).toBe('03 · 10 · 2026')
    const event = d.sections.find(s => s.type === 'event')!.data
    expect(event).toMatchObject({ day: 'Sabtu', date: '03', monthYear: 'Oktober 2026' })
    expect(d.sections.find(s => s.type === 'countdown')!.data.targetDate).toBe('2026-10-03T08:00')
  })

  it('tiap tipe v2 punya meta, kolom, fitur paket, dan skema data yang menerima bawaannya', () => {
    const d = createDefaultDocument()
    for (const type of v2SectionTypes) {
      expect(sectionMeta[type].label).toBeTruthy()
      expect(sectionFields[type].length).toBeGreaterThan(0)
      expect(sectionTypes).toContain(type)
      expect(catalog.packages[0]!.features.concat(catalog.addons.map(a => a.id))).toContain(sectionFeature[type])
      const section = d.sections.find(s => s.type === type)!
      expect(sectionDataSchema(type).safeParse(section.data).success).toBe(true)
    }
    expect(isRequiredSection('hero')).toBe(true)
    expect(isRequiredSection('quote')).toBe(false)
  })

  it('memvalidasi kolom v2: panjang, gaya teks per kolom, latar, gerak', () => {
    const d = createDefaultDocument()
    const hero = d.sections.find(s => s.type === 'hero')!
    const dengan = (patch: Record<string, unknown>) => invitationDocumentSchema.safeParse({ ...d, sections: d.sections.map(s => s === hero ? { ...s, data: { ...s.data, ...patch } } : s) }).success
    expect(dengan({ title: 'a'.repeat(121) })).toBe(false)
    expect(dengan({ textStyles: { title: { fontFamily: 'great-vibes', fontSize: 48, color: '#994B36', fontWeight: 'bold' } } })).toBe(true)
    expect(dengan({ textStyles: { title: { fontSize: 200 } } })).toBe(false)
    expect(dengan({ textStyles: { imageUrl: { fontSize: 20 } } })).toBe(false)
    expect(dengan({ background: { color: '#FFF7F0', imageUrl: '/uploads/x.webp', overlay: 0.4 } })).toBe(true)
    expect(dengan({ background: { color: 'merah' } })).toBe(false)
    expect(dengan({ motion: 'sweep' })).toBe(true)
    expect(dengan({ motion: 'lompat' })).toBe(false)
    expect(styledFieldKeys('hero')).not.toContain('imageUrl')
    expect(invitationDocumentSchema.safeParse({ ...d, settings: { musicUrl: '/a.mp3', musicVolume: 0.6 } }).success).toBe(true)
    expect(invitationDocumentSchema.safeParse({ ...d, settings: { musicVolume: 2 } }).success).toBe(false)
    expect(invitationDocumentSchema.safeParse({ ...d, shareCard: { styleId: 'elegan', showGuestName: true } }).success).toBe(true)
    expect(invitationDocumentSchema.safeParse({ ...d, tokens: { ...d.tokens, layout: 'penuh' } }).success).toBe(true)
  })

  it('memigrasikan dokumen v1 ke v2 tanpa kehilangan nama, foto, rekening, dan ornamen', () => {
    const lama = createLegacyDocument('Dea', 'Haryo')
    const cover = lama.sections.find(s => s.type === 'cover')!
    cover.data = { ...cover.data, image: '/uploads/cover.webp', ornamentOverrides: { divider: 'divider-x' } }
    const gift = lama.sections.find(s => s.type === 'gift')!
    gift.enabled = true
    gift.data = { title: 'Hadiah', note: 'Catatan', address: '', accounts: [{ id: 'a', bankId: 'bca', bankLabel: 'BCA', number: '123', holder: 'Dea', owner: 'cpw' }, { id: 'b', bankId: 'bri', bankLabel: 'BRI', number: '456', holder: 'Haryo', owner: 'cpp' }] }
    lama.copy = { 'gate.open': 'Buka Amplop' }
    const music = lama.sections.find(s => s.type === 'music')!
    music.data = { url: '/uploads/lagu.mp3', title: 'Lagu' }
    const baru = migrateLegacyDocument(lama)
    expect(baru.schemaVersion).toBe(2)
    expect(invitationDocumentSchema.safeParse(baru).success).toBe(true)
    expect(baru.copy).toBeUndefined()
    const env = baru.sections.find(s => s.type === 'opening-envelope')!.data
    expect(env.title).toBe('Dea & Haryo')
    expect(env.sealLabel).toBe('Buka Amplop')
    expect(env.ornamentOverrides).toEqual({ divider: 'divider-x' })
    expect(baru.sections.find(s => s.type === 'hero')!.data.imageUrl).toBe('/uploads/cover.webp')
    expect(baru.sections.find(s => s.type === 'couple')!.data).toMatchObject({ brideName: 'Dea', groomName: 'Haryo' })
    expect(baru.sections.find(s => s.type === 'gift')!.data).toMatchObject({ bank1: 'BCA', account1: '123', hasSecondAccount: true, bank2: 'BRI', account2: '456' })
    expect(baru.settings).toEqual({ musicUrl: '/uploads/lagu.mp3', musicTitle: 'Lagu' })
    expect(migrateLegacyDocument(baru)).toBe(baru)
  })

  /*
   * Invarian yang menjaga `publish()` (`invitations.service.ts`): ia menolak undangan yang
   * menyalakan bagian di luar entitlement paketnya. `gift` pernah lahir menyala padahal ia fitur
   * Mekar ke atas, dan akibatnya setiap undangan BARU di paket Mula gagal terbit — galatnya muncul
   * di tombol Publikasikan, bukan di berkas yang menyebabkannya.
   */
  it('setiap bagian yang menyala secara bawaan tercakup paket dasar', () => {
    const dasar = new Set(catalog.packages[0]!.features)
    const d = createDefaultDocument()
    expect(d.sections.filter(s => s.enabled && !dasar.has(sectionFeature[s.type])).map(s => s.type)).toEqual([])
    // Penjaga arah sebaliknya: invarian di atas tidak boleh bisa dihijaukan dengan mematikan semuanya.
    expect(d.sections.filter(s => !s.enabled).map(s => s.type)).toEqual(['unduh-mantu', 'gift', 'story', 'rundown', 'dresscode', 'video'])
  })

  it('dokumen hasil migrasi pun tidak lahir dalam keadaan tidak bisa terbit', () => {
    const dasar = new Set(catalog.packages[0]!.features)
    const baru = migrateLegacyDocument(createLegacyDocument('Dea', 'Haryo'))
    expect(baru.sections.filter(s => s.enabled && !dasar.has(sectionFeature[s.type])).map(s => s.type)).toEqual([])
  })

  it('memecah tanggal untuk kolom teks referensi', () => {
    expect(dateParts('2026-10-03')).toMatchObject({ day: 'Sabtu', date: '03', monthYear: 'Oktober 2026', dotted: '03 · 10 · 2026' })
    expect(dateParts('')).toMatchObject({ day: '', dotted: '' })
  })
})
