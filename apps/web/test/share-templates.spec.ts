import { describe, expect, it } from 'vitest'
import { createDefaultDocument, createLegacyDocument } from '@aruna/contracts'
import { sharePresets } from '@aruna/contracts/api'
import { defaultTemplate, fillTemplate, formatPhone, guestPlaceholder, linkPlaceholder, shareContext, toCsv, whatsappLink } from '../components/dashboard/generator/templates'

/** Template WhatsApp halaman Generator (fase 72.6): dirakit dari dokumen, dua placeholder, tautan wa.me. */
describe('shareContext', () => {
  it('membaca acara, lokasi, dan nama pasangan dari dokumen v2', () => {
    const ctx = shareContext(createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', { date: '2026-10-03', venue: 'Pendopo Aruna', address: 'Yogyakarta' }))
    expect(ctx.couple).toBe('Aruna & Dewa')
    expect(ctx.dateLine).toBe('Sabtu, 03 Oktober 2026')
    expect(ctx.akadTime).toBe('08.00 WIB s.d selesai')
    expect(ctx.venue).toBe('Lokasi Akad & Resepsi')
    expect(ctx.address).toBe('Pendopo Aruna, Yogyakarta')
  })

  it('membaca dokumen v1 dari events dan countdown', () => {
    const v1 = createLegacyDocument('Sekar', 'Jagad')
    v1.sections.find(section => section.type === 'countdown')!.data.date = '2027-11-20'
    const ctx = shareContext(v1)
    expect(ctx.couple).toBe('Sekar & Jagad')
    expect(ctx.dateLine).toBe('Sabtu, 20 November 2027')
    expect(ctx.akadTitle).toBe('Akad nikah')
    expect(ctx.receptionTime).toBe('11:00')
  })

  it('jatuh ke judul undangan saat dokumen belum ada', () => {
    expect(shareContext(null, 'QA Aruna & Dewa').couple).toBe('QA Aruna & Dewa')
  })
})

describe('defaultTemplate', () => {
  const ctx = shareContext(createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', { date: '2026-10-03', venue: 'Pendopo Aruna' }))

  it('setiap gaya memuat kedua placeholder, nama pasangan, dan blok acara', () => {
    for (const preset of sharePresets) {
      const text = defaultTemplate(preset, ctx)
      expect(text, preset).toContain(guestPlaceholder)
      expect(text, preset).toContain(linkPlaceholder)
      expect(text, preset).toContain('*Aruna & Dewa*')
      expect(text, preset).toContain('📅 Sabtu, 03 Oktober 2026')
      expect(text, preset).toContain('📍 Lokasi Akad & Resepsi')
    }
  })

  it('gaya islami dibuka basmalah dan kutipan referensi', () => {
    const text = defaultTemplate('islami', ctx)
    expect(text.startsWith('Bismillahirrahmanirrahim')).toBe(true)
    expect(text).toContain('_Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan._')
  })

  it('tanpa tanggal, blok acara tetap punya baris pengganti', () => {
    const text = defaultTemplate('formal', { ...ctx, dateLine: '', akadTime: '', receptionTime: '', venue: '', address: '' })
    expect(text).toContain('📅 Tanggal menyusul')
  })
})

describe('fillTemplate & whatsappLink', () => {
  it('mengganti semua placeholder dan memberi sapaan umum bila nama kosong', () => {
    const template = `Halo ${guestPlaceholder}, ${guestPlaceholder}! ${linkPlaceholder}`
    expect(fillTemplate(template, { guestName: 'Budi', url: 'https://x/i/a?to=Budi' })).toBe('Halo Budi, Budi! https://x/i/a?to=Budi')
    expect(fillTemplate(template, { url: 'u' })).toBe('Halo Bapak/Ibu/Saudara/i, Bapak/Ibu/Saudara/i! u')
  })

  it('menormalkan nomor lokal ke 62 dan meng-encode teks', () => {
    expect(whatsappLink('0812-3456 7890', 'a b\n*c*')).toBe('https://wa.me/6281234567890?text=a%20b%0A*c*')
    expect(whatsappLink('+62 812 3456 7890', 'x')).toBe('https://wa.me/6281234567890?text=x')
    expect(formatPhone('6281234567890')).toBe('+62 812-3456-7890')
    expect(formatPhone(undefined)).toBe('—')
  })

  it('toCsv membungkus sel yang memuat koma atau kutip', () => {
    expect(toCsv([['nama', 'telepon'], ['dr. Yosi, Sp.OG', '0812'], ['Budi "B"', '']])).toBe('nama,telepon\n"dr. Yosi, Sp.OG",0812\n"Budi ""B""",\n')
  })
})
