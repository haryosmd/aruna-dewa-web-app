# Lambang bank — 2026-09-12

Section hadiah menampilkan sampai dua rekening, masing-masing dengan kartu berwarna merek banknya.
Daftar bank tertutup ada di `packages/contracts/src/index.ts` (`bankIds`); presentasinya — nama,
warna merek, warna teks, dan path lambang — di `apps/web/utils/banks.ts`.

## Status berkas di `apps/web/public/banks/`

**Semua berkas saat ini adalah penanda sementara yang digambar sendiri, bukan lambang resmi.**
Bentuknya sengaja generik (kotak membulat + monogram garis + nama bank dalam Plus Jakarta Sans)
supaya tidak ada yang mengira itu lambang asli, dan supaya tidak ada bentuk merek yang dijiplak.

Lambang bank adalah **merek dagang**, bukan CC0/PD, sehingga tidak bisa diambil dari Wikimedia
Commons seperti foto. Untuk memasang lambang resmi:

1. Ambil berkas SVG dari brand kit / press kit resmi bank yang bersangkutan.
2. Timpa `apps/web/public/banks/<bankId>.svg` dengan berkas itu. **Tidak ada kode lain yang berubah** —
   `banks.ts` hanya menunjuk path, dan dokumen undangan hanya menyimpan `bankId`.
3. Catat sumber dan tanggal unduh di tabel bawah.
4. Wajib SVG, bukan PNG. Lambang selalu dirender di atas kepingan putih, jadi versi berwarna penuh aman.

Penggunaannya nominatif: mengidentifikasi bank tujuan transfer milik pasangan, bukan mengklaim
afiliasi atau dukungan dari bank mana pun.

| bankId | Nama tampil | Warna merek | Warna teks di atasnya | Rasio | Sumber lambang resmi | Tanggal |
|---|---|---|---|---:|---|---|
| `bca` | BCA | `#0060AF` | putih | 6,38:1 | _belum dipasang_ | — |
| `mandiri` | Mandiri | `#003D79` | putih | 10,80:1 | _belum dipasang_ | — |
| `bri` | BRI | `#00529C` | putih | 7,82:1 | _belum dipasang_ | — |
| `bsi` | BSI | `#00A39D` | ink `#17110D` | 5,99:1 | _belum dipasang_ | — |
| `jago` | Jago | `#F26F21` | ink `#17110D` | 6,30:1 | _belum dipasang_ | — |
| `jenius` | Jenius SMBC | `#00A9E0` | ink `#17110D` | 6,91:1 | _belum dipasang_ | — |
| `seabank` | Seabank | `#EE4D2D` | ink `#17110D` | 5,11:1 | _belum dipasang_ | — |
| `other` | Bank lain | `#5B4B41` | putih | 8,31:1 | tidak berlaku | — |

Warna teks dipatok per bank, bukan dihitung satu aturan: putih di atas Jenius hanya 2,71:1 dan ink
di atas Mandiri hanya 1,73:1. Rasio di atas diverifikasi dengan `scripts/contrast-check.py`.

Warna merek hanya mengecat pita kepala kartu (±56px). Nomor rekening, nama pemilik, dan tombol salin
tetap memakai token tema undangan, jadi palet pasangan yang tetap berkuasa di section itu.
