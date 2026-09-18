> **SUPERSEDED 2026-09-11.** Otoritas desain sekarang ada di `DESIGN.md` di root repo.
> Dokumen ini disimpan sebagai catatan riset referensi saja; palet dan aturan layout di bawah tidak lagi mengikat.

# Referensi → desain Aruna Dewa

Sumber: Snapture oleh Farzan Faruk / Rylic Studio di Dribbble. Halaman teks dan palet berhasil dibaca 2026-09-11. Browser Chrome gagal membuat tab dan browser internal hanya mengembalikan halaman kosong; screenshot komposisi lengkap belum berhasil diverifikasi. Keputusan layout di bawah adalah desain original, bukan klaim menyalin layout sumber.

## Palet dan tokens

Palet yang dicantumkan halaman sumber: #F8F1DE, #0B0806, #E8CAAE, #574642, #6A9E97, #B38D6A, #B64D2C, #B5A99E.

| Semantic token | Nilai | Peran |
|---|---|---|
| background | #F8F1DE | Cream utama |
| foreground | #0B0806 | Teks/section gelap |
| card | #FFFCF5 | Surface form dan kartu |
| muted | #E8CAAE | Panel sand |
| muted-foreground | #574642 | Teks pendukung |
| primary | #B64D2C | Tombol utama terracotta |
| primary-foreground | #FFFFFF | Teks pada tombol |
| accent | #6A9E97 | Dekorasi teal, gunakan ink untuk teks di atasnya |
| border | #B5A99E | Pemisah dekoratif saja |
| input-border | #574642 | Batas kontrol input pada surface cream/putih |
| ring | #B64D2C | Focus ring dengan offset terhadap surface |

Palet ini menggantikan coral/pink sebelumnya pada landing/brand. Warna success/destructive dibuat semantic terpisah; terracotta bukan indikator error. Kontras dihitung sebelum implementasi. Template undangan memiliki token lokal; mengubah tema tamu tidak mengubah dashboard.

Typography: Cormorant Garamond heading editorial dan DM Sans body/kontrol dari rencana sebelumnya. Body minimal 16px; script tidak untuk paragraf atau navigasi. Container max 1280px, gutter 20/32/48px, ruang section 64px mobile/112px desktop. Radius kartu 16–24px, form 10–12px, variasi foto arch hanya di area editorial. Hindari menjadikan setiap section kartu identik.

## Bukti awal yang tetap relevan

- Screenshot #1–3: order stepper, rincian acara dan paket/toggle → flow order terpisah; landing menjelaskan langkahnya.
- #4–5: menu feature → dashboard; feature ownership berbeda dari section enabled.
- #6 dan #11: tabel/impor → demo fitur memakai fixture dengan label contoh.
- #7–10: template/warna/typography/susunan/cover/header → editor section live preview.
- Keenam demo Katsudoto: cover, pasangan, acara, media, cerita, RSVP, hadiah, ucapan dan urutan bervariasi → schema renderer bersama.

Tidak ada screenshot aplikasi Aruna Dewa atau hasil QA visual pada tahap ini.

## Verifikasi numerik — 2026-09-11

Perhitungan relative luminance sRGB pada warna solid (bukan screenshot/composited surface): ink/cream 17.71:1; muted text/cream 7.89:1; putih/terracotta 5.14:1; ink/teal 6.61:1; input-border/card 8.68:1. Seluruh pasangan teks tersebut melewati 4.5:1. Border dekoratif #B5A99E pada card hanya 2.24:1, sehingga tidak digunakan sebagai satu-satunya penanda batas kontrol input. Focus/hover/disabled dan teks di atas foto masih perlu audit pada UI aktual.
