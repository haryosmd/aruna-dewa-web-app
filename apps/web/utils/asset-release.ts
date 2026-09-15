import { mediaAssetIdFromUrl } from './media-file'

/**
 * Kapan sebuah berkas media boleh benar-benar dihapus dari server.
 *
 * Dulu jawabannya "begitu URL-nya lepas dari dokumen di layar", dan itu benar hanya selama
 * autosave hidup: draf di server menyusul 900ms kemudian, jadi jendela di mana draf tersimpan
 * menunjuk aset yang sudah mati nyaris tidak ada. Autosave dicabut di fase 18, dan jendela itu
 * jadi selebar "sampai pasangan menekan Simpan" — atau selamanya kalau mereka tidak
 * menekannya. Pasangan yang menghapus foto lalu memuat ulang halaman akan menemukan galerinya
 * utuh dengan satu kotak gambar rusak di dalamnya.
 *
 * Jadi urutannya dibalik: URL yang dihapus mengantre, dan baru dilepas **sesudah** simpan
 * berhasil — diperiksa terhadap dokumen yang benar-benar tersimpan, bukan terhadap yang ada
 * di layar saat tombol hapus ditekan.
 *
 * Berkas ini murni: tidak menyentuh jaringan maupun DOM. `editor.vue` yang memegang antreannya
 * dan yang memanggil `DELETE /media/:id`.
 */

/**
 * URL mana dari antrean yang aman dilepas, mengingat dokumen yang baru saja tersimpan.
 *
 * Dua alasan sebuah URL tidak lolos, dan keduanya pernah menimbulkan bug sungguhan:
 *
 * 1. **Masih disebut dokumen.** Foto yang sama boleh dipakai di cover *dan* di galeri;
 *    menghapusnya dari salah satu tidak boleh membuang berkasnya.
 * 2. **Bukan aset unggahan kita.** `https://images.unsplash.com/…` yang ditempel pasangan
 *    tidak punya `assetId`, dan tidak ada yang bisa dihapus untuknya.
 */
export function releasableUrls(queued: Iterable<string>, savedDocumentJson: string): string[] {
  const keluar: string[] = []
  for (const url of queued) {
    if (!url || !mediaAssetIdFromUrl(url)) continue
    if (savedDocumentJson.includes(url)) continue
    if (keluar.includes(url)) continue
    keluar.push(url)
  }
  return keluar
}

/**
 * Yang tetap mengantre untuk percobaan berikutnya.
 *
 * Bukan sekadar "sisanya": URL yang bukan aset kita dibuang dari antrean untuk selamanya —
 * tidak ada yang bisa dihapus untuknya, dan menyimpannya hanya membuat antrean tumbuh sepanjang
 * sesi penyuntingan. Yang dipertahankan cuma aset kita yang ternyata masih dipakai, karena
 * pasangan boleh melepasnya lagi nanti.
 */
export function stillQueued(queued: Iterable<string>, savedDocumentJson: string): string[] {
  const keluar: string[] = []
  for (const url of queued) {
    if (!url || !mediaAssetIdFromUrl(url)) continue
    if (!savedDocumentJson.includes(url)) continue
    if (keluar.includes(url)) continue
    keluar.push(url)
  }
  return keluar
}
