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
    music.enabled = true
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

/*
 * Kesetiaan migrasi v1→v2 (fase 73.3).
 *
 * Migrator pernah hanya membawa `enabled` milik hadiah dan empat bagian ekstra, jadi bagian yang
 * sengaja dimatikan pasangan menyala lagi — dan mereka menemukannya dari undangan yang sudah
 * beredar. Tiga tes di bawah sengaja menagih KEHILANGAN, supaya ia tetap keputusan dan berbunyi
 * kalau suatu saat ditambal diam-diam.
 */
describe('kesetiaan migrasi v1→v2', () => {
  const cari = (doc: ReturnType<typeof createLegacyDocument>, type: string) => doc.sections.find(s => s.type === type)!
  const hasil = (ubah: (doc: ReturnType<typeof createLegacyDocument>) => void = () => {}) => {
    const doc = createLegacyDocument('Dea', 'Haryo')
    ubah(doc)
    return migrateLegacyDocument(doc)
  }
  const bagian = (doc: ReturnType<typeof migrateLegacyDocument>, type: string) => doc.sections.find(s => s.type === type)!
  const acara = (items: Record<string, unknown>[]) => (doc: ReturnType<typeof createLegacyDocument>) => { cari(doc, 'events').data = { ...cari(doc, 'events').data, events: items } }

  it('membawa `enabled` bagian yang dimatikan pasangan', () => {
    const baru = hasil(doc => { for (const type of ['countdown', 'gallery', 'events', 'rsvp', 'wishes']) cari(doc, type).enabled = false })
    expect(bagian(baru, 'countdown').enabled).toBe(false)
    expect(bagian(baru, 'gallery').enabled).toBe(false)
    expect(bagian(baru, 'map').enabled).toBe(false)
    expect(bagian(baru, 'wishes').enabled).toBe(false)
    // `event` wajib di v2: ia tidak punya sakelar di rail sama sekali.
    expect(bagian(baru, 'event').enabled).toBe(true)
  })

  it('penutup yang dimatikan di v1 menyala lagi — satu-satunya bagian yang berpindah ke wajib', () => {
    expect(bagian(hasil(doc => { cari(doc, 'closing').enabled = false }), 'closing').enabled).toBe(true)
    expect(isRequiredSection('closing')).toBe(true)
  })

  it('melebur rsvp dan wishes: cukup salah satunya menyala', () => {
    const kehadiran = (rsvp: boolean, wishes: boolean) => bagian(hasil(doc => { cari(doc, 'rsvp').enabled = rsvp; cari(doc, 'wishes').enabled = wishes }), 'wishes').enabled
    expect(kehadiran(true, false)).toBe(true)
    expect(kehadiran(false, true)).toBe(true)
    expect(kehadiran(false, false)).toBe(false)
    // Dokumen lama yang tidak punya kedua bagian itu sama sekali ikut bawaan v2.
    const tanpa = migrateLegacyDocument({ ...createLegacyDocument('Dea', 'Haryo'), sections: createLegacyDocument('Dea', 'Haryo').sections.filter(s => s.type !== 'rsvp' && s.type !== 'wishes') })
    expect(tanpa.sections.find(s => s.type === 'wishes')!.enabled).toBe(true)
  })

  it('musik yang sengaja dibisukan tidak ikut berbunyi sesudah migrasi', () => {
    const mati = hasil(doc => { cari(doc, 'music').data = { url: '/uploads/lagu.mp3' } })
    expect(mati.settings).toBeUndefined()
    const nyala = hasil(doc => { cari(doc, 'music').enabled = true; cari(doc, 'music').data = { url: '/uploads/lagu.mp3' } })
    expect(nyala.settings).toEqual({ musicUrl: '/uploads/lagu.mp3' })
  })

  it('membaca tanggal dari acara pertama, lalu hitung mundur sebagai cadangan', () => {
    const dari = (ubah: (doc: ReturnType<typeof createLegacyDocument>) => void) => bagian(hasil(ubah), 'event').data
    const lewatAcara = dari(acara([{ id: 'a', name: 'Akad', date: '2026-10-03', time: '09:00' }]))
    expect(lewatAcara).toMatchObject({ day: 'Sabtu', date: '03', monthYear: 'Oktober 2026' })
    const lewatHitungMundur = dari(doc => { cari(doc, 'countdown').data = { date: '2026-10-03' } })
    expect(lewatHitungMundur).toMatchObject({ day: 'Sabtu', date: '03', monthYear: 'Oktober 2026' })
  })

  it('tidak pernah menulis ISO ke kolom "Hari" yang berbatas 20 karakter', () => {
    const baru = hasil(acara([{ id: 'a', name: 'Akad', date: '2026-10-03T09:00:00.000Z', time: '09:00' }]))
    expect(bagian(baru, 'event').data.day as string).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(invitationDocumentSchema.safeParse(baru).success).toBe(true)
  })

  it('membawa acara ketiga ke Unduh Mantu, dan mengakui kehilangan acara keempat', () => {
    const empat = [
      { id: '1', name: 'Akad', date: '2026-10-03', time: '09:00', venue: 'Masjid Agung', address: 'Jl. Masjid 1' },
      { id: '2', name: 'Resepsi', date: '2026-10-03', time: '11:00', venue: 'Pendopo Aruna', address: 'Jl. Pendopo 2' },
      { id: '3', name: 'Ngunduh Mantu', date: '2026-10-10', time: '10:00', venue: 'Kediaman mempelai pria', address: 'Jl. Melati 12', mapUrl: 'https://maps.example/x' },
      { id: '4', name: 'Siraman', date: '2026-10-02', time: '15:00', venue: 'Kediaman mempelai wanita', address: 'Jl. Kenanga 7' },
    ]
    const baru = hasil(acara(empat))
    const unduh = bagian(baru, 'unduh-mantu')
    expect(unduh.enabled).toBe(true)
    expect(unduh.data).toMatchObject({ title: 'Ngunduh Mantu', mapUrl: 'https://maps.example/x' })
    expect(unduh.data.address as string).toContain('Jl. Melati 12')
    // Kehilangan yang dipilih: Elegance tidak punya rumah untuk acara keempat.
    expect(JSON.stringify(baru)).not.toContain('Siraman')
    expect(invitationDocumentSchema.safeParse(baru).success).toBe(true)
  })

  it('membawa alamat resepsi yang berbeda ke bagian Lokasi, tanpa menggandakan yang sama', () => {
    const beda = hasil(acara([
      { id: '1', name: 'Akad', venue: 'Masjid Agung', address: 'Jl. Masjid 1' },
      { id: '2', name: 'Resepsi', venue: 'Pendopo Aruna', address: 'Jl. Pendopo 2' },
    ]))
    const subtitle = bagian(beda, 'map').data.subtitle as string
    expect(subtitle).toContain('Pendopo Aruna')
    expect(subtitle.length).toBeLessThanOrEqual(400)
    const sama = hasil(acara([{ id: '1', name: 'Akad', venue: 'Masjid Agung', address: 'Jl. Masjid 1' }]))
    const satu = bagian(sama, 'map').data.subtitle as string
    expect(satu.split('Masjid Agung').length - 1).toBe(1)
    expect(invitationDocumentSchema.safeParse(beda).success).toBe(true)
  })

  it('tidak memutasi dokumen lama', () => {
    const lama = createLegacyDocument('Dea', 'Haryo')
    const semula = JSON.stringify(lama)
    migrateLegacyDocument(lama)
    expect(JSON.stringify(lama)).toBe(semula)
  })
})

