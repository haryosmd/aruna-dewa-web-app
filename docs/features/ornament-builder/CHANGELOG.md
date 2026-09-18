# Changelog

## 2026-09-18 — Pack `sekar`: 22 glyph bergradasi, tema `aruna-sekar`, dan latar yang akhirnya menyala

Pack keempat yang tayang, dan yang pertama lahir dari permintaan pemilik langsung. Sembilan
ekspor Canva miliknya plus satu ubin damask jadi **referensi**, bukan barang kirim — pilihan itu
diajukan dan dia yang memutuskannya. Bank diisi 22 glyph original; tidak ada satu path pun yang
menyeberang.

**Referensinya diukur dari piksel, bukan dari atribut `fill`, dan itu keputusan yang terbukti
perlu dua kali.** `imported/canva-sekar/studi.mjs` merender tiap berkas lalu menghistogram
hasilnya. Dua berkas terberat (1,9 MB dan 8,0 MB) isinya PNG cat air tertanam: atribut `fill`-nya
menyebut **satu** warna untuk yang di layar punya puluhan. Satu berkas lain menyebut **233** warna
untuk apa yang sebenarnya satu gradasi emas. Membaca atributnya salah pada keduanya, dengan cara
yang berlawanan.

**516 KB untuk dua poligon emas.** Itu ukuran `Ungu Bunga Frame` — 774 path terklip yang meniru
`<linearGradient>` satu per satu, karena format ekspornya tidak punya. Angka itu yang membuat
"digambar ulang" berhenti jadi soal lisensi saja: plafon bobot `frame` di repo ini 20 KB, dan
`sekar-bingkai-segi` yang menggantikannya mendarat di **4,8 KB** dengan gradasi sungguhan.

**Syarat mutu pemilik: jangan datar.** Ramp empat stop sudah ada sejak fase 42, tapi ia hanya
menyediakan warnanya — diukur, 128 dari 133 glyph tetap hidup di dua tingkat. Kedua puluh dua
glyph pack ini wajib memakai tiga dari empat stop dan membawa minimal satu `<linearGradient>`
ber-`stop-color: var(--iv-orn-*)`, jadi gradasinya ikut palet pasangan.

**Semuanya kubik, dan itu sekaligus paling murah.** `subPathPolyline()` mengembalikan senarai
kosong begitu sebuah `d` mengandung `C/S/Q/T/A`, jadi `potong-diri`, `lonjakan`, dan `runtuh`
memang tidak berlaku untuk bentuk kubik. Yang tetap berlaku `massa-tertimbun` — dan ia langsung
menangkap satu cecek yang duduk persis di bawah palang sewarna di `motif-damask`. Pemakaian plafon
bobot tertinggi di pack ini **83%**, setelah presisi koordinat diturunkan dari dua desimal ke
satu (`rangkaian-kanan` 7698 → jauh di bawah plafon 8192; 0,1 satuan pada viewBox 120 adalah
0,08% lebar keping).

**Yang berpasangan kiri-kanan dipecah, dan keduanya digambar terpisah.** `sudut-sulur-kiri` bukan
`scaleX(-1)` dari yang kanan: yang kiri bertulang tiga ukel menyusut, yang kanan dua ukel besar
dengan tumpal di ujung luar. Begitu juga `rangkaian-*` dan `ranting-*`. Referensi D memang satu
path tunggal yang simetris cermin — itu yang membuatnya bisa dibelah tanpa kehilangan apa pun.

**Empat bug ketahuan, dan tiga di antaranya hanya bisa dilihat, bukan digerbang:**

- **Komentar XML yang menyebut nama custom property.** Tanda hubung ganda membuat ubin latarnya
  tidak sah. Gagalnya total dan sepenuhnya senyap: berkas dijawab **200**, `mask-image` terpasang,
  `--iv-backdrop-mask/size/opacity` benar semua, dan latarnya kosong. Tidak ada gerbang di repo
  ini yang bisa melihatnya; yang menemukannya adalah membuka `/i/demo?tema=aruna-sekar`.
