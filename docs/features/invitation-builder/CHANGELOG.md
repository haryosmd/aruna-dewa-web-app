# Revision history

## 2026-09-23: Fase 82 — tempel saat mengubah ukuran, pratinjau Lapisan yang jujur, logo bank

- **Smart guide kini juga saat mengubah ukuran.** `tempelUkuran` (murni, `utils/kanvas.ts`) hanya
  menempelkan tepi yang ditarik ke tepi/tengah objek sekitar (ambang 4px layar); tepi seberang
  diam, Shift tetap mengunci rasio (pojok memilih koreksi terkecil), ⌘/Ctrl mematikannya. Hanya
  untuk putaran kelipatan 90°; teks dikecualikan karena ukurannya `fontSize` yang dibulatkan.
- **Pratinjau Lapisan menghadap seperti di kanvas.** Arah bawaan dibaca dari `transform` terhitung
  pembungkus keping (`arahDasar`), bukan ditebak dari nama slot — sudut, "Simbol · bawah" Hero, dan
  keping ladang yang dibalik kini sama.
- **Logo bank jadi tile.** 12 tile dari PNG pemilik (bayangan pink ter-bake dibuang, pojok diisi,
  sudut/bayangan digambar CSS), Jago diberi tile putih 2×, penanda BSI/SeaBank/lainnya digambar
  ulang ke bentuk tile. `bankIds` + alias bertambah BNI, CIMB Niaga, Danamon, HSBC, digibank, DANA,
  GoPay, OVO ("danamon" dicek sebelum "dana"). Form Hadiah mendapat saran bank berlogo
  (`FieldMeta.saran: 'bank'`, `BankSaran.vue`); nama bebas tetap boleh.

## 2026-09-23: Fase 81 — kanvas bebas, pratinjau yang bisa direview, gerak masuk yang terlihat

- **Pratinjau Tablet/Desktop kecil adalah bug tata letak.** `PhoneFrame` mengukur induknya, yaitu
  pembungkus `w-fit` yang lebarnya ditentukan bingkai itu sendiri: skala hanya bisa menyusut,
  jadi sesudah Ponsel Tablet tersangkut di 0,43 dan Desktop di 0,26, dan ZOOM tak berefek. Lebar
  kini diukur dari viewport panggung; Tablet/Desktop pas lebar dan layarnya mengisi tinggi
  panggung; ZOOM 50–200 % dari pas; tombol Fokus melipat navigasi, rail, dan inspektor. Terukur di
  1440×900: Tablet **0,43 → 0,63**, Desktop **0,26 → 0,38**, Desktop + Fokus **0,95**.
- **"Gerak masuk" tidak pernah diputar ulang.** Timeline dibangun sekali saat mount; kini
  `useArunaMotion` punya opsi `ulang` dan Renderer mengirim tanda tangan gerak (bukan geseran),
  jadi mengganti pilihan langsung memutar bagian yang terlihat. Tombol ▶ di samping select. Tema
  bawaan Bloom (jalur legacy) kini memberi `paksa` dan memanggil `silhouette()`; Siluet menggelapkan
  teks juga (`grayscale(1) brightness(0.3) blur(2px)` → netral), jadi bagian tanpa foto berbeda.
- **Kanvas bebas.** `sections[].data.kanvas = { keping, tambahan }` (contracts `kanvasSchema`,
  strict, digerbangi add-on design lewat `designFingerprint`). Semua glyph berslot lewat
  `InvitationOrnamen` (pembungkus transform + glyph beranimasi); teks lewat `InvitationText`.
  `Kanvas.vue` menggambar hover/pilih/pegangan di luar bingkai: seret, resize 8 arah (Shift =
  rasio), putar (Shift = 15°), klik dua kali teks = sunting di tempat, klik kanan = menu reka-ui
  (sunting/ganti, putar 90°, cermin, kunci, 4 urutan lapis, putar gerak, sembunyikan, kembalikan,
  hapus), keyboard (panah, ⌘L, ⌘[/], Delete, Enter, Esc). Satu seretan = satu undo.
- **Ganti ornamen per tempat** (keputusan pemilik) + "Terapkan ke semua"; sudut punya **4 arah**
  (putaran relatif pojoknya) di Studio dan panel Elemen; sudut Hero/potret/kartu acara/kartu tamu
  jadi empat, dua yang baru lahir tersembunyi. **Tambah ornamen** maks 6 per bagian.
- **Tanpa kecuali.** Sudut, segel, flap, kantong, kelopak RSVP, ladang, gedung, busana, pita
  babak kini bisa ditunjuk; isi bagian tembus klik di celah kosongnya. Di panggung klik amplop
  memilih kepingnya; callout "Klik di sini" jadi tombol berikon dan ada tombol buka di toolbar.
  Halaman tamu tidak berubah.
- **Kunci** = tidak bisa disunting di panggung sama sekali; tab Elemen tetap menyunting. Gerak
  per keping (8 preset + tunda) dan tidak ikut terkunci.
- Bug yang ditemukan saat diverifikasi di browser: sunting teks di tempat mengganti node teks milik
  Vue (dokumen berubah, layar tidak); status kunci dibaca dari DOM saat klik (pegangan tetap tampil
  sesudah dikunci); Delete diabaikan karena fokus tertinggal di rail.
- **Lanjutan (permintaan pemilik sesudah mencoba kanvas):** menyeret meniru Figma — smart guide
  ke tepi/tengah keping lain dan kotak bagian, jarak seimbang antar-tetangga, Shift mengunci arah
  (mendatar/tegak/45°), ⌘/Ctrl mematikan tempel, garis panduan `--color-panduan` dan label `X · Y`.
  Daftar Lapisan bergambar: pratinjau 32px tiap keping, menghadap arahnya di kanvas.
- **Bug yang ketahuan e2e penuh:** sesudah viewport panggung dibungkus `ContextMenuTrigger as-child`,
  `useElementSize` tertinggal mengamati elemen lama — lebarnya 0, dan Desktop yang dimuat dari
  preferensi dirender 1:1 selebar 1280px di kolom 528px. Stage kini memakai `ResizeObserver` yang
  mengikuti ref-nya.
- **Tiga temuan suite penuh, diperbaiki di kode:**
  - pengukur viewport sempat menghasilkan lebar/tinggi NEGATIF saat panggung tersembunyi (tab
    Pengaturan di bawah `xl`), sekarang diklem ≥ 0;
  - pendaratan rail meleset 18–25px karena satu langkah ekor animasi gulir halus jatuh SESUDAH
    koreksi instan (6034 → 6052) dan penjaga membacanya sebagai gulir pasangan. Titik pendaratan
    kini dibaca ulang dua frame sesudah koreksi. Terukur: −17,3 → 7,7 (target 8);
  - lapisan overlay kanvas yang membawa potongan basi sesudah jendela mengecil mendorong halaman
    editor melebar — kini tak berukuran tanpa sorotan dan dihitung ulang tiap viewport berubah.
- Tes: `test/kanvas.spec.ts` (34), contracts kanvas (4), API `design-gate-kanvas` (3), motion
  (siluet + gerak keping), `ornament-slots` jadi penjaga satu pintu; e2e `fase81.spec.ts` (10) —
  termasuk sapuan `elementFromPoint` seluruh keping. Tes fase 76 "amplop terbuka dari badannya"
  dan "segel tetap membuka amplop" ditulis ulang sesuai keputusan pemilik.

## 2026-09-23: Fase 80 — amplop yang bergerak, gerak masuk yang terlihat, form yang tidak direbut

- **Amplop "statis" adalah bug posisi GSAP, dan halaman tamu ikut rusak.** Fase 69.3 menulis
  posisi timeline sebagai string numerik (`"-0.22"`), yang dibaca GSAP sebagai waktu mutlak:
  gerbang pudar di 0,00–0,60 s, lalu segel, flap, dan surat bergerak tanpa terlihat. Jadwalnya
  pindah ke `susunAmplop()` (`utils/motion-envelope.ts`), tabel tempo hanya memuat besaran positif,
  dan `motion-envelope-timeline.spec.ts` menjalankan jadwalnya dengan GSAP sungguhan (merah
  lebih dulu). Koreografi dipoles: flap berperspektif pindah ke belakang surat setelah tegak
  lurus, surat naik dari miring 2,5°, berhenti sejenak (`breath`), baru amplop pergi.
- **Amplop → hero.** Gerak masuk ditahan (`MotionOptions.tahan`) selama gerbang menutup halaman
  tamu, lalu dilepas saat gerbang mulai pudar. Terukur: judul hero 0 selama gerbang utuh, lalu
  0,4 → 0,9 bersamaan pudarnya.
- **`iris` dkk.** Diukur headless di lima tema: judul bergerak identik (y 26) di semua pilihan, dan
  clip-path tidak pernah muncul. Sekarang judul ikut tata bahasa (`utils/motion-entrance.ts`):
  sweep x ±32, iris membuka lewat `clip-path`, dan foto iris dari lingkaran pusat. Pilihan per
  bagian mengalahkan `data-entrance` komponen (Couple). `silhouette` di panggung digerbangi
  pengamat, bukan scrub jendela.
- **Rail tidak lagi merebut form.** Gulir hanya menandai (`data-terlihat` + titik), sedangkan
  `selectedId` hanya berubah lewat klik. Gestur gulir membatalkan ekor koreksi `gulirKe`, yang
  sebelumnya menarik balik gulir pasangan (9875 → 8653 px). Pendaratan dijaga tiga kali dalam
  2,4 s untuk pergeseran tata letak yang datang terlambat (`dashboard.spec.ts:754`).
- **Ornamen.** Tab "Disarankan" dihapus: Studio membuka seluruh bank per jenis, dan yang serasi
  diurutkan di depan dengan lencana. Slot baru `segue` (Pita babak) dan `heroFrame` (Bingkai
  hero) punya bawaan garis, bukan keping, jadi undangan terbit tidak berubah. Simbol Rundown,
  segel dan kelopak RSVP, serta Segue kini ber-`data-iv-slot`. Penjaga baru mewajibkan slot di
  tiap glyph berslot, tanpa syarat `data-iv-ornament`.

## 2026-09-23: Fase 79 — empat bagian ekstra berhenti jadi lubang, cerita jadi lima wajah

- **Utangnya empat permukaan, bukan satu.** Fase 78 mencatat sembilan kolom teks di `story`,
  `rundown`, `dresscode`, dan `video` yang tidak pernah sampai ke layar. Penelusuran menemukan
  tiga permukaan lagi yang ikut mati di keempat bagian itu: mereka **nol** memakai
  `<InvitationText>` (jadi panel Gaya teks tidak berlaku pada satu pun kolomnya), dan tidak
  pernah meneruskan `latarBagian()` maupun `gerakBagian()` ke `InvitationSection` (jadi Latar
  dan Gerak per bagian ikut mati). Sumbernya satu: `eleganceComponents` di `Renderer.vue`
  menunjuk berkas yang sama dengan `legacyComponents`.
