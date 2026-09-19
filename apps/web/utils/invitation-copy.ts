import type { CopyKey, InvitationCopy } from '@aruna/contracts'
import { copyKeys, copyLimit, type sectionTypes } from '@aruna/contracts'

/**
 * Kata-kata bawaan undangan dan bentuk formnya (fase 69).
 *
 * Sampai fase ini ±40 kalimat tamu-facing ditulis mati di `sections/*.vue` dan `CoverGate.vue`.
 * Sekarang tiap kalimat punya satu kunci di `copyKeys` (kontrak), satu bawaan di sini, dan satu
 * pembaca `t(key)` di renderer. Bawaannya **persis** teks lama, jadi undangan yang tidak pernah
 * menyentuh form ini tidak berubah satu huruf pun — itu juga yang dijaga tes e2e publik yang
 * mencari "Buka Undangan" dan "Kepada Yth.".
 */
export const copyDefaults: Record<CopyKey, string> = {
  'gate.kicker': 'Undangan pernikahan',
  'gate.greeting': 'Kepada Yth.',
  'gate.noGuest': 'Tanpa mengurangi rasa hormat, kami mengundang Anda.',
  'gate.open': 'Buka Undangan',
  'gate.music': 'Undangan ini memakai musik latar — nyalakan suara ponselmu.',
  'cover.kicker': 'Undangan pernikahan',
  'couple.kicker': 'Dengan penuh sukacita',
  'events.kicker': 'Rangkaian acara',
  'events.title': 'Akad & Resepsi',
  'events.map': 'Buka peta',
  'events.calendar': 'Simpan ke kalender',
  'countdown.kicker': 'Menuju hari bahagia',
  'countdown.arrived': 'Hari bahagia telah tiba.',
  'countdown.tba': 'Tanggal akan segera diumumkan.',
  'gallery.kicker': 'Potret bahagia',
  'gallery.title': 'Momen yang kami simpan',
  'story.kicker': 'Cerita kami',
  'story.closing': '…dan sampailah kami di hari ini.',
  'rundown.kicker': 'Susunan acara',
  'rundown.title': 'Rundown',
  'dresscode.kicker': 'Dresscode',
  'dresscode.title': 'Yang kami harapkan dikenakan',
  'dresscode.note': 'Kenakan yang membuat Anda nyaman.',
  'video.kicker': 'Saksikan bersama',
  'video.open': 'Buka siaran',
  'gift.kicker': 'Tanda kasih',
  'gift.fallbackNote': 'Doa restu Anda sudah lebih dari cukup. Bila ingin berbagi tanda kasih, kami menerimanya dengan senang hati.',
  'rsvp.kicker': 'Konfirmasi kehadiran',
  'rsvp.title': 'Apakah Anda dapat hadir?',
  'rsvp.thanks': 'Terima kasih sudah merespons.',
  'rsvp.confirmed': 'Kehadiran dikonfirmasi',
  'rsvp.declined': 'Berhalangan hadir',
  'rsvp.prayer': 'Doa Anda tetap kami terima dengan hangat.',
  'rsvp.yes': 'Hadir',
  'rsvp.yesHint': 'Saya akan datang',
  'rsvp.no': 'Berhalangan',
  'rsvp.noHint': 'Saya kirim doa dari jauh',
  'rsvp.seats': 'Jumlah yang hadir',
  'rsvp.message': 'Pesan untuk pasangan (opsional)',
  'rsvp.submit': 'Kirim konfirmasi',
  'wishes.kicker': 'Ucapan dan doa',
  'wishes.title': 'Doa baik dari orang tersayang',
  'wishes.add': 'Tambahkan ucapan',
  'wishes.submit': 'Kirim ucapan',
}

export interface CopyField {
  key: CopyKey
  label: string
  /** Kalimat panjang dapat `<textarea>`; label dan tombol cukup satu baris. */
  multiline?: boolean
}

export interface CopyGroup {
  /** `gate` bukan section; ia amplop pembuka yang hidup di depan cover. */
  section: (typeof sectionTypes)[number] | 'gate'
  label: string
  fields: CopyField[]
}