- **Ubin latar bermassa.** Versi pertama memakai siluet penuh dan pada opacity latar ia jadi empat
  lonjong hitam raksasa. Latar bekerja pada siluet, dan siluet yang benar untuk latar adalah
  garis. Digambar ulang jadi cincin `evenodd`.
- **Opacity latar yang disalin, bukan dilihat.** 0,05 dari catatan pack kayon ditulis untuk ubin
  bermassa; ubin bergaris hilang di sana. Dibandingkan bertiga di layar — 0,05 · 0,07 · 0,10 —
  dan 0,07 yang dipakai.
- **Spline berjangkar selang-seling melahirkan bintang, bukan damask.** Jangkar pinggang di 0,4
  menarik kurva melewati talinya sendiri. Enam jangkar berpinggang 0,62 memberi ogee yang dituju,
  dan cupingnya dipasang sebagai keping tersendiri.

**Palet temanya diukur terhadap gerbang sebelum ditulis.** Tiga kandidat gagal di tempat yang
sama — "warna aksi di atas bidang bertinta" mendarat di 3,79 · 4,44 · 4,31 terhadap ambang 4,5 —
dan yang lolos adalah primary yang lebih gelap **dan** lebih kelabu, bukan emas yang lebih terang.
Aksennya `#C89F3B`, persis stop tengah gradient palsu referensi F.

**Ketebalan garis 3,2, dan angkanya dipilih supaya kolam varian tidak bisa bercampur.** Pada 3 ia
seketebalan bloom, pada 3,5 seketebalan wastra dan pelita; `ornament-variants.spec.ts` menuntut
kolam disjoint antar tema hidup, dan kolam yang bisa dicampur cepat atau lambat akan dicampur.
3,2 membuat `aruna-sekar` hanya bisa menarik dari packnya sendiri — yang memang membawa dua
kandidat untuk keempat slotnya.

**Hasil gerbang:** 22 dari 22 glyph lolos sebelas gerbang geometris; 13 tema, 0 pelanggaran
keunikan, 0 tema tidak kohesif. 796 tes unit hijau **tanpa** menyentuh
`ornament-quality.baseline.json`. 112 tes e2e `public.spec.ts` hijau di mobile/tablet/desktop/
safari, termasuk axe 0 violation untuk `aruna-sekar` dan "ornament field renders real mass in
every theme".

## 2026-09-18 — 26 ekspor Canva lagi: enam pack, 42 aset, dan pengantin yang dipecah

Total impor jadi **58 aset dari 9 template**. Konverter bersama di `imported/lib/` tumbuh empat
kemampuan, tiga di antaranya lahir dari kegagalan yang terlihat di layar, bukan dari rencana.

**Matriks affine penuh.** Dua template pertama hanya memakai geseran murni, jadi pemecah lama
menolak apa pun selain itu. Template baru membawa skala, cermin, dan rotasi seperempat putaran —
menolaknya berarti menolak memecah berkas yang justru paling butuh dipecah. Kotak pembatas sekarang
ditransformasi lewat keempat sudutnya.

**Potong raster.** Sepasang benda dalam satu gambar bitmap dipisah dengan menyatakan wilayahnya
dalam satuan `viewBox` sumber — tanpa menyentuh pikselnya. Dipakai untuk sudut bunga, sudut ukir,
cincin vs rangkaian bunga (yang celahnya **vertikal**, bukan horizontal), dan pengantin.

**Renderer cadangan.** `pengantin-jawa.svg` memuat 10 MB base64 dalam satu atribut dan ditolak
librsvg dengan "Huge input lookup". Chromium lewat Playwright mengambil alih; renderer yang dipakai
tercatat di katalog tiap varian.

**Pemisahan vektor dari bitmap.** Dua berkas mencampur keduanya dalam satu gambar. Masing-masing
sekarang keluar dua kali dari berkas yang sama: sebagai glyph `currentColor` dengan `<image>`
dibuang, dan sebagai raster dengan path vektornya dibuang.

**Empat bug ketahuan, semuanya karena hasilnya diperiksa:**

