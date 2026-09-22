import type { InvitationDocument } from '@aruna/contracts'
import { dateParts, safeSpreadsheetCell } from '@aruna/contracts'
import type { SharePreset } from '@aruna/contracts/api'

/*
 * Template pesan WhatsApp halaman Generator (fase 72.6) — murni, tanpa Vue, supaya bisa diuji.
 *
 * Teks bawaan tiap gaya **dirakit dari dokumen** setiap kali dibuka, bukan disimpan: perubahan
 * tanggal atau lokasi di editor otomatis ikut ke pesan yang belum pernah disunting pasangan.
 * Yang disimpan di `shareSettings.templates` hanya gaya yang pernah diketik ulang.
 *
 * Dua placeholder saja, sesuai referensi: `{{nama_tamu}}` dan `{{tautan_undangan}}`.
 */

export const guestPlaceholder = '{{nama_tamu}}'
export const linkPlaceholder = '{{tautan_undangan}}'

export interface PresetMeta { label: string; description: string }

/** Lima kartu gaya bahasa, urut dan berbunyi persis referensi. */
export const presetMeta: Record<SharePreset, PresetMeta> = {
  formal: { label: 'Formal & Santun', description: 'Cocok untuk keluarga & rekan kerja' },
  islami: { label: 'Nuansa Islami', description: 'Lengkap dengan basmalah & doa' },
  nonmuslim: { label: 'Nuansa Non-Muslim', description: 'Salam sejahtera & doa berkat' },
  santai: { label: 'Santai & Akrab', description: 'Asik untuk teman sebaya' },
  bilingual: { label: 'Bilingual / English', description: 'Format internasional' },
}

/** Potongan dokumen yang dibaca template; dokumen v1 dan v2 sama-sama dipetakan ke sini. */
export interface ShareContext {
  couple: string
  /** "Sabtu, 03 Oktober 2026"; kosong bila tanggal belum diisi. */
  dateLine: string
  akadTitle: string
  akadTime: string
  receptionTitle: string
  receptionTime: string
  venue: string
  address: string
}

