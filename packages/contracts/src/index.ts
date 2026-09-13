import { z } from 'zod'

export function normalizeDisplayName(value: string): string {
  const name = value.normalize('NFC').trim()
  if (!name || [...name].length > 200 || /[\p{Cc}\p{Zl}\p{Zp}]/u.test(value)) throw new Error('Nama wajib, satu baris, maksimum 200 karakter.')
  return name
}

export function buildGuestUrl(base: string, slug: string, displayName: string, token?: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Slug tidak valid.')
  const url = new URL(`/i/${slug}`, base)
  url.searchParams.set('to', normalizeDisplayName(displayName))
  if (token) url.searchParams.set('g', token)
  return url.toString()
}

export const sectionTypes = ['cover', 'couple', 'events', 'countdown', 'gallery', 'story', 'rundown', 'dresscode', 'video', 'gift', 'rsvp', 'wishes', 'closing', 'music'] as const

export const templateIds = ['aruna-bloom', 'aruna-lumine', 'aruna-senja', 'aruna-alba', 'aruna-sogan', 'aruna-gonjong', 'aruna-mendung', 'aruna-kenanga', 'aruna-bentar'] as const
export type TemplateId = (typeof templateIds)[number]

/** `dm-sans` is retained so documents written before the theme system still validate. */
export const fontChoices = ['cormorant', 'italiana', 'fraunces', 'jost', 'jakarta', 'instrument', 'dm-sans'] as const
export type FontChoice = (typeof fontChoices)[number]
export const selectableFonts: { id: FontChoice; label: string }[] = [
  { id: 'cormorant', label: 'Cormorant Garamond' },
  { id: 'fraunces', label: 'Fraunces' },
  { id: 'italiana', label: 'Italiana' },
  { id: 'jost', label: 'Jost' },
  { id: 'jakarta', label: 'Plus Jakarta Sans' },
  { id: 'instrument', label: 'Instrument Serif' },
]

/**
 * Curated starting point for each template. Couples on the `design` entitlement can
 * still override the three colours; the preset only decides where they start.
 */
export const templates: { id: TemplateId; name: string; version: number; tagline: string; accent: string; tokens: { background: string; foreground: string; primary: string; font: FontChoice } }[] = [
  { id: 'aruna-bloom', name: 'Aruna Bloom', version: 1, tagline: 'Botanical ivory yang hangat dan klasik.', accent: '#7A8B6F', tokens: { background: '#FBF6EE', foreground: '#241A14', primary: '#A93F23', font: 'cormorant' } },
  { id: 'aruna-lumine', name: 'Aruna Lumine', version: 1, tagline: 'Modern luxe dengan emas sampanye yang tenang.', accent: '#2E3330', tokens: { background: '#F7F5F1', foreground: '#1C1C1A', primary: '#7E6020', font: 'italiana' } },
  { id: 'aruna-senja', name: 'Aruna Senja', version: 1, tagline: 'Senja Jawa: plum tua, amber, dan pasir.', accent: '#C2803A', tokens: { background: '#FBF3EA', foreground: '#2E1A26', primary: '#7D3350', font: 'fraunces' } },
  { id: 'aruna-alba', name: 'Aruna Alba', version: 1, tagline: 'Minimalis modern: putih tulang, garis tegas, tanpa hiasan berlebih.', accent: '#9AA3A8', tokens: { background: '#F4F3F1', foreground: '#15161A', primary: '#4A5560', font: 'instrument' } },
  { id: 'aruna-sogan', name: 'Aruna Sogan', version: 1, tagline: 'Terinspirasi adat Jawa: sogan, kunir, dan kawung.', accent: '#A9833F', tokens: { background: '#F6EEE2', foreground: '#241809', primary: '#7A4A18', font: 'cormorant' } },
  { id: 'aruna-gonjong', name: 'Aruna Gonjong', version: 1, tagline: 'Terinspirasi adat Minang: marun rumah gadang dan kilau songket.', accent: '#BE9440', tokens: { background: '#FBF1E7', foreground: '#25101A', primary: '#8E2433', font: 'fraunces' } },
  { id: 'aruna-mendung', name: 'Aruna Mendung', version: 1, tagline: 'Mega mendung Cirebon: awan berundak di atas biru laut.', accent: '#B8842B', tokens: { background: '#F2F6F8', foreground: '#10222E', primary: '#1F4E68', font: 'cormorant' } },
  { id: 'aruna-kenanga', name: 'Aruna Kenanga', version: 1, tagline: 'Blush kenanga: merah jambu pudar, kelopak pita, dan kupu-kupu.', accent: '#C08A7A', tokens: { background: '#FBF1EF', foreground: '#2A1A1C', primary: '#97364A', font: 'italiana' } },
  { id: 'aruna-bentar', name: 'Aruna Bentar', version: 1, tagline: 'Terinspirasi adat Bali: candi bentar, poleng, dan batu padas.', accent: '#B08A3C', tokens: { background: '#F5F1E8', foreground: '#1C211E', primary: '#2B6252', font: 'instrument' } },
]