- **`<g …/>` swa-tutup merusak keseimbangan tag.** Didorong ke tumpukan dan tidak pernah
  dikeluarkan, keluarannya kelebihan satu `<g>` tanpa penutup — SVG tidak sah, ditolak renderer.
- **`<defs>` disalin utuh membawa base64 yang tidak dipakai.** Glyph vektor sekecil satu path ikut
  membawa **1,1 MB** milik mask gambar, dan `<image>` di dalamnya membuatnya ditolak validator.
  Sekarang defs dipangkas ke blok yang benar-benar dirujuk, ditelusuri sampai habis, dan rujukan ke
  blok yang dibuang ikut dilepas dari badan gambar.
- **`trim` disambung setelah `extract` gagal** dengan "bad extract area", karena ia menghitung area
  pangkas terhadap gambar yang belum dipotong.
- **Pembanding menghitung yang bukan miliknya.** Glyph vektor dari berkas campuran tercatat meleset
  21,5%; yang meleset bukan path-nya, melainkan gambar wayang di jendela yang sama. Dan tiga bagian
  `gunungan-sayap` tercatat meleset 25% karena **jendelanya saling beririsan** — sekarang irisan itu
  dideteksi dan bagiannya ditandai *tidak terbandingkan*, bukan diberi angka yang tidak mengukur apa pun.

**Pengantin Jawa dipecah, dan potongannya tidak bersih — itu ditulis, bukan disembunyikan.** Profil
alpha sumbernya menerus tanpa celah: mempelai pria merangkul lengan mempelai wanita. Dipotong di
x = 582, `pengantin-pria` kehilangan ujung tangan kanannya dan `pengantin-wanita` membawa serta
tangan itu. Pasangan utuhnya tetap disediakan.

**Tiga berkas sengaja TIDAK dipecah, dan tiap alasannya ditulis:** kayon merah (kayon dan sulurnya
bertumpuk), bingkai ukir (kedua separuhnya menyusun satu bingkai utuh), wayang sepasang (tongkat dan
busurnya menyilang). Memecah berguna ketika bagiannya berdiri sendiri, bukan ketika ia separuh benda.

**Validator belajar satu kategori baru.** Dua latar semi-transparan gagal dengan alpha maksimum 107
dan 128: ia **wash**, bukan cutout, dan memang tidak pernah pekat. Ambang "ada piksel pekat" tetap
berlaku untuk cutout; untuk aset yang menyatakan dirinya wash yang diuji hanya "ada daerah tembus
dan ada yang tergambar".

Verifikasi: sembilan pack **0 error**; demo 93 SVG, 0 violation axe di 360/768/1440, 0 overflow,
0 id DOM ganda, jeda offscreen 2→0.


## 2026-09-18 — Dua pack impor Canva lagi, dan sepasang sudut yang akhirnya bisa dipasang sendiri

Sembilan ekspor SVG baru dari pemilik: satu template infografis rumah Jawa Barat dan satu template
wallpaper wayang. Jadi 10 aset baru (total impor 16 dari 3 template), dan konverternya pindah ke
`imported/lib/` supaya ketiganya memakai aturan yang sama.

**Sepasang ukiran sudut dalam satu berkas, dipecah jadi dua glyph.** Permintaannya jelas dan
alasannya benar: satu berkas berisi keduanya memaksa keduanya ikut terpasang, padahal di lebar
ponsel sering hanya satu sudut yang muat. Yang tidak bisa dipakai memecahnya: **posisi path** —
kedua salinan memakai rentang koordinat yang sama persis (x 2,6–237,4), dan yang membedakan cuma
geseran grupnya. Pemecahan karena itu berbasis transform grup, koordinatnya tidak digeser sedikit
pun, dan hanya `viewBox`-nya yang dirapatkan ke isi masing-masing bagian. Hasil: 226 path per
bagian, **0 piksel beda**, dua glyph rasio 1:1 yang bisa dipasang terpisah.

**Dua asumsi konverter yang lolos di template pertama gugur di template kedua.**