- **Kenapa kolomnya tulis-ke-lubang, bukan sekadar terabaikan.** Migrasi v1→v2 membuang
  `document.copy`, jadi untuk dokumen v2 `resolveCopy` selalu `{}` dan `pilihCopy` **selalu**
  jatuh ke `copyDefaults`. Bawaan di `createEleganceSections` kebetulan disalin persis dari
  `copyDefaults` — itu sebabnya layarnya benar selama pasangan tidak menyunting apa pun, dan
  cacatnya baru terlihat begitu kolomnya disentuh.
- **Satu berkas per bagian, bukan keluarga kedua di `elegance/`.** Keempatnya dipakai bersama
  struktur `elegance` dan `warisan`, dan revisi v1 yang sudah terbit masih dibaca tamu hari ini.
  Tiap kolom dipasang `<InvitationText>` dengan `fallback` yang menghasilkan teks identik; dua
  di antaranya (`story.closing`, `dresscode.note`) **bersyarat**, karena baris itu hari ini
  hanya muncul di satu cabang dan fallback tanpa syarat akan menumbuhkan kalimat baru di
  undangan warisan yang sudah terbit.
- **`FieldKind` dapat bentuk enum.** Sampai fase ini tiap pilihan yang hidup di `section.data`
  ditulis di luar tabel kolom, dan dua di antaranya berakhir yatim: `selectableCoverLayouts` dan
  `selectableGalleryMotions` masih dibaca renderer tapi tidak punya satu pun form yang menulisnya
  sejak fase 72. Sekarang `kind: 'pilihan'` + `FieldMeta.options`, satu `case` di `kindSchema`,
  dan satu cabang di `SectionForm.vue` — nol baris di halaman editor.
- **Cerita jadi lima wajah yang bisa dipilih**, dan yang lama jadi varian pertama, bukan dibuang:
  `rel` (garis melengkung, titik menyusuri scroll), `prosa` (cabang tersembunyi "kalau belum ada
  langkah" yang kini pilihan sadar), `tumpuk` (kartu ber-`sticky`), `buku` (halaman berselang),
  `rel-datar` (geser ke samping). Dimuat malas lewat `import.meta.glob` + `defineAsyncComponent`
  (pola `OrnamentGlyph`), jadi undangan yang memilih `tumpuk` berhenti mengunduh ResizeObserver,
  DrawSVG, dan MotionPath milik `rel`.
- **Nol migrasi, dan itu dibuktikan.** `storyVariantEfektif` menjatuhkan varian berbasis langkah
  yang tidak punya langkah ke `prosa` — cabang lama `Story.vue`, ditulis sekali sebagai fungsi
  murni. Dokumen lama tanpa kolom `variant` karena itu terlihat persis sama, dan `story-variant.spec.ts`
  membuktikannya tanpa merender apa pun.
- **`story.variant` sengaja TIDAK masuk `designFingerprint`.** `restructureDocument` dan
  "Kembalikan ke preset awal" sama-sama menulis `{ ...bawaan.data, ...lama.data }`, jadi keduanya
  pasti menanam `variant: 'rel'` ke draf lama. Kalau kolom itu digerbangi desain, sidik jarinya
  berbalik pada simpan pertama dan setiap pelanggan tanpa add-on `design` terkunci — cacat 73.1
  kata per kata. Dipin `design-gate-story-variant.spec.ts`.
- **Rundown dipertahankan berdampingan `event`, dan naik ke kosakata Elegance.** `event` memuat
  dua acara utama yang dipatok kode; rundown memuat jalannya hari, 0–30 baris. Lencana penanda
  1,75 → 2,5rem meniru medali `event`, isi baris duduk di kartu ber-radius arch. Tiga angka yang
  memposisikan rel (kolom jam + gap + setengah lencana) **diikat jadi variabel CSS** — sebelumnya
  literal di dua aturan terpisah, jadi menaikkan lencana membuat rel meleset dari titiknya tanpa
  satu tes pun berbunyi.
- **Video memakai sampul sendiri.** Repo belum punya satu baris kode YouTube. Iframe langsung
  akan mematikan `pauseMusic`: tombol play-nya ada di dokumen lintas-origin, jadi klik tamu tidak
  menghasilkan event apa pun di halaman kita dan musik latar menimpa ijab kabul. Sampulnya
  digambar dari `i.ytimg.com`, kliknya milik kita, musik dijeda **sebelum** iframe masuk DOM,
  lalu `youtube-nocookie.com/embed/…?autoplay=1`. URL non-YouTube tetap jatuh ke tautan keluar
  yang lama. `hqdefault`, bukan `maxresdefault` — yang terakhir 404 untuk video yang tidak pernah
  HD, dan 404 itu jadi kotak kosong di undangan pernikahan seseorang.
- **Galeri berhenti meninggalkan sel kosong.** `.iv-gallery--grid` dua kolom tanpa aturan `span`,
  jadi tiap jumlah ganjil menyisakan separuh baris kosong — paling buruk pada satu foto, yang
  terbaca sebagai foto gagal dimuat. Tile terakhir berposisi ganjil kini mengisi kedua kolom.
  Nomor `01–04` berputar alih-alih menulis `57` di tile ke-57 (kuota Purnama 60 foto). Tabirnya
  dipendekkan ke 42% dan diringankan ke 0,45 — **bukan** disembunyikan sampai di-hover: aturan
  repo melarang markup undangan menyembunyikan apa pun lewat CSS, dan undangan ini dibaca di
  ponsel, yang tidak punya hover.
- **Satu utang tetangga ikut ketahuan dan ditambal.** `wishes.loadingLabel` juga tidak dibaca
  siapa pun — kolom kesepuluh dengan cacat yang sama persis, hanya lebih sepi. Ditambal dengan
  merendernya (selagi dinding ucapan diambil ulang sesudah kiriman), **bukan** dengan menghapus
  kolomnya: menghapusnya menyempitkan `styledFieldKeys('wishes')`, dan `textStyles` diskemakan
  `.strict()`, jadi tiap dokumen terbit yang pernah memberi gaya di kolom itu akan ditolak skema
  dan berhenti bisa disimpan maupun diterbitkan.
- **Penjaga yang membuat kelas cacat ini tidak bisa lahir lagi.** `section-fields-render.spec.ts`
  membaca `sectionFields` lalu memeriksa tiap key-nya muncul di sumber komponen yang memetakan
  tipe itu, dan tiap komponen keluarga `elegance` memakai `sectionDomId`, `latarBagian`, dan
  `gerakBagian`. Dijalankan terhadap kode sebelum fase ini, ia menangkap **sembilan dari sepuluh**
  kolom mati dan ketiga panggilan yang hilang di keempat berkas; `rundown.title` lolos karena
  baris rundown membaca `item.title` miliknya sendiri. Batas itu ditulis di berkasnya, bukan
  disembunyikan.
- **Nol perubahan harga.** `dresscode` butuh Mekar, `video` butuh Purnama atau add-on.
  `enabledByDefault` tidak disentuh — memasukkannya akan membuat setiap undangan baru paket Mula
  gagal terbit, cacat `gift` fase 73.2 kata per kata.
- **Wajah baru rundown dipagari ke keluarganya.** `sections/Rundown.vue` dipakai bersama
  `elegance` dan `warisan`, jadi melebarkan lencana dan memberi kartu pada tiap baris akan ikut
  mengubah undangan v1 yang sudah terbit. `.iv-root` kini memancarkan `data-iv-struktur`, dan
  wajah barunya digantung di `[data-iv-struktur='elegance']`. Terukur dengan membalik penanda itu
  di halaman yang sama: elegance **40px** berkartu dan bercincin, warisan kembali **28px** tanpa
  keduanya. Yang **tidak** dipagari adalah pengikatan tiga angka posisi rel jadi variabel CSS —
  itu koreksi, dan ia berlaku untuk kedua keluarga.
- **Bagian Video kosong berdiri di panggung**, dengan slot kosongnya sendiri, dan tetap hilang di
  halaman tamu — cacat yang sama persis dengan galeri kosong yang ditutup fase 78.
- **Satu cacat lama ikut ditutup di jalurnya.** `Story`, `Gallery`, dan `Rsvp` memanggil
  `useArunaMotion` **telanjang** — tanpa `scrollRoot` maupun `statis` — jadi di panggung editor
  ketiganya mengukur jendela alih-alih layar ponsel yang menggulung, dan tombol Statis (fase 78)
  tidak mematikan geraknya. Renderer kini menyalurkan `motionOptions` lewat `InvitationContext`;
  memecah cerita jadi lima varian tanpa itu akan melipatgandakan cacatnya dari tiga tempat jadi tujuh.

## 2026-09-22: Fase 78 — panggung yang berhenti kosong, dan musik yang menunggu ditekan

- **Teks bagian tidak pernah sampai ke panggung, dan sebabnya terukur.** Gerak masuk memakai
  `gsap.from(..., { opacity: 0, scrollTrigger })`, dan **tidak ada satu pun `scroller:` yang
  dioper ke ScrollTrigger di seluruh repo** — benar di halaman tamu, tempat penggulungnya memang
  jendela; salah di panggung editor, yang menggulung isinya di dalam bingkai ponsel
  (`[data-preview-stage]`). Terukur sebelum diperbaiki: **22 dari 22** `[data-iv-lead]` bening
  saat dipasang, dan **tetap 22 dari 22** setelah panggung digulir sampai dasar. Kontrolnya
  halaman tamu di lebar yang sama: 26 dari 30 bening di puncak, **nol** setelah digulir.
  Sesudah perbaikan: nol di kedua permukaan.
- **Gerbangnya `IntersectionObserver`, bukan `scroller:` milik ScrollTrigger.** Bingkai ponsel
  diperkecil `transform: scale()` 0,5–1,0; ScrollTrigger mencampur `getBoundingClientRect()`
  (ikut terskala) dengan `scrollTop` (tidak), jadi titik nyalanya meleset sebesar faktor
  skalanya — 19% pada pratinjau 84%, dua kali lipat pada zoom 50%. IntersectionObserver
  menghitung dari kotak tata letak dan benar pada skala berapa pun. Jaring pengamannya satu:
  tanpa `IntersectionObserver`, animasinya langsung dimajukan ke keadaan akhir.
- **Menggulir ke atas memutar geraknya mundur**, di kedua permukaan (`toggleActions` keempat →
  `reverse` di halaman tamu; `timeline.reverse()` pada keluar-lewat-bawah di panggung). Yang
  keluar ke ATAS dibiarkan utuh — memundurkannya berarti halaman yang bagian-bagiannya
  menghilang di belakang punggung. Digerbangi satu invarian e2e: **setelah gerak mereda, bagian
  yang menempati tengah layar wajib menampilkan seluruh teksnya**, dibandingkan terhadap keadaan
  istirahat yang diambil dari halaman yang sama dengan `prefers-reduced-motion` menyala — bukan
  terhadap angka 1, karena `.iv-kicker` memang hidup pada 0,8 demi kontras.
- **Panggung dapat tombol Statis/Dinamis** (`#editor-preview-gerak`). Jalurnya sudah ada:
  `useArunaMotion` berhenti sebelum menulis satu pun keadaan `from` ketika gerak tidak
  dikehendaki, jadi "statis" berarti markup keadaan-akhir yang memang terbaca tanpa JS. Disimpan
  di `useEditorPrefs` bersama zoom dan lebar pratinjau, **tidak pernah masuk
  `InvitationDocument`** — dipaku tes e2e yang menegaskan penanda simpan tidak bergerak saat
  tombolnya ditekan.
- **Musik berhenti menyalakan dirinya sendiri.** Pemicu `gate` dicabut dari `music-state.ts`,
  dan `onGateOpen()` berhenti memanggil `player.arm()`. Lagu bawaan tetap terpasang di tiap
  undangan baru; yang berpindah keputusannya. Empat aturan fase 17 utuh — berhenti saat siaran
  akad, berhenti saat tab tersembunyi, penolakan tamu bertahan per-tab.
- **Galeri tanpa foto berhenti menghilang.** `gallery` menyala di tiap undangan baru dengan
  `imageUrls: []` dan ber-`v-if` pada jumlahnya, jadi rail menampilkan bagian "Tampil" yang tidak
  menghasilkan apa pun. `SlotKosong.vue` menggantikannya **di panggung saja**; halaman tamu tetap
  menyembunyikannya. Sama untuk potret Mempelai dan foto Penutup.
- **Dua cacat data bawaan, satu sebab.** "Kembalikan ke preset awal" mengoper `{}` sebagai
  masukan, jadi tanggal, gedung, dan alamat dari wizard `/order` dibuang dan bagian acara kembali
  ke "Hari / 00 / Bulan Tahun"; `restructureDocument` mengoper `{ partner1: 'Aruna', partner2:
  'Dewa' }` hardcode, jadi bagian yang belum ada di struktur asal lahir dengan nama orang lain.
  Keduanya sekarang memakai `defaultInputFromDocument()` — membaca dokumen kembali jadi masukan
  yang melahirkannya, murni dan diuji tanpa DB.

## 2026-09-22: Fase 77 — hierarki yang bisa dibaca, dan wajah desktop

- **Skala chrome, lima langkah bernama.** 117 nilai `text-[…]` arbitrer diganti token; chrome
  editor turun dari **tujuh ukuran liar** (10/11/12/13/14/15/17px) jadi **lima bernama** —
  `ui-label` 12 · `caption` 13 · `ui` 14 · `ui-lg` 15 · `body-lg` 17 — plus `stat` 36 untuk angka
  metrik dan `body` 16 yang **tetap** untuk isian form (di bawah itu Safari iOS memperbesar halaman
  saat field difokus). Hierarki yang bertabrakan dibetulkan: judul panel rail turun ke label mikro
  uppercase (dulu 15/700, seukuran nama bagian di bawahnya), tab inspektor disamakan dengan nav
  toolbar (dulu 13 lawan 14 — kembar visual, beda satu piksel yang tidak pernah diputuskan siapa
  pun), chip "tersimpan" dari 13/600 ber-pill jadi 12/500. `chrome-type-scale.spec.ts` menolak
  nilai arbitrer berikutnya.
- **`tailwind-merge` membuang warna tombol — cacat laten sejak token kustom pertama.** Ia tidak
  tahu `text-ui` itu ukuran, jadi menganggapnya bertabrakan dengan `text-white` dan membuang yang
  pertama: tombol primary dasbor jadi tinta gelap di atas terakota, **kontras 3,45:1**, tertangkap
  axe. `text-caption` lewat `cn()` pun sudah kehilangan ukurannya sejak dulu; yang membuat cacat
  ini baru terlihat adalah arah kerugiannya — ukuran yang hilang cuma terbaca sebagai huruf agak
  besar, warna yang hilang terbaca sebagai kontras yang gagal. `cn.ts` mendaftarkan kedua belas
  ukuran; `cn-font-size.spec.ts` menjaganya.
- **Latar panggung putih**, dan token `--color-surface-3` **tidak** digeser: ia juga hover tiap
  tombol ghost, latar tab, badge netral, `Skeleton`, `Dropzone`, `Input`, `Avatar`, dan lima seksi
  landing.
- **Kepala rail dan inspektor berhenti tergulir.** Keduanya jadi grid dua baris di `lg`: judul +
  pencarian, dan alat + tab, di baris yang diam; daftar dan isi form di baris yang menggulung.
  Bukan `sticky` — ia menuntut latar buram dan z-index sendiri dan tetap bisa tertindih cincin fokus.
- **Tiga lebar yang benar-benar berbeda**: Ponsel 390 · **Tablet 768** · Desktop 1280.
  `ponsel-besar` 412 dibuang — ia tidak pernah menyalakan satu pun aturan tata letak.
- **Undangan punya wajah desktop.** Di container ≥64rem: panel foto **Galeri** yang diam di kiri
  (960px pada layar 1440), kolom undangan 480px yang digulir di kanan — **tamu ikut melihatnya**.
  Tablet 48–64rem tetap satu kolom, melapang ke 640px. `container-type` pindah dari `.iv-root` ke
  `.iv-column` baru, karena `.iv-root` kini grid selebar layar dan section yang menanyainya akan
  menata diri untuk lebar yang bukan miliknya. `.iv-frame` diberi **nama** container: `@container`
  tanpa nama menanyai wadah terdekat, dan dock serta pemutar musik hidup di dalam `.iv-column` —
  aturan desktop yang ditulis tanpa nama menanyai kolom 480px dan tidak pernah cocok. Tanpa foto,
  gridnya tidak dinyalakan sama sekali; panel jatuh ke foto utama supaya undangan baru tidak
  kehilangan seluruh tata letak desktopnya.
- **Musik**: `createDefaultDocument()` memasang lagu bawaan (`Gymnopédie No. 1`) untuk undangan
  baru — sebelumnya `settings.musicUrl` lahir kosong dan pemutarnya memang tidak pernah dirender,
  jadi "tombolnya hilang" adalah lagu yang belum pernah ada. Kalimat "Undangan ini memutar musik
  saat dibuka." dicabut. `left-4` pada elemen `sticky` (yang di sana adalah batas penahan, bukan
  offset) diganti `ml-4`. E2e baru membuktikan pemutarnya berdiri **di panggung** — jalur yang
  sebelumnya nol tes.

