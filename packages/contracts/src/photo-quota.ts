/**
 * Kuota foto galeri per paket (fase 75).
 *
 * Berkas sendiri, bukan di `index.ts` bersama `catalog`, karena **`sections.ts` membutuhkannya**
 * dan `index.ts` mengimpor `sections.ts` — menaruhnya di sana berarti lingkaran impor. Dan
 * lingkarannya bukan tipe saja: `maxGalleryPhotoLimit` dihitung saat modul dimuat, jadi separuh
 * lingkaran akan membacanya sebagai `undefined` alih-alih gagal dengan jelas.
 *
 * `catalog.packages[].photoLimit` di `index.ts` membaca angkanya dari sini, jadi tetap satu sumber.
 */

/**
 * Angka yang dijanjikan katalog. Kuncinya id paket; paket baru yang lupa didaftarkan di sini akan
 * tertangkap invarian di `tests/contracts.test.ts`, bukan diam-diam jatuh ke batas terkecil.
 */
export const packagePhotoLimits = {
  mula: 15,
  mekar: 30,
  purnama: 60,
} as const

/**
 * Plafon untuk cap statis yang tidak bisa tahu paketnya — `invitationDocumentSchema` dipakai
 * editor juga dan tidak punya akses ke `packageId`. Angka per paket ditegakkan di tempat paketnya
 * diketahui; di sini yang dijaga cuma "tidak ada yang boleh melebihi paket teratas".
 *
 * Diturunkan, tidak ditulis tangan, supaya menaikkan paket teratas tidak pernah melupakan plafonnya.
 */
export const maxGalleryPhotoLimit = Math.max(...Object.values(packagePhotoLimits))

/**
 * Batas foto galeri untuk satu paket. Sebelum fase 75 ini satu angka untuk semua
 * (`galleryPhotoLimit = 15`) karena `Invitation` belum menyimpan paketnya; sekarang ia
 * menyimpannya di `Invitation.packageId`.
 *
 * Aturannya hidup di sini, bukan dua kali, dengan alasan yang sama persis dengan `canEditDesign`:
 * editor memakainya untuk mematikan tombol "Tambah foto" dan API memakainya untuk menolak
 * unggahan. Dua salinan yang menyimpang berarti tombolnya terlihat hidup lalu unggahannya gagal
 * tanpa sebab yang jelas.
 *
 * Paket yang tidak dikenali — termasuk `null`, yaitu draft yang belum punya pesanan lunas —
 * mendapat angka paket **termurah**, bukan tak terbatas. Kalau draft gratis boleh 60, pasangan
 * bisa menimbun dulu lalu terbentur sesudah membayar, dan itu bentuk kegagalan yang paling
 * menyakitkan: menyuruh menghapus foto yang sudah terlanjur dipilih.
 */
export function galleryPhotoLimitFor(packageId: string | null | undefined): number {
  const limit = packageId ? (packagePhotoLimits as Record<string, number | undefined>)[packageId] : undefined
  return limit ?? Math.min(...Object.values(packagePhotoLimits))
}
