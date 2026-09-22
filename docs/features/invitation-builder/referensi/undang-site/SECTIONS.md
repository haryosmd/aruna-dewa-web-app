# Dua belas bagian, dibaca dari halaman terbitnya

Dibaca 2026-09-22 dari `https://arunadewa.undang.site/`. Kolom kanan adalah padanannya di
`packages/contracts/src/sections.ts` (`createEleganceSections`, `:412-488`).

Kesimpulannya lebih dulu: **cocok hampir kata per kata.** Itu bukan kebetulan — teks bawaan
kita memang diturunkan dari bedah ini di fase 72. Yang dicatat di bawah adalah **selisihnya**,
karena hanya selisih yang berguna.

| # | Bagian | Teks di halaman referensi | Di kode kita |
|---|---|---|---|
| 1 | `opening-envelope` | "DENGAN PENUH KEBAHAGIAAN" · "THE WEDDING OF" · "Dea & Haryo" · "03 · 10 · 2026" · "KEPADA YTH." · "D & H" · "BUKA" · "👈 KLIK DI SINI" · "untuk membuka" · "Sebuah undangan istimewa untuk Anda" | `:420-424`, identik |
| 2 | `hero` | "D & H" · "THE WEDDING OF" · "Dea & Haryo" · "SABTU · 03 OKTOBER · 2026" · "Kepada Yth." · "SCROLL" | `:425-428`, identik |
| 3 | `couple` | bismillah Arab · "Assalamu'alaikum Warahmatullahi Wabarakatuh" · "Dengan memohon rahmat dan ridha Allah SWT…" · "The Bride" / "The Groom" · "Putri pertama dari" / "Putra pertama dari" · nama orang tua | `:429-435`. Selisih satu huruf: referensi "ridha", kita "rida" (KBBI). Dipertahankan. |
| 4 | `countdown` | "Save the Date" · "Menuju Hari Bahagia" · HARI/JAM/MENIT/DETIK · "SIMPAN TANGGAL" | `:436-440`, identik |
| 5 | `event` | "RANGKAIAN ACARA" · "Hari Bahagia Kami" · "Insya Allah akan dilaksanakan pada:" · "SABTU 03 OKTOBER 2026" · "Akad Nikah" 08.00 WIB · "Resepsi" 11.00–15.00 WIB | `:441-446`. Kita menulis resepsi 11.00–14.00 sebagai contoh; angka memang diisi pasangan. |
| 6 | `map` | "LOKASI AKAD & RESEPSI" · alamat satu paragraf · "BUKA GOOGLE MAPS" | `:447-450`, identik |
| 7 | `unduh-mantu` | **tidak muncul** — dimatikan pasangannya | `:451-454` `enabled: false`. Cocok. |
| 8 | `quote` | "Dan di antara tanda-tanda kekuasaan-Nya…" · "QS. AR-RUM: 21" | `:455-457`, identik |
| 9 | `gallery` | "OUR MOMENTS" · "Galeri Bahagia" · ubin 01–04 masing-masing berlabel "LIHAT FOTO" · satu caption "Two cultures, one beautiful story." | `:459-462`. Lihat catatan di bawah. |
| 10 | `gift` | "TANDA KASIH" · "Wedding Gift" · "Doa restu Anda merupakan hadiah terindah…" · dua rekening BCA · "SALIN NOMOR" | `:463-468`. Kita `enabled: false` (fase 73.2 — `gift` bukan fitur paket Mula); referensi menyalakannya karena pasangannya memang membelinya. |
| 11 | `wishes` | "KIRIM DOA" · "Ucapan & Kehadiran" · "Tinggalkan Pesan" · "Setiap doa adalah hadiah terindah bagi kami" · Hadir/Belum pasti/Berhalangan hadir · "KIRIM UCAPAN" · "Jadilah yang pertama mengirimkan doa terbaik." · pencacah `0/240` | `:469-477`, identik. `240` cocok dengan `copyLimit` kita. |
| 12 | `closing` | "Terima Kasih" · "Merupakan suatu kehormatan dan kebahagiaan…" · "Dea & Haryo" · "Wassalamu'alaikum Warahmatullahi Wabarakatuh" · "03 · 10 · 2026" | `:478-482`, identik |

## Galeri: `viewLabel` dan `subtitle` TIDAK tertukar

Ini ditulis terpisah karena `FASE-72-SISA.md:43` sempat mencatatnya sebagai cacat, dan
catatan itu **keliru**. Yang terlihat di halaman referensi:

- "LIHAT FOTO" muncul **empat kali**, satu di tiap ubin, di bawah nomor 01–04 → itu
  `viewLabel`, dan `apps/web/components/invitation/Gallery.vue:125` merendernya persis begitu
  (`.iv-gallery-num-label`).
- "Two cultures, one beautiful story." muncul **sekali**, di bawah grid, dengan huruf sambung
  → itu `subtitle`, dan `elegance/Gallery.vue:33` merendernya sebagai caption `iv-script`.

Jadi pemetaan di `sections.ts:206-213` sudah benar. Yang benar-benar berselisih dengan dokumen
adalah dua hal lain, dan keduanya ada di dokumen, bukan di kode:

1. **Urutan kolom.** `FASE-72.md:120` mendaftar `title, eyebrow, subtitle, viewLabel,
   lightboxTitle` sementara tabel label `FASE-72.md:310` — yang menyebut dirinya "persis,
   urut" — mendaftar `Label section, Judul, Label preview foto, Caption, Nama di lightbox`.
   Kode mengikuti `:310`. `:120` yang dibetulkan.
2. **`limit`.** `:310` menulis "Maks 4" karena halaman referensi yang dibedah kebetulan
   memuat empat foto. Batas kita `15` (`sections.ts:211`) adalah batas paket, bukan batas
   template. Dipertahankan; `:310` diberi catatan.
