# Landing editorial wedding

## LAND-01 — tujuan dan navigasi

Target: pasangan yang menyiapkan pernikahan, mobile-first. Tujuan landing: pengunjung memahami produk, mencoba contoh undangan, membandingkan harga, lalu memulai order. Prinsip desain: kejelasan manfaat, contoh konkret, langkah kecil dan transparansi harga; tidak mengklaim peningkatan konversi tanpa pengukuran.

Satu halaman scroll. Sticky navbar: Aruna Dewa (home), Desain, Fitur, Cara Kerja, Paket, Cerita, FAQ; Masuk dan CTA Buat Undangan. Di mobile gunakan drawer, tutup setelah memilih anchor, focus kembali pada target. Active section memakai IntersectionObserver; scroll-margin-top agar heading tidak tertutup navbar. Native scroll dengan smooth scroll hanya jika motion preference mengizinkan. Order/login tetap route terpisah.

## LAND-02 — alur section dan copy

| Section | Konten dan tindakan | Bentuk visual |
|---|---|---|
| Hero | `Kisah kalian, undangan yang terasa personal.` Subcopy: Pilih desain, atur detail acara, dan sapa setiap tamu dengan namanya. CTA Buat undangan; sekunder Lihat contoh. | Serif besar, foto wedding editorial asimetris, preview undangan nyata; cream dominan |
| Demo personal | Input nama default contoh Yosi Susanti, preview sapaan langsung dan tombol Buka demo. Gunakan to pada demo tanpa membuat guest produksi. | Transisi dari foto emosional ke bukti produk, input jelas |
| Desain | Template yang benar-benar tersedia, preview mobile, kategori hanya jika ada hasil; satu template tidak dibuat tampak sebagai banyak produk. | Foto portrait dengan nama tema dan CTA Lihat demo/Pilih desain |
| Fitur | Personalisasi, impor spreadsheet, RSVP, editor section, media. Tampilkan interaksi singkat dari fixture, jangan screenshot palsu seolah integrasi live. | Layout bergantian foto/preview, grid hanya untuk manfaat yang sebanding |
| Cara kerja | Pilih desain → Lengkapi dan bayar → Atur dan bagikan. Jelaskan dashboard aktif setelah pembayaran. | Tiga langkah singkat, indikator kemajuan |
| Paket | Mula 149k dan Mekar 249k seed sandbox dari rencana sebelumnya; fitur termasuk, add-on, masa aktif dan total jelas. | Dua kartu setara; tidak memasang badge Terlaris tanpa data; tabel perbandingan opsional expandable |
| Cerita pasangan | Testimoni/komentar produk. Di development seed ditandai `Contoh tampilan testimoni`; tanpa bintang, angka pelanggan atau klaim terverifikasi palsu. Produksi menyembunyikan section jika belum ada testimoni asli. | Kutipan editorial + identitas hanya dengan izin; tidak autoplay |
| FAQ | Cara edit, pembayaran, masa aktif, data tamu, impor, perubahan template dan bantuan. Jawaban sesuai fitur aktual. | Accordion keyboard-accessible |
| CTA akhir/footer | `Mulai merangkai kabar bahagia kalian.` CTA Buat undangan; tautan kebijakan, bantuan, kontak terkonfigurasi. | Ink background dengan teks cream, aksen terracotta |

Komentar landing ditafsirkan sebagai testimoni produk; ucapan tamu tetap berada dalam undangan. Sistem komentar publik bebas pada landing bukan bagian milestone awal.

## LAND-03 — interaksi dan feedback

Sonner melalui shadcn-vue untuk copy, save, import dan publish yang berhasil/gagal. Toast sukses 4 detik; error penting tetap tersedia inline dengan retry; live region polite, posisi tidak menutupi CTA mobile. Jangan toast setiap pergantian section. Form punya label, hint, error per field dan summary saat submit gagal. Pending mencegah duplicate submit. Skeleton hanya untuk fetch; placeholder media menjaga aspect ratio. Empty/filter-no-result/error memiliki CTA pemulihan. Dialog/drawer punya focus trap dan Escape; tooltip bukan satu-satunya label kontrol.

## LAND-04 — motion

GSAP + ScrollTrigger sebagai engine kompleks; CSS untuk hover/press. Jangan tambah engine kedua tanpa kebutuhan konkret. Mount animasi client-side dengan context scope, cleanup saat unmount dan perubahan breakpoint via matchMedia. Konten SSR tetap terbaca sebelum hydration dan ketika JS gagal.

- Hero: entrance sekali, 550–750 ms; teks/foto stagger 70 ms, translate maksimal 20 px; CTA tidak menunggu sequence panjang.
- Section: reveal opacity/translate 12–20 px, 450–600 ms, once per mount; jangan mengulang setiap scroll naik/turun.
- Foto: parallax dekoratif maksimal 24 px desktop, dimatikan mobile/reduced-motion. Bukan setiap gambar bergerak.
- Cards: hover translateY -4 px dan perubahan border/shadow 180 ms; tidak mengubah layout.
- Paket/FAQ: teks harga tetap stabil; accordion hanya animasi pendek, tanpa counter harga yang menghalangi pembacaan.
- Reduced motion: konten langsung tampil, tanpa parallax/scrub/smooth scroll; fungsi lengkap tetap tersedia.
- Tidak ada scroll hijacking, forced horizontal scrolling, cursor custom atau loader yang menunggu seluruh galeri. Tiap section boleh punya reveal ringan, bukan wajib efek berat.

## LAND-05 — aset dan performa

Dummy foto dari Unsplash/Pexels yang lisensinya diperiksa per aset. Catat halaman asal, author, license URL, tanggal, peran dan local output. Foto landscape hero, portrait pasangan, detail tangan/cincin, venue warm-light; hindari campur grading yang tidak konsisten. Tidak menganggap model stock sebagai pelanggan/testimoni. Dribbble/Katsudoto tidak menjadi aset produksi.

AVIF/WebP responsive srcset, dimensi eksplisit, hero prioritas; gambar bawah fold lazy. Font self-hosted berlisensi, maksimal dua keluarga. Pisahkan chunk editor/import dari landing dan undangan publik. Target lab LCP <=2.5 s, CLS <=0.1; INP target field <=200 ms, tidak diklaim sudah tercapai lewat screenshot. Verifikasi reduced motion, 360/768/1440 px, keyboard dan kontras. Analytics berbasis aksi demo/order/checkout tanpa nama tamu, token, query URL atau input form.
