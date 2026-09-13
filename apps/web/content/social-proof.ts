/**
 * Hanya berisi fakta yang benar-benar bisa dibuktikan.
 *
 * Testimoni sengaja dikosongkan: menayangkan kutipan fiktif sebagai testimoni asli adalah
 * klaim yang menyesatkan. Begitu ada testimoni sungguhan dari pasangan, isi `testimonials`
 * di bawah dan bagian itu akan muncul kembali di halaman depan dengan sendirinya.
 */

/**
 * Angka yang tidak perlu dirawat. Jumlah tema sengaja tidak disebut: koleksinya bertambah,
 * dan teks yang menyebut angka pasti akan basi tanpa ada yang menyadarinya.
 */
export const heroStats: [string, string][] = [
  ['12 bulan', 'undangan tetap aktif'],
  ['Sekali bayar', 'tanpa langganan'],
  ['Tanpa batas', 'jumlah tamu diundang'],
]

export type Testimonial = { quote: string; name: string; detail: string }

export const testimonials: Testimonial[] = []
