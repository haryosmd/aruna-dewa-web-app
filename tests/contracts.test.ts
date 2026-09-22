import { describe, it, expect } from 'vitest'
import { normalizeDisplayName, buildGuestUrl, invitationDocumentSchema, createDefaultDocument, createLegacyDocument, priceOrder, parseGuestText, safeSpreadsheetCell, templates, templateIds, liveTemplateIds, templateAliases, resolveTemplateId, templateById, normalizeGift, giftAccountLimit, normalizeChildCount, normalizeGuestFrom, normalizeInvitationKind } from '../packages/contracts/src/index'

describe('guest identity and links', () => {
  it.each(['Yosi Susanti', 'dr. Yosi Susanti, Sp.OG', 'Drs. Ahmad Hidayat, M.Pd.', 'Anne-Marie & Budi', 'A+B', "O’Connor / % # ?", '山田 太郎'])('preserves %s', name => {
    const url = new URL(buildGuestUrl('https://aruna.test', 'fahrul-dan-chika', name))
    expect(url.searchParams.get('to')).toBe(name)
    expect(url.pathname).toBe('/i/fahrul-dan-chika')
  })
  it('uses + only for encoded spaces and normalizes Unicode', () => {
    expect(buildGuestUrl('https://aruna.test', 'a-b', 'Yosi Susanti')).toContain('?to=Yosi+Susanti')
    expect(normalizeDisplayName('  Jose\u0301  ')).toBe('José')
    expect(new URL(buildGuestUrl('https://aruna.test','a-b','A+B','opaque')).searchParams.get('g')).toBe('opaque')
  })
  it.each(['', '  ', 'A\nB', 'A\u0000B', 'a'.repeat(201)])('rejects invalid names', name => expect(() => normalizeDisplayName(name)).toThrow())
  it('counts code points, not UTF16 halves', () => expect(normalizeDisplayName('𐐀'.repeat(200))).toHaveLength(400))
})
describe('document and pricing boundaries', () => {
  it('makes independent valid drafts', () => {
    const a=createDefaultDocument('Aruna','Dewa'),b=createDefaultDocument()
    expect(invitationDocumentSchema.parse(a)).toEqual(a)
    a.sections[0]!.data.title='changed'
    expect(b.sections[0]!.data.title).not.toBe('changed')
  })
  it('rejects duplicate section IDs and unsupported versions', () => {
    const d=createDefaultDocument();d.sections.push(d.sections[0]!)
    expect(invitationDocumentSchema.safeParse(d).success).toBe(false)
    expect(invitationDocumentSchema.safeParse({...createDefaultDocument(),schemaVersion:3}).success).toBe(false)
    // v1 dengan tipe bagian lama tetap sah; v2 hanya menerima tipe Elegance.
    expect(invitationDocumentSchema.safeParse(createLegacyDocument()).success).toBe(true)
    expect(invitationDocumentSchema.safeParse({...createLegacyDocument(),schemaVersion:2}).success).toBe(false)
  })
  it('calculates server catalog price and prevents double charging included features', () => {
    expect(priceOrder('mula',['story']).total).toBe(304000)
    expect(priceOrder('mekar',[]).total).toBe(449000)
    expect(priceOrder('mekar',['design']).total).toBe(474000)
    expect(priceOrder('purnama',[]).total).toBe(699000)
    expect(() => priceOrder('mekar',['story'])).toThrow()
    expect(() => priceOrder('purnama',['design'])).toThrow()
    expect(() => priceOrder('mula',['story','story'])).toThrow()
    expect(() => priceOrder('free',[])).toThrow()
  })
  it('accepts the closed copy layer and rejects strangers (fase 69)', () => {
    const base = createDefaultDocument()
    expect(base.copy).toBeUndefined()
    expect(invitationDocumentSchema.safeParse({ ...base, copy: { 'gate.open': 'Buka' } }).success).toBe(true)
    expect(invitationDocumentSchema.safeParse({ ...base, copy: { 'gate.open': 'a'.repeat(41) } }).success).toBe(false)
    expect(invitationDocumentSchema.safeParse({ ...base, copy: { 'kunci.asing': 'x' } }).success).toBe(false)
  })
  it('accepts enumerated per-invitation motion and rejects free values (fase 69)', () => {
    const base = createDefaultDocument()
    const dengan = (motion: unknown) => invitationDocumentSchema.safeParse({ ...base, tokens: { ...base.tokens, motion } }).success
    expect(dengan({ amplop: 'pelan', masuk: 'iris' })).toBe(true)
    expect(dengan({})).toBe(true)
    expect(dengan({ amplop: 1.5 })).toBe(false)
    expect(dengan({ masuk: 'tema' })).toBe(false)
    expect(dengan({ asing: 'x' })).toBe(false)
  })
  it('ships a valid preset for every template', () => {
    for (const template of templates) {
      const document = createDefaultDocument('Aruna', 'Dewa', template.id)
      expect(invitationDocumentSchema.safeParse(document).success).toBe(true)
      expect(document.tokens).toEqual(template.tokens)
    }
  })
})
describe('id tema pensiun', () => {
  it('menerima tiap id pensiun di schema, tapi tidak menawarkannya di pemilih', () => {
    for (const id of Object.keys(templateAliases)) {
      // Diterima schema: draft dan revisi terbit yang sudah memakainya tidak boleh mati.
      expect(templateIds).toContain(id)
      expect(invitationDocumentSchema.safeParse({ ...createDefaultDocument(), templateId: id }).success).toBe(true)
      // Hilang dari pemilih: `templates` adalah yang diiterasi landing, /order, dan editor.
      expect(templates.some(t => t.id === id)).toBe(false)
      expect(liveTemplateIds).not.toContain(id)
    }
  })
  it('mengarahkan tiap alias ke tema yang benar-benar hidup', () => {
    for (const [pensiun, tujuan] of Object.entries(templateAliases)) {
      expect(liveTemplateIds).toContain(tujuan)
      expect(resolveTemplateId(pensiun)).toBe(tujuan)
      // Preset ikut terterjemahkan, jadi dokumen ber-id pensiun tetap punya warna.
      expect(templateById(pensiun)?.id).toBe(tujuan)
    }
  })
  it('membiarkan id hidup apa adanya dan menampung id yang tidak dikenal', () => {
    for (const id of liveTemplateIds) expect(resolveTemplateId(id)).toBe(id)
    // Dokumen yang rusak tetap harus bisa dibuka pemiliknya, bukan melempar.
    expect(liveTemplateIds).toContain(resolveTemplateId('aruna-entah-apa'))
  })
  it('menulis pengganti, bukan id pensiun, ke dokumen yang baru lahir', () => {
    for (const [pensiun, tujuan] of Object.entries(templateAliases)) {
      expect(createDefaultDocument('Aruna', 'Dewa', pensiun as never).templateId).toBe(tujuan)
    }
  })
})
describe('gift accounts', () => {
  it('reads the flat legacy shape and guesses the bank', () => {
    const gift = normalizeGift({ bank: 'Bank Mandiri', account: '1234567890', holder: 'Aruna' })
    expect(gift.accounts).toHaveLength(1)
    expect(gift.accounts[0]?.bankId).toBe('mandiri')
    expect(gift.accounts[0]?.number).toBe('1234567890')
  })
  it('keeps up to the account limit and drops empty numbers', () => {
    const gift = normalizeGift({ accounts: [
      { id: 'a', bankId: 'bca', bankLabel: 'BCA', number: '111', holder: 'A', owner: 'cpp' },
      { id: 'b', bankId: 'bri', bankLabel: 'BRI', number: '', holder: 'B', owner: 'cpw' },
      { id: 'c', bankId: 'jago', bankLabel: 'Jago', number: '333', holder: 'C', owner: 'cpw' },
      { id: 'd', bankId: 'bsi', bankLabel: 'BSI', number: '444', holder: 'D', owner: '' },
    ] })
    expect(gift.accounts.map(a => a.id)).toEqual(['a','c','d'])
  })
  it('stops at the account limit', () => {
    const many = Array.from({ length: giftAccountLimit + 3 }, (_, at) => ({ id: `r${at}`, bankId: 'bca', bankLabel: 'BCA', number: String(at + 1), holder: '', owner: '' }))
    expect(normalizeGift({ accounts: many }).accounts).toHaveLength(giftAccountLimit)
  })
  it('falls back to `other` for an unknown bank and empty data', () => {
    expect(normalizeGift({ bank: 'Koperasi Kita', account: '9' }).accounts[0]?.bankId).toBe('other')
    expect(normalizeGift(undefined).accounts).toEqual([])
    expect(normalizeGift({}).title).toBe('Hadiah untuk kami')
  })
})
describe('spreadsheet intake', () => {
  it('handles quoted delimiters, leading zero and duplicate names without merging', () => {
    const rows=parseGuestText('Nama undangan,Telepon\n"dr. Yosi, Sp.OG",0812345\n"dr. Yosi, Sp.OG",0812346','csv')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.displayName).toBe('dr. Yosi, Sp.OG')
    expect(rows[0]?.phone).toBe('0812345')
    expect(rows[1]?.warnings.length).toBeGreaterThan(0)
  })
  it('reports invalid rows without executing formulas', () => {
    const rows=parseGuestText('Nama\tTelepon\nYosi\t=1+1\n\t0800','tsv')
    expect(rows[0]?.phone).toBe('=1+1')
    expect(rows[1]?.errors.length).toBeGreaterThan(0)
    expect(safeSpreadsheetCell('=HYPERLINK("bad")')).toBe("'=HYPERLINK(\"bad\")")
  })
})

