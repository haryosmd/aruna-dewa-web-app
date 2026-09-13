import { describe, it, expect } from 'vitest'
import { normalizeDisplayName, buildGuestUrl, invitationDocumentSchema, createDefaultDocument, priceOrder, parseGuestText, safeSpreadsheetCell, templates, normalizeGift, giftAccountLimit } from '../packages/contracts/src/index'

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
    expect(invitationDocumentSchema.safeParse({...createDefaultDocument(),schemaVersion:2}).success).toBe(false)
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
  it('ships a valid preset for every template', () => {
    for (const template of templates) {
      const document = createDefaultDocument('Aruna', 'Dewa', template.id)
      expect(invitationDocumentSchema.safeParse(document).success).toBe(true)
      expect(document.tokens).toEqual(template.tokens)
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
