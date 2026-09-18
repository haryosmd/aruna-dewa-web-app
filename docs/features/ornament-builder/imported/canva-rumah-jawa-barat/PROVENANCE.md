# Provenance — impor Canva "Rumah Jawa Barat"

Dibuat 2026-09-18 atas permintaan pemilik, yang mengirim dua berkas SVG hasil ekspor dari akun
Canva Pro-nya sendiri.

**Ini bukan aset original.** Batas lisensinya sama dengan pack impor lain di repo ini; uraian
lengkapnya ada di [`../canva-cokelat-krem/PROVENANCE.md`](../canva-cokelat-krem/PROVENANCE.md) dan
tidak diulang di sini. Ringkasnya: lisensi konten Canva mengatur elemen template yang dipakai di
dalam produk yang dijual, elemen di dalamnya bisa milik kontributor pihak ketiga, dan keduanya
keputusan pemilik — bukan keputusan teknis. Sampai diputuskan, semuanya
`"usage": "imported-local-demo"` dan tidak masuk `apps/web/public` maupun `ornamentBank`.

| | |
|---|---|
| Template | *Rumah Adat Jawa Barat Infografis Ilustratif* |
| Berkas mentah | `source/sudut-ukiran.svg`, `source/rumah-julang-ngapak.svg` |
| Diterima | 2026-09-18 |

## Tiga aset dari dua berkas

### `sudut-ukiran-kiri` dan `sudut-ukiran-kanan` — dipecah dari satu berkas

Berkas sumbernya memuat **sepasang ukiran sudut** dalam satu gambar selebar 600 satuan. Dipecah
jadi dua glyph berdiri sendiri karena permintaan pemilik, dan alasannya benar: satu berkas berisi
keduanya memaksa keduanya ikut terpasang. Di lebar ponsel sering hanya satu sudut yang muat, dan
ornamen yang tidak bisa dilepas satu-satu akhirnya dipasang dengan cara dipotong CSS — yang berarti
mengunduh dua kali lipat untuk memperlihatkan separuh.

**Yang tidak bisa dipakai untuk memecahnya: posisi path.** Kedua salinan memakai rentang koordinat
yang **sama persis** (x 2,6–237,4); yang membedakan hanya geseran grupnya —
`matrix(1, 0, 0, 1, 0, 0)` untuk kiri dan `matrix(1, 0, 0, 1, 360, 0)` untuk kanan. Pemecahan
karena itu dilakukan berdasarkan transform grup, bukan kotak pembatas. Konverter menolak memecah
kalau transform yang ditemuinya bukan geseran murni, supaya tidak ada `viewBox` yang diam-diam salah.

Koordinatnya **tidak digeser**. Yang dipersempit hanya `viewBox`-nya, dirapatkan ke isi
masing-masing bagian: `0.02 0.09 239.29 239.22` untuk kiri dan `360.68 0.09 239.29 239.22` untuk
kanan. Keduanya karena itu punya rasio 1:1 dan bisa dipasang sendiri-sendiri.

Hasil: 226 path per bagian, **0 piksel beda** terhadap sumber pada jendela yang sama.

### `rumah-julang-ngapak` — 15 warna diturunkan ke satu tinta

Ilustrasi berwarna penuh dengan 15 warna. Ornamen Aruna monokrom, dan memetakan 15 warna dengan
tangan bukan pekerjaan yang bisa dipertanggungjawabkan, jadi tiap warna diturunkan ke bidang nilai
berdasarkan **luminance relatif** (sRGB, rumus WCAG): makin gelap warnanya, makin pekat tintanya.

Versi pertama pemetaan ini gagal dan itu terlihat begitu dirender: rumah kayu berpelitur warnanya
rata-rata gelap, seluruh 15 warnanya jatuh di 0,6–1,0, dan hasilnya satu siluet pekat tanpa detail.
Sekarang kurvanya diberi `gamma` 1,9 yang melebarkan jarak di paruh terang, dengan lantai 0,1 dan
delapan langkah. Bidang nilai yang benar-benar terpakai: **1 · 0,875 · 0,75 · 0,5 · 0,375 · 0,25**.

Warna sumbernya tetap tercatat di `catalog.json`, dan berkas berwarna aslinya utuh di `source/`.
Bangunan digambar **kaku** — `rigid: true`, tidak pernah ditekuk oleh motion.

## Kesetiaan terukur

| Glyph | Path | Beda piksel | Koordinat utuh |
|---|---|---|---|
| `sudut-ukiran-kiri` | 226 | **0** / 490.000 | ya |
| `sudut-ukiran-kanan` | 226 | **0** / 490.000 | ya |
| `rumah-julang-ngapak` | 71 | **0** / 265.300 | ya |

Pembandingan siluet mengukur **bentuk**, bukan pemetaan nilai: di sisi siluet seluruh warna
diratakan jadi hitam. Jadi angka 0 untuk `rumah-julang-ngapak` berarti "tidak ada geometri yang
bergeser", bukan "tampilannya sama dengan sumber" — tampilannya memang sengaja berbeda, karena
monokrom.

## Membangun ulang

```sh
rtk proxy node docs/features/ornament-builder/imported/canva-rumah-jawa-barat/build.mjs
rtk proxy node .claude/skills/aruna-ornament-builder/scripts/validate.mjs docs/features/ornament-builder/imported/canva-rumah-jawa-barat
```