/*
 * Lembar tamu pemilik yang SUNGGUHAN, disalin bentuknya: kolom A kosong, spanduk judul, blok
 * ringkasan, dua baris petunjuk, header di baris 15, data mulai baris 16, lalu ratusan baris
 * kosong yang tetap membawa `FALSE` di kolom Child.
 *
 * Sampai fase 75 lembar ini tidak bisa diimpor sama sekali — bukan dengan galat, melainkan dengan
 * sampah yang terlihat berhasil, karena spanduknya terbaca sebagai baris header.
 */
const lembarPemilik = [
  ',,,,,,,,,',
  ',GUEST LIST — WEDDING DEA & HARYO,,,,,,,,',
  ',LSI • Sabtu 03 Oktober 2026,,,,,,,,',
  ',,,,,,,,,',
  ',SUMMARY,,,,,,,,',
  ',,Total Guests (entries),11,,Digital Invitation,,2,,',
  ',,Total Pax (persons),2,,Printed Hard,,0,,',
  ',,Children,0,,Confirmed,,0,,',
  ',,VIP Guests,0,,,,,,',
  ',,,,,,,,,',
  ',CARA PAKAI — Isi hanya baris data (mulai baris 16).,,,,,,,,',
  ',*Nomor tidak perlu di isi,,,,,,,,',
  ',,,,,,,,,',
  ',,,,,,,,,',
  ',No.,Guest Name,Relationship,Guest From,Person,Child,Invitation,Status,Notes',
  ',1,Evan Hadi Subroto,SID,Groom,1,FALSE,Digital,,',
  ',2,Hoora,REKANAN,Bride,2,TRUE,Printed Hard,,Bawa anak',
  ',3,Sahells,,,,FALSE,,,',
  ',,,,,,FALSE,,,',
  ',,,,,,FALSE,,,',
  ',,,,,,FALSE,,,',
].join('\n')