### Tiga cacat scroll-spy fase 76, semuanya ditemukan lewat tes yang merah di sebagian project

1. **Titik tengah salah satuan.** `clientHeight` (koordinat render) dijumlahkan dengan `rect.top`
   (piksel layar); pada skala 0,497 melesetnya 212px — cukup untuk menjawab bagian berikutnya. Di
   desktop skalanya 0,79 sehingga melesetnya 89px dan jawabannya kebetulan benar. **Itulah sebab
   tiga merah fase 76**, yang dua kali saya salah diagnosis sebagai soal waktu.
2. **Panggung tersembunyi tetap menjawab.** Elemen `display: none` menjawab semua rect nol, jadi
   tiap bagian "memuat" titik tengah dan yang pertama menang: berpindah ke tab Pengaturan di ponsel
   melapor "Hero" dan menimpa bagian yang baru dipilih.
3. **Sorot berpindah tanpa ada yang menggulir, dan itu menghapus ketikan.** `selectedId` yang
   berubah me-remount `SectionForm` (ia ber-`:key`), jadi bagian yang cuma TERLEWATI dalam gulir
   halus dari rail menghapus judul yang sedang diketik pasangan — terukur, judulnya kembali ke
   nilai lama 1,5 detik sesudah diketik. Sekarang sorot hanya berpindah kalau `scrollTop` benar-benar
   berubah, perjalanan menuju bagian yang diminta rail dibungkam sampai sampai, dan laporan
   penutup dibaca dari keadaan yang sebenarnya — bukan dari tujuan yang tadi diminta.

### Dua tes yang salah menuntut, bukan dua cacat

- **Pemutar musik di panggung** dituntut berlabel "Putar musik" sesudah amplop dibuka. Tidak bisa
  ditebak: `onGateOpen` memanggil `arm()` sinkron di dalam klik, dan apakah ia benar-benar berbunyi
  tergantung kebijakan autoplay mesinnya — WebKit mengizinkan, Chromium headless tidak. Hijau di
  satu project, merah di project lain, tanpa ada yang rusak. Yang diuji sekarang: menekannya
  **membalik** labelnya.
- **`demo wishes form`** merah sekali di WebKit lalu hijau 3/3 saat diulang; dicatat sebagai flake,
  bukan diperbaiki dengan menebak.

### Yang diperiksa dan TIDAK terbukti

`container-type: inline-size` disangka membuat `position: fixed` berlabuh ke `.iv-root`, sehingga
gerbang, dock, dan pemutar di halaman tamu dikira melayang di dasar dokumen. Diukur di browser:
`contain: none`, gerbang `fixed` setinggi 900 = viewport, dock di dalam viewport. Tidak ada cacat.

## 2026-09-22: Fase 76 — panggung yang bisa disentuh

Empat keluhan dari peninjauan pemilik di layar, tiga di antaranya cacat yang bisa ditunjuk barisnya.

- **Pratinjau ponsel akhirnya muat** (`PhoneFrame.vue`, `Stage.vue`). `fit` dulu hanya
  `Math.min(1, hostWidth / width)` — tinggi tidak pernah ikut, padahal prop `maxHeight` sudah ada
  sejak fase 65 dan dipakai `/order`. `Stage` kini mengopernya dari tinggi content-box viewport-nya
  sendiri, dikurangi padding bezel, berlantai 420px. Terukur di 1440×900: Clean 79 %, bingkai 669px
  di dalam viewport 829px (dulu 864px berdiri melewati tepi bawah); iPhone 77 %, bingkai 649px.
