import { mediaRules } from '@aruna/contracts'

/**
 * Sisi terpanjang foto setelah dinormalkan.
 *
 * Undangan dibuka di ponsel, dan foto galeri terbesar dirender selebar layar. 2000px masih
 * tajam di layar 3x sambil memangkas foto ponsel 8 MB jadi ratusan kilobyte — dan yang
 * menghemat kuota di sini bukan cuma tamu, tapi juga pasangan yang mengunggahnya.
 */
export const maxPhotoEdge = 2000

/** Kualitas WebP. 0,82 adalah titik ketika artefak berhenti terlihat pada foto pernikahan. */
const webpQuality = 0.82

/**
 * Ukuran sasaran, dihitung terpisah supaya bisa diuji tanpa canvas.
 * Foto yang sudah lebih kecil dari batas tidak pernah diperbesar.
 */
export function targetSize(width: number, height: number, maxEdge = maxPhotoEdge): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (!longest || longest <= maxEdge) return { width, height }
  const ratio = maxEdge / longest
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) }
}

/**
 * Nama berkas hasil konversi: ekstensi lama dibuang, bukan ditempeli — dan ekstensinya
 * mengikuti jenis yang **benar-benar dihasilkan** canvas, bukan yang diminta.
 *
 * Itu bukan kehati-hatian teoretis. `toBlob` boleh mengabaikan jenis yang diminta dan
 * mengembalikan PNG; spesifikasinya mengizinkan, dan WebKit memakainya. Sebelum ini hasilnya
 * tetap dinamai `.webp` dan dilabeli `image/webp`, jadi yang naik adalah berkas PNG yang
 * mengaku WebP — dan pemeriksaan magic-byte di server menolaknya dengan "Isi berkas tidak
 * cocok dengan jenis media yang diklaim". Di browser tanpa encoder WebP, **tidak satu pun
 * foto bisa diunggah**. Ditemukan project Playwright `safari`, tes galeri, WebKit 390.
 */
export function convertedName(name: string, type: string): string {
  const stem = name.replace(/\.[^.]+$/u, '') || 'foto'
  const extension = ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' } as Record<string, string>)[type]
  return extension ? `${stem}.${extension}` : name
}

/**
 * Memperkecil dan mengubah foto ke WebP sebelum diunggah.
 *
 * Ini **kenyamanan, bukan keamanan**. Server tetap memeriksa MIME dan magic-byte-nya sendiri;
 * apa pun yang keluar dari sini diperlakukan sebagai kiriman tak dipercaya seperti biasa.
 *
 * Kalau apa pun gagal — browser tanpa `createImageBitmap`, `toBlob` mengembalikan null, atau
 * foto rusak — berkas aslinya yang dikirim. Unggahan yang lebih besar jauh lebih baik daripada
 * unggahan yang tidak terjadi.
 */
export async function normalizePhoto(file: File): Promise<File> {
  if (!mediaRules.image.mimeTypes.includes(file.type as never)) return file
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file

  let bitmap: ImageBitmap | null = null
  try {
    // `imageOrientation: 'from-image'` memutar foto potret sesuai EXIF-nya. Tanpa itu, foto
    // yang benar di galeri ponsel mendarat miring di undangan — canvas tidak membaca EXIF.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const size = targetSize(bitmap.width, bitmap.height)

    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, size.width, size.height)

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', webpQuality))
    if (!blob || !blob.size) return file
    /*
     * Jenisnya dibaca dari blob, bukan dari yang diminta. Browser tanpa encoder WebP
     * mengembalikan PNG dengan senang hati, dan mengirimkannya sebagai `image/webp` berarti
     * server menolak setiap unggahan. PNG yang sudah diperkecil tetap jauh lebih baik daripada
     * foto ponsel 8 MB yang naik apa adanya — yang dibuang cuma penghematan formatnya.
     */
    if (!mediaRules.image.mimeTypes.includes(blob.type as never)) return file
    // Konversi yang justru membengkakkan berkas dibuang. Terjadi pada WebP yang sudah
    // dioptimalkan dan pada foto kecil: mengirim hasil yang lebih besar tidak masuk akal.
    if (blob.size >= file.size && file.size <= mediaRules.image.maxBytes) return file

    return new File([blob], convertedName(file.name, blob.type), { type: blob.type, lastModified: Date.now() })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}
