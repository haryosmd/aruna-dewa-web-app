# Pustaka musik undangan

Aturan yang sama dengan foto (`DESIGN.md` → Aset): **hanya CC0/PD terverifikasi**, lisensi
diperiksa per berkas lewat `extmetadata` Wikimedia Commons, bukan per situs. Ketujuh berkas di
bawah lolos pemeriksaan itu pada 2026-09-15.

## Yang dikirim

Sumber diunduh dari Commons, dipotong jadi loop, lalu dikodekan ulang:

```
ffmpeg -nostdin -i <sumber> -t <=120 \
  -af "afade=t=in:st=0:d=1.2,afade=t=out:st=<akhir-3>:d=3" \
  -ac 2 -ar 44100 -b:a 96k -map_metadata -1 \
  -metadata title=… -metadata artist=… \
  -metadata comment="Public domain / CC0 — via Wikimedia Commons" out.mp3
```

**Kenapa dipotong ≤120 detik:** pemutarnya `loop`. Lagu utuh empat menit hanya membuang kuota
data tamu tanpa seorang pun mendengarnya sampai habis. Fade 1,2 detik di awal dan 3 detik di
akhir membuat sambungan loop-nya jadi tarikan napas, bukan potongan.

**Kenapa 96 kbps:** ini musik latar di balik teks, diputar dari speaker ponsel. Seluruh pustaka
8,7 MB; pada 128 kbps ia jadi 11,6 MB tanpa perbedaan yang terdengar di konteks itu.

| Berkas | Karya | Pemain | Lisensi | Durasi | SHA-256 |
|---|---|---|---|---|---|
| `gymnopedie-1.mp3` | Satie — Gymnopédie No. 1 | Michael Laucke (gitar) | Public domain | 120 dtk | `d2fb6ce0f4742f7848dbac6425522837a2294e38f3961b4b633401a8e8da9413` |
| `gymnopedie-3.mp3` | Satie — Gymnopédie No. 3 | Michael Laucke (gitar) | Public domain | 120 dtk | `63c9a568ef7f03b5be2552b2387d6ae05b737e272214e48fc3bd1a8265bf37f7` |
| `etude-harpa.mp3` | Chopin — Étude Op. 25 No. 1 "Harpa" | Edward Neeman (piano) | Public domain | 120 dtk | `ce65d86c17399331dd73c9f547cee3393e7426adfae82b29c920c647aa42909d` |
| `mazurka-g.mp3` | Chopin — Mazurka No. 42 in G, Op. 67 No. 1 | Edward Neeman (piano) | Public domain | 81 dtk | `8b3596e2723e7c946904cf1bcc624ae768f3942bd7cfa1a28650252311784114` |
| `balletto.mp3` | Respighi — Balletto "Il conte Orlando" | — | Public domain | 119 dtk | `0177ac54721de80c7a13b0f4b63d9547ebb9df3c6d5abfc7176b73a10e3569ff` |
| `invensi-8.mp3` | Bach — Invensi No. 8, BWV 779 | US Air Force Strolling Strings | Public domain | 61 dtk | `8e1b6aa40cad5980661c6ec3d52effe1ed760d3ac0b1f62b279b0dc2eeeba530` |
| `esta-tarde.mp3` | Esta Tarde Vi Llover | Mike Luisi (aransemen piano) | CC0 | 120 dtk | `8656477f249b0b7e907bbc856ded9cd12021c0c59bdc6e413fd2fdf36e966c03` |

Tautan sumber (halaman berkas Commons, bukan URL unduhan langsung):

- `Satie Gymnopedie No 1 performed by Michael Laucke.flac`
- `Satie Gymnopedie No 3 performed by Michael Laucke.flac`
- `Chopin - 12 Études, Op. 25 - No. 1 in A-Flat major 'Harp Study' (Edward Neeman).flac`
- `Chopin - Mazurka No. 42 in G major, Op. 67 No. 1 (Edward Neeman).flac`
- `Balletto detto Il conte Orlando.ogg`
- `Invention No. 8 - Strolling Strings - United States Air Force Band.mp3`
- `Esta tarde vi llover - Solo Piano Arragement by Mike Luisi.wav`

## Bagaimana kompetitor melakukannya

Diperiksa 2026-09-15 pada enam demo Katsudoto yang tautannya ada di
[landing-order/sources/INDEX.md](../../landing-order/sources/INDEX.md). Yang dibaca hanya markup
dan skrip yang dikirim server; tidak ada kode maupun aset mereka yang disalin ke sini.