- **Layar ponsel jadi wadah gulirnya sendiri** (`scrollable` di `PhoneFrame`). Sebelum ini
  `DeviceBezel` memasang `max-height: ${screenHeight}px` + `overflow-hidden` **tanpa** gulir di
  dalamnya, jadi di mode iPhone/Android seluruh isi di bawah 844px tidak bisa dicapai sama sekali —
  hanya "Clean" yang pernah bisa digulir. Terukur: isi 7.534px menggulung di layar 844px, di kedua
  mode. `stageScrollTop()` menerima `scale`, karena wadah gulirnya kini elemen yang di-`scale()`
  itu sendiri dan rect (piksel layar) bukan lagi satu satuan dengan `scrollTop` (koordinat render).
  `stageScrollOffset` 96 → 8: tidak ada lagi pil mengambang di atas wadah gulirnya.
- **Panggung berhenti mengunci gulirnya, dan inilah akar keluhan yang sebenarnya.** Ditemukan
  sesudah pemilik meninjau hasil putaran pertama dan melaporkan bahwa gulirnya masih diam. Gerbang
  amplop di panggung dulu `absolute inset-0` menindih seluruh tinggi undangan, jadi satu-satunya
  cara agar gulir tidak menampakkan gerbang tanpa ujung adalah `overflow-y: hidden` selama amplop
  belum dibuka. Terukur pada keadaan pemilik: roda 600px → `scrollTop` tetap 0. `.iv-gate--contained`
  kini `relative` setinggi `var(--iv-layar-h)` di puncak aliran; emit `lock`/`unlock` tidak lagi
  mengunci apa pun dan `PhoneFrame.scrollLocked` dibuang. Gerbang juga dapat `id="iv-opening-envelope"`
  (prop `gateId`, hanya v2 — pada v1 `#iv-cover` sudah dipakai section sungguhan), jadi rail bisa
  menggulir ke amplop dan scroll-spy bisa menyorotnya.
- **Bezel dibuang seluruhnya.** Putaran pertama hanya memindahkan bawaan ke `Clean` dan menyisakan
  bezel sebagai opsi; itu keliru dua kali. `useLocalStorage` membuat pasangan yang preferensinya
  sudah `iphone` tidak pernah melihat bawaan baru, dan `Clean` sendiri lahir sebagai "iPhone tanpa
  bezel" sehingga tanpa bezel ia tidak beda dari apa pun. `DeviceBezel.vue` dihapus; pemilihnya
  jadi **Ponsel 390 · Ponsel besar 412 · Desktop 1280** dengan layar `rounded-[1.75rem]`. Nilai
  tersimpan lama dipetakan di `bacaDevice()` supaya preferensi yang tersangkut sembuh sendiri.
- **Panggung menyorot balik ke rail** (fase 70 hanya punya arah sebaliknya). `IntersectionObserver`
  ber-`rootMargin: '-45% 0px -45% 0px'` seperti `Dock.vue`. Callback pembuka dilewati lewat
  **bendera, bukan jendela waktu**: versi pertamanya membungkam 250ms sesudah pemasangan dan itu
  ikut menelan gulir sungguhan tepat sesudah amplop dibuka — gerakan paling wajar di panggung.
  **`entries` tidak dipakai untuk memilih**,
  hanya sebagai isyarat: satu lompatan gulir melintaskan lima bagian sekaligus, dan memilih dari
  larik itu menyorot "Hadiah" saat yang dituju "Ucapan" — diukur, bukan dikhawatirkan. Yang memuat
  titik tengah layar yang menang. `SectionRail` menggulir item aktifnya ke tampak.
- **Amplop terbuka dari badannya**, bukan cuma dari segel seluas 4,75rem. Tidak ada yang pernah
  mematikan kliknya — e2e sudah mengklik `[data-gate-seal]` di panggung sejak fase 72 — yang salah
  adalah areanya, sementara callout di bawahnya berbunyi "Klik di sini untuk membuka". Kotak amplop
  (`data-gate-envelope`) dan callout jadi pemicu dengan `@click.stop`; segel tetap satu-satunya
  kontrol beraksesibilitas. Terukur klik→gerbang hilang: 2.085 ms, jadi timeline GSAP-nya memang
  berjalan penuh.
- **Ornamen punya afordans di panggung** (permintaan baru). `data-iv-slot` mendampingi
  `data-iv-ornament` di 43 titik panggil; hover memberi `outline: 1px dashed` 65 % primary; klik
  memindahkan inspektor ke tab Ornamen dan menyorot kartu slotnya 1,2 detik. Studio **tidak**
  dibuka langsung — nilai ornamen berlaku global dan kartu slotnya yang mengatakan itu. Delegasi
  kliknya melewati apa pun yang punya leluhur `button/a/[role=button]`, jadi segel amplop tetap
  membuka amplop. Seluruhnya digerbangi `.iv-root--stage`: halaman tamu tidak melihat satu garis
  pun, dan `.iv-field` di sana tetap `pointer-events: none`.
- Penjaga baru: `ornament-slots.spec.ts` menolak `OrnamentGlyph` berslot yang lupa `data-iv-slot`
  (kegagalannya senyap — ornamennya tetap tergambar, hanya tidak bisa diklik);
  `editor-sections.spec.ts` mengunci konversi satuan `scale`; enam e2e baru di `dashboard.spec.ts`.
- Dua tes lama diperbarui, bukan dilemahkan. `device preview` mengukur dua angka: `scrollHeight`
  (tinggi isi; `offsetHeight` sejak fase ini menjawab tinggi LAYAR dan tidak bisa lagi membuktikan
  apa pun) dan tinggi satu section yang benar-benar ditentukan lebar. Yang kedua perlu karena
  `scrollHeight` kini memuat dua blok setinggi `--iv-layar-h`, dan tinggi itu datang dari viewport
  perangkat: 8.378 di 390×844 lawan 8.449 di 412×915 — lebih lapang tapi lebih panjang. Probe-nya
  "Ucapan" (1.768 · 1.714 · 1.550), dipilih sesudah ketiganya diukur; "Mempelai" justru NAIK
  bersama lebar (815 · 819 · 833) karena tata letaknya bertukar. `studio editor` melepas keterangan
  "di bezel bagian di bawah lipatan tidak pernah bisa digulir" dan menggantinya dengan tes yang
  membuktikan sebaliknya.
- Satu bug ada di tes, bukan di aplikasi, dan dicatat apa adanya: helper gulir e2e lupa membagi
  skala, mendarat 648px terlalu tinggi, lalu menuduh scroll-spy-nya yang salah.

## 2026-09-20: Fase 72 — template utama "Elegance" dan editor ala Undangan Studio

- **Kontrak v2** (72.0): `sections.ts` — dua belas bagian Elegance + empat ekstra, kolom per tipe
  (`sectionFields`) yang sekaligus skema zod dan sumber form editor; `textStyles`, `background`,
  `motion` per bagian; `settings` musik; `shareCard`; `tokens.layout`. `createDefaultDocument()`
  kini v2; `migrateLegacyDocument()` di editor. `copyKeys` tidak dipakai dokumen v2.
- **Editor** (72.1–72.5, 72.8): `Toolbar` (nav Editor | Generator | Ucapan, Published), `SectionRail`
  (Wajib/Opsional, mata, drag), `Inspector` empat tab, `Stage` (zoom, bezel, `mode="stage"`),
  `SectionForm` (digenerate) + `TextStyleField` + `ExtrasForm`, `GlobalPanel`, `KartuPanel` +
  `ShareCardPreview`, `MediaLibrary` + `useMediaLibrary`, `PhotoField` gaya "Foto komponen",
  `useEditorPrefs` (device iphone/android/laptop/bersih, tab, zoom, inspektor ciut),
  `utils/theme-palettes.ts`, metadata pustaka musik. `CopyFields.vue` dan cabang form per tipe
  di `editor.vue` dihapus (1.788 → ±430 baris).
- **Renderer v2** (`components/invitation/elegance/*.vue`): dua belas bagian Elegance memakai tema,
  ornamen, dan partitur kita; `Renderer` memilih peta komponen per `schemaVersion`, `mode`
  `live|stage|compact`, gerbang `contained` untuk panggung editor, musik dari `settings`.
- **API**: `create()` menulis dokumen v2, `document-validation` bercabang v2, `publish()` memakai
  `sectionFeature`, `designFingerprint` membaca `textStyles`/`background`/`motion` per bagian;
  `GET /v1/public/share-card/:slug.png` (satori + resvg) jadi `og:image`; Generator mendapat
  `PATCH /invitations/:id/share-settings` dan `POST …/guests/:id/sent`.
- **Dua cacat ditemukan saat verifikasi dan diperbaiki.** (1) Menggeser urutan bagian menanam
  proxy Vue ke dalam dokumen, sehingga `structuredClone` di `undo()` melempar tepat sesudah
  `pop()` — tumpukan habis, redo kosong, urutan tidak pernah kembali; `reorder()` kini menyusun
  dari `toRaw`, dan riwayat memakai salinan JSON yang tahan proxy. (2) Kartu 480px
  ("Fokuskan untuk Layar") memakai `@media`, jadi pratinjau Desktop di editor berbohong: tinggi
  render 1280 berubah 7210 → 8148 hanya karena jendela editornya menyempit. Aturannya pindah ke
  `@container` pada pembungkus `.iv-frame`, sesuai aturan DESIGN.md "undangan mengukur dirinya".
- **Rencana kanvas bagian ala Figma dibuang** (keputusan pemilik 2026-09-20).
- Verifikasi: `pnpm test` 1201 hijau (80 berkas), `pnpm lint` dan `typecheck` bersih, e2e desktop
  **51/51 hijau** pada stack lokal non-demo (web `dev` biasa di 3000 + API `dist` di 3001).

## 2026-09-19: Fase 71 — form bagian yang utuh, gulir yang bocor

- **Gulir bocor** (71.1): label `UiDropzone` jadi `relative` (input `sr-only`-nya absolut tanpa
  leluhur ber-posisi → `scrollHeight` 2168 pada viewport 900); akar `DashboardShell` studio
  `lg:relative lg:h-svh lg:overflow-hidden`. E2e "studio tidak menarik gulir dokumen".
- **Tulisan bagian** (71.2): `CopyForm` (tab Tema) → `CopyFields` di tab Bagian; label per fungsi,
  `kelompok` per kolom, `copyGroupsFor`/`copyKeysFor`/`copyClustersFor`, `kembalikanCopyBagian`.
  Tab Tema hanya ringkasan + "Kembalikan semua". E2e "tulisan bagian" menggantikan "kata-kata undangan".
- **Ornamen di bagian ini** (71.3): `sectionOrnamentSlots` (dijaga vitest yang membaca
  `components/invitation/`), `SlotSummary` prop `slots`; `ornamentOverrides` editor dibaca dari cover.
