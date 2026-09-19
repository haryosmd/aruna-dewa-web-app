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
  /**
   * Ditulis menurut **fungsi** kolomnya di mata pasangan, bukan istilah desain: "Teks kecil di
   * atas judul", bukan "Kicker". Keputusan pemilik fase 71 — form bagian harus terbaca seperti
   * form, dan pasangan tidak tahu apa itu kicker.
   */
  label: string
  /** Kalimat panjang dapat `<textarea>`; label dan tombol cukup satu baris. */
  multiline?: boolean
  /**
   * Sub-blok di form bagian, dinamai menurut fungsinya ("Tombol", "Pesan setelah menjawab").
   * Kolom tanpa kelompok jatuh ke kelompok pertama grupnya — tidak ada judul payung "Kata-kata".
   */
  kelompok?: string
}

export type CopySection = (typeof sectionTypes)[number]

export interface CopyGroup {
  /** `gate` bukan section; ia amplop pembuka yang hidup di depan cover. */
  section: CopySection | 'gate'
  label: string
  fields: CopyField[]
}

const JUDUL = 'Judul & pengantar'
const TOMBOL = 'Tombol'
const KOSONG = 'Saat kosong'

/** Urutan grup mengikuti urutan tamu membacanya, bukan abjad. */
export const copyGroups: CopyGroup[] = [
  { section: 'gate', label: 'Amplop pembuka', fields: [
    { key: 'gate.kicker', label: 'Teks kecil di atas nama', kelompok: 'Amplop pembuka' },
    { key: 'gate.greeting', label: 'Sapaan sebelum nama tamu', kelompok: 'Amplop pembuka' },
    { key: 'gate.open', label: 'Tulisan tombol buka amplop', kelompok: 'Amplop pembuka' },
    { key: 'gate.noGuest', label: 'Kalimat saat tautan tanpa nama tamu', multiline: true, kelompok: 'Amplop pembuka' },
    { key: 'gate.music', label: 'Catatan musik latar', multiline: true, kelompok: 'Amplop pembuka' },
  ] },
  { section: 'cover', label: 'Cover', fields: [{ key: 'cover.kicker', label: 'Teks kecil di atas nama', kelompok: JUDUL }] },
  { section: 'couple', label: 'Mempelai', fields: [{ key: 'couple.kicker', label: 'Teks kecil di atas nama', kelompok: JUDUL }] },
  { section: 'events', label: 'Acara', fields: [
    { key: 'events.kicker', label: 'Teks kecil di atas judul', kelompok: JUDUL },
    { key: 'events.title', label: 'Judul bagian', kelompok: JUDUL },
    { key: 'events.map', label: 'Tulisan tombol peta', kelompok: TOMBOL },
    { key: 'events.calendar', label: 'Tulisan tombol kalender', kelompok: TOMBOL },
  ] },
  { section: 'countdown', label: 'Hitung mundur', fields: [
    { key: 'countdown.kicker', label: 'Teks kecil di atas hitungan', kelompok: JUDUL },
    { key: 'countdown.arrived', label: 'Kalimat saat harinya tiba', kelompok: KOSONG },
    { key: 'countdown.tba', label: 'Kalimat saat tanggal belum diisi', kelompok: KOSONG },
  ] },
  { section: 'gallery', label: 'Galeri', fields: [
    { key: 'gallery.kicker', label: 'Teks kecil di atas judul', kelompok: JUDUL },
    { key: 'gallery.title', label: 'Judul bagian', kelompok: JUDUL },
  ] },
  { section: 'story', label: 'Cerita cinta', fields: [
    { key: 'story.kicker', label: 'Teks kecil di atas judul', kelompok: JUDUL },
    { key: 'story.closing', label: 'Kalimat penutup cerita', kelompok: JUDUL },
  ] },
  { section: 'rundown', label: 'Rundown', fields: [
    { key: 'rundown.kicker', label: 'Teks kecil di atas judul', kelompok: JUDUL },
    { key: 'rundown.title', label: 'Judul bagian', kelompok: JUDUL },
  ] },
  { section: 'dresscode', label: 'Dresscode', fields: [
    { key: 'dresscode.kicker', label: 'Teks kecil di atas judul', kelompok: JUDUL },
    { key: 'dresscode.title', label: 'Judul bagian', kelompok: JUDUL },
    { key: 'dresscode.note', label: 'Catatan di bawah', kelompok: JUDUL },
  ] },
  { section: 'video', label: 'Video & live stream', fields: [
    { key: 'video.kicker', label: 'Teks kecil di atas judul', kelompok: JUDUL },
    { key: 'video.open', label: 'Tulisan tombol siaran', kelompok: TOMBOL },
  ] },
  { section: 'gift', label: 'Hadiah', fields: [
    { key: 'gift.kicker', label: 'Teks kecil di atas judul', kelompok: JUDUL },
    { key: 'gift.fallbackNote', label: 'Kalimat saat catatan hadiah kosong', multiline: true, kelompok: KOSONG },
  ] },
  { section: 'rsvp', label: 'RSVP', fields: [
    { key: 'rsvp.kicker', label: 'Teks kecil di atas pertanyaan', kelompok: JUDUL },
    { key: 'rsvp.title', label: 'Pertanyaan kepada tamu', kelompok: JUDUL },
    { key: 'rsvp.yes', label: 'Tulisan pilihan hadir', kelompok: 'Pilihan jawaban' },
    { key: 'rsvp.yesHint', label: 'Keterangan di bawah pilihan hadir', kelompok: 'Pilihan jawaban' },
    { key: 'rsvp.no', label: 'Tulisan pilihan berhalangan', kelompok: 'Pilihan jawaban' },
    { key: 'rsvp.noHint', label: 'Keterangan di bawah pilihan berhalangan', kelompok: 'Pilihan jawaban' },
    { key: 'rsvp.seats', label: 'Label kolom jumlah tamu', kelompok: 'Pilihan jawaban' },
    { key: 'rsvp.message', label: 'Label kolom pesan', kelompok: 'Pilihan jawaban' },
    { key: 'rsvp.submit', label: 'Tulisan tombol kirim', kelompok: TOMBOL },
    { key: 'rsvp.thanks', label: 'Judul sesudah tamu menjawab', kelompok: 'Pesan setelah menjawab' },
    { key: 'rsvp.confirmed', label: 'Status untuk yang hadir', kelompok: 'Pesan setelah menjawab' },
    { key: 'rsvp.declined', label: 'Status untuk yang berhalangan', kelompok: 'Pesan setelah menjawab' },
    { key: 'rsvp.prayer', label: 'Kalimat untuk yang berhalangan', multiline: true, kelompok: 'Pesan setelah menjawab' },
  ] },
  { section: 'wishes', label: 'Ucapan', fields: [
    { key: 'wishes.kicker', label: 'Teks kecil di atas judul', kelompok: JUDUL },
    { key: 'wishes.title', label: 'Judul bagian', kelompok: JUDUL },
    { key: 'wishes.add', label: 'Judul form ucapan', kelompok: JUDUL },
    { key: 'wishes.submit', label: 'Tulisan tombol kirim', kelompok: TOMBOL },
  ] },
]