- **Rongga bertumpuk membatalkan dirinya sendiri di `evenodd`.** Sembilan sulur putih kayon
  bersentuhan di batang tengah; digabung jadi satu path evenodd, irisannya disilangi dua kali dan
  kembali terisi — batang tengah keluar sebagai garis pekat yang tidak ada di aslinya (1,79% beda).
  Sekarang rongga yang kotak pembatasnya beririsan memakai `<mask>`; yang terpisah tetap `evenodd`.
- **`mask` di ekspor Canva tidak selalu no-op.** Alasan lama "isinya kotak lewat `feColorMatrix`
  yang memaksa RGB ke 1" kebetulan benar untuk template pertama dan terbukti lewat beda 0 piksel.
  Di kayon wayang ia salah: mask itulah yang membuat sapuan lembut di tepi kanan, dan membuangnya
  menelan sulur di bawahnya (1,2% beda). Sekarang **seluruh `<defs>` disalin apa adanya** dengan
  `id` berawalan. Pack cokelat-krem dibangun ulang dengan aturan itu — daunnya naik tipis
  26→33 dan 21→23 piksel, karena sapuannya sekarang membawa mask aslinya: lebih setia, bukan kurang.

**Ilustrasi 15 warna diturunkan ke satu tinta lewat luminance.** Versi pertama pemetaannya keluar
sebagai siluet pekat — rumah kayu berpelitur warnanya rata-rata gelap, semuanya jatuh di 0,6–1,0.
Dengan `gamma` 1,9 yang melebarkan paruh terang, bidang nilai yang terpakai jadi
1 · 0,875 · 0,75 · 0,5 · 0,375 · 0,25 dan atap bertingkatnya terbaca lagi.

**Satu tes yang lolos karena kebetulan, ketahuan dan diperbaiki.** Pemeriksa jeda-offscreen menunggu
"ada anak di `globalTimeline`" — syarat yang resolve pada tween reveal, sebelum observer melepas
jeda sway. Begitu halaman jadi lebih berat ia melaporkan "0 tween berjalan" untuk halaman yang di
browser sungguhan menjalankan 2. Syaratnya sekarang menyebut tween berulang yang tidak terjeda.

Verifikasi: tiga pack 0 error di `validate.mjs`; demo 69 SVG, 0 violation axe, 0 overflow,
0 id DOM ganda, jeda offscreen 2→0.


## 2026-09-17 — Impor Canva "Cokelat Krem" (6 aset)

Pemilik mengirim enam ekspor SVG dari akun Canva Pro-nya dan meminta bentuknya dipakai sebagai
ornamen, dengan catatan bahwa hasil gambar-ulang fase 31 tidak cukup mirip. Dengan berkas vektor
aslinya di tangan, pertanyaannya memang berubah: yang sebelumnya cuma ada sebagai frame MP4 gepeng
dari template *lain* sekarang ada sebagai path.

Ditaruh di `imported/canva-cokelat-krem/`, **bukan** di dalam pack melati — seluruh klaim pack itu
adalah "digambar dari nol", dan satu aset impor yang menyelinap ke dalamnya membuat provenance 45
glyph lainnya ikut tidak bisa dipercaya. Status lisensinya belum diputuskan dan dicatat apa adanya
di `PROVENANCE.md`; tidak ada yang masuk `apps/web/public` atau `ornamentBank`.

Konverternya tidak menggambar ulang apa pun: tiap `d` disalin karakter per karakter, `viewBox`
sumber dipertahankan, dan **kesetiaannya diukur** — 0 piksel beda untuk kayon dan pita, 21–26
piksel (0,004%) untuk dua daun, seluruhnya antialias di tepi rongga, plus pemeriksaan "tiap `d`
yang ditulis muncul apa adanya di sumbernya".

Dua hal ketahuan hanya karena hasilnya diperiksa, bukan diasumsikan:

- **`clipPath` ekspor Canva bukan sekadar kotak pembatas.** Versi pertama membuangnya; peta beda
  menunjukkan ujung tangkai daun memang dipotong olehnya. Sekarang dipertahankan, dengan `id`
  berawalan per glyph.
