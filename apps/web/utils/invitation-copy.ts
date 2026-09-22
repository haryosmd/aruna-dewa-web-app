import type { CopyKey, InvitationCopy } from '@aruna/contracts'
import { copyKeys, copyLimit } from '@aruna/contracts'

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

/*
 * Permukaan FORM sistem copy dihapus di fase 74.5, bukan dibiarkan jadi utang diam.
 *
 * `copyGroups`, `copyGroupsFor`, `copyKeysFor`, `copyClustersFor`, `jumlahCopyDiubah(Di)` dan
 * ketiga tipenya (`CopyField`, `CopyGroup`, `CopyCluster`) lahir untuk `CopyForm.vue` lalu
 * `CopyFields.vue` (fase 71). Fase 72 menghapus keduanya — kata-kata v2 hidup di dalam `data`
 * tiap bagian dan formnya digenerate dari `sectionFields` — tapi tabel setinggi 70 baris ini
 * ikut tertinggal, dengan spec 13 tesnya sendiri sebagai satu-satunya konsumen. Tes yang
 * menguji tabel yang tidak dibaca siapa pun hanya membuat suite terlihat lebih tebal.
 *
 * Yang di bawah TETAP dan tidak boleh ikut dibuang: `copyDefaults` dibaca `CoverGate.vue:16`,
 * `resolveCopy` + `pilihCopy` dibaca `Renderer.vue:299-300`. Dokumen v1 masih sah, masih
 * dirender, dan sidik jari desainnya masih membaca `copy` (`invitations.service.ts`).
 *
 * Aturan "label ditulis menurut fungsinya, bukan istilah desain" (keputusan pemilik fase 71)
 * ikut pindah bersama formnya: penjaganya sekarang membaca `sectionFields` di
 * `tests/sections.test.ts`, karena di situlah label form hidup sekarang.
 */

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

