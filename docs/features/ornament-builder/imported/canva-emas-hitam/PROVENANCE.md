# Provenance — impor Canva "Emas Hitam"

Dibuat 2026-09-18 atas permintaan pemilik, yang mengirim 8 berkas SVG hasil ekspor dari akun
Canva Pro-nya sendiri.

**Ini bukan aset original.** Batas lisensinya sama dengan pack impor lain di repo ini; uraian
lengkapnya di [`../canva-cokelat-krem/PROVENANCE.md`](../canva-cokelat-krem/PROVENANCE.md). Semuanya
`"usage": "imported-local-demo"`, tidak masuk `apps/web/public` maupun `ornamentBank`. Aturan
konversinya di [`../lib/convert.mjs`](../lib/convert.mjs); tiap `d` disalin karakter per karakter
dan diuji dengan pemeriksaan "koordinat utuh".

| | |
|---|---|
| Template | *Emas dan Hitam Tradisional Adat Jawa Undangan Pernikahan Brosur* |
| Berkas mentah | `source/` — 8 berkas |
| Diterima | 2026-09-18 |

## Tiga belas aset dari delapan berkas

Lima berkas memuat sepasang atau bertiga ornamen sekaligus dan **dipecah**:

| Berkas | Dipecah jadi | Cara |
|---|---|---|
| `bingkai-daun.svg` | `sudut-daun-kiri` · `sudut-daun-kanan` | transform grup |
| `pita-sulur.svg` | `pita-sulur-kiri` · `pita-sulur-kanan` | sumbu x = 187,5 |
| `pita-tipis.svg` | `pita-tipis-kiri` · `pita-tipis-kanan` | transform grup |
| `gunungan-sayap.svg` | `gunungan-sayap-kiri` · `-tengah` · `-kanan` | transform grup |
| `bingkai-daun-gunungan.svg` | `gunungan-bingkai` saja | transform grup |

`pita-sulur.svg` punya **tiga** grup transform, tapi dua di antaranya sama-sama menyusun sisi
kirinya. Dipecah menurut grup, hasilnya tiga potongan yang tak satu pun utuh; dipecah menurut sumbu
di x = 187,5, hasilnya dua sudut penuh. Yang dipakai bentuk keduanya.

**Satu berkas hampir menggandakan aset.** `bingkai-daun-gunungan.svg` memuat 284 path daun yang
**sama persis** dengan `bingkai-daun.svg`, ditambah gunungan 10 path di tengah. Kalau seluruhnya
diimpor, sudut daunnya masuk dua kali dengan id berbeda. Yang diambil hanya gunungannya.

## Jendela yang beririsan tidak bisa dibandingkan, dan dilaporkan begitu

Ketiga bagian `gunungan-sayap.svg` berdiri berdampingan dengan kotak yang **saling beririsan**.
Merender sumber pada jendela salah satu bagian karena itu ikut memunculkan dua bagian lain, dan
pembandingnya sempat melaporkan 25% meleset untuk path yang identik. Sekarang irisan jendela
dideteksi lebih dulu dan ketiganya ditandai **tidak terbandingkan** — bukan diberi angka yang
terdengar meyakinkan tapi tidak mengukur apa pun. Buktinya bersandar pada "koordinat utuh", yang
tidak bergantung renderer sama sekali, dan pada hitungan path per bagian.

## Kesetiaan terukur

| Glyph | Path | Beda piksel | Koordinat utuh |
|---|---|---|---|
| `sudut-daun-kiri` · `-kanan` | 142 · 142 | **0** / 490.000 | ya |
| `gunungan-bingkai` | 10 | **0** / 596.400 | ya |
| `mega-mendung-a` · `-b` | 1 · 1 | **0** / 310.100 | ya |
| `pita-sulur-kiri` · `-kanan` | 321 · 321 | **0** | ya |
| `pita-tipis-kiri` · `-kanan` | 247 · 248 | **0** / 186.200 | ya |
| `gunungan-emas` | 10 | 1.809 / 422.100 (0,43%) | ya |
| `gunungan-sayap-*` | 10 tiap bagian | tidak terbandingkan | ya |

Sisa 1.809 piksel pada `gunungan-emas` berkumpul di **tiga kolom paling kiri** bidang render, bukan
di bentuknya — peta bedanya di `diff/gunungan-emas.png` memperlihatkan siluetnya bersih dan hanya
tepi kiri kanvasnya yang merah. Sumbernya memakai matriks rotasi seperempat putaran, dan selisih
pembulatan tepi itu yang tersisa.
