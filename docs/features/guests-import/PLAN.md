# Rencana implementasi

Status: belum dieksekusi; satu helper URL bersama digunakan tabel, export dan pesan.

1. GUEST-01/02: schema displayName dan normalisasi; simpan id/token terpisah; contract test gelar, Unicode, nama duplikat dan nama kosong.
2. GUEST-02/03: helper URL(simple/personal), endpoint token scoped invitation, response no-store, canonical tanpa query; tests encoding roundtrip, literal +/%/&/#/?/apostrophe, tampering to dan token invitation lain.
3. GUEST-01/04: tabel shadcn-vue/TanStack Vue dengan editor nama inline, link turunan, save-before-copy, revision conflict, Sonner toast dan fallback clipboard.
4. GUEST-05: satukan pipeline manual/paste/Sheets/XLSX/CSV; preview tidak mutate database; commit idempotent; uji nomor telepon leading zero serta formula tidak dieksekusi.
5. E2E: ketik Yosi, copy, buka link sederhana dan verifikasi sapaan; dua nama identik dengan token berbeda memiliki RSVP terpisah; rename mempertahankan ID; token invalid tidak mengubah RSVP; keyboard/mobile copy, failure dan retry.

Verifikasi aktual saat spesifikasi: lima contoh encoding/decoding URLSearchParams lulus pemeriksaan roundtrip via Node pada 2026-09-11. Ini bukan pengujian aplikasi.
