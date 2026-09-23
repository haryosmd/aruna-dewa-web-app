/**
 * Keputusan siklus hidup undangan: apa yang dibuang saat diarsipkan, dan kapan arsipnya
 * dimusnahkan (fase 78).
 *
 * Murni — tidak menyentuh Prisma maupun penyimpanan berkas — supaya aturan yang paling mahal
 * kalau salah bisa diuji tanpa database. Yang memanggilnya `InvitationsService` dan
 * `MaintenanceService`; keduanya cuma menjalankan daftar yang dihitung di sini.
 */

/**
 * Berapa lama undangan yang diarsipkan boleh hidup sebelum dihapus permanen.
 *
 * Arsip adalah janji "salah klik masih bisa dipulihkan", bukan gudang tanpa batas. Tiga puluh
 * hari cukup panjang untuk pasangan menyadari kekeliruannya dan cukup pendek untuk tidak
 * menumpuk — dan sisanya sudah dipangkas di detik pengarsipan (lihat dua fungsi di bawah).
 */
export const archivedInvitationRetentionDays = 30;

/**
 * Revisi terbit yang dibuang saat undangan diarsipkan.
 *
 * Undangan yang diarsipkan tidak menyajikan satu pun revisinya — ia tidak publik. Riwayat
 * terbit fase 75 bisa menahan sampai 50 dokumen JSON penuh per undangan, dan itulah baris
 * terberat yang tertinggal kalau arsip hanya berarti "ganti status". Yang aktif dipertahankan:
 * ia yang membuat pemulihan berarti sesuatu, dan ia satu-satunya yang ditunjuk
 * `Invitation.activeRevisionId`.
 *
 * Kerugiannya nyata dan dipilih sadar: riwayat terbit hilang saat arsip. Itu ditulis di dialog
 * konfirmasinya, bukan disembunyikan.
 */
export function revisionsToDropOnArchive(
  revisions: { id: string }[],
  activeRevisionId: string | null | undefined,
): string[] {
  return revisions.filter((revision) => revision.id !== activeRevisionId).map((revision) => revision.id);
}

/**
 * Batas waktu pemusnahan arsip, dihitung mundur dari `now`.
 *
 * Menerima `now` alih-alih memanggil `new Date()` sendiri — itu yang membuat retensinya bisa
 * diuji tanpa menunggu tiga puluh hari, dan pola yang sama sudah dipakai `retentionCutoffs()`.
 */
export function archivedPurgeCutoff(now: Date): Date {
  return new Date(now.getTime() - archivedInvitationRetentionDays * 24 * 60 * 60 * 1000);
}
