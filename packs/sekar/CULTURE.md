# Sekar — catatan budaya

Pack ini **tidak membawa satu pun klaim budaya**, dan itu keputusan sadar, bukan kelalaian.

Aturan repo ada di `docs/features/ornament-builder/CULTURE-BANK.md`: sebuah bentuk baru boleh
disebut motif adat kalau ada sumber yang bisa ditunjuk beserta tanggal periksanya. Delapan
keluarga motif di sana punya sumbernya; kosakata yang dipakai pack ini — ukel, patran, tumpal,
cecek, anyaman — **tidak punya entri di sana**. Selama itu belum ada, kelimanya diperlakukan
sebagai nama kerja bentuk di dalam repo ini, bukan sebagai atribusi daerah.

Preseden yang diikuti adalah bagian *"Yang masih kosong"* di berkas yang sama: ketika sebuah
klaim tidak bersumber, yang dihapus adalah klaimnya — bukan ornamennya.

## Asal bentuknya, tanpa dibungkus

Kosakata pack ini dipelajari dari **sembilan template undangan Canva milik pemilik akun
sendiri**, yang diukur di `docs/features/ornament-builder/imported/canva-sekar/`. Yang diambil
adalah proporsi, kerapatan, dan arah gradasinya. Tidak ada satu path pun yang disalin: seluruh
koordinat di `svg/` lahir dari `geometri.mjs`, dan `buat.mjs` bisa dijalankan ulang untuk
membuktikannya.

Templatenya sendiri bukan dokumen budaya. Ia produk desain komersial, jadi ia tidak bisa jadi
sumber untuk klaim apa pun tentang adat — hanya untuk klaim tentang bentuk.

## Damask, dan kenapa ia tidak disebut Nusantara

Ubin latar tema ini berasal dari berkas yang diberikan pemilik: damask seamless 864×864,
krem-taupe, enam simpul mendatar per sisi. **Damask adalah kosakata tekstil Eropa–Islam, bukan
Nusantara**, dan ia tidak diberi nama daerah di sini. Ia dipakai karena pemilik memilihnya, dan
disebut apa adanya.

Motif yang sama muncul di tiga tempat — ubin latar, `motif-damask`, dan `sudut-damask` — dan
ketiganya dibangkitkan dari primitif `damask()` yang sama. Itu disengaja: halaman harus terbaca
sebagai satu kain, bukan sebagai ornamen yang ditempel di atas motif asing.

## Yang tetap tidak diklaim

- **Tidak ada makna spiritual** yang ditulis untuk bentuk mana pun di pack ini.
- **Tidak ada atribusi daerah.** Tidak untuk gapura, tidak untuk tumpal, tidak untuk sulur.
- **Tidak ada klaim "mewakili tradisi"**, termasuk lewat nama glyph. `culturalRole` seluruh
  aset di `catalog.json` berbunyi `dekorasi-original`, dan itu memang yang benar.

## Kalau nanti ada sumbernya

Yang perlu ditambahkan bukan ornamennya melainkan entri di `CULTURE-BANK.md`: satu sumber per
keluarga bentuk, dengan tanggal periksa, seperti delapan entri yang sudah ada. Sesudah itu
`culturalRole` di `catalog.json` boleh naik dari `dekorasi-original` ke peran yang bersumber —
dan `pack.mjs` akan ikut menuliskannya ke komentar komponen, bersama tanggal periksanya.
