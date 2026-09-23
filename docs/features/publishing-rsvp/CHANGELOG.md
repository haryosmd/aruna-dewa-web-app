# Revision history

## 2026-09-22: Fase 78 — pratinjau draf, siklus hidup undangan, dan backoffice operator

- **Pratinjau draf akhirnya punya tautan.** `/i/:slug` dijaga server — `PUBLISHED` **dan**
  `activeRevision` wajib — jadi satu-satunya cara pasangan melihat drafnya adalah panggung
  editor, dan tautan "Lihat halaman publik" di kartu ringkasan bahkan dipasang **tanpa syarat**
  di sebelah badge bertuliskan "Draf": satu-satunya hal yang dituju tautan itu adalah layar
  galat. Sekarang `/dashboard/:id/preview` di belakang `middleware: 'auth'`, memakai
  `GET /invitations/:id` yang sudah dijaga sesi dan keanggotaan — **nol endpoint publik baru,
  nol token baru**. Ucapan dan RSVP tidak pernah dikirim dari sana.
- **`ARCHIVED` akhirnya dipakai.** Enum itu ada di skema sejak awal dan belum pernah ditulis
  atau dibaca satu baris kode pun. Empat endpoint baru: `unpublish` (EDITOR — keluar dari daftar
  publik, **suntingannya tetap ada**, `activeRevision` dan riwayat dipertahankan), `archive`
  (OWNER), `restore` dan `DELETE` (operator saja).
- **Arsip memangkas yang berat di detik pengarsipan.** Seluruh `PublishedRevision` kecuali yang
  aktif dibuang — sampai 50 dokumen JSON penuh per undangan, tidak satu pun punya pembaca selama
  undangannya tidak publik — berikut aset yang tidak dirujuk draf, **berkasnya di storage**, bukan
  cuma barisnya. Tiga puluh hari kemudian `MaintenanceService` memusnahkannya; rumahnya cron
  `EVERY_DAY_AT_3AM` yang sudah ada, dan `sweep(now)` menerima waktunya sebagai argumen supaya
  retensinya bisa diuji tanpa menunggu sebulan.
- **Perangkap penghapusan permanen.** `Invitation.activeRevisionId` menunjuk
  `PublishedRevision.id` tanpa `onDelete`, sementara `PublishedRevision.invitationId` menunjuk
  balik dengan `onDelete: Cascade`. Lingkar — `invitation.delete()` langsung ditolak Postgres.
  Urutannya: berkas storage dulu (cascade tidak pernah menyentuhnya), `activeRevisionId`
  di-null-kan, baru barisnya. `AuditEvent` sengaja `onDelete: SetNull`, jadi jejaknya bertahan.
- **`/bo` untuk operator.** Tabel seluruh undangan dengan pemilik, jumlah tamu, dan status —
  satu-satunya tempat arsip terlihat, karena `GET /invitations` mengecualikannya di kedua
  cabangnya. Yang bukan operator dijawab **404, bukan 403**: halaman operator tidak perlu
  mengumumkan keberadaannya; penjaga sesungguhnya `assertOperator` di API, yang menjawab 403.
  Hapus permanen menuntut slug diketik ulang — `PopupRequest.confirmText`, dipasang di dialog
  yang sudah ada alih-alih dialog kedua.
- **Satu cacat lama ikut ketahuan.** `InvitationSummary` tidak pernah mengirim `publishedAt`
  sementara kartu dasbor membacanya, jadi **setiap** kartu berbunyi "Belum dipublikasikan" —
  termasuk yang badge-nya bertuliskan "Tayang". Sekarang dikirim, dan kalimatnya dibaca dari
  `status`: "Sedang tayang" · "Pernah tayang, sekarang draf" · "Belum dipublikasikan".

## 2026-09-11: execution started

Materialized approved plan; current frontend decisions override earlier React choices.
