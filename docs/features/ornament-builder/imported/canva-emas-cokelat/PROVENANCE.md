# Provenance — impor Canva "Emas Cokelat"

Dibuat 2026-09-18 atas permintaan pemilik, yang mengirim 6 berkas SVG hasil ekspor dari akun
Canva Pro-nya sendiri.

**Ini bukan aset original.** Batas lisensinya sama dengan pack impor lain di repo ini; uraian
lengkapnya di [`../canva-cokelat-krem/PROVENANCE.md`](../canva-cokelat-krem/PROVENANCE.md). Semuanya
`"usage": "imported-local-demo"`, tidak masuk `apps/web/public` maupun `ornamentBank`.

| | |
|---|---|
| Template | *Emas Cokelat Tradisional Undangan Pernikahan Video Seluler* |
| Berkas mentah | `source/` — 6 berkas |
| Diterima | 2026-09-18 |

## Sebelas aset dari enam berkas

| Aset | Dari | Bentuk | Pemecahan |
|---|---|---|---|
| `sudut-gunungan-kiri` · `-kanan` | `sudut-gunungan-emas.svg` | raster | dipotong di x = 585 |
| `sulur-krem-kiri` · `-kanan` | `sulur-krem.svg` | SVG `currentColor` | sumbu x = 547 |
| `sulur-tipis-kiri` · `-kanan` | `sulur-tipis.svg` | SVG `currentColor` | transform grup |
| `lengkung-latar` | `lengkung-latar.svg` | raster **wash** | — |
| `cahaya-lembut` | `cahaya-lembut.svg` | raster **wash** | satu dari dua nyala identik |
| `pengantin-jawa` · `pengantin-pria` · `pengantin-wanita` | `pengantin-jawa.svg` | raster | utuh + dua potongan |

## Pengantinnya dipecah, dan potongannya tidak bersih — ini batasnya

Permintaan pemilik menyebut karakter pengantin ikut dipecah. Dikerjakan: `pengantin-pria` dan
`pengantin-wanita` dipotong di **x = 582**, dan keduanya disediakan berdampingan dengan pasangan
utuhnya supaya yang butuh gambar berdua tidak perlu menempel ulang.

Yang harus diketahui sebelum memakainya: **kedua tokoh saling menimpa di titik potong itu.** Profil
alpha sumbernya menerus dari x 134 sampai 1034 tanpa satu pun celah — mempelai pria merangkul lengan
mempelai wanita, dan ujung kain mempelai wanita lewat di belakang kaki mempelai pria. Akibatnya:

- `pengantin-pria` kehilangan ujung tangan kanannya, yang memang berada di sisi mempelai wanita.
- `pengantin-wanita` membawa serta tangan mempelai pria yang melingkari lengannya.

Tidak ada titik potong yang menghindari keduanya; yang ada hanya memilih di mana irisannya jatuh.
Dipilih x = 582 karena di situ irisannya paling tipis.

## Dua latar semi-transparan, dan validator yang belajar dari keduanya

`lengkung-latar` dan `cahaya-lembut` adalah **wash**: lapisan tembus pandang, bukan potongan.
Alpha maksimumnya 128 dan — pada sapuan kuas pack tetangga — 107, artinya tidak ada satu piksel pun
yang pekat. Validator skill semula menuntut alpha maksimum ≥ 200 dengan alasan yang benar untuk
cutout ("potongan ini kehilangan alpha-nya"), tapi salah untuk wash.

Diperbaiki 2026-09-18 di `validate.mjs`: ambang itu tetap berlaku untuk cutout, dan untuk aset yang
menyatakan dirinya wash lewat `style.medium` yang diuji hanya "ada daerah tembus **dan** ada yang
tergambar". Ketatnya tidak dikurangi untuk yang lain.

`cahaya-lembut` juga menunjukkan bahwa memecah tidak selalu berarti menghasilkan lebih banyak aset:
sumbernya memuat **dua nyala yang identik**, jadi yang diambil satu.

## Kesetiaan terukur

| Glyph vektor | Path | Beda piksel | Koordinat utuh |
|---|---|---|---|
| `sulur-krem-kiri` · `-kanan` | 6 · 6 | **0** / 718.900 | ya |
| `sulur-tipis-kiri` · `-kanan` | 14 · 14 | **0** / 657.300 | ya |

`sulur-krem.svg` dipecah menurut **sumbu**, bukan grup: kedua sulurnya bercermin tapi keduanya
tanpa transform, jadi tidak ada grup yang membedakannya. Celah alpha-nya bersih di x 473–621.

## Satu berkas yang tidak bisa dirender librsvg

`pengantin-jawa.svg` memuat 10 MB base64 dalam satu atribut dan ditolak librsvg dengan
"Huge input lookup". Chromium lewat Playwright dipakai sebagai cadangan — ia sudah jadi dependency
repo ini. Renderer yang dipakai tercatat di `catalog.json` tiap varian, supaya tidak ada aset yang
asal-usul rendernya kabur.
