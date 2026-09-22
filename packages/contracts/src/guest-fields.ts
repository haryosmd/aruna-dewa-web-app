/**
 * Kolom tamu yang lahir dari lembar tamu pemilik (fase 75), beserta pembaca nilainya.
 *
 * Lembar aslinya berbahasa Inggris (`Guest From`, `Child`, `Invitation`, `Status`, `Notes`) dan
 * dropdown-nya **boleh diubah pemilik** — lembarnya sendiri menulis "Tambah/ubah pilihan langsung
 * di kolomnya". Jadi tidak ada enum di sini maupun di basis data: yang dikenal dinormalkan ke satu
 * ejaan supaya filter dan statistik tidak pecah, yang tidak dikenal **disimpan apa adanya**.
 * Menolaknya berarti menolak lembar kerja pasangan, dan itu bukan tugas kita.
 *
 * `Status` sengaja tidak ada di sini. Ia sudah diturunkan dari `sentAt` + RSVP, dan kolom kedua
 * yang mengklaim hal yang sama pasti menyimpang dari yang pertama.
 */

/** Panjang aman untuk kolom bebas; sepadan dengan `groupName`. */
export const guestFieldMaxLength = 80
export const guestNotesMaxLength = 500
/** Sepadan dengan `quota`: satu undangan bukan tempat mendaftarkan satu kampung. */
export const guestChildMax = 20

const normalisasi = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

/** Dari siapa tamu ini diundang. Ejaan tersimpan: `pria` · `wanita` · `keduanya`. */
export function normalizeGuestFrom(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  const key = normalisasi(raw)
  if (['groom', 'pria', 'mempelai pria', 'laki-laki', 'cpp', 'pengantin pria'].includes(key)) return 'pria'
  if (['bride', 'wanita', 'mempelai wanita', 'perempuan', 'cpw', 'pengantin wanita'].includes(key)) return 'wanita'
  if (['both', 'keduanya', 'dua-duanya', 'bersama'].includes(key)) return 'keduanya'
  return raw.slice(0, guestFieldMaxLength)
}

/** Bentuk undangan yang diberikan. Ejaan tersimpan: `digital` · `cetak` · `belum`. */
export function normalizeInvitationKind(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  const key = normalisasi(raw)
  if (['digital', 'online', 'link', 'tautan', 'whatsapp'].includes(key)) return 'digital'
  if (['printed hard', 'printed', 'hard', 'cetak', 'fisik', 'kartu'].includes(key)) return 'cetak'
  if (['not yet', 'belum', 'belum ada', '-'].includes(key)) return 'belum'
  return raw.slice(0, guestFieldMaxLength)
}

/**
 * Jumlah anak. **Tidak pernah memblokir sebuah baris** — permintaan pemilik, ditulis tegas:
 * kolom anak murni pendataan, dan kosong sama sahnya dengan terisi.
 *
 * Lembar pemilik memakai centang, dan ekspornya menulis `TRUE`/`FALSE` di **setiap** baris,
 * termasuk ~190 baris kosong di bawah data. Karena itu `FALSE` wajib terbaca sebagai "tidak
 * diisi" (null) dan bukan angka 0 — kalau tidak, baris kosong akan terlihat "punya data" dan
 * lolos penyaring baris kosong di `parseGuestText`.
 */
export function normalizeChildCount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 && value <= guestChildMax ? value : null
  const raw = value.trim()
  if (!raw) return null
  const key = normalisasi(raw)
  if (['false', 'no', 'tidak', '0', '-', 'n'].includes(key)) return null
  if (['true', 'yes', 'ya', '✓', '✔', 'v', 'x', 'y'].includes(key)) return 1
  const angka = Number(raw)
  return Number.isInteger(angka) && angka > 0 && angka <= guestChildMax ? angka : null
}

/** Catatan bebas pasangan; dipotong, tidak pernah ditolak. */
export function normalizeGuestNotes(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  return raw ? raw.slice(0, guestNotesMaxLength) : null
}

/** Label Indonesia untuk ejaan tersimpan; nilai bebas pemilik dikembalikan apa adanya. */
export function guestFromLabel(value: string | null | undefined): string {
  if (value === 'pria') return 'Mempelai pria'
  if (value === 'wanita') return 'Mempelai wanita'
  if (value === 'keduanya') return 'Keduanya'
  return value ?? ''
}

export function invitationKindLabel(value: string | null | undefined): string {
  if (value === 'digital') return 'Digital'
  if (value === 'cetak') return 'Cetak'
  if (value === 'belum') return 'Belum dikirim'
  return value ?? ''
}