/** Urutan grup mengikuti urutan tamu membacanya, bukan abjad. */
export const copyGroups: CopyGroup[] = [
  { section: 'gate', label: 'Amplop pembuka', fields: [
    { key: 'gate.kicker', label: 'Kicker amplop' },
    { key: 'gate.greeting', label: 'Sapaan sebelum nama tamu' },
    { key: 'gate.noGuest', label: 'Kalimat saat tautan tanpa nama tamu', multiline: true },
    { key: 'gate.open', label: 'Tombol buka' },
    { key: 'gate.music', label: 'Catatan musik latar', multiline: true },
  ] },
  { section: 'cover', label: 'Cover', fields: [{ key: 'cover.kicker', label: 'Kicker cover' }] },
  { section: 'couple', label: 'Mempelai', fields: [{ key: 'couple.kicker', label: 'Kicker' }] },
  { section: 'events', label: 'Acara', fields: [
    { key: 'events.kicker', label: 'Kicker' },
    { key: 'events.title', label: 'Judul' },
    { key: 'events.map', label: 'Tombol peta' },
    { key: 'events.calendar', label: 'Tombol kalender' },
  ] },
  { section: 'countdown', label: 'Hitung mundur', fields: [
    { key: 'countdown.kicker', label: 'Kicker' },
    { key: 'countdown.arrived', label: 'Saat harinya tiba' },
    { key: 'countdown.tba', label: 'Saat tanggal belum diisi' },
  ] },
  { section: 'gallery', label: 'Galeri', fields: [
    { key: 'gallery.kicker', label: 'Kicker' },
    { key: 'gallery.title', label: 'Judul' },
  ] },
  { section: 'story', label: 'Cerita cinta', fields: [
    { key: 'story.kicker', label: 'Kicker' },
    { key: 'story.closing', label: 'Kalimat penutup cerita' },
  ] },
  { section: 'rundown', label: 'Rundown', fields: [
    { key: 'rundown.kicker', label: 'Kicker' },
    { key: 'rundown.title', label: 'Judul' },
  ] },
  { section: 'dresscode', label: 'Dresscode', fields: [
    { key: 'dresscode.kicker', label: 'Kicker' },
    { key: 'dresscode.title', label: 'Judul' },
    { key: 'dresscode.note', label: 'Catatan di bawah' },
  ] },
  { section: 'video', label: 'Video & live stream', fields: [
    { key: 'video.kicker', label: 'Kicker' },
    { key: 'video.open', label: 'Tombol siaran' },
  ] },
  { section: 'gift', label: 'Hadiah', fields: [
    { key: 'gift.kicker', label: 'Kicker' },
    { key: 'gift.fallbackNote', label: 'Catatan saat catatan hadiah kosong', multiline: true },
  ] },
  { section: 'rsvp', label: 'RSVP', fields: [
    { key: 'rsvp.kicker', label: 'Kicker' },
    { key: 'rsvp.title', label: 'Pertanyaan' },
    { key: 'rsvp.thanks', label: 'Judul sesudah menjawab' },
    { key: 'rsvp.confirmed', label: 'Status hadir' },
    { key: 'rsvp.declined', label: 'Status berhalangan' },
    { key: 'rsvp.prayer', label: 'Kalimat untuk yang berhalangan', multiline: true },
    { key: 'rsvp.yes', label: 'Pilihan hadir' },
    { key: 'rsvp.yesHint', label: 'Keterangan hadir' },
    { key: 'rsvp.no', label: 'Pilihan berhalangan' },
    { key: 'rsvp.noHint', label: 'Keterangan berhalangan' },
    { key: 'rsvp.seats', label: 'Label jumlah kursi' },
    { key: 'rsvp.message', label: 'Label pesan' },
    { key: 'rsvp.submit', label: 'Tombol kirim' },
  ] },
  { section: 'wishes', label: 'Ucapan', fields: [
    { key: 'wishes.kicker', label: 'Kicker' },
    { key: 'wishes.title', label: 'Judul' },
    { key: 'wishes.add', label: 'Label form ucapan' },
    { key: 'wishes.submit', label: 'Tombol kirim' },
  ] },
]

/**
 * Menyempitkan `document.copy` yang belum tentu berbentuk: hanya kunci yang dikenal, hanya
 * string, dipangkas, dan tidak melampaui batasnya. Dokumen hasil suntingan tangan lewat sini.
 */
export function resolveCopy(value: unknown): InvitationCopy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const masuk = value as Record<string, unknown>
  const keluar: InvitationCopy = {}
  for (const key of copyKeys) {
    const nilai = masuk[key]
    if (typeof nilai !== 'string') continue
    const rapi = nilai.trim()
    if (!rapi || rapi.length > copyLimit(key)) continue
    keluar[key] = rapi
  }
  return keluar
}

/** Kata-kata yang berlaku: milik pasangan bila ada, bawaan bila tidak. */
export function pilihCopy(copy: InvitationCopy | undefined, key: CopyKey, fallback = copyDefaults[key]): string {
  return copy?.[key]?.trim() || fallback
}

/** Berapa kunci yang benar-benar berbeda dari bawaan — angka untuk lencana "n diubah". */
export function jumlahCopyDiubah(copy: InvitationCopy | undefined): number {
  if (!copy) return 0
  return copyKeys.filter(key => copy[key] !== undefined && copy[key] !== copyDefaults[key]).length
}