export function templateById(id: string) {
  return templates.find(template => template.id === id)
}

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/)
export const invitationDocumentSchema = z.object({
  schemaVersion: z.literal(1), templateId: z.enum(templateIds), templateVersion: z.literal(1),
  tokens: z.object({ background: color, foreground: color, primary: color, font: z.enum(fontChoices) }).strict(),
  sections: z.array(z.object({
    id: z.string().min(1).max(80), type: z.enum(sectionTypes), enabled: z.boolean(), data: z.record(z.unknown()),
  }).strict()).min(1).max(30),
}).strict().superRefine((document, ctx) => {
  if (new Set(document.sections.map(s => s.id)).size !== document.sections.length) ctx.addIssue({ code: 'custom', path: ['sections'], message: 'ID section harus unik.' })
  if (JSON.stringify(document).length > 200_000) ctx.addIssue({ code: 'custom', message: 'Konten terlalu besar.' })
})
export type InvitationDocument = z.infer<typeof invitationDocumentSchema>
export type InvitationSection = InvitationDocument['sections'][number]

export function createDefaultDocument(partner1 = 'Aruna', partner2 = 'Dewa', templateId: TemplateId = 'aruna-bloom'): InvitationDocument {
  const template = templateById(templateId) ?? templates[0]!
  return {
    schemaVersion: 1, templateId: template.id, templateVersion: 1,
    tokens: { ...template.tokens },
    sections: [
      { id: 'cover', type: 'cover', enabled: true, data: { title: `${partner1} & ${partner2}`, subtitle: 'The wedding of', image: '/images/couple.webp', layout: 'arch-potret', ornamentIntensity: 'seimbang' } },
      { id: 'couple', type: 'couple', enabled: true, data: { partner1, partner2, description: 'Dengan penuh kebahagiaan, kami mengundang Anda merayakan hari pernikahan kami.' } },
      { id: 'events', type: 'events', enabled: true, data: { events: [{ id: 'ceremony', name: 'Akad nikah', date: '', time: '09:00', venue: 'Lokasi akan diumumkan', address: '', mapUrl: '', public: true }, { id: 'reception', name: 'Resepsi', date: '', time: '11:00', venue: 'Lokasi akan diumumkan', address: '', mapUrl: '', public: true }], venueIllustration: '' } },
      { id: 'countdown', type: 'countdown', enabled: true, data: { date: '' } },
      { id: 'gallery', type: 'gallery', enabled: true, data: { images: [], motion: 'tema' } },
      { id: 'story', type: 'story', enabled: false, data: { title: 'Awal sebuah cerita', text: '', steps: [] as unknown[] } },
      { id: 'rundown', type: 'rundown', enabled: false, data: { items: [] } },
      { id: 'dresscode', type: 'dresscode', enabled: false, data: { text: '', attire: [] as string[], colors: [] as unknown[] } },
      { id: 'video', type: 'video', enabled: false, data: { url: '', title: 'Saksikan kebahagiaan kami' } },
      { id: 'gift', type: 'gift', enabled: false, data: { title: 'Hadiah untuk kami', note: '', accounts: [] as GiftAccount[], address: '' } },
      { id: 'rsvp', type: 'rsvp', enabled: true, data: { deadline: '' } },
      { id: 'wishes', type: 'wishes', enabled: true, data: {} },
      { id: 'closing', type: 'closing', enabled: true, data: { text: 'Terima kasih telah menjadi bagian dari cerita kami.' } },
      { id: 'music', type: 'music', enabled: false, data: { url: '' } },
    ],
  }
}

/* ── Hadiah: rekening pasangan ─────────────────────────────────────────────── */

/**
 * Daftar bank tertutup. Ada di kontrak, bukan di lapisan web, karena validasi publish
 * di API harus bisa menolak bank yang tidak dikenal tanpa mengimpor `apps/web`.
 * Presentasinya (nama tampil, warna merek, path logo) hidup di `apps/web/utils/banks.ts`.
 */
export const bankIds = ['bca', 'mandiri', 'bri', 'bsi', 'jago', 'jenius', 'seabank', 'other'] as const
export type BankId = (typeof bankIds)[number]