- **Daun sulur disusun sebagai siluet gelap + badan krem yang lebih kecil di atasnya.** Dalam
  monokrom trik itu runtuh jadi gumpalan pekat. Sekarang kedua `d` digabung dengan
  `fill-rule="evenodd"` supaya badannya benar-benar berlubang — tanpa mengubah koordinat.
- **Bunga mawarnya bukan vektor.** Tiap berkas rangkaian berisi ~9.100 path (daun dan ranting) plus
  enam `<image>` PNG base64, dan seluruh bunganya ada di dalam `<image>` itu — dibuktikan dengan
  merender ulang setelah semua `<image>` dihapus. Keduanya karena itu disajikan sebagai potongan
  PNG/WebP ber-alpha, bukan SVG.

Demo Ronce Melati mendapat seksi "Impor dari Canva" dengan peringatan dan bingkai putus-putus
sendiri. Verifikasi ulang: 63 SVG di halaman, 0 violation axe, 0 overflow, 0 id DOM ganda.


## 2026-09-17 — Fase 31: bentuk gerak yang terukur, dan pack Ronce Melati

Analisis motion tahap dua (`sources/canva/motion/analyze.mjs` → `MOTION-DALAM.md`) dan pack original
kedua, `originals/melati/` — **45 glyph** yang menutup sepuluh keluarga `DESIGN.md`.

**Fase 30 salah mengukur klip beradegan banyak, dan itu diperbaiki di sini.** Jendela geraknya dicari
di sekitar puncak klip; pada klip beradegan banyak puncak itu adalah potongan adegannya sendiri, jadi
jendelanya runtuh ke 1–3% durasi dan yang terukur adalah pergantian gambar. Dengan frame-cut ditandai
dan dibuang, klip ungu terbaca **tujuh segmen gerak dan lima belas cut**, bukan satu jendela 1%.

Yang sekarang punya angka: **`power1.out` pada lima dari sembilan klip** (dan tidak satu pun ke
`power2`/`power3`/`expo`/`circ`), **stagger 0,50 detik** yang terukur dua kali berturut-turut, dan
**zona teks yang tidak bergerak** — satu klip mencatat densitas gerak **0,00** di sana. Pembacaan
naif "gerak hidup di sudut" dibatalkan di laporannya sendiri: 51,8% energi di empat sudut tidak
berarti apa-apa ketika keempatnya juga 53,6% luas bingkai.

Pack melati digambar parametrik dari satu kosakata bentuk, dengan **kuncup** sebagai satuan dasar —
ronce melati memang dirangkai dari kuncup, bukan bunga mekar. Tiga bug bentuk baru ketahuan setelah
hasilnya dirender dan dilihat: lingkaran busur-tunggal yang ill-conditioned (cincin monogram keluar
terisi penuh), kelopak yang terlalu lebar sampai bunganya jadi gumpalan, dan massa berwarna sama di
atas massa yang tidak pernah terlihat.

Verifikasi: 45 aset/45 varian 0 error di `validate.mjs`; 360/768/1440 nol violation axe, nol overflow,
**nol id DOM ganda dari 59 penyisipan SVG**; reduced-motion, tanpa-JS, dan jeda offscreen terbukti
(`verification/melati-browser.json`).

Belum dikerjakan: pack tidak dipasang sebagai tema aplikasi, `useArunaMotion.ts` tidak disentuh,
`FONTS.md` masih kosong, dan Canva MCP masih belum pernah dipakai untuk membaca isi desain.


## 2026-09-17 — Fase 30: arsip riset Canva

Enam preview MP4 template undangan beranimasi diarsipkan di `sources/canva/` dengan profil motion
terukur (`ffprobe`/`ffmpeg`, magnitudo gerak per-frame). Temuan yang mengubah rencana: **Canva MCP
tidak punya tool pencarian template publik** — hanya `search-designs` (desain sendiri) dan
`search-brand-templates` — jadi penemuan dikerjakan lewat panel browser, dan preview MP4 ternyata
disajikan publik tanpa login di `template.canva.com`.

