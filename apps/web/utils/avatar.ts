/**
 * Avatar dipilih dari id akun, bukan disimpan.
 *
 * Tidak ada kolom `avatar` di basis data dan tidak ada endpoint untuk mengubahnya: id akun
 * tidak pernah berubah, jadi orang yang sama selalu mendapat gambar yang sama — di ponsel,
 * di laptop, dan di render server. Menyimpannya di `localStorage` akan terlihat lebih ramah
 * sampai orangnya membuka browser lain dan avatarnya berganti, dan itu terbaca sebagai bug.
 *
 * Perkalian dengan posisi karakter penting: id kami UUID, dan dua UUID berbeda sering punya
 * kumpulan karakter yang sama persis. Penjumlahan polos memberi keduanya avatar yang sama.
 */

export const avatarCount = 5

export function avatarIndex(id: string | null | undefined): number {
  if (!id) return 0
  let sum = 0
  for (let index = 0; index < id.length; index += 1) sum = (sum + id.charCodeAt(index) * (index + 1)) % 9973
  return sum % avatarCount
}