describe('impor dari lembar kerja yang tidak rapi', () => {
  it('membaca lembar berspanduk dengan kolom kiri kosong dan header di baris 15', () => {
    const rows = parseGuestText(lembarPemilik, 'csv')
    expect(rows).toHaveLength(3)
    expect(rows.map(r => r.displayName)).toEqual(['Evan Hadi Subroto', 'Hoora', 'Sahells'])
    expect(rows.every(r => r.errors.length === 0)).toBe(true)
  })

  it('nomor barisnya nomor baris spreadsheet, bukan indeks sesudah preamble dibuang', () => {
    // Kalau ini bergeser, pratinjau galat justru menyesatkan: "Baris 2" untuk baris 16.
    expect(parseGuestText(lembarPemilik, 'csv').map(r => r.row)).toEqual([16, 17, 18])
  })

  it('ratusan baris kosong ber-FALSE dilewati diam-diam, bukan jadi ratusan galat', () => {
    const banyak = lembarPemilik + '\n' + Array.from({ length: 180 }, () => ',,,,,,FALSE,,,').join('\n')
    const rows = parseGuestText(banyak, 'csv')
    expect(rows).toHaveLength(3)
    expect(rows.flatMap(r => r.errors)).toEqual([])
  })

  it('tapi baris bernomor telepon tanpa nama TETAP galat — itu kehilangan data sungguhan', () => {
    const rows = parseGuestText('Nama,Telepon\nBudi,0811\n,08129876543', 'csv')
    expect(rows).toHaveLength(2)
    expect(rows[1]?.errors.length).toBeGreaterThan(0)
  })

  it('membawa keempat kolom lembar pemilik, dengan sinonim Inggris dikenali', () => {
    const rows = parseGuestText(lembarPemilik, 'csv')
    expect(rows[0]).toMatchObject({ group: 'SID', quota: 1, guestFrom: 'pria', invitationKind: 'digital' })
    expect(rows[0]?.childCount).toBeUndefined()
    expect(rows[1]).toMatchObject({ quota: 2, guestFrom: 'wanita', childCount: 1, invitationKind: 'cetak', notes: 'Bawa anak' })
  })

  it('judul kolom bahasa Indonesia dibaca sama, termasuk nomor WhatsApp', () => {
    const rows = parseGuestText('Nama,Nomor WA,Kategori,Kuota,Dari,Anak,Jenis undangan,Catatan\nYosi,0812,Keluarga,2,Mempelai wanita,2,Digital,Vegetarian', 'csv')
    expect(rows[0]).toMatchObject({ displayName: 'Yosi', phone: '0812', group: 'Keluarga', quota: 2, guestFrom: 'wanita', childCount: 2, invitationKind: 'digital', notes: 'Vegetarian' })
  })

  it('tanpa baris header sama sekali, pemetaan posisi lama tidak bergeser', () => {
    const rows = parseGuestText('Budi Santoso,0812,Teman,2', 'csv')
    expect(rows[0]).toMatchObject({ row: 1, displayName: 'Budi Santoso', phone: '0812', group: 'Teman', quota: 2 })
  })

  it('kolom anak tidak pernah menggagalkan baris, apa pun isinya', () => {
    const rows = parseGuestText('Nama,Anak\nA,\nB,FALSE\nC,-1\nD,entah\nE,3', 'csv')
    expect(rows.flatMap(r => r.errors)).toEqual([])
    expect(rows.map(r => r.childCount)).toEqual([undefined, undefined, undefined, undefined, 3])
  })
})

