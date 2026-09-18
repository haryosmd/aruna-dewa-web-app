# Reference review — 2026-09-11

Tujuan review ini adalah memisahkan bukti yang benar-benar dilihat dari inspirasi eksternal dan aset yang boleh dipakai di aplikasi. Tidak ada foto atau screenshot kompetitor yang dipindahkan ke `apps/web/public/images`.

## Bukti lokal yang dibuka

Kesebelas screenshot pengguna dibuka ulang dari arsip asli: order start/detail/paket (01–03), menu dan builder (04–05, 07–10), serta tabel/impor tamu (06, 11). Temuan tetap sesuai `UI-BRIDGE.md`: order merupakan alur terpisah; tabel dan impor adalah pola dashboard; dan template/warna/typography/navigasi editor adalah concern builder. Screenshot tersebut referensi fungsional, bukan aset UI produksi.

## Referensi eksternal

| Referensi | Bukti pemeriksaan | Status penggunaan |
|---|---|---|
| [Snapture di Dribbble](https://dribbble.com/shots/26395571-Snapture-Photography-Storytelling-Agency-Website) | HTTP `202` tanpa title body pada 2026-09-11; CUA tidak menghasilkan visual yang dapat direkam. Metadata palet yang sudah ada di `UI-BRIDGE.md` tetap konteks inspirasi. | Inspirasi saja; layout Aruna Dewa original. |
| [Halaman produk Katsudoto](https://katsudoto.id/undangan-website) | HTTP `200`; title `Undangan Website Digital Pernikahan - Buat dan Sebarkan Undanganmu dengan Katsudoto`. | Referensi fungsional saja. |
| Enam demo Katsudoto: [Artha & Sandra](https://arthaandsandra.katsudoto.id/952317), [Nicholas & Arabella](https://nicholasarabella.katsudoto.id/731900), [Ansel & Varo](https://anselvaro.katsudoto.id/554904), [Alyssa & Rayhan](https://alyssarayhan.katsudoto.id/940751), [Selena & Milo](https://selenamilo.katsudoto.id/961199), [Vino & Ivelle](https://vinoandivelle.katsudoto.id/133695) | Masing-masing HTTP `200` dan title pasangan yang sesuai. CUA navigasi visual ke demo Artha & Sandra timeout, jadi review ini tidak menambah kesimpulan visual baru. | Referensi struktur/fitur saja; tidak ada screenshot atau asetnya dalam aplikasi. |

## Aset yang boleh masuk aplikasi

Empat berkas CC0 dari Wikimedia Commons diverifikasi melalui metadata sumber, diunduh, lalu dibuka secara visual sebelum dikonversi dengan `sharp-cli` quality 82. Detail author, URL, hash, dan path ada di [landing-order/sources/ASSETS.md](features/landing-order/sources/ASSETS.md). `sips` mengonfirmasi WebP final dan batas ukuran yang disyaratkan.

| Aset aplikasi | Final dimensi | Peran |
|---|---:|---|
| `apps/web/public/images/hero.webp` | 1600×1067 | pasangan di botanical garden untuk hero |
| `apps/web/public/images/couple.webp` | 1000×667 | detail mempelai dan cincin |
| `apps/web/public/images/rings.webp` | 1000×667 | detail cincin |
| `apps/web/public/images/venue.webp` | 1000×666 | venue dan gerbang bunga |

Kandidat awal Unsplash/Pexels tidak dipakai: Unsplash mengarah ke verifikasi (`307`/`401`) dan Pexels merespons Cloudflare challenge (`403`). Ini dicatat sebagai blocker akses sumber, bukan sebagai kegagalan lisensi aset final.
