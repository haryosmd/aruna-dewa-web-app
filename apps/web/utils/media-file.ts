import { formatBytes, mediaRules, type MediaKind } from '@aruna/contracts'

/**
 * Penolakan berkas, di klien, sebelum satu byte pun naik.
 *
 * Server tetap pemegang keputusan sesungguhnya — ini hanya memindahkan kabar buruknya ke
 * detik pertama. Sebelum ini `accept="image/*"` meloloskan GIF, AVIF, dan SVG, lalu server
 * menolaknya; pasangan baru tahu berkasnya salah setelah 12 MB selesai naik lewat data seluler.
 *
 * Mengembalikan kalimat kesalahan, atau `null` kalau berkasnya boleh naik. Kalimatnya selalu
 * menyebut nama berkasnya: satu jatuhan bisa berisi sepuluh foto, dan "jenis berkas tidak
 * didukung" tanpa nama tidak memberi tahu yang mana.
 */
export function validateMediaFile(file: File, kind: MediaKind): string | null {
  const rules = mediaRules[kind]
  const extension = /\.[^.]+$/u.exec(file.name.toLowerCase())?.[0] ?? ''
  const typeAllowed = (rules.mimeTypes as readonly string[]).includes(file.type)
  const extensionAllowed = (rules.extensions as readonly string[]).includes(extension)

  // Sebagian ponsel mengirim `.webp` sebagai `application/octet-stream` dan `.mp3` tanpa tipe
  // sama sekali. Ekstensi yang benar cukup untuk meloloskannya ke server, yang memeriksa
  // magic-byte-nya; tipe yang jelas-jelas salah tetap ditolak di sini.
  if (!typeAllowed && !(extensionAllowed && (!file.type || file.type === 'application/octet-stream'))) {
    return `${file.name} — jenis berkas harus ${rules.label}`
  }
  if (!file.size) return `${file.name} — berkasnya kosong`
  if (file.size > rules.maxBytes) return `${file.name} — ${formatBytes(file.size)}, maksimal ${formatBytes(rules.maxBytes)}`
  return null
}

/** `null` kalau URL-nya bukan aset unggahan kita. Dipakai untuk tahu apa yang boleh ikut dihapus. */
export function mediaAssetIdFromUrl(url: string): string | null {
  return /\/v1\/public\/media\/([0-9a-f-]{36})$/iu.exec(url)?.[1] ?? null
}
