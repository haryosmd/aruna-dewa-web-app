import { publicDocument } from '../invitations/document-validation.js';

export function apiOrigin(): string { return process.env.API_ORIGIN ?? 'http://127.0.0.1:3001'; }
export function publicMediaUrl(assetId: string): string { return `${apiOrigin()}/v1/public/media/${assetId}`; }

/**
 * Boleh **disajikan** ke tamu? Yang diperiksa versi publiknya, bukan dokumen mentah: section
 * yang dimatikan tidak pernah sampai ke tamu, jadi asetnya tidak boleh bisa diambil lewat
 * tautan langsung hanya karena masih tertulis di dalamnya.
 */
export function servesAsset(document: unknown, assetId: string): boolean {
  if (!document) return false;
  return JSON.stringify(publicDocument(document as never)).includes(publicMediaUrl(assetId));
}

/**
 * Masih **disebut** di dokumen ini? Sengaja memeriksa dokumen mentah, bukan versi publiknya.
 *
 * Perbedaannya kecil di layar dan mahal di lapangan. Pasangan yang mematikan galerinya sejenak
 * — mengaturnya ulang, membandingkan tema — lalu menghapus satu foto akan kehilangan berkasnya,
 * dan begitu galerinya dinyalakan lagi, revisi yang **sudah terbit** memuat tautan yang tidak
 * lagi ada. Menolak menghapus hanya menyisakan berkas yang tidak terpakai; salah menghapus
 * mematahkan undangan yang sudah disebar ke ratusan tamu. Yang pertama jauh lebih murah.
 */
export function referencesAsset(document: unknown, assetId: string): boolean {
  if (!document) return false;
  return JSON.stringify(document).includes(publicMediaUrl(assetId));
}

/**
 * Aset yang sudah tidak disebut di mana pun — tidak di versi yang dilihat tamu, tidak pula di
 * draf yang sedang disunting pasangan.
 *
 * Dipanggil sesudah publish, dan hanya di sana. Menghapus foto dari draf tidak boleh langsung
 * membuang berkasnya selama versi terbit masih memakainya — undangan yang sudah disebar ke
 * ratusan tamu tidak boleh berubah jadi kotak rusak. Tapi begitu pasangan menerbitkan ulang,
 * penahannya lepas, dan tanpa sapuan ini berkasnya menggantung selamanya sambil tetap
 * menghabiskan kuota.
 *
 * Draf ikut diperiksa karena foto yang baru diunggah memang belum ada di versi terbit mana pun.
 */
export function orphanAssetIds(assetIds: string[], activeDocument: unknown, draftDocument: unknown): string[] {
  const live = `${JSON.stringify(activeDocument ?? null)}${JSON.stringify(draftDocument ?? null)}`;
  return assetIds.filter((id) => !live.includes(publicMediaUrl(id)));
}