**Bukan YouTube.** Musik latarnya MP3 yang di-host sendiri di `media.katsudoto.id`
(`content-type: audio/mpeg`, di belakang Cloudflare), ditanam server-side sebagai variabel global
`MUSIC = { url, box }` di sebelah `<div id="music-box">`, lalu dipasang runtime oleh
`AudioManager` di `src/template/template.js` — `createElement("audio")`, `loop`, `preload="auto"`,
volume tetap 0,6. YouTube memang dipakai di halaman yang sama, tapi hanya untuk seksi video
prewedding dan live streaming, lewat `videojs` + plugin `videojs-youtube`.

Empat hal yang layak dicatat karena menjelaskan pilihan kita:

- **5,27 MB untuk satu lagu utuh**, dan pemotongannya terjadi di klien: `CROPPED_SONG.start/end`
  dibaca dari halaman, lalu `timeupdate` melompat balik ke `start`. Satu berkas mereka lebih besar
  dari seluruh pustaka tujuh lagu kita (8,7 MB) yang sudah dipotong di `ffmpeg`. Dari enam demo,
  hanya satu memakai crop.
- **Izin autoplay ditumpangi, bukan dipakai.** `play()` dipanggil `setTimeout(…, 500)` setelah
  klik gerbang, bukan di dalam tumpukan panggilan gesturnya — dan akibatnya ditambal dengan
  deteksi iOS/Safari/in-app browser, unlock lewat buffer MP3 senyap base64, dan retry tiga kali.
  `arm()` kita memanggil `play()` sinkron, jadi tidak satu pun tambalan itu kita butuhkan.
- **Handler visibility mereka mengabaikan jeda tamu.** Musik dilanjutkan begitu tab kembali
  terlihat tanpa memeriksa apa pun, jadi jeda yang ditekan tamu di ruang rapat batal sendiri
  setelah ia pindah tab. Aturan `show` kita memeriksa penanda penolakan; perilakunya dikunci
  tes di `apps/web/test/music-state.spec.ts`.
- **Musik mereka menjeda saat tombol video ditekan** — satu-satunya hal dari daftar ini yang
  kita tidak punya, dan itu bug kita, bukan fitur mereka. Diperbaiki di fase 17.

Soal lisensi: keenam demo memakai lagu komersial (The Piano Guys, Lana Del Rey, cover Tulus,
cover Budi Doremi) tanpa jejak izin apa pun. Aturan CC0/PD di berkas ini lebih ketat dari pasar.
Itu pilihan sadar, bukan ketertinggalan fitur.

## Celah yang belum tertutup, dan kenapa

**Tidak ada satu pun rekaman Indonesia di pustaka ini.** Bukan karena tidak dicari. Commons
punya rekaman gamelan Jawa yang bagus — `Ketawang Sekar Teja Slendro Manyura`,
`Jineman Uler Kambang Slendro Sanga`, `Ketawang Mijil Wigaringtyas Pelog Nem`,
`Ketawang Retna Wigena Pelog Nem`, semuanya oleh Karawitan Marta Yogiswara — tapi keempatnya
**CC BY-SA 4.0**, bukan CC0/PD. Pencarian `sasando`, `kacapi`, `suling sunda`, `angklung`, dan
`gamelan degung` juga tidak menghasilkan satu pun berkas CC0/PD yang layak.

Ini janggal untuk produk yang seluruh perbendaharaan ornamennya Kawung, Gunungan, dan Poleng:
temanya berakar, musiknya tidak. Dua jalan keluar, keduanya di luar fase 16:

1. **Terima CC BY-SA untuk audio saja**, dengan atribusi yang tampil di pemutar (field `credit`
   sudah ada untuk itu). Perlu keputusan pemilik — share-alike pada berkas audio tidak menular
   ke seluruh situs, tapi itu tetap keputusan lisensi, bukan keputusan teknis.
2. **Rekam atau pesan sendiri.** Paling mahal, paling bersih, dan satu-satunya yang menghasilkan
   sesuatu yang tidak dimiliki kompetitor.

Sampai salah satunya diambil, pasangan yang ingin gamelan memakai jalur unggah MP3 sendiri.

**MP3 unggahan pasangan belum bisa dipotong.** Pustaka di atas dipotong ≤120 detik di server,
jadi loop-nya rapi. Lagu yang diunggah sendiri tidak: ia utuh, mengulang dari detik 0 yang
seringnya intro kosong, dan tetap terunduh penuh oleh tamu. Katsudoto menyelesaikannya di klien
lewat `CROPPED_SONG.start/end`. Kita bisa meniru itu — dua field di `music.data` dan satu
penanganan `timeupdate` — tapi pemotongan di klien tidak mengurangi satu byte pun unduhan tamu,
jadi jalan yang lebih benar adalah memotong saat unggah seperti pustaka ini. Keduanya di luar
fase 17, yang sengaja hanya mengurus kapan musik harus diam.
