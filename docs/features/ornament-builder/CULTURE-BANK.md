# Dasar bentuk & konteks budaya bank ornamen

Ditulis 2026-09-18 (fase 40), **sebelum satu ornamen pun digubah ulang**.

Berkas ini ada karena delapan keluarga motif dipakai aplikasi tanpa dasar dokumentasi apa
pun. Yang ada hanya komentar JSDoc satu baris per komponen, tidak bersumber — dan dua di
antaranya **bertentangan dengan satu-satunya sumber yang ada di repo**.

Skill `aruna-ornament-builder` melarang mengarang makna budaya. Jadi aturannya di sini:

- Tiap klaim membawa **URL + tanggal periksa**.
- Yang dipisah tegas: **aturan bentuk** (yang kita gambar) dari **makna** (yang tidak kita
  klaim di salinan pemasaran tanpa mengutip sumbernya).
- Kalau sebuah motif punya **pembatasan pemakaian**, konteksnya dicatat sebelum dipilih —
  bukan sesudah.
- Sumber di bawah sebagian besar **sekunder** (berita, ensiklopedia, jurnal daring). Cukup
  untuk "bentuknya begini dan namanya ini". **Tidak cukup** untuk klaim sejarah, varian
  daerah, atau makna spiritual.

Semua tanggal periksa: **2026-09-18**.

---

## 1. Kawung — dan status larangannya

**Sumber utama:** Keraton Yogyakarta, *"Motif Batik Larangan Keraton Yogyakarta"*,
<https://www.kratonjogja.id/kagungan-dalem/12-motif-batik-larangan-keraton-yogyakarta/>

Ini sumber **primer institusional** — situs resmi keraton — dan karena itu yang paling
berbobot di seluruh berkas ini.

**Yang ditopang sumber:**

- Kawung termasuk daftar motif larangan, bersama *Parang Rusak Barong, Parang Rusak Gendreh,
  Parang Klithik, Semen Gedhe Sawat Gurdha, Semen Gedhe Sawat Lar, Udan Liris, Rujak Senthe,
  Parang-parangan, Cemukiran,* dan *Huk*.
- Dasar aturannya *Pranatan Dalem Bab Jenenge Panganggo Keprabon Ing Keraton Nagari
  Yogyakarta* (1927), masa Sri Sultan Hamengku Buwono VIII.
- Kawung boleh dipakai para **Sentana Dalem**.
- Parang adalah motif **pertama** yang dicanangkan sebagai pola larangan, tahun **1785** oleh
  Sri Sultan Hamengku Buwono I.
- **Dan ini kalimat yang menentukan:** aturan itu *"masih berlaku hingga sekarang, namun
  hanya diterapkan secara terbatas di lingkungan Keraton Yogyakarta, tidak untuk masyarakat
  umum di luar keraton."*