- **Fase 72** ditulis. Rencana kanvas bagian yang disebut di sini dibuang pemilik sehari
  kemudian; yang dikerjakan adalah "Elegance" — lihat entri 2026-09-20 di atas.

## 2026-09-19: Fase 69 — "Buat tema versi Anda sendiri" (langkah 1–4, 6)

- **Kata-kata** (69.1): `copyKeys` (44) + `copy` opsional; `t()` di renderer; `CopyForm` di tab
  Tema. Vitest web 796 → 810, API+contracts 268; e2e "kata-kata undangan" desktop + mobile.
- **Amplop** (69.2): lima glyph `amplop-*`, slot `envelopePocket`/`envelopeFlap`, CoverGate
  merender keduanya lewat `OrnamentGlyph`. Forge verify bersih; ringkasan ornamen 14 → 16 slot.
- **Gerak** (69.3): `tokens.motion`, `motion-envelope.ts` (sedang = fase 68 persis), `MotionPicker`.
  E2e "gerak undangan" (pilih pelan+iris, bertahan, kembali ke tema).
- **Ornamen unggahan raster** (69.4): `mediaRules.ornament`, Prisma `MediaAsset.kind/width/height`
  (migrasi `20260919000000_media_kind_dimensions`), `ornament-intake.ts` (probe PNG/WebP, alpha
  wajib), `GET/POST …/media?jenis=`, `ornamentOverrides.unggahan`, tab Unggahan di Studio. E2e
  "ornamen unggahan": PNG RGBA dirakit di tes, terpasang di Simbol, "Unggahan kalian" + "Diganti",
  dihapus lagi. SVG **ditunda** (keputusan pemilik).
- **Gerbang** (69.6): fingerprint membaca `copy`, `tokens.motion`, `unggahan`; tiga spec
  `design-gate-*` baru/diperluas.
- Temuan sambil jalan: dialog Studio dipasang `v-if` dengan `open` sudah true, jadi watcher
  `open` tidak pernah melihat pembukaan pertama — `onMounted` ikut memanggil `saatDibuka()`.

## 2026-09-19: Fase 70 — rail menggulir panggung, kartu ornamen bersih, bank bingkai dirapikan

- Memilih bagian di rail "Struktur undangan" menggulir panggung pratinjau ke bagian itu
  (`Stage.vue` prop `focusSection`, util `stageScrollTop()` di `utils/editor-sections.ts`);
  offset 96px di bawah pemilih perangkat, `prefers-reduced-motion` → `instant`. Di ponsel,
  gulir dikirim ulang saat tab Pratinjau dibuka.
- Ringkasan ornamen inspektor: baris tiga teks → grid dua kolom ubin berlabel
  (`dashboard/ornament/SlotCard.vue`). Hint dan syarat slot tidak lagi diulang di kartu.
- `ornamenDisembunyikan` (`ornament-slots.ts`): sembilan bingkai inti berhenti ditawarkan Studio
  tanpa dihapus dari bank (`frame-bentar`, `-kenanga`, `-mendung`, `-gonjong`, `-gunungan`,
  `-hening`, `-line`, `-pelita`, `-wastra`). Hanya `kandidat()` yang membacanya.
- Ubin Studio dan kotak pratinjau memakai `grid-rows-[minmax(0,1fr)]` + `overflow-hidden`;
  aset referensi tinggi (`lengkung-latar`) tidak lagi meluber dari ubin 80px.
- `ref-putih-cokelat-bingkai-ukir` dipecah menjadi `bingkai-ukir-kiri`/`-kanan` (kategori
  `corner`, potong di x 405 satuan viewBox 810); bank referensi 65 → 66 aset.
- Temuan sambil lalu: klaster tombol toolbar (fase 67) tidak membungkus dan meluberkan halaman
  ke samping di 360px — e2e `tidakMeluber` merah di project mobile/safari. Kini `flex-wrap`.
- Gulir rail menunggu viewport bisa menggulir (tinggi `PhoneFrame` masih 0 sesaat setelah tab
  Pratinjau dibuka) dan merapikan sekali setelah mengendap (font/foto yang tiba belakangan
  menggeser target 63px di WebKit). E2e rail hijau di desktop, tablet, mobile, safari.

## 2026-09-19: Fase 68 — amplop membuka lebih pelan

`CoverGate.vue`: flap 0,8 → 1,1 s; surat 0,8 → 1,4 s dan mulai saat flap setengah terbuka; pudar
akhir 0,45 → 0,6 s. Segel tidak diubah. Terukur headless di 375px (Chromium, poll 16ms sejak
klik): flap bergerak 1,12 s · surat mulai naik 1,57 s · badan memudar 2,56 s · gerbang hilang
3,20 s. Sebelumnya, dari posisi timeline: total ≈2,6 s dengan surat menyusul flap 0,38 s.

## 2026-09-19: Fase 67 — rail dasbor ciut jadi ikon, Tooltip pertama, toolbar dikelompokkan

**Rail dasbor** (`DashboardNav.vue`) 256 → 56px lewat `#dash-nav-toggle` di baris brand;
preferensi `aruna:dashboard:prefs` (`useDashboardPrefs`, pola `useEditorPrefs`). Saat ciut: logo
mark, judul hilang, `DemoBadge compact` jadi chip 44px, tautan jadi ikon 44×44 ber-`aria-label`
dan `UiTooltip` kanan. Transisi lebar digerbang `useInteractiveReady` supaya muat halaman tidak
diawali animasi ciut. `DashboardShell` tidak berubah — aside adalah flex sibling.

**`UiTooltip`** baru (`components/ui/Tooltip.vue`) di atas reka-ui, `as-child`, `TooltipProvider`
tunggal di `app.vue` (delay 300 / skip 250 ms), token `--z-tooltip 70`, kait tes `[data-tooltip]`.
Dipakai juga oleh rail struktur saat ciut dan oleh kedua toggle.

**Toolbar** tiga klaster: status tersimpan (turun ke barisnya sendiri di bawah 1280 —
terukur di 1100: status y=12, klaster tombol y=39; di 1280 semuanya sebaris), riwayat
(`role="group"` "Riwayat": undo · redo · pemisah · Reset), aksi (Lihat publik · Simpan draft ·
Publikasikan). Teks dan nama tombol yang dibaca e2e tidak berubah.

**`UiButton`** primary nonaktif tanpa `aria-busy` → `bg-surface-3 text-ink-subtle` (terukur
`rgb(244,239,232)`, opacity 1); saat `loading` tetap terakota + spinner. Transisi warna hanya
saat masuk hover (lihat DESIGN.md §Komponen — sweep axe /account menangkap pudaran 1,6:1).

**Terukur** (Laptop, `getBoundingClientRect`, rail lebar → kedua rail ciut):
1440 → rail 256 · struktur 272 · panggung 512 · inspektor 352 ⇒ 56 · 56 · **928** · 352;
1280 → 256 · 272 · 352 · 352 ⇒ 56 · 56 · **768** · 352. Tidak ada meluber (`scrollWidth` =
`innerWidth`) di 1440, 1280, 1100, 375. Di 375 rail `display:none`, dock bawah tetap.

**Tes:** vitest `dashboard-prefs.spec.ts` (3); e2e desktop baru "rail dasbor ciut jadi ikon…"
(lebar 256/56, `aria-expanded`, tooltip "Kelola tamu", axe nol pelanggaran saat ciut, bertahan
setelah muat ulang, navigasi ke RSVP tetap ciut). `dashboard screens are accessible and titled`
tetap nol pelanggaran setelah perbaikan transisi tombol.

## 2026-09-19: Fase 62 — editor jadi studio tiga panel

Pratinjau pindah ke tengah dan mendapat jalur paling lebar. `editor.vue` (1.814 → 1.630 baris)
kini `DashboardShell variant="studio"`: toolbar tipis (`DashboardEditorToolbar`, satu-satunya
pemegang `<h1>` dan status simpan yang tetap **tertulis**), rail struktur di kiri
(`DashboardEditorSectionRail`: cari bagian, "N dari 14 tampil", ikon per bagian, label Wajib pada
cover/mempelai/acara yang sakelarnya dimatikan, panah urut, tombol ciut), panggung
(`DashboardEditorStage`, pemilih Ponsel/Tablet/Laptop mengambang dan pengukur skala pindah ke
sini), dan inspektor kanan bertab **Bagian | Tema** (`DashboardEditorInspector`, dua panel
`v-show` ber-`@container`). Dua blok form besar **tidak dipindahkan**; mereka dirender lewat
named slot, verbatim, karena memutasi `selected.data` langsung dan memanggil ±60 helper halaman.

Preferensi (perangkat, tab, rail ciut) bertahan di `localStorage` lewat `useEditorPrefs`
ber-`initOnMounted`. Memilih bagian selalu membuka tab Bagian — pref `tema` yang tersimpan tidak
boleh menyembunyikan form yang baru diminta. Sakelar tampil kini lewat `checkpoint()` sehingga
bisa di-undo; sebelumnya `v-model` langsung ke `section.enabled`. Panah urut mati selama daftar
tersaring, dan indeks yang dikirim ke `move()` selalu indeks dokumen (`utils/editor-sections.ts`,
8 tes unit).

Jalur terukur (`getBoundingClientRect`, 2026-09-19): 1440 → rail 272 · panggung 560 · inspektor
352; 1280 → 272 · 400 · 352; 1024 → 272 · 496 (kolom dua diisi panggung *atau* inspektor);
1920 → 272 · 1008 · 384. Tiga cacat ketahuan saat mengukur, bukan dari kode: grid satu kolom di
ponsel `minmax(auto,1fr)` membuat panggung 422px di jendela 360 (halaman meluber 62px, skala tetap
1); inspektor 22rem membuat `@xs` (320px) tidak pernah aktif sehingga enam tema bertumpuk satu
kolom (ambang disetel ulang: dua kolom tetap, tiga di `@md`); dan label "Wajib" `ink-subtle` di atas
`primary-soft` hanya 4,35:1 menurut axe (diganti `ink-muted`). Bug `xl:col-start-3` lama lenyap
dengan sendirinya karena urutan DOM rail → panggung → inspektor.

**Cacat keempat milik undangan, bukan editor.** Begitu panggung menampilkan cover pada skala
100%, sapuan axe di tes Studio Ornamen (desktop) menemukan kicker "Undangan pernikahan" 11px
tebal hanya **3,66:1**: `.iv-kicker` 0,7 dikalikan `opacity-90` di `Cover.vue` = 0,63 di atas
latar Aruna Bloom. Mencabut `opacity-90` saja masih 4,20:1 — fg tema hangat, bukan hitam — jadi
`.iv-kicker` dinaikkan ke 0,8 (±5,6:1). Ini mengubah seluruh kicker undangan sedikit lebih pekat;
suite publik (semua tema, tiga viewport) tetap hijau.

