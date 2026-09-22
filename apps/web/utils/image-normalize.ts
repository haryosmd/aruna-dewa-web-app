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

/* ── Pangkas (fase 74.6) ─────────────────────────────────────────────────────── */

/**
 * Kotak pangkas dalam koordinat **ternormalisasi** 0–1, bukan piksel.
 *
 * Alasannya praktis: pemilih kotaknya menggambar di atas `<img>` yang lebarnya ditentukan
 * tata letak dialog, bukan ukuran asli foto. Menyimpan piksel berarti setiap perubahan lebar
 * dialog harus dikonversi ulang, dan satu pembulatan yang meleset menggeser hasil pangkas.
 */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Menerjemahkan kotak ternormalisasi ke piksel foto aslinya, dan **menjinakkan** nilai yang
 * tidak masuk akal alih-alih mempercayainya.
 *
 * Dipisah dari canvas supaya bisa diuji tanpa browser — pola yang sama dengan `targetSize`.
 * Kotak yang keluar batas dipotong ke dalam, bukan ditolak: pointer event bisa mendarat satu
 * piksel di luar gambar, dan menolak seluruh pangkasan karena itu akan terasa seperti bug.
 * Kotak yang menyusut jadi nol dikembalikan sebagai foto utuh — hasil 0x0 melempar di canvas.
 */
export function cropRect(natural: { width: number; height: number }, rect: CropRect): { x: number; y: number; width: number; height: number } {
  const utuh = { x: 0, y: 0, width: natural.width, height: natural.height }
  if (!natural.width || !natural.height) return utuh
  const batas = (nilai: number) => (Number.isFinite(nilai) ? Math.min(1, Math.max(0, nilai)) : 0)
  const x = batas(rect.x)
  const y = batas(rect.y)
  const width = Math.min(batas(rect.width), 1 - x)
  const height = Math.min(batas(rect.height), 1 - y)
  const piksel = {
    x: Math.round(x * natural.width),
    y: Math.round(y * natural.height),
    width: Math.round(width * natural.width),
    height: Math.round(height * natural.height),
  }
  if (piksel.width < 1 || piksel.height < 1) return utuh
  return piksel
}

/**
 * Memangkas foto lalu mengembalikannya sebagai `File` baru, siap diunggah.
 *
 * Memakai jalur yang sama persis dengan `normalizePhoto` — `createImageBitmap` ber-EXIF,
 * canvas, `toBlob`, jenis dibaca dari blob-nya — jadi pangkas tidak memperkenalkan cara kedua
 * untuk salah. Termasuk dua jebakan yang sudah dibayar di sana: EXIF potret, dan browser yang
 * mengembalikan PNG saat diminta WebP.
 *
 * Bedanya satu: di sini kegagalan **mengembalikan `null`**, bukan berkas asli. `normalizePhoto`
 * boleh diam-diam menyerah karena hasilnya sekadar kurang hemat; pangkas yang diam-diam
 * menyerah akan mengunggah foto UTUH padahal pasangan baru saja memilih sebagian — mengganti
 * hasil yang salah dengan pesan galat adalah satu-satunya pilihan yang jujur.
 */
export async function cropPhoto(file: File, rect: CropRect): Promise<File | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const potong = cropRect({ width: bitmap.width, height: bitmap.height }, rect)
    const size = targetSize(potong.width, potong.height)

    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(bitmap, potong.x, potong.y, potong.width, potong.height, 0, 0, size.width, size.height)

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', webpQuality))
    if (!blob || !blob.size) return null
    if (!mediaRules.image.mimeTypes.includes(blob.type as never)) return null

    const stem = file.name.replace(/\.[^.]+$/u, '') || 'foto'
    return new File([blob], convertedName(`${stem}-pangkas`, blob.type), { type: blob.type, lastModified: Date.now() })
  } catch {
    return null
  } finally {
    bitmap?.close()
  }
}
