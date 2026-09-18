# Revision history

## 2026-09-11: execution started

Materialized approved plan; current frontend decisions override earlier React choices.

## 2026-09-12: kontrol desain sadar entitlement

Editor undangan kini mematikan pemilih tema, tiga color picker, select font, dan panah urutan
section ketika undangan belum memegang fitur `design`, dengan satu penjelasan di sebelah kontrolnya
yang memakai nama dan harga add-on dari `GET /v1/catalog`. Sebelumnya kontrolnya selalu hidup:
pratinjau ikut berubah, lalu autosave ditolak `saveDraft` tanpa menunjuk kontrol mana pun.

Keputusannya dipindah ke satu fungsi murni `canEditDesign` di `@aruna/contracts`
(spec: `apps/api/test/domain/design-entitlement.spec.ts`); `InvitationsService.saveDraft` sekarang
memanggil fungsi yang sama alih-alih menyalin aturannya. Perilaku gerbangnya tidak berubah — fitur
`design` saja yang membuka, operator tetap lewat — dan harga tidak disentuh.

Panel keterbacaan "Tema & warna" tetap tampil saat terkunci (paletnya preset, jadi selalu lulus);
tombol "Perbaiki warna otomatis" ikut disembunyikan karena hasilnya akan ditolak saat disimpan.