/*
 * Penjaga fase 74.3: struktur berulang bagian ekstra akhirnya punya batas.
 *
 * `steps`, `items`, `colors`, dan `attire` disunting `ExtrasForm.vue` tapi tidak ada di
 * `sectionFields` — `FieldMeta` menggambarkan satu kolom form, bukan daftar baris. Sampai fase
 * ini akibatnya keempatnya lolos `.passthrough()` tanpa batas apa pun, dan satu-satunya plafon
 * adalah 200 KB seluruh dokumen. Migrator pun menyalinnya bulat-bulat.
 */
/*
 * Penjaga yang pindah rumah di fase 74.5.
 *
 * Keputusan pemilik fase 71: label kolom ditulis menurut FUNGSINYA di mata pasangan, bukan
 * istilah desain. Penjaganya dulu hidup di `apps/web/test/invitation-copy.spec.ts` dan membaca
 * `copyGroups` — tabel sistem copy lama. Fase 72 memindahkan label form ke `sectionFields` dan
 * fase 74.5 membuang tabel lamanya, jadi penjaga itu akan ikut mati tanpa penerus.
 *
 * Dan ia memang sudah tidak menjaga apa pun: dua kolom `kicker` di `sectionFields` menulis
 * "Kicker" apa adanya selama tiga fase, tepat di bawah komentar yang melarangnya, karena
 * penjaganya tidak pernah membaca tabel ini.
 */
describe('label kolom ditulis menurut fungsinya (fase 71, dijaga sejak 74.5)', () => {
  const jargon = [/kicker/, /eyebrow/, /\bcta\b/, /lightbox/, /overlay/, /placeholder/]

  it('tidak ada label yang memakai istilah desain', () => {
    const pelanggar: string[] = []
    for (const [type, fields] of Object.entries(sectionFields)) {
      for (const field of fields) {
        if (jargon.some(pola => pola.test(field.label.toLowerCase()))) pelanggar.push(`${type}.${field.key}: "${field.label}"`)
      }
    }
    expect(pelanggar, 'label ini memakai istilah desain, bukan fungsi kolomnya').toEqual([])
  })

  it('tiap kolom punya label yang tidak kosong', () => {
    for (const [type, fields] of Object.entries(sectionFields)) {
      for (const field of fields) expect(field.label.trim(), `${type}.${field.key}`).toBeTruthy()
    }
  })

  /*
   * `bismillah` berlabel "Bismillah", dan itu BENAR — kata itu justru nama yang dikenal
   * pasangan, bukan istilah desain. Aturannya "jangan pakai istilah DESAIN", bukan "label
   * harus berbeda dari key": penjaga yang melarang keduanya sama akan menuntut label yang
   * lebih buruk daripada yang ada.
   */
  it('label yang kebetulan sama dengan key-nya tidak dianggap pelanggaran', () => {
    expect(sectionFields.couple.find(field => field.key === 'bismillah')?.label).toBe('Bismillah')
  })
})