describe('normalisasi kolom lembar tamu', () => {
  it('menyatukan ejaan yang dikenal dan MEMBIARKAN yang tidak dikenal', () => {
    expect(normalizeGuestFrom('Groom')).toBe('pria')
    expect(normalizeGuestFrom('  BRIDE ')).toBe('wanita')
    expect(normalizeGuestFrom('Both')).toBe('keduanya')
    // Daftar dropdown milik pasangan dan memang mereka ubah sendiri — menolaknya berarti
    // menolak lembar kerja mereka.
    expect(normalizeGuestFrom('SID • VIP')).toBe('SID • VIP')
    expect(normalizeGuestFrom('')).toBeNull()
  })

  it('FALSE pada kolom centang berarti tidak diisi, bukan angka nol', () => {
    // Kalau `FALSE` jadi 0, ratusan baris kosong lembar pemilik akan terlihat "punya data".
    expect(normalizeChildCount('FALSE')).toBeNull()
    expect(normalizeChildCount('TRUE')).toBe(1)
    expect(normalizeChildCount('✓')).toBe(1)
    expect(normalizeChildCount('3')).toBe(3)
    expect(normalizeChildCount('0')).toBeNull()
    expect(normalizeChildCount(undefined)).toBeNull()
  })

  it('bentuk undangan punya tiga ejaan tersimpan', () => {
    expect(normalizeInvitationKind('Printed Hard')).toBe('cetak')
    expect(normalizeInvitationKind('Digital')).toBe('digital')
    expect(normalizeInvitationKind('Not Yet')).toBe('belum')
  })
})