/** Satu rekening tujuan. `owner` menandai mempelai pria/wanita; boleh kosong. */
export interface GiftAccount {
  id: string
  bankId: BankId
  /** Nama bank apa adanya. Dipakai saat `bankId` jatuh ke `other`, dan sebagai fallback teks. */
  bankLabel: string
  number: string
  holder: string
  owner: 'cpp' | 'cpw' | ''
}

/**
 * Delapan sejak 2026-09-12. Dua hanya cukup untuk mempelai pria dan wanita; pada
 * praktiknya pasangan juga mencantumkan rekening orang tua, e-wallet, dan satu rekening
 * khusus untuk keluarga di luar negeri. Batasnya tetap ada supaya section hadiah tidak
 * berubah jadi daftar bank.
 */
export const giftAccountLimit = 8

const bankAliases: [BankId, string[]][] = [
  ['bca', ['bca', 'central asia']],
  ['mandiri', ['mandiri']],
  ['bsi', ['bsi', 'syariah indonesia']],
  ['bri', ['bri', 'rakyat indonesia']],
  ['jago', ['jago']],
  ['jenius', ['jenius', 'smbc', 'btpn']],
  ['seabank', ['seabank', 'sea bank']],
]

/** Menebak `bankId` dari nama bank yang diketik bebas pada dokumen lama. */
export function matchBankAlias(label: string): BankId {
  const needle = label.toLowerCase()
  for (const [id, aliases] of bankAliases) {
    if (aliases.some(alias => needle.includes(alias))) return id
  }
  return 'other'
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export interface NormalizedGift {
  title: string
  note: string
  address: string
  accounts: GiftAccount[]
}

/**
 * Satu-satunya pembaca data section `gift`, dipakai renderer, editor, dan validasi publish.
 *
 * Dokumen lama menyimpan satu rekening datar (`{ bank, account, holder }`). Bentuk itu
 * diterjemahkan di sini supaya undangan yang sudah terbit tetap tampil benar tanpa migrasi
 * basis data; bentuk barunya baru ditulis saat pasangan menyentuh section ini di editor.
 */
export function normalizeGift(data: Record<string, unknown> | null | undefined): NormalizedGift {
  const source = data ?? {}
  const base = {
    title: asString(source.title) || 'Hadiah untuk kami',
    note: asString(source.note),
    address: asString(source.address),
  }

  if (Array.isArray(source.accounts)) {
    const accounts: GiftAccount[] = []
    for (const raw of source.accounts) {
      if (!raw || typeof raw !== 'object') continue
      const entry = raw as Record<string, unknown>
      const number = asString(entry.number).trim()
      if (!number) continue
      const bankLabel = asString(entry.bankLabel)
      const declared = asString(entry.bankId) as BankId
      const bankId = (bankIds as readonly string[]).includes(declared) ? declared : matchBankAlias(bankLabel)
      const owner = asString(entry.owner)
      accounts.push({
        id: asString(entry.id) || `rek-${accounts.length + 1}`,
        bankId,
        bankLabel,
        number,
        holder: asString(entry.holder),
        owner: owner === 'cpp' || owner === 'cpw' ? owner : '',
      })
      if (accounts.length === giftAccountLimit) break
    }
    return { ...base, accounts }
  }

  const legacyNumber = asString(source.account).trim()
  if (!legacyNumber) return { ...base, accounts: [] }
  const legacyBank = asString(source.bank)
  return {
    ...base,
    accounts: [{
      id: 'rek-1',
      bankId: matchBankAlias(legacyBank),
      bankLabel: legacyBank,
      number: legacyNumber,
      holder: asString(source.holder),
      owner: '',
    }],
  }
}

const baseFeatures = ['cover', 'couple', 'events', 'countdown', 'gallery', 'guests', 'imports', 'rsvp', 'wishes', 'closing', 'music']
export const premiumFeatures = ['story', 'gift', 'rundown', 'dresscode', 'video', 'design']
/** Yang dibuka paket tengah. Sisanya (`video`, `design`) hanya di paket teratas atau sebagai add-on. */
const growthFeatures = ['story', 'gift', 'rundown', 'dresscode']
export const catalog = {
  sandbox: true,
  packages: [
    { id: 'mula', name: 'Mula', price: 279000, features: [...baseFeatures], durationMonths: 12, photoLimit: 15 },
    { id: 'mekar', name: 'Mekar', price: 449000, features: [...baseFeatures, ...growthFeatures], durationMonths: 12, photoLimit: 30 },
    { id: 'purnama', name: 'Purnama', price: 699000, features: [...baseFeatures, ...premiumFeatures], durationMonths: 12, photoLimit: 60 },
  ],
  addons: premiumFeatures.map(id => ({ id, name: ({ story: 'Cerita cinta', gift: 'Hadiah', rundown: 'Rundown', dresscode: 'Dresscode', video: 'Video & live stream', design: 'Warna, font & urutan' } as Record<string, string>)[id]!, price: 25000 })),
  templates: templates.map(({ id, name, version, tagline, accent, tokens }) => ({ id, name, version, tagline, accent, tokens })),
}

export function priceOrder(packageId: string, addonIds: string[]) {
  const pack = catalog.packages.find(p => p.id === packageId)
  if (!pack || new Set(addonIds).size !== addonIds.length) throw new Error('Paket atau add-on tidak valid.')
  const addons = addonIds.map(id => {
    const addon = catalog.addons.find(a => a.id === id)
    if (!addon || pack.features.includes(id)) throw new Error('Add-on tidak tersedia atau sudah termasuk paket.')
    return addon
  })
  return { total: pack.price + addons.reduce((sum, a) => sum + a.price, 0), features: [...pack.features, ...addonIds], packageId, addonIds }
}

export type ImportRow = { row: number; displayName: string; phone?: string; group?: string; quota?: number; errors: string[]; warnings: string[] }
export function parseGuestText(text: string, format: 'csv' | 'tsv'): ImportRow[] {
  if (text.length > 10_000_000) throw new Error('Batas impor 10 MB.')
  const delimiter = format === 'csv' ? ',' : '\t'
  const records: string[][] = []; let record: string[] = []; let field = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++ }
      else if (quoted || field.length === 0) quoted = !quoted
      else field += c
    } else if (!quoted && c === delimiter) { record.push(field); field = '' }
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++
      record.push(field); if (record.some(v => v !== '')) records.push(record); record = []; field = ''
    } else field += c
  }
  if (quoted) throw new Error('Tanda kutip CSV tidak ditutup.')
  record.push(field); if (record.some(v => v !== '')) records.push(record)
  const first = records[0]?.map(v => v.replace(/^\uFEFF/, '').trim().toLowerCase()) ?? []
  const nameKeys = ['nama', 'nama undangan', 'name', 'displayname', 'nama lengkap']
  const hasHeader = first.some(v => nameKeys.includes(v))
  const nameIndex = hasHeader ? first.findIndex(v => nameKeys.includes(v)) : 0
  const phoneIndex = hasHeader ? first.findIndex(v => ['telepon', 'phone', 'no hp', 'whatsapp', 'kontak'].includes(v)) : 1
  const groupIndex = hasHeader ? first.findIndex(v => ['grup', 'group', 'kategori'].includes(v)) : 2
  const quotaIndex = hasHeader ? first.findIndex(v => ['kuota', 'quota'].includes(v)) : 3
  const rows = hasHeader ? records.slice(1) : records
  if (rows.length > 5000) throw new Error('Maksimum 5.000 baris per impor.')
  const seen = new Set<string>()
  return rows.map((columns, i) => {
    const errors: string[] = [], warnings: string[] = []; let displayName = columns[nameIndex] ?? ''
    try { displayName = normalizeDisplayName(displayName) } catch (error) { errors.push((error as Error).message) }
    if (seen.has(displayName)) warnings.push('Nama sama ditemukan; tetap dibuat sebagai tamu terpisah.')
    seen.add(displayName)
    const rawQuota = columns[quotaIndex]?.trim(); const quota = rawQuota ? Number(rawQuota) : 1
    if (!Number.isInteger(quota) || quota < 1 || quota > 20) errors.push('Kuota harus 1–20 orang.')
    return { row: i + (hasHeader ? 2 : 1), displayName, phone: columns[phoneIndex]?.trim(), group: columns[groupIndex]?.trim(), quota, errors, warnings }
  })
}

export function safeSpreadsheetCell(value: string): string {
  return /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

/**
 * Fitur yang membuka kontrol warna, font, dan urutan section.
 *
 * Aturannya hidup di sini, bukan dua kali, karena editor harus mematikan kontrolnya
 * sebelum pasangan menyentuhnya sementara API menolak simpanannya sesudahnya. Dua salinan
 * yang menyimpang berarti kontrol terlihat hidup lalu autosave gagal tanpa sebab yang jelas.
 */
export const designFeatureId = 'design'

export function canEditDesign(input: { isOperator?: boolean; features: readonly string[] }): boolean {
  return Boolean(input.isOperator) || input.features.includes(designFeatureId)
}