Yang diukur: lima dari enam template menyelesaikan gerakannya dalam **1,25–2,75 detik** lalu diam
total; hanya satu yang melooping (periode ~1,5 detik). Query `undangan-digital` ditolak karena
didominasi template *digital marketing*; `animated-wedding-invitation` yang dipakai. Pool undangan
beranimasi berbahasa Indonesia terbukti tipis.

Belum dikerjakan: Canva MCP belum terpasang, belum ada login, `get-design-content` dan
`export-design` belum pernah dipanggil, `FONTS.md` sengaja kosong (teks di MP4 sudah jadi piksel),
dan belum ada pack original yang digambar. Rincian di `sources/canva/LIMITS.md`.

## 2026-09-17

- Implementasi rencana pengguna: arsip delapan referensi, skill ornament builder, koleksi Sunda original dan demo lokal.
- Ditemukan pemblokir contextmenu/shortcut pada skrip Bisdev Browser Protection setelah pemeriksaan awal HTML tidak menemukan handler inline.
- Font terender direkam melalui CDP setelah scroll; deklarasi tetap dipisahkan dalam fonts.json.
- Validasi raster alpha melalui metadata/pixel dan browser. Tampilan viewer tertentu memperlihatkan RGB transparan; tampilan composited browser menjadi bukti visual.
- Pengujian live reduced motion menunggu event media-query selesai sebelum assertion, bukan menganggap perubahan browser selalu sinkron.

Hasil akhir dan batas verifikasi ada di verification/RESULTS.md.

## 2026-09-17 — Fase 32: desain Canva milik akun, dibaca lewat MCP

Satu desain undangan Canva milik akun pemilik (`DAHVdNQzQbs`, "Cokelat Krem Elegan Tradisional
Undangan Pernikahan Video Seluler") diarsipkan di `sources/canva-cokelat-krem/` dan diturunkan
menjadi pack original `originals/kayon/`.

**Yang berhasil, dan tidak mungkin di fase 30.** Canva MCP terpasang: `get-design-content`
mengembalikan teks desain, `export-design` mengembalikan MP4 `vertical_1080p` 1080×1920,
30 fps, 32,23 detik, 967 frame, tanpa watermark.

**Yang gagal, dan menghalangi font.** `start-editing-transaction` membuka transaksi dengan
sukses tapi melaporkan `richtexts: []`, `fills: []`, dan halaman satu-satunya `is_empty: true`.
Struktur elemen tidak terbaca, jadi **font tetap tidak teridentifikasi** dan warna tetap warna
piksel hasil kompresi 4:2:0, bukan nilai isian desain. Transaksi dibatalkan tanpa satu pun
operasi edit; desain pemilik tidak diubah.

**Yang diukur.** 87,3% frame di bawah ambang gerak. Sembilan segmen gerak, lima potongan
adegan pada 14,97/19,97/24,97/28,73/32,00 s (tiga yang pertama berjarak persis 5,00 detik).
Delapan dari sembilan segmen berkurva lonceng, centroid 0,48–0,56, paling dekat ke
`sine.inOut`/`power1.inOut` yang praktis tak terbedakan. Densitas zona baris bawah 1,09–1,29
vs baris atas 0,70–0,92. Warna per wilayah di `WARNA.md`.

**Pack `kayon`:** 39 glyph SVG + 3 ubin tekstur, seluruhnya parametrik (`geometry.mjs`), tidak
ada path yang ditrace. Sembilan keluarga glyph `DESIGN.md` terisi. `validate.mjs` bersih (39
aset, 39 varian, 0 galat); `verify.mjs` 23 pemeriksaan lolos di 360/768/1440 termasuk axe
wcag2a/2aa/21aa, reduced motion, tanpa-JS, dan jeda offscreen.

**Belum dikerjakan:** pemasangan ke aplikasi. `originals/kayon/THEME.md` menyiapkan pemetaan
slot dan palet terverifikasi, lalu mendaftar enam prasyarat yang belum satupun dikerjakan.