describe('batas struktur berulang bagian ekstra (fase 74.3)', () => {
  const dataSah = (type: 'story' | 'rundown' | 'dresscode', extra: Record<string, unknown>) =>
    sectionDataSchema(type).safeParse(extra)

  it('bentuk yang ditulis ExtrasForm diterima apa adanya', () => {
    expect(dataSah('story', { steps: [{ id: 'a', title: 'Bertemu', text: 'Di kampus.', image: '', side: 'kiri' }] }).success).toBe(true)
    expect(dataSah('rundown', { items: [{ id: 'a', time: '08.00', title: 'Akad', description: 'Di masjid' }] }).success).toBe(true)
    expect(dataSah('dresscode', { colors: [{ hex: '#E8DCC8', name: 'Krem' }], attire: ['attire-kebaya'] }).success).toBe(true)
  })

  it('baris yang belum diisi tetap sah — yang dijaga panjang dan jumlah, bukan kelengkapan', () => {
    expect(dataSah('story', { steps: [{ id: 'a' }, {}] }).success).toBe(true)
    expect(dataSah('rundown', { items: [{}] }).success).toBe(true)
  })

  it('kunci pendamping di dalam baris tetap lewat — dokumen lama tidak boleh ditolak', () => {
    // `name` dipakai dokumen v1 dan masih dibaca `Rundown.vue` sebagai cadangan `title`.
    expect(dataSah('rundown', { items: [{ name: 'Akad', warna: 'merah' }] }).success).toBe(true)
    expect(dataSah('story', { steps: [{ title: 'A', catatanLama: 1 }] }).success).toBe(true)
  })

  it.each([
    ['story', 'steps', 21],
    ['rundown', 'items', 31],
    ['dresscode', 'colors', 13],
  ] as const)('%s.%s menolak lebih dari batasnya', (type, key, jumlah) => {
    const banyak = Array.from({ length: jumlah }, (_, index) => ({ id: String(index) }))
    expect(dataSah(type, { [key]: banyak }).success).toBe(false)
  })

  it('attire dibatasi jumlah dan panjang idnya', () => {
    expect(dataSah('dresscode', { attire: Array.from({ length: 13 }, () => 'x') }).success).toBe(false)
    expect(dataSah('dresscode', { attire: ['x'.repeat(81)] }).success).toBe(false)
  })

  it('teks di dalam baris dibatasi panjangnya', () => {
    expect(dataSah('story', { steps: [{ text: 'x'.repeat(601) }] }).success).toBe(false)
    expect(dataSah('story', { steps: [{ title: 'x'.repeat(201) }] }).success).toBe(false)
    expect(dataSah('rundown', { items: [{ description: 'x'.repeat(401) }] }).success).toBe(false)
  })

  it('side hanya kiri atau kanan', () => {
    expect(dataSah('story', { steps: [{ side: 'kiri' }] }).success).toBe(true)
    expect(dataSah('story', { steps: [{ side: 'tengah' }] }).success).toBe(false)
  })

  it('bukan larik ditolak, bukan diam-diam dianggap kosong', () => {
    expect(dataSah('story', { steps: 'bukan larik' }).success).toBe(false)
    expect(dataSah('dresscode', { attire: 'kebaya' }).success).toBe(false)
  })

  it('bagian yang tidak punya struktur berulang tidak kebagian kuncinya', () => {
    // `video` memang tidak pernah disunting `ExtrasForm`; kuncinya lewat sebagai passthrough biasa.
    expect(sectionDataSchema('video').safeParse({ steps: [{ title: 'x'.repeat(900) }] }).success).toBe(true)
  })

  it('dokumen bawaan dan hasil migrasi keduanya lolos skema penuh', () => {
    expect(invitationDocumentSchema.safeParse(createDefaultDocument('Dea', 'Haryo')).success).toBe(true)
    expect(invitationDocumentSchema.safeParse(migrateLegacyDocument(createLegacyDocument('Dea', 'Haryo'))).success).toBe(true)
  })

  it('dokumen dengan baris yang meledak ditolak lewat invitationDocumentSchema, bukan cuma lewat sectionDataSchema', () => {
    const doc = createDefaultDocument('Dea', 'Haryo')
    const story = doc.sections.find(section => section.type === 'story')!
    story.data.steps = Array.from({ length: 40 }, (_, index) => ({ id: String(index), title: 'x' }))
    const hasil = invitationDocumentSchema.safeParse(doc)
    expect(hasil.success).toBe(false)
    if (!hasil.success) expect(hasil.error.issues[0]!.path).toEqual(['sections', doc.sections.indexOf(story), 'data', 'steps'])
  })
})