**Aturan bentuk** (sumber sekunder, <https://ambarrukmo.com/batik-kawung/>): empat bulatan
lonjong tersusun simetris mengelilingi satu titik pusat, berulang sebagai rapport. Diilhami
buah kawung (aren/kolang-kaling) yang dibelah empat.

**Keputusan.** Kawung **boleh dipakai sebagai bentuk**, karena sumber primernya sendiri
menyatakan pembatasannya tidak berlaku untuk masyarakat umum di luar keraton. Yang **tidak
boleh**: mengaitkannya dengan keraton, kebangsawanan, atau kemewahan di salinan pemasaran —
justru karena kaitan itu nyata dan berpembatasan.

**Parang tetap tidak dipakai.** Ia motif larangan pertama dan yang paling lekat ke keraton,
dan ia memang belum pernah ada di `ornamentBank`. Tidak ada alasan produk untuk menambahkannya.

**Klaim lama yang dihapus:** `MotifKawung.vue` menyebut *"motif batik tertua"*. Tidak ada
sumber untuk superlatif itu di mana pun yang diperiksa.

---

## 2. Poleng — dan kenapa ia perlu perlakuan berbeda

**Sumber:** detikBali, *"Saput Poleng (Kain Poleng) Bali: Sejarah dan Fungsinya"*,
<https://www.detik.com/bali/budaya/d-6418416/saput-poleng-kain-poleng-bali-sejarah-dan-fungsinya>

**Yang ditopang sumber:**

- Tiga varian, dan warnanya yang membedakan: **rwa bhineda** (hitam–putih), **sudhamala**
  (putih–abu–hitam), **tridatu** (putih–hitam–merah).
- Dipakai **melilit** pohon tertentu, kul-kul, **pelinggih**, dan arca dwarapala; dipakai
  pecalang dan dalam kegiatan keagamaan Hindu.
- Pelinggih yang dibalut saput poleng menandakan tempat itu *"memiliki energi besar yang
  harus dijaga keseimbangannya"*.
- Rwa bhineda: konsep keseimbangan dua hal yang tak terpisahkan — baik-buruk, siang-malam.

**Ini bukan motif hias.** Ia kain dengan fungsi penanda dan pelindung pada objek suci. Papan
catur hitam-putihnya sendiri adalah geometri biasa; yang membawa makna adalah **kain yang
dililitkan pada pelinggih**.

**Keputusan yang diusulkan** (butuh persetujuan pemilik, karena menyentuh tema `aruna-bentar`
yang sudah terbit):

- Papan catur hitam-putih **tetap boleh** dipakai sebagai bidang geometris.
- **Nama `poleng` dilepas** dari id ornamen, dan tidak ada klaim rwa bhineda, pelindung, atau
  keseimbangan di salinan mana pun. Menamainya poleng sambil memakainya sebagai hiasan
  undangan adalah tempat klaimnya lahir.
- Alternatifnya — mempertahankan nama dan mencantumkan maknanya dengan kutipan bersumber —
  sengaja **tidak** diusulkan: undangan pernikahan bukan tempat menjelaskan fungsi ritual
  sebuah kain, dan mengutipnya setengah justru lebih buruk daripada tidak menyebutnya.

**Klaim lama yang dihapus:** `MotifPoleng.vue` menyebut *"kain yang membalut pelinggih dan
pohon di Bali"* — ini justru **benar** menurut sumber, dan itulah masalahnya: ornamen hias
kita bukan kain itu.

---

## 3. Candi bentar

**Sumber:** Badan Penghubung Provinsi Bali, *"Candi Bentar dan Kori Agung"*,
<https://perwakilan.baliprov.go.id/anjungan-daerah-bali-tmii/bangunan-anjungan-bali/depan/> ·
tirto.id, *"Candi Bentar, Simbolisme Teologis dan Sekat Kekuasaan"*,
<https://tirto.id/candi-bentar-simbolisme-teologis-dan-sekat-kekuasaan-hms2>

**Aturan bentuk yang ditopang sumber:**

- Dua bangunan **serupa dan sebangun, simetri cermin**, membatasi sisi kiri dan kanan pintu.
- **Tidak punya atap penghubung di bagian atas.** Kedua sisinya **terpisah sempurna**, dan
  hanya terhubung di bagian bawah oleh anak tangga.
- Karena itu ia disebut "gerbang terbelah" — seolah satu candi dibelah dua secara sempurna.
- **Berbeda dari kori agung / paduraksa**, yang punya atap dan pintu.
- Fungsi: gerbang ke **Nista Mandala**, zona terluar pura.
- Asal: Majapahit, Jawa Timur abad 14–15 — **bukan tradisi Sunda**.

Komentar `FrameBentar.vue` yang sudah ada (*"celah di puncak itu bukan kekurangan bentuk —
justru itu yang membuatnya bentar, bukan kori"*) ternyata **benar**, dan kini bersumber.
Ia dipertahankan, ditambah rujukannya.

**Konsekuensi gambar:** celah puncak wajib **penuh** — tidak boleh ada lengkung, pita, atau
ornamen yang menyeberang di atasnya. Begitu ada yang menyeberang, ia berhenti jadi bentar.

---

## 4. Gonjong — dan jumlahnya yang ternyata bermakna

**Sumber:** detikProperti, *"Mengenal Rumah Gadang: Bentuk, Jenis, Fungsi, dan Keunikannya"*,
<https://www.detik.com/properti/arsitektur/d-7439378/mengenal-rumah-gadang-bentuk-jenis-fungsi-dan-keunikannya>

**Yang ditopang sumber:**

- Bentuk menyerupai tanduk kerbau, **jumlah lengkung empat atau enam**, dengan satu lengkungan
  ke arah depan rumah.
- **Jumlah gonjong menandai kedudukan sosial pemiliknya:** dua = rumah warga biasa; **empat =
  pemilik seorang Datuak** (penghulu kaum); **enam = koordinator para datuak**, pemimpin adat
  tertinggi di nagari.
- Kaitan ke Tambo Alam Minangkabau (kemenangan adu kerbau) disebut sumber sebagai
  *"sering dihubungkan"* — **bukan fakta tunggal**; sumber yang sama menyebut gonjong juga
  dibaca sebagai pucuk rebung, kapal, dan bukit. Ketidakpastian ini dicatat, bukan dihapus.

**Koreksi langsung ke ornamen yang ada.** `FrameGonjong.vue` menggambar **tiga puncak**. Tiga
tidak ada dalam himpunan yang terdokumentasi (2/4/6), dan karena jumlahnya menandai kedudukan,
menggambar tiga bukan sekadar tidak akurat — ia menyatakan sesuatu yang tidak ada. **Digubah
jadi empat**, jumlah paling lazim dan netral untuk rumah bergonjong.

---

## 5. Pucuak rabuang

**Sumber:** RRI, *"Motif Minang Pucuk Rabuang: Makna Filosofis di Balik Karya Seni"*,
<https://rri.co.id/hiburan/1160856/motif-minang-pucuk-rabuang-makna-filosofis-di-balik-karya-seni>

**Yang ditopang sumber:**

- Diilhami rebung (tunas bambu); pepatahnya *"nan bak pucuak rabuang, ketek baguno gadang
  tapakai"*.
- **Aturan penempatan, dan ini yang paling berguna:** pada rumah gadang, ukiran pucuak rabuang
  *"biasanya mengisi bidang-bidang kecil, diletakkan di atas ukiran besar, pada les plank dan
  bingkai ukiran"*.

**Konsekuensi gambar:** ia **ornamen pengisi bidang kecil di atas ornamen besar**, bukan
ornamen utama. Memakainya sebagai sudut tunggal berukuran besar — seperti sekarang — memakai
motifnya di luar perannya. Ia dipindahkan jadi isen tepi/bingkai.

**Klaim lama yang diperbaiki:** `CornerPucuakRabuang.vue` menyebut *"lambang tumbuh yang
berguna sejak muda"*. Itu parafrase pepatahnya dan **kini bersumber** — tapi ditulis ulang
mengutip pepatahnya, bukan menafsirkannya.

---

## 6. Songket

**Sumber:** Gorga: Jurnal Seni Rupa (UNIMED), *"Desain Motif Tenun Songket Minangkabau"*,
<https://jurnal.unimed.ac.id/2012/index.php/gorga/article/view/25928>

**Yang ditopang sumber:**

- Teknik: **pakan tambahan** (supplementary weft), benang emas disisipkan dengan perhitungan.
- Dasar tenunnya **tenun polos/datar**.
- Motifnya bernama dan banyak: *pucuak rabuang, saik kalamai, buah palo, balah kacang,
  salapah, api, tirai, biku, itiak pulang patang, anyam, bada mudiak, saluak laka, cukia
  baserak, sirangkak.*
- *Saluak laka* = anyaman rotan yang sangat kuat, melambangkan eratnya sistem kekerabatan.

**Konsekuensi gambar.** "Songket = deret belah ketupat" adalah penyederhanaan yang terlalu
jauh — dan itulah yang sekarang digambar. Yang benar: **pita bermotif bernama yang disusun
berjalur**, di atas dasar tenun polos. Ornamen songket digubah jadi jalur berisi blok motif
yang berbeda, bukan satu ketupat diulang.

---

## 7. Mega mendung

**Sumber:** Kompas Travel, *"Makna Motif Batik Mega Mendung Khas Cirebon"*,
<https://travel.kompas.com/read/2022/05/11/120850227/makna-motif-batik-mega-mendung-khas-cirebon>

**Yang ditopang sumber:**

- **Tujuh gradasi** warna pada satu awan, sejalan dengan tujuh lapis langit.
- Warisan pertukaran budaya Cirebon–Tiongkok pada masa Sunan Gunung Jati.
- Warna asli Cirebon: dasar merah, awan biru bergradasi.

**Konsekuensi gambar.** Bank ornamen satu warna, jadi tujuh gradasi **warna** tidak bisa
dipindahkan apa adanya. Yang dipindahkan adalah **strukturnya**: awan sebagai **garis luar
berlapis-lapis yang bersarang**, bukan satu kait tunggal seperti sekarang. Gradasi warna
diterjemahkan jadi gradasi **bidang nilai** — dan karena bank dibatasi dua tingkat opacity,
jumlah lapisnya yang membawa kedalaman, bukan jumlah nilainya. Ini **terjemahan, dan dicatat
sebagai terjemahan** — bukan klaim bahwa tujuh lapis nilai kita sama dengan tujuh gradasi
Cirebon.

---

## 8. Wadasan

**Sumber:** Kompas Lifestyle, *"Sering Dikira Sama, Ini Perbedaan Batik Megamendung dan
Wadasan"*,
<https://lifestyle.kompas.com/read/2024/10/26/201500920/sering-dikira-sama-ini-perbedaan-batik-megamendung-dan-wadasan>

**Yang ditopang sumber:**

- *Wadas* = batu karang dalam bahasa Cirebon.
- Bentuknya **mirip mega mendung tapi lebih kecil, lebih pipih, dan lebih runcing**. Inilah
  pembedanya, dan keduanya memang sering tertukar.
- Diilhami batu karang di **Taman Sari Gua Sunyaragi**, Cirebon.

**Konsekuensi gambar:** wadasan dan mega mendung **wajib terbaca berbeda** dalam satu tema.
Kalau keduanya digambar sebagai kait yang sama berukuran beda, salah satunya tidak perlu ada —
dan gerbang keunikan akan menangkapnya.

---

## Yang tetap tidak diklaim

- **Makna spiritual per bentuk** tidak ditulis ke salinan produk. Uraian itu nyata ada di
  sumbernya, tapi ia milik kain, ukiran, dan upacaranya — bukan milik SVG hiasan undangan.
- **Varian daerah.** Sumber sekunder tidak cukup untuk menyatakan sebuah bentuk mewakili satu
  daerah tertentu.
- **Klaim "mewakili Nusantara."** Delapan keluarga di atas berasal dari empat wilayah budaya
  saja (Jawa, Cirebon, Minangkabau, Bali).

## Yang masih kosong

- **Kenanga** hanya ditopang `originals/melati/CULTURE.md`, dan hanya sebagai *flora
  pendamping tanpa peran ritual*. Pembeda bentuknya di sana — **kelopak pita yang meluruh** —
  **bertentangan** dengan `MotifKenanga.vue` yang menggambarnya berkelopak enam. Sumber repo
  yang menang; komponennya digubah.
- **`symbol-payung`** diklaim *"payung upacara Bali"* tanpa sumber, sementara satu-satunya
  sumber repo (`melati/CULTURE.md`) mengaitkan payung ke **janur Jawa** dalam kembar mayang.
  Kontradiksi ini belum diselesaikan; sampai ada sumber, klaim Bali dihapus dan ornamennya
  diperlakukan sebagai payung tanpa atribusi daerah.
- **`layer-*-sogan`** — "sogan" adalah pewarnaan, bukan motif. Namanya menyesatkan.
