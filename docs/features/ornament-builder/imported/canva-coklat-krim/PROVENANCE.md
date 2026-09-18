# Provenance — impor Canva "Coklat Krim"

Dibuat 2026-09-18 atas permintaan pemilik, yang mengirim 3 berkas SVG hasil ekspor dari akun
Canva Pro-nya sendiri.

**Ini bukan aset original.** Batas lisensinya sama dengan pack impor lain di repo ini; uraian
lengkapnya di [`../canva-cokelat-krem/PROVENANCE.md`](../canva-cokelat-krem/PROVENANCE.md). Semuanya
`"usage": "imported-local-demo"`, tidak masuk `apps/web/public` maupun `ornamentBank`. Aturan
konversinya di [`../lib/convert.mjs`](../lib/convert.mjs); tiap `d` disalin karakter per karakter
dan diuji dengan pemeriksaan "koordinat utuh".

| | |
|---|---|
| Template | *Coklat dan Krim Aesthetic Bunga Undangan Pernikahan Invitation* |
| Berkas mentah | `source/` — 3 berkas |
| Diterima | 2026-09-18 |

## Enam aset dari tiga berkas, dan satu yang sengaja ditinggal

| Aset | Dari | Bentuk |
|---|---|---|
| `gunungan-monogram` | `nameplate-gunungan.svg` | SVG `currentColor`, 77 path |
| `sudut-garis-atas` · `sudut-sulur-bawah` | `wayang-sudut.svg` | SVG `currentColor` |
| `wayang-pengantin` | `wayang-sudut.svg` | PNG + WebP ber-alpha |
| `sudut-garis-halus` | `sudut-kuas.svg` | SVG `currentColor` |
| `sapuan-kuas` | `sudut-kuas.svg` | PNG + WebP, **wash semi-transparan** |

**Nama contoh tidak diimpor.** Berkas `nameplate-gunungan.svg` adalah papan nama contoh milik
template: "Olivia ⬥ Morgan". Yang diambil hanya gunungan di tengahnya — 77 path tanpa transform.
Tiap huruf namanya adalah satu grup `translate` tersendiri, dan nama contoh sebuah template bukan
ornamen; mengimpornya berarti menyimpan nama orang lain sebagai aset.

**Dua berkas mencampur vektor dan bitmap dalam satu gambar.** `wayang-sudut.svg` memuat dua sudut
bergaris (vektor) di atas sepasang tokoh wayang (bitmap); `sudut-kuas.svg` memuat sudut bergaris
(vektor) di samping sapuan kuas (bitmap). Keduanya dikeluarkan dua kali dari berkas yang sama:
sekali sebagai glyph `currentColor` — dengan `<image>` dibuang lebih dulu — dan sekali sebagai
raster, dengan path vektornya dibuang lebih dulu.

**Tokoh wayangnya tidak dipecah per tokoh.** Tongkat tokoh kanan dan busur tokoh kiri saling
menyilang di tengah; memotongnya akan memutus keduanya.

## Alat ukur yang sempat salah, dan ini penting

Glyph vektor dari berkas campuran mula-mula tercatat meleset **21,5%** dan **9,8%**. Yang meleset
bukan path-nya: pembandingnya merender sumber pada jendela potongan — lengkap dengan gambar wayang
yang memang bukan bagian glyph itu — lalu membandingkannya dengan glyph yang hanya berisi vektor.
Sejak sisi sumber juga dibersihkan dari `<image>`, ketiganya **0 piksel**.

| Glyph | Path | Beda piksel | Koordinat utuh |
|---|---|---|---|
| `gunungan-monogram` | 77 | **0** / 763.700 | ya |
| `sudut-garis-atas` | 1 | **0** / 490.000 | ya |
| `sudut-sulur-bawah` | 1 | **0** / 490.700 | ya |
| `sudut-garis-halus` | 1 | **0** / 490.000 | ya |
