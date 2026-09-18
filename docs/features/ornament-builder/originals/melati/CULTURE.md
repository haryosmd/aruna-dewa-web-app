# Sumber budaya — pack Ronce Melati

Ditulis 2026-09-17 (fase 31). Berkas ini memisahkan tiga hal yang gampang tercampur ketika
sebuah ornamen diberi nama daerah:

1. **Apa yang memang terdokumentasi** — dan dari mana.
2. **Apa yang hanya bentuk hias** yang dikarang untuk pack ini, tanpa klaim makna.
3. **Apa yang tidak diklaim sama sekali.**

Aturannya dari skill ornamen: makna budaya tidak boleh dikarang, dan tampilan yang mirip sesuatu
tidak membuktikan asalnya dari sana. Tiap aset di `catalog.json` karena itu membawa `culturalRole`
dengan salah satu dari lima nilai: `flora-upacara`, `bahan-upacara`, `perangkat-upacara`,
`arsitektur`, atau `hiasan-original`.

---

## Kenapa melati, dan kenapa "ronce"

Pack Sunda yang sudah ada berangkat dari arsitektur dan bambu. Pack ini berangkat dari **bunga
yang dirangkai** — dan alasannya bukan selera, melainkan dua hal yang saling bertemu.

Dari sisi referensi: sembilan klip yang diukur di `sources/canva/` didominasi dua keluarga bentuk,
**untaian yang menjuntai dari tepi atas** (klip whatsapp dengan *torana* bunga) dan **daun
garis-tunggal di sudut** (klip botanical). Keduanya punya padanan Indonesia yang bukan tiruan:
ronce melati yang menjuntai, dan tangkai melati/kantil di tepi.

Dari sisi budaya: ronce melati adalah rangkaian **kuncup** melati yang ditusuk benang menjadi
untaian, dipakai pada busana pengantin Jawa — antara lain *tibo dodo* yang menjuntai dari kepala
melewati dada, dan beberapa bentuk yang menutup sanggul. Kuncupnya sering dicampur **kantil**
(cempaka putih). Itulah kenapa satuan bentuk dasar pack ini adalah **kuncup**, bukan bunga mekar:
sebuah ronce yang digambar dengan bunga mekar akan salah sejak satuannya.

---

## Yang terdokumentasi

