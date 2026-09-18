# Provenance — impor Canva "Krem Wayang"

Dibuat 2026-09-18 atas permintaan pemilik, yang mengirim tujuh berkas SVG hasil ekspor dari akun
Canva Pro-nya sendiri.

**Ini bukan aset original.** Batas lisensinya sama dengan pack impor lain di repo ini; uraian
lengkapnya ada di [`../canva-cokelat-krem/PROVENANCE.md`](../canva-cokelat-krem/PROVENANCE.md).
Semuanya `"usage": "imported-local-demo"`, tidak masuk `apps/web/public` maupun `ornamentBank`.

| | |
|---|---|
| Template | *Krem Ilustrasi Vintage Rumah Jawa dengan Ornamen Wayang Wallpaper Telepon* |
| Berkas mentah | tujuh berkas di `source/` |
| Diterima | 2026-09-18 |

## Isi

| Aset | Bentuk | Catatan |
|---|---|---|
| `kayon-sulur` | SVG `currentColor` | Kayon bersulur, 9 rongga |
| `kayon-pohon-kiri` · `kayon-pohon-kanan` | SVG `currentColor` | Sepasang, sudah terpisah di sumbernya |
| `lampion-ronce-kiri` · `lampion-ronce-kanan` | PNG + WebP ber-alpha | Lengkung lampion menjuntai; sepasang, sudah terpisah |
| `pita-tekstur` | PNG + WebP ber-alpha | Pita tekstur kertas |
| `rumah-joglo` | PNG + WebP ber-alpha | Rumah joglo berwarna |

Empat yang terakhir raster karena gambarnya **memang bitmap** di dalam SVG sumbernya: tiap berkas
berisi satu path dan dua `<image>` PNG base64. `<image>` ditolak validator SVG skill ini, dengan
alasan yang benar, dan memanggangnya jadi potongan ber-alpha adalah penyiapan aset mekanis — bukan
konversi raster ke vektor. Berkas SVG sumbernya tetap utuh di `source/`.

## Dua hal yang salah di versi pertama, dan bagaimana ketahuannya

Ketiga kayon adalah artwork yang sama dengan `daun-sulur` di pack `canva-cokelat-krem` — panjang
path-nya cocok satu per satu — tapi **disusun terbalik**: di sana badan terang ditumpuk di atas
siluet gelap, di sini sulurnya yang putih dicat di atas badan berwarna. Keduanya diselesaikan
aturan rongga yang sama, tapi dua asumsi yang lolos di template pertama gugur di sini.

### 1. Rongga yang bertumpuk membatalkan dirinya sendiri di `evenodd`

Sembilan sulur putih pada kayon bersentuhan di batang tengahnya. Digabung jadi satu path
`fill-rule="evenodd"`, daerah irisannya disilangi dua kali dan **kembali terisi** — batang tengah
keluar sebagai garis pekat yang tidak ada di aslinya. Di sumbernya itu tidak terjadi, karena di
sana kedua sulur cuma dicat warna kertas dua kali.

Terukur 1,79% piksel meleset, dan terlihat jelas di peta beda. Sekarang konverter memeriksa apakah
kotak pembatas antar-rongga beririsan: kalau ya ia memakai `<mask>`, kalau tidak tetap `evenodd`
yang lebih ringan dan lebih mudah disunting. Pemeriksaannya konservatif — kadang memilih mask untuk
bentuk yang sebenarnya tidak beririsan, tidak pernah sebaliknya.

### 2. `mask` di ekspor Canva tidak selalu no-op

Versi pertama konverter membuang tiap `mask` dengan alasan "isinya kotak lewat `feColorMatrix` yang
memaksa RGB ke 1, jadi opak seluruhnya". Pada template pertama alasan itu kebetulan benar, dan
terbukti oleh beda 0 piksel. Di sini ia **salah**: `mask` yang membungkus path terakhir kayon
adalah yang membuat sapuan lembut di tepi kanannya. Dibuang, sapuan itu jadi tinta pekat yang
menelan sulur di bawahnya — 1,2% piksel meleset, dan terlihat sebagai tepi kanan yang terlalu
penuh.

Aturannya sekarang: **seluruh `<defs>` disalin apa adanya** dengan `id` berawalan, dan `clipPath`,
`mask`, serta `filter` semuanya dipertahankan. Menyalin semuanya lebih aman daripada memilih —
sebuah `mask` bisa menunjuk `filter` yang menunjuk yang lain, dan rantai itu tidak perlu ditebak.

*Catatan alat ukur:* isi `<mask>` juga harus dikecualikan dari perataan warna saat membandingkan
siluet. Putih dan hitam di dalamnya bukan tinta melainkan instruksi tembus-pandang; meratakannya
membuat rect penutup jadi hitam, seluruh bentuk ikut tersembunyi, dan pembandingnya sempat
melaporkan 25% beda yang sepenuhnya artefak alat ukurnya sendiri.

## Kesetiaan terukur

| Glyph | Path | Beda piksel | Koordinat utuh |
|---|---|---|---|
| `kayon-sulur` | 2 | **0** / 800.800 | ya |
| `kayon-pohon-kiri` | 2 | 67 / 672.000 (0,01%) | ya |
| `kayon-pohon-kanan` | 2 | 25 / 668.500 (0,0037%) | ya |

Sisa 25–67 piksel adalah antialias di keliling rongga. Peta bedanya di `diff/`.

Perbaikan ini juga berlaku surut ke pack `canva-cokelat-krem`, yang dibangun ulang dengan konverter
yang sama: `daun-sulur` naik tipis dari 26→33 dan 21→23 piksel, karena sapuan lembutnya sekarang
membawa mask aslinya alih-alih dicat pekat. Lebih setia, bukan kurang.

## Membangun ulang

```sh
rtk proxy node docs/features/ornament-builder/imported/canva-krem-wayang/build.mjs
rtk proxy node .claude/skills/aruna-ornament-builder/scripts/validate.mjs docs/features/ornament-builder/imported/canva-krem-wayang
```