Tes e2e baru `studio editor: rail, inspektor, dan preferensi yang bertahan` hijau di keempat
project. Spesifikasi dan sebelum/sesudah: [Artifact](https://claude.ai/artifact/BrdeiMTnJpTSULnNRC5zMp).

## 2026-09-18: Fase 61 — tiga e2e merah dibereskan, dan cacat keempat yang baru ketahuan

`GET /v1/invitations/:id/guests` berhenti menjawab 500 karena satu baris tamu. `decryptGuestToken()`
dulu dipanggil telanjang di dalam `.map()`, jadi satu ciphertext yang ditulis di bawah `JWT_SECRET`
lain menjatuhkan seluruh halaman 25 baris dan halaman tamu tampil kosong. Sekarang
`tryDecryptGuestToken()` mengembalikan `null`, barisnya tetap terkirim dengan `tokenUnavailable`,
dan `GuestsService` mencatat `warn` per baris supaya kegagalannya tidak jadi senyap.

Degradasinya **diberi penanda, bukan didiamkan**. `buildGuestUrl()` membuang `g` diam-diam kalau
tokennya kosong, jadi tanpa penjagaan ini tombol salin personal akan menghasilkan tautan sapaan
tanpa RSVP sambil mengumumkan "berhasil disalin". Tombolnya kini mati untuk baris yang rusak, dan
`copyLink()` menolak dengan alasan; tombol salin biasa tetap hidup karena tautan sapaan tidak
butuh token.

Datanya: 4 dari 30 baris teracun, semuanya di undangan fixture QA yang ditulis 2026-09-16. Empat
baris itu dihapus, fixture diregenerasi, dan ketiga puluh baris sekarang terbuka dengan secret di
`apps/api/.env`. `pnpm test:integration` 47/47 — kegagalan `old refresh token replay denied` yang
dicatat fase 16 sudah tidak ada.

`expect(heights.Tablet).toBe(heights.Laptop)` dicabut. Ia tidak pernah menangkap `md:` yang kembali
(media query membaca jendela yang sama untuk ketiga panggung), dan merah-hijaunya ternyata ikut isi
fixture: sesudah regenerasi ia identik lagi, 4720 = 4720. Penggantinya mengukur lebar perangkat yang
sama di dua lebar jendela yang menyeberangi 1280, dan dibuktikan lebih kuat lewat mutasi —
`@min-[40rem]:py-5` → `md:py-5` membuatnya merah (8px di ketiga lebar) sementara assertion lama
tetap hijau.

Cacat keempat, milik fase 59, ketemu hanya karena project `mobile` dijalankan: editor meluber 2px
di 360px (`scrollWidth` 362 lawan 360). `grid-cols-[auto_1fr_auto]` di
`dashboard/ornament/SlotSummary.vue` menahan kolom teks di `min-content`; diganti `minmax(0,1fr)`.

Satu tes ternyata lulus di keempat project tanpa sekali pun berjalan: `mengunci pemilih saat add-on
desain belum dibeli` melewati dirinya sendiri kalau `#ornament-locked` tidak ada, padahal pemilik
fixture QA selalu dinaikkan jadi `OPERATOR` sehingga keadaan terkunci tidak pernah bisa terjadi.
`api-smoke.ts` kini menyeed undangan kedua milik akun biasa dan tesnya masuk lewat akun itu;
`test.skip`-nya dicabut, dan ia terbukti merah saat diarahkan ke undangan operator. Gerbang
`ci.yml` dinaikkan 156 → 172 **sesudah** itu, bukan sebelumnya.

Hasil: 1029 tes unit hijau (+4), `lint` dan `typecheck` hijau, `pnpm test:integration` 49/49, dan
**seluruh suite e2e 172 lulus, nol gagal, nol skip** di keempat project.

## 2026-09-11: execution started

Materialized approved plan; current frontend decisions override earlier React choices.

## 2026-09-12: penjaga kontras palet kustom

Palet kustom milik pasangan (fitur premium `design`) sebelumnya tidak divalidasi sama sekali, sehingga
undangan yang tidak terbaca bisa terbit. `apps/web/utils/contrast.ts` menghitung keempat pasangan yang sama
dengan audit tema di DESIGN.md — `fg/bg`, `primary/bg`, `primary` di atas tone `tint`, dan `#FFFDF7` di atas
`primary` — dan panel "Tema & warna" melaporkan rasio tiap pasangan secara langsung saat color picker bergerak.

`repairPalette` mencari nilai terdekat yang lolos dengan menggeser lightness saja: hue dan saturasi pilihan
pasangan dipertahankan, `background` tidak pernah disentuh, dan `primary` dicari sekaligus untuk ketiga
pasangannya karena memperbaikinya satu per satu bisa saling membatalkan. Token yang sudah lolos dikembalikan
persis apa adanya supaya dokumen tidak ditandai berubah tanpa sebab.

Simpan draft sengaja tidak diblokir; publish yang diblokir. Halaman editor juga akhirnya menyetel `<title>`
(satu-satunya halaman web yang tidak, terdeteksi sebagai `document-title` oleh axe).

Diverifikasi di browser: keenam preset lolos (Bloom 15,83 / 5,70 / 5,02 / 6,03), teks `#C9C0B4` di atas latar
Bloom jatuh ke 1,67:1 dan panel berubah ke keadaan peringatan, publish ditolak dengan alasan yang jelas, dan
tombol perbaikan mengembalikan keempatnya ke ambang. `tests/contrast.test.ts` (8 uji) mengunci perilakunya.

## 2026-09-12: rombak ornamen & motion undangan (Fase 0–4)

Owner menilai ornamen undangan "kurang kental, masih garis tipis" dibanding enam referensi
Katsudoto. Audit terukur membenarkannya: ke-53 ornamen dirender pada **0,11–0,60 piksel
tinta** di titik pakainya — di bawah 1px sebuah stroke hanya menjadi abu-abu antialias.
Bukti dan tabelnya di [Artifact Bank Ornamen](https://claude.ai/code/artifact/37832f05-582b-4b52-89ed-408d6b1db071).

Bank ornamen 44 → **102 komponen**: 53 digambar ulang bermassa (`fill="currentColor"` +
stroke tebal, dua bidang nilai), 30 `layer` komposisi tepi, 6 segel, 13 venue/attire.
Keputusan yang mengikat: tetap `currentColor` sehingga ornamen ikut palet pasangan, dan
aturan DESIGN.md "tidak ada PNG untuk ornamen" **tetap berlaku** — tidak ada aset raster
yang dibeli. `OrnamentField` menggantikan `frame` tunggal di tengah dengan 2–6 keping
berjangkar tepi.

`Renderer.vue` 800 → 402 baris, dipecah jadi 13 komponen di `components/invitation/sections/`.
Urutan section mengikuti `document.sections`, jadi tombol naik/turun di editor akhirnya
berpengaruh. Field baru masuk ke `section.data`, **bukan** ke `tokens` — `tests/contracts.test.ts`
membandingkan `document.tokens` persis dengan `template.tokens`, dan `hasDesignChange()`
menggerbangi tiap perubahan `tokens` di balik entitlement `design`.

`giftAccountLimit` 2 → 8; label `MEMPELAI PRIA/WANITA` tidak dirender lagi, tapi field `owner`
tetap ada supaya dokumen lama tidak rusak.

**Temuan tak terduga: seluruh motion undangan sudah lama mati.** `once: true` membuat
ScrollTrigger mem-`kill()` dirinya begitu menyala, jadi elemen yang sudah di viewport saat
mount menghapus diri dari daftar trigger global tepat ketika trigger berikutnya menyusuri
daftar itu; `ScrollTrigger.init()` membaca `_triggers[i].end` tanpa penjaga null, dan satu
lubang membatalkan **seluruh** motion halaman. Hanya muncul pada navigasi klien ("Buka demo"
dari landing), tidak pernah saat undangan dibuka langsung — itu sebabnya lolos lama. Diganti
`toggleActions: 'play none none none'`.

Dua jebakan yang ikut lahir: `drawSvg` dulu memakai tiap `<path>` sebagai trigger sendiri
(kotak sebuah path bisa nol, dan trigger ber-`end` nol memicu `refresh()` rekursif) —
sekarang dikelompokkan per `<svg>` pemiliknya; dan komponen yang hanya disebut lewat nama
string runtime tidak pernah ikut ter-bundle, karena auto-import Nuxt memindai tag di
template saat compile. Ornamen karena itu selalu dirender lewat `<OrnamentGlyph :glyph="id" />`.

## 2026-09-13: ladang ornamen proporsional terhadap wadahnya (Fase 05)

Ukuran keping `OrnamentField` adalah piksel tetap yang ditala untuk section selebar desktop,
lalu dijepit `min(…px, 62vw)`. Di ponsel keping itu membesar **relatif terhadap bidangnya**
alih-alih mengecil: di `/i/demo` pada 375px `bloom` memenuhi 100% lebar section dan `cascade`
62%, sementara di 1440px keduanya 32% dan 17%. Yang dilihat tamu ponsel bukan rumpun bunga
melainkan bagian tengah satu keping yang dibesarkan tiga kali.

Ladang sekarang mengukur wadahnya sendiri (`container-type: inline-size`) dan tiap keping
berlebar `clamp(size × 0.44, size/1400 × 100cqw, size × 1.25)`. Batas bawah itu ada supaya
ornamen tidak kembali jadi hantu seperti sebelum Fase 1 — proporsi murni akan mengecilkan
`cascade` ke 67px di section 375px. Titik peralihannya 616px: ponsel dan kartu memakai batas
bawah, tablet ke atas murni proporsional.

Bleed diturunkan dari lebar yang sudah di-clamp (`calc(var(--iv-piece) * -0.14)`), bukan
dihitung terpisah — kalau keduanya dihitung sendiri-sendiri, bleed tidak lagi cocok begitu
clamp menggigit.

`Themes.vue` tidak lagi mengoper `:scale="0.46"`. Pengali itu benar tapi salah tempat: yang
perlu tahu lebar wadah adalah ladangnya, bukan tiap pemanggil. Ia juga jadi uji silang yang
bagus — rumus baru menghasilkan 119px untuk `cluster` di kartu 302px, sementara pengali
hardcoded menghasilkan 124px. Terukur setelah perbaikan: 375px → `bloom` 54%, `cascade` 29%,
`cluster` 28%; 1440px tidak berubah (`crown` 34%, `cluster` 19%, `swag` 43%).

## 2026-09-13: audit dasbor & editor (Fase 10)

Pass UI/UX pertama yang benar-benar masuk ke dasbor. Sebelumnya tidak pernah — panel browser
sesi ini menolak origin pasangan, jadi kelima layar disisir lewat Playwright pada 375px dan
1440px, dengan axe, luapan mendatar, dan galat konsol diukur sekaligus.

**Empat halaman berjalan tanpa `<title>` sama sekali** — ringkasan, kelola tamu, RSVP, dan
pesanan. axe menandainya `document-title` (serious), dan di tab tamu yang terbaca cuma URL
mentah. Catatan 2026-09-12 yang menyebut editor sebagai "satu-satunya halaman web yang tidak
menyetel title" ternyata keliru: empat halaman dasbor juga tidak. Judulnya reaktif, karena
undangannya baru dimuat setelah mount.

**`<dl>` ringkasan memuat `<p>` di dalam pembungkus `dt`/`dd`** — `definition-list` (serious).
Keterangan di bawah tiap angka sekarang `dd` kedua; satu istilah memang boleh punya lebih dari
satu deskripsi, dan pembungkusnya tidak boleh memuat apa pun selain keduanya.

**Pratinjau draft dikunci `max-h-[36rem]`** — 576px, bahkan di layar 1000px. Panel yang justru
jadi alasan pasangan membuka editor menampilkan 40% lebih sedikit dari yang muat. Sekarang
`xl:max-h-[calc(100svh-9rem)]`. Ditambah bayangan tipis di tepi bawah: panel ini memotong
isinya di tengah huruf, dan scrollbar overlay macOS tidak terlihat sampai disentuh, jadi
potongannya terbaca sebagai render rusak alih-alih "masih ada lagi".

**Sebab ketiganya lolos: axe tidak pernah menyapu dasbor.** Suite hanya menyapu landing, auth,
dan keenam tema undangan. `dashboard.spec.ts` sekarang menyapu keenam layar dan menuntut tiap
halaman punya `<title>` — 72 → 75 tes.

Dua temuan yang **tidak** jadi perbaikan, dicatat supaya tidak diaudit ulang: pelanggaran
`color-contrast` yang muncul di semua layar adalah label badge Nuxt devtools (9,6px `#888`
di atas putih), bukan produk — `public.spec.ts` sudah lama mengecualikannya. Dan sasaran sentuh
16×16 di editor adalah `<input type=checkbox>` yang dibungkus `<label class="min-h-11">`:
yang bisa diketuk tamu adalah labelnya, 44px, jadi ambangnya sudah terpenuhi.

---

## 2026-09-14: lebar kerja editor (Fase 11)

Berangkat dari potret yang dipakai berjualan di landing, bukan dari keluhan di editor. Di
`editor-desktop.webp` — viewport 1440 — kolom **Pengaturan bagian** adalah kolom tersempit dari
tiga yang ada, dan tombol urutan di kolom kiri menempel ke kolom tengah. Landing menjual potret
itu apa adanya, jadi cacatnya ikut dijual.

**Akarnya `max-w-5xl` di `DashboardShell`.** Di layar 1440 area utama punya 1184px; yang dipakai
1024px, dikurangi `lg:px-10` tersisa 944px untuk tiga kolom. Jalur `[15rem_1fr_22rem]` memakan
240 + 352 + 40 gap = 632px, jadi `1fr` — permukaan kerja utama pasangan — tinggal **312px**,
lebih sempit daripada pratinjau di sebelahnya.

Lebar sekarang dua tingkat lewat prop `width`: `reading` (1024px) untuk empat layar yang dibaca,
`wide` (1536px) hanya untuk editor. Satu angka untuk semuanya salah di salah satu sisi — 1024
mencekik editor, 1536 membuat tabel tamu jadi baris sepanjang layar.

Jalur terukur sesudahnya (dibaca dari `gridTemplateColumns`, bukan ditaksir dari tangkapan layar):

| Viewport | Daftar | Pengaturan | Pratinjau |
|---|---|---|---|
| 1024 | 232px | 436px | — (di balik tab) |
| 1280 | 232px | 368px | 304px |
| 1440 | 232px | **528px** (dari 312px) | 304px |
| 1920 | 232px | 880px | 304px |

**`sm:` di dalam kolom selebar 312px selalu benar dan selalu salah.** Panel pengaturan memakai
`sm:grid-cols-2` dan `sm:grid-cols-3`; keduanya benar pada viewport 1440 tanpa peduli kolomnya
312px. Hasilnya kartu tema selebar 80px dan `input[type=date]` selebar 128px. Panel sekarang
`@container`, dan setiap varian di dalamnya bertanya pada wadahnya.

Ambangnya `@xs` (320px), bukan `@sm` (384px) — dan itu ditemukan dengan mengukur, bukan dengan
menghitung di atas kertas. Jalur pratinjau `minmax(16rem,19rem)` mengambil maksimumnya lebih
dulu, jadi kolom pengaturan **368px di 1280 tapi 436px di 1024**: dengan `@sm`, pasangan yang
melebarkan jendelanya dari 1024 ke 1280 akan melihat kolomnya mundur jadi satu-up. Perkiraan
awal di rencana (432px di 1280) meleset 64px justru karena asumsi itu.

**Tahap dua kolom baru untuk 1024–1280.** Sebelumnya lompatannya langsung dari tata letak ponsel
ke tiga kolom di `xl`, jadi laptop 13" melihat satu panel bertab padahal ruangnya cukup untuk
dua. Di `lg` daftar bagian selalu terlihat dan kolom kedua bergantian pengaturan/pratinjau
mengikuti tab yang sudah ada. `xl:col-start-3` pada pratinjau wajib — tanpa itu `lg:col-start-2`
ikut berlaku di `xl` dan pratinjau mendarat menindih pengaturan.

**Judul bagian `text-h2` → `text-h3`.** `--text-h2` = 40px di ≥1440 dan skalanya viewport,
sementara wadahnya bukan; di kolom 312px ia berebut dengan `<h1>` nama undangan (54px). Tetap
`<h2>`, hanya kelas ukurannya — tingkat heading dan urutan aksesibilitas tidak berubah.

**Baris daftar bagian: `flex` → `grid grid-cols-[minmax(0,1fr)_auto]`.** Yang lama muat karena
kebetulan — centang 36px + dua panah 28px + jarak dan padding menyisakan ~94px teks di jalur
240px, dan tidak ada yang menghalangi kontrolnya terdorong keluar jalur. Sekarang kolom label
yang menyusut, jaminan struktural: `rowOverflow` terukur **0px di 1024 / 1280 / 1440 / 1920**.

Dan labelnya membungkus, bukan dipotong. `truncate` memotong tiga dari empat belas nama —
"Video & live str…", "Cover pemb…", "Hitung mun…" — persis nama bagian yang sedang dicari.
Dua baris pada `leading-snug` masih muat di dalam tinggi baris yang sudah ada: keempat belas
baris terukur **46px seragam**, jadi nama utuh tidak menukar apa pun. Target sentuh 44px tidak
disentuh.

Gerbang: `typecheck` · `lint` · 65 tes unit · **84 tes e2e di 360/768/1440** hijau, axe 0
violation di keenam layar dasbor. Potret landing diambil ulang (`pnpm capture:dashboard`).

---

## 2026-09-14: pratinjau perangkat & undangan tanpa breakpoint viewport (Fase 12)

Lahir dari meninjau hasil Fase 11 di layar, bukan dari rencana: kolomnya masih terasa rapat,
dan pertanyaan berikutnya datang sendiri — "kalau mau lihat dari perangkat lain bagaimana?"

**Pertanyaan yang sebenarnya dipegang pasangan bukan "apa yang saya lihat", melainkan "apa yang
dilihat tamu saya".** Tamu hampir selalu membuka dari ponsel. Sampai sekarang rel pratinjau
punya satu lebar — lebar rel itu sendiri, ~304px — yang kebetulan mirip ponsel tapi tidak pernah
dinyatakan, tidak bisa diganti, dan tidak memberi tahu pasangan sedang melihat lebar berapa.

Rel sekarang punya pemilih **Ponsel 390 · Tablet 834 · Laptop 1280**, bawaannya Ponsel — lebar
yang dipakai tamu, bukan lebar yang kebetulan tersedia. Lebar sungguhannya ditulis ("Selebar
390px") berikut persen skalanya ("diperkecil 82%"); tanpa angka itu pratinjau yang diperkecil
jadi misteri, dan pasangan tidak bisa membedakan huruf yang memang kecil di ponsel dari huruf
yang cuma kelihatan kecil di sini. Skala tidak pernah melebihi 1 — render yang diperbesar hanya
kabur dan berbohong soal ukuran huruf.

**Dirender di lebarnya lalu diperkecil, bukan diperkecil lalu dirender** — dan itu hanya jujur
kalau undangannya mengukur dirinya sendiri. Undangan sudah 99,5% begitu (`cqw` di ladang
ornamen, `clamp()` di tipografi); yang tersisa lima utilitas `md:`/`sm:` di cover, section, dan
hitung mundur. Lima itu cukup untuk merusak seluruh fitur: di editor pada layar 1440, `md:`
selalu benar, jadi pratinjau "Ponsel" akan menampilkan cover dua kolom yang tidak akan pernah
dilihat tamu di ponselnya. `.iv-root` sekarang `container-type: inline-size` dan kelimanya jadi
`@min-[40rem]:` / `@min-[48rem]:` — **ambang 640/768px persis seperti sebelumnya**. Terukur di
halaman publik: `.iv-root` selebar viewport di 360 / 767 / 768 / 1440, jadi yang dilihat tamu
tidak bergeser sedikit pun.

Buktinya terukur, bukan diklaim: render 390px setinggi **4444px**, render 834px dan 1280px
setinggi **4233px**. Selisih 211px itu adalah cover yang menumpuk di ponsel dan membelah di
tablet. Tes e2e baru menjaga persis relasi itu — kalau seseorang mengembalikan `@min-[48rem]:`
jadi `md:`, kedua tinggi jadi sama dan tesnya merah.

**Satu bug ketemu saat mengukur, bukan saat melihat.** Skala mula-mula dihitung dari lebar rel,
sementara yang menampung render adalah viewport yang menggulung di dalamnya — lebih sempit
selebar scrollbar. Render Tablet dan Laptop jadi persis selebar rel lalu tergunting ~15px di
kanan; tidak kentara di tangkapan layar, jelas di `scrollWidth > clientWidth`. Sekarang diukur
pada viewport itu sendiri, ditambah `scrollbar-gutter: stable` supaya lebarnya tidak lagi
berubah saat isinya cukup pendek untuk tidak menggulung — tanpa itu tinggi mengubah lebar,
lebar mengubah skala, dan skala mengubah tinggi lagi.

Kerapatan: selokan antar kolom **20 → 32px** (`lg:gap-x-8`), sesuai skala gutter di `DESIGN.md`.
Tiga panel tanpa pembatas butuh selokan, bukan sekadar jarak. Jalur terukur di 1440 jadi
`232px · 488px · 320px`. Ambang tiga-up kartu tema turun `@lg` → `@md` (448px) supaya ia tidak
ikut hilang setiap kali selokan atau rel bergeser beberapa piksel — ambang jangan diikat ke
aritmetika jalur yang masih akan berubah.

Gerbang: `typecheck` · `lint` · 65 tes unit · **87 tes e2e di 360/768/1440** hijau, axe 0
violation di keenam layar dasbor. Potret landing diambil ulang.

---

## 2026-09-15 — Autosave dicabut, popup global, dan WebKit 390 (fase 18)

**Autosave dihapus, bukan diperbaiki.** Yang tercatat di fase 16 sebagai "jawaban simpan yang
melayang menimpa dokumen lokal" ternyata bukan penimpaan sesekali. `document.value =
result.document` mengubah identitas ref, memicu `watch(document, …, { deep: true })`, dan
penjaganya `saving.value` selalu lolos karena `finally` menyetel `saving = false` sebelum antrean
watcher Vue di-flush. Terukur sebelum disentuh: satu suntingan di satu kolom → **13 revisi dalam
12 detik**, lalu **11 `PUT …/draft` tiap 10 detik diam**, selama editornya terbuka. Sesudah:
**0 saat diam, 1 per penekanan tombol.**

Jawaban servernya nol informasi — `saveDraft` mengembalikan `{ document, revision + 1 }`, gema
dari dokumen yang baru dikirim dan sudah di-parse klien dengan skema yang sama.

Penggantinya tiga hal, bukan satu:

1. **Penanda kotor tanpa ras.** Cuplikan JSON diambil sebelum permintaan berangkat dan dipasang
   setelah berhasil, jadi suntingan yang datang selagi permintaan terbang tetap terhitung belum
   tersimpan. Cuplikan awal dipasang di `nextTick` yang sama dengan `watchReady` — lebih dini
   dari itu membuat editor lahir kotor, karena migrasi data hadiah menulis ulang `section.data`
   saat sectionnya pertama dipilih.
2. **Keadaan yang tertulis**, bukan disiratkan: `#editor-save-state` menyebutkan "Ada perubahan
   yang belum tersimpan" / "Semua perubahan tersimpan", dan tombol simpan mati saat bersih.
3. **Penjaga saat halaman ditinggalkan**: `onBeforeRouteLeave` memunculkan popup tiga pilihan
   (Simpan perubahan / Tinggalkan halaman / Kembali menyunting; Escape = kembali), ditambah
   `beforeunload` untuk tab yang benar-benar ditutup.

**Popup jadi fasilitas global.** `stores/popup.ts` (antrean satu-dalam-satu-waktu, jawaban
dikunci `key` supaya Escape yang tertangkap dua kali tidak membuang popup berikutnya sekalian),
`components/atomic/Popup.vue` di `app.vue` — bukan di layout, karena editor memakai
`layout: false` — dan `composables/usePopup.ts` sebagai satu-satunya permukaan pemakai.
Fondasinya `Dialog*` reka-ui seperti dua dialog lain di repo; fokus awal dipaksa ke aksi pertama
karena bawaannya memfokuskan tombol silang, yang membuat Enter membatalkan pertanyaannya.
Pemakai kedua: `reset()` berhenti memakai `window.confirm`.

**Pelepasan aset mengikuti simpan.** Dulu berkas dihapus begitu URL-nya lepas dari dokumen di
layar dan draf menyusul 900ms kemudian. Tanpa autosave, urutan itu meninggalkan draf tersimpan
yang menunjuk aset mati. Sekarang URL yang dihapus mengantre dan dilepas sesudah simpan berhasil,
diuji terhadap dokumen yang benar-benar tersimpan (`utils/asset-release.ts`). Aset undangan QA
**7 sebelum, 7 sesudah satu putaran suite penuh** (empat siklus unggah–hapus); sebelumnya
merangkak sampai 15 dan `Dropzone` memasang `blocked`.

**`device preview` di WebKit 390 bukan klik yang menggantung.** `document.fonts.ready` tidak
pernah resolve di sana: `@nuxt/fonts` mendeklarasikan tiap keluarga dua kali (set ber-
`unicode-range` + rentang penuh, 12 blok per weight Cormorant, di bundel produksi maupun dev),
WebKit membatalkan duplikat yang kalah dan mencatatnya `error`, dan satu face `error` membekukan
`FontFaceSet.status` di `loading`. 0–1ms di Chromium 390 dan WebKit 1440. Karena penantian itu
memakan seluruh jatah 30 detik, yang dilaporkan gagal adalah langkah mana pun yang kebetulan
berjalan saat tenggatnya lewat. Tidak ada yang rusak di layar — diperiksa:
`document.fonts.check('600 24px "Cormorant Garamond"')` `true` di ketiga kombinasi, dan halaman
undangan tamu bersih sama sekali. Tesnya menyebut huruf yang dipakai elemen yang diukur dan
memuatnya (43ms), bukan menunggu himpunan 136 face. **30s timeout → 2,3s hijau.**

**Bug produk yang ditemukan project `safari`:** `canvas.toBlob(…, 'image/webp')` boleh
mengembalikan PNG, dan `normalizePhoto` tetap menamainya `.webp` dan melabelinya `image/webp` —
jadi pemeriksaan magic-byte di server menolak **setiap** unggahan foto dari browser tanpa encoder
WebP ("Isi berkas tidak cocok dengan jenis media yang diklaim"). Sekarang nama dan MIME dibaca
dari `blob.type`; PNG yang sudah diperkecil tetap dikirim, dan jenis yang tidak dikenal jatuh ke
berkas asli.

Gerbang: `typecheck` · `lint` · **189 tes unit** · **148 e2e (37 × 4 project)** hijau, termasuk
WebKit 390 yang belum pernah hijau sama sekali. Axe 0 violation di keenam layar dasbor.

## 2026-09-18 — Fase 59: Studio Ornamen, huruf paragraf, dan latar bagian

Editor mendapat pemilih layar penuh untuk **seluruh bank ornamen**, bukan lagi 59 glyph dari 328.
Permintaan pemilik: "seperti Canva… berikan akses ke semua ornamen ya atau glyph atau background."

**Yang dibuka.** Sembilan slot skalar (dulu empat) plus lima jangkar ladang; enam ubin latar di
`public/textures/` yang selama ini hanya satu tersambung; dan huruf paragraf, yang sebelumnya
dipatok tema. `motif` **sengaja tidak** ditawarkan — ia tidak pernah dirender di undangan, dan
kontrol yang tidak mengubah apa pun terbaca sebagai aplikasi yang rusak.

**Kurasi tidak dicabut, ia pindah tempat.** Tab "Disarankan" tetap kolam `themeVariants` dengan
syarat gerbang yang sama; tab "Semua" membuka bank penuh dengan lencana ber-**kalimat** (ikut ke
`aria-label`, tidak pernah warna saja). `ornament-metrics.ts` hasil generate menyuplai angkanya,
dan satu tes jembatan menuntut tiap anggota kolam lolos `fitOf()` juga — dua mesin, satu jawaban.

**Temuan yang mengubah rencananya sendiri: 65 aset referensi belum pernah diunduh satu tamu pun.**
Nol rujukan di `theme.ts` dan `ornament-variants.ts`. Fase ini yang pertama membuatnya bisa terbit,
jadi 24,11 MB berhenti jadi biaya repo dan mulai jadi biaya kuota tamu. Ditambahkan varian `web`
960px (1,8 MB → 313 KB, total 24,1 MB → 3,4 MB), ubin 240px untuk pemilih (789 KB), dimensi
intrinsik di `ReferenceAsset.vue` yang selama ini tidak punya `width`/`height`, dan penolakan aset
referensi di slot `layers` — lima keping 6,43 MB yang diulang 2–6 kali per section.

**Gerbang entitlement ternyata sudah rapuh sebelum disentuh.** `hasDesignChange()` membandingkan
`JSON.stringify(tokens)`, peka urutan key. Tiga key opsional baru membuat false positive berhenti
jadi teori — gejalanya simpan ditolak untuk perubahan yang tidak pernah dibuat pasangan. Diganti
`designFingerprint()` dengan tokens tersortir dan proyeksi eksplisit. `ornamentOverrides` ikut
digerbangi `design` atas keputusan pemilik; `ornamentIntensity` sengaja tetap gratis.

**Regresi yang disengaja dan harus disebut:** penukaran ornamen yang dulu gratis kini butuh add-on
`design`. Nilai yang sudah tersimpan tidak hilang — gerbang membandingkan lama terhadap baru — tapi
suntingan berikutnya berbayar. Dan penukaran kini **bertahan** saat tema diganti (penyaringnya
berbasis kategori, bukan kolam per tema), jadi Studio wajib membawa "Kembalikan ke bawaan tema".

**Bug yang ditemukan dengan melihat layar, bukan dari gerbang:** Studio versi pertama mendarat di
cabang `v-else` milik keadaan memuat. Markup benar, typecheck hijau, lint bersih, dan tombol
"Ganti" tidak melakukan apa pun — cabang itu mati begitu editor selesai memuat.

Verifikasi: 1024 tes unit, e2e Studio hijau di mobile/tablet/desktop termasuk **axe pada dialog
yang sedang terbuka** (sapuan halaman tidak pernah melihatnya). Diperiksa di 375 dan 1440,
`scrollWidth <= innerWidth` keduanya.

## 2026-09-19 — Fase 66: ikon acara universal, medali di atas judul

- `sections/Events.vue`: ikon akad `Church` → `HeartHandshake`; resepsi tetap `PartyPopper`.
  Regex pemilih (`/akad|pemberkatan|nikah|misa/`) tidak berubah.
- Ikon keluar dari baris judul (22px, `opacity-70`, sejajar teks) menjadi medali bulat
  `.iv-event-badge` 3,5rem di atas judul: ikon 28px stroke 2, latar
  `color-mix(var(--iv-primary) 12%)`, warna primary. Tanpa override tone `ink`/`primary`:
  section acara selalu `tone="tint"`, override itu sempat ditulis lalu dibuang sebagai kode mati.
- Judul kehilangan `flex`; jadi `text-center` biasa. Tidak ada tes yang menyentuh ikon ini.