| Unsur | Dipakai di | Yang bisa dikatakan | Sumber |
|---|---|---|---|
| **Melati** (*Jasminum sambac*) | 17 glyph | Ditetapkan sebagai **puspa bangsa** lewat Keppres No. 4 Tahun 1993 tentang Satwa dan Bunga Nasional, bersama anggrek bulan (puspa pesona) dan padma raksasa (puspa langka) | [Keppres 4/1993](https://pasal.id/peraturan/keppres/keppres-4-1993) · [ANTARA](https://www.antaranews.com/berita/5225561/ini-tiga-jenis-bunga-yang-menjadi-simbol-puspa-nasional-indonesia) |
| **Ronce melati** | `*-ronce`, `layer-untaian`, `layer-untai-tunggal` | Untaian kuncup melati yang ditusuk benang, dipakai pada busana pengantin Jawa; beberapa bentuknya punya nama sendiri (*tibo dodo*, *keket*, *tutup sanggul*) | [Tempo](https://www.tempo.co/gaya-hidup/pernikahan-anak-jokowi-kenali-jenis-ronce-melati-pengantin-jawa-1150594) |
| **Kantil / cempaka putih** | `*-kantil`, `layer-mekar` | Umum dirangkai bersama kuncup melati dalam ronce pengantin | [Tempo](https://www.tempo.co/gaya-hidup/pernikahan-anak-jokowi-kenali-jenis-ronce-melati-pengantin-jawa-1150594) |
| **Kembar mayang** | `kembar-mayang`, `bingkai-kembar-mayang` | Sepasang rangkaian janur dan dedaunan dalam pernikahan adat Jawa; muncul pada malam midodareni dan dipakai di upacara **panggih** | [Kompas](https://www.kompas.com/tren/read/2023/07/10/181500965/apa-itu-kembar-mayang-dalam-pernikahan-adat-jawa-ini-arti-makna-dan) · [Wikipedia](https://id.wikipedia.org/wiki/Kembar_mayang) |
| **Payung dan burung dari janur** | `payung-teduh`, `merpati-sepasang` | Bentuk payung dan burung **memang termasuk** bentuk janur yang dirangkai di dalam kembar mayang | [Kompas](https://www.kompas.com/tren/read/2023/07/10/181500965/apa-itu-kembar-mayang-dalam-pernikahan-adat-jawa-ini-arti-makna-dan) |
| **Janur** | `*-janur`, `*-anyam`, `motif-anyaman` | Daun kelapa muda; bahan rangkaian kembar mayang dan hiasan pernikahan | sda. |

**Yang sengaja tidak ditulis di sini: makna filosofis per bentuk.** Sumber-sumber di atas memuat
uraian makna (payung = saling mengayomi, burung = kesetiaan, melati = kesucian), dan uraian itu
**nyata ada di sumbernya** — tapi ia milik rangkaian janur yang asli dalam upacaranya, bukan milik
gambar SVG yang dipakai sebagai hiasan undangan. Pack ini memakai bentuknya sebagai rujukan visual
dan tidak mengklaim mewarisi maknanya. Kalau nanti sebuah tema mau menampilkan maknanya ke
pasangan, kalimatnya harus dikutip dari sumber, bukan dari berkas ini.

---

## Flora pendamping

Dibedakan dari flora upacara di atas: ini tanaman yang lazim ada di rangkaian bunga pernikahan
Indonesia, dipakai di pack ini sebagai pendamping, tanpa klaim peran ritual.

- **Kenanga** (*Cananga odorata*) — `pemisah-kenanga`, `tangkai-kenanga`. Kelopaknya panjang dan
  menjuntai; itu yang membuatnya berbeda dari melati pada jarak baca ornamen.
- **Sedap malam** (*Polianthes tuberosa*) — `tangkai-sedap-malam`. Bunga tabung di sepanjang tangkai tegak.
- **Pandan** — `dedaunan-pandan`. Helai panjang tanpa bunga; di pack ini murni bentuk daun.

---

## Yang murni hiasan original

Sebelas glyph bertanda `hiasan-original`. Ia digambar untuk pack ini dan **tidak membawa klaim
makna apa pun**: `bingkai-segi`, `pemisah-titik`, `pemisah-sulur`, `sudut-sulur`, `sudut-ceplok`,
`motif-ceplok`, `motif-jala`, `motif-tumpal`, `monogram-cincin`, `monogram-perisai`,
`merpati-sepasang`.

Dua di antaranya memakai nama keluarga motif yang nyata, dan itu perlu dinyatakan terang:

- **Ceplok** adalah nama keluarga motif batik Jawa berbasis rosét geometris berulang.
  `motif-ceplok` dan `sudut-ceplok` digambar **di dalam keluarga itu**, bukan menyalin satu motif
  ceplok tertentu, dan tidak mewakili motif ceplok mana pun yang punya nama sendiri.
- **Tumpal** adalah keluarga motif segitiga yang tersebar luas di tekstil Nusantara. `motif-tumpal`
  sama: bentuk baru di dalam keluarga itu.

Aruna sudah punya `frame-tumpal` dan `corner-batik` di `ornamentBank`; kalau pack ini nanti
dipasang sebagai tema, dua nama itu harus diperiksa ulang supaya tidak bertabrakan, karena
`DESIGN.md` melarang identitas `motif`/`corner` dipakai ulang antar tema.

---

## Arsitektur

`pendopo-joglo` — pendopo beratap joglo. Digambar **kaku**: tidak ada motion yang menekuk atapnya,
sesuai aturan di `creation-motion.md`. Yang digambar adalah susunan atap bertingkat, tiang, dan
lantai; tidak ada klaim bahwa ia mewakili pendopo tertentu.

---

## Batas berkas ini

- Semua sumber di atas adalah sumber **sekunder berbahasa Indonesia** (berita, ensiklopedia,
  penulisan industri pernikahan). Cukup untuk menopang pernyataan "ini dipakai dan namanya ini",
  tidak cukup untuk klaim sejarah atau varian daerah.
- Ronce melati hidup di lebih dari satu daerah; yang terbaca di sumber yang dipakai di sini
  terutama praktik **Jawa**. Pack ini karena itu tidak menyebut dirinya mewakili Nusantara.
- Tidak ada satu pun bentuk di pack ini yang dijiplak dari aset referensi mana pun. Provenance
  tiap aset ada di `catalog.json`; geometrinya lahir dari `build.mjs`, yang bisa dijalankan ulang.