const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export function shareContext(document: InvitationDocument | null | undefined, fallbackCouple = ''): ShareContext {
  const at = (type: string) => document?.sections.find(section => section.type === type)?.data ?? {}
  if (document?.schemaVersion === 2) {
    const couple = at('couple')
    const event = at('event')
    const map = at('map')
    const names = [trimmed(couple.brideName), trimmed(couple.groomName)].filter(Boolean).join(' & ')
    // `map.subtitle` = "nama gedung\nalamat"; bila `map.title` sudah jadi nama lokasi, seluruh subtitle jadi alamat.
    const lines = trimmed(map.subtitle).split('\n').map(line => line.trim()).filter(Boolean)
    const [venue = '', ...rest] = lines
    return {
      couple: trimmed(at('opening-envelope').title) || names || fallbackCouple,
      dateLine: [trimmed(event.day), [trimmed(event.date), trimmed(event.monthYear)].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      akadTitle: trimmed(event.akadTitle) || 'Akad Nikah',
      akadTime: trimmed(event.akadTime),
      receptionTitle: trimmed(event.receptionTitle) || 'Resepsi',
      receptionTime: trimmed(event.receptionTime),
      venue: trimmed(map.title) || venue,
      address: trimmed(map.title) ? lines.join(', ') : rest.join(', '),
    }
  }
  // v1: dua acara pertama = akad dan resepsi; tanggal dari countdown.
  const events = Array.isArray(at('events').events) ? (at('events').events as Record<string, unknown>[]) : []
  const akad = events[0] ?? {}
  const resepsi = events[1] ?? {}
  const couple = at('couple')
  const t = dateParts(trimmed(at('countdown').date) || trimmed(akad.date) || undefined)
  return {
    couple: trimmed(at('cover').title) || [trimmed(couple.partner1), trimmed(couple.partner2)].filter(Boolean).join(' & ') || fallbackCouple,
    dateLine: t.day ? `${t.day}, ${t.date} ${t.monthYear}` : '',
    akadTitle: trimmed(akad.name) || 'Akad Nikah',
    akadTime: trimmed(akad.time),
    receptionTitle: trimmed(resepsi.name) || 'Resepsi',
    receptionTime: trimmed(resepsi.time),
    venue: trimmed(akad.venue),
    address: trimmed(akad.address),
  }
}

/** Blok acara yang sama untuk semua gaya: hanya baris yang datanya ada yang ditulis. */
function eventBlock(ctx: ShareContext, labels: { date: string; location: string }): string {
  const lines: string[] = []
  if (ctx.dateLine) lines.push(`📅 ${ctx.dateLine}`)
  if (ctx.akadTime) lines.push(`⏰ ${ctx.akadTitle}: ${ctx.akadTime}`)
  if (ctx.receptionTime) lines.push(`⏰ ${ctx.receptionTitle}: ${ctx.receptionTime}`)
  if (ctx.venue) lines.push(`📍 ${ctx.venue}`)
  if (ctx.address) lines.push(ctx.address)
  if (!lines.length) lines.push(`📅 ${labels.date}`, `📍 ${labels.location}`)
  return lines.join('\n')
}

/** Teks bawaan satu gaya. Tiap gaya setara isinya: sapaan, undangan, blok acara, tautan, penutup. */
export function defaultTemplate(preset: SharePreset, ctx: ShareContext): string {
  const couple = ctx.couple || 'Kedua Mempelai'
  const acara = eventBlock(ctx, { date: 'Tanggal menyusul', location: 'Lokasi menyusul' })
  switch (preset) {
    case 'islami':
      return [
        'Bismillahirrahmanirrahim',
        '',
        '_Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan._',
        '',
        `Dengan memohon ridho dan rahmat Allah SWT, kami bermaksud mengundang Bpk/Ibu/Saudara/i *${guestPlaceholder}* pada acara pernikahan kami:`,
        '',
        `*${couple}*`,
        '',
        'Yang akan dilaksanakan pada:',
        acara,
        '',
        'Info lengkap & lokasi acara dapat diakses melalui:',
        linkPlaceholder,
        '',
        'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bpk/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.',
        '',
        'Wassalamu’alaikum Warahmatullahi Wabarakatuh',
        couple,
      ].join('\n')
    case 'nonmuslim':
      return [
        'Salam sejahtera,',
        '',
        `Dengan penuh sukacita dan berkat Tuhan, kami mengundang Bapak/Ibu/Saudara/i *${guestPlaceholder}* untuk hadir pada pemberkatan dan resepsi pernikahan kami:`,
        '',
        `*${couple}*`,
        '',
        'Yang akan diselenggarakan pada:',
        acara,
        '',
        'Informasi lengkap dan lokasi acara dapat dilihat melalui:',
        linkPlaceholder,
        '',
        'Kehadiran dan doa berkat Bapak/Ibu/Saudara/i merupakan kebahagiaan bagi kami.',
        '',
        'Salam kasih,',
        couple,
      ].join('\n')
    case 'santai':
      return [
        `Halo *${guestPlaceholder}*! 👋`,
        '',
        'Kami mau berbagi kabar bahagia — kami akan menikah! 🎉',
        '',
        `*${couple}*`,
        '',
        'Catat tanggalnya ya:',
        acara,
        '',
        'Detail acara, lokasi, dan konfirmasi kehadiran ada di sini:',
        linkPlaceholder,
        '',
        'Ditunggu kehadiran dan doanya. Sampai jumpa di hari bahagia kami! 🤍',
        couple,
      ].join('\n')
    case 'bilingual':
      return [
        `Kepada Yth. / Dear *${guestPlaceholder}*,`,
        '',
        `Dengan hormat, kami mengundang Anda pada pernikahan kami. / With great pleasure, we invite you to celebrate our wedding.`,
        '',
        `*${couple}*`,
        '',
        'Waktu & tempat / Date & venue:',
        acara,
        '',
        'Detail undangan / Invitation details:',
        linkPlaceholder,
        '',
        'Kehadiran dan doa Anda sangat berarti bagi kami. / Your presence and blessings mean the world to us.',
        '',
        'Hormat kami / Warm regards,',
        couple,
      ].join('\n')
    case 'formal':
    default:
      return [
        `Kepada Yth. Bapak/Ibu/Saudara/i *${guestPlaceholder}*`,
        '',
        'Dengan hormat,',
        'Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:',
        '',
        `*${couple}*`,
        '',
        'Yang akan diselenggarakan pada:',
        acara,
        '',
        'Informasi lengkap undangan dapat diakses melalui tautan berikut:',
        linkPlaceholder,
        '',
        'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu.',
        '',
        'Hormat kami,',
        couple,
      ].join('\n')
  }
}

/** Mengisi kedua placeholder. Nama tamu kosong → "Bapak/Ibu/Saudara/i" supaya kalimatnya tetap utuh. */
export function fillTemplate(template: string, values: { guestName?: string; url: string }): string {
  return template
    .split(guestPlaceholder).join(values.guestName?.trim() || 'Bapak/Ibu/Saudara/i')
    .split(linkPlaceholder).join(values.url)
}

/**
 * Tautan `wa.me`. Nomor dinormalkan seperti API (`0812…` → `62812…`), teks di-encode utuh —
 * WhatsApp membaca `\n` dari `%0A` dan `*`/`_` tetap jadi tebal/miring.
 */
export function whatsappLink(phone: string | undefined, text: string): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  const number = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

/** Tampilan nomor di tabel: `628123…` → `+62 812-3…`; kosong → strip. */
export function formatPhone(phone: string | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return '—'
  if (digits.startsWith('62')) {
    const rest = digits.slice(2)
    return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}${rest.length > 7 ? `-${rest.slice(7)}` : ''}`
  }
  return `+${digits}`
}

/** Baris CSV untuk ekspor dan template unduhan; sel yang memuat koma/kutip/baris baru dibungkus kutip. */
/**
 * CSV untuk diunduh pasangan — dan dibuka di Excel/Sheets, yang membuat pengutipan saja tidak cukup.
 *
 * Sebuah nama tamu yang diawali `=`, `+`, `-`, atau `@` akan dieksekusi sebagai rumus saat
 * berkasnya dibuka; `=HYPERLINK(...)` adalah bentuk yang paling sering dipakai untuk itu. Repo
 * ini sudah punya penangkalnya di `safeSpreadsheetCell` sejak lama — lengkap dengan tesnya — tapi
 * sampai fase 75 fungsi itu **tidak punya satu pun pemanggil produksi**, dan ekspor tamu di sini
 * mengirimkannya mentah. Nama tamu datang dari pasangan sendiri, jadi risikonya kecil; yang tidak
 * masuk akal adalah punya obatnya lalu tidak meminumnya.
 */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    const text = safeSpreadsheetCell(String(value ?? ''))
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return `${rows.map(row => row.map(cell).join(',')).join('\n')}\n`
}