/**
 * Grup yang tampil di form satu bagian (fase 71). `gate` menumpang di cover: amplop hidup di
 * depan cover, tidak punya entri rail, dan tidak punya `#iv-gate` di panggung — bagian virtual
 * untuk lima kolom akan menyentuh rail, `selected`, dan fokus panggung sekaligus.
 */
export function copyGroupsFor(section: CopySection): CopyGroup[] {
  if (section === 'cover') return copyGroups.filter(group => group.section === 'gate' || group.section === 'cover')
  return copyGroups.filter(group => group.section === section)
}

export function copyKeysFor(section: CopySection): CopyKey[] {
  return copyGroupsFor(section).flatMap(group => group.fields.map(field => field.key))
}

export interface CopyCluster {
  judul: string
  fields: CopyField[]
}

/** Kolom-kolom sebuah bagian, dikelompokkan menurut fungsinya dan diurutkan seperti kemunculan pertama kelompoknya. */
export function copyClustersFor(section: CopySection): CopyCluster[] {
  const clusters: CopyCluster[] = []
  for (const group of copyGroupsFor(section)) {
    for (const field of group.fields) {
      const judul = field.kelompok ?? group.label
      let cluster = clusters.find(item => item.judul === judul)
      if (!cluster) { cluster = { judul, fields: [] }; clusters.push(cluster) }
      cluster.fields.push(field)
    }
  }
  return clusters
}

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

/** Berapa dari `keys` yang benar-benar berbeda dari bawaan — angka untuk lencana "n diubah" per bagian. */
export function jumlahCopyDiubahDi(copy: InvitationCopy | undefined, keys: readonly CopyKey[]): number {
  if (!copy) return 0
  return keys.filter(key => copy[key] !== undefined && copy[key] !== copyDefaults[key]).length
}

/** Hitungan untuk seluruh undangan (ringkasan di tab Tema). */
export function jumlahCopyDiubah(copy: InvitationCopy | undefined): number {
  return jumlahCopyDiubahDi(copy, copyKeys)
}
