# Kandidat dan aset produksi dekoratif — 2026-09-11

## Kandidat awal yang tidak dipakai

Status awal di bawah dipertahankan sebagai riwayat riset. Halaman Unsplash mengembalikan redirect verifikasi dan Pexels memberi Cloudflare challenge pada pemeriksaan CLI 2026-09-11, sehingga komposisi serta berkasnya tidak dapat diverifikasi atau diunduh secara andal. Kandidat ini **bukan** aset final dan tidak menjadi dependensi produksi.

| Peran | Kandidat | Author yang ditemukan | License |
|---|---|---|---|
| Hero pasangan garden | https://unsplash.com/photos/bride-and-groom-in-a-garden-with-rustic-barn-ohEq2BC8THM | Jennifer Kalenberg | https://unsplash.com/license |
| Detail tangan/cincin | https://www.pexels.com/photo/close-up-of-the-hands-of-a-couple-with-wedding-rings-17321937/ | Western Sydney Wedding Photo and Video | https://www.pexels.com/license/ |
| Foto editorial section | https://unsplash.com/photos/bride-and-groom-walking-in-a-lush-garden-Q9HYFXSV9T8 | Samuel Cruz | https://unsplash.com/license |
| Detail venue/floral | https://unsplash.com/photos/a-garden-filled-with-lots-of-white-flowers-96IKWQOvmVk | Brittney Weng | https://unsplash.com/license |

Saat implementasi: buka masing-masing halaman, verifikasi gratis dan author/license, tinjau komposisi serta rights yang berlaku, download dari sumber resmi, simpan original dan optimized derivatives dengan checksum/dimensi. Jika crop tidak cocok, ganti kandidat dan catat alasannya. Prioritaskan satu pasangan konsisten untuk satu demo undangan; jangan mencampur foto pasangan berbeda seolah orang yang sama. Hero dekoratif landing dapat memakai pasangan berbeda dengan konteks editorial yang jelas. Tidak ada ketergantungan hotlink pada produksi.

## Aset produksi yang diverifikasi

Semua aset di bawah telah dibuka secara visual setelah unduh. Perannya dekoratif/editorial, bukan testimoni atau klaim bahwa pasangan tersebut memakai Aruna Dewa. Sumber adalah berkas Wikimedia Commons dengan metadata CC0; lisensi tidak mewajibkan atribusi, tetapi author dan tautan asal tetap dicatat untuk provenance. Original JPEG disimpan untuk audit lokal, sedangkan aplikasi hanya memuat turunan WebP di `apps/web/public/images/`.

| Peran | Local original → turunan aplikasi | Dimensi output | Author / sumber | Lisensi | SHA-256 original | SHA-256 output |
|---|---|---:|---|---|---|---|
| Hero pasangan di botanical garden | `production-originals/hero-original.jpg` → `hero.webp` | 1600×1067 | [Nick Karvounis](https://unsplash.com/@nickkarvounis), [file Commons](https://commons.wikimedia.org/wiki/File:Wedding_In_Copenhagen_at_the_Botanical_Gardens_(Unsplash).jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) | `77cf368148baf68c75263b2bd48df9dd0d2d1e0f8d286c84867bbab9f6ab4196` | `0fb24f14c871595aad5169d280cc9760143d6ac6688502850511ec5e8b91da9f` |
| Detail mempelai dan cincin | `production-originals/couple-original.jpg` → `couple.webp` | 1000×667 | [Sweet Ice Cream Photography](https://unsplash.com/@sweeticecreamphotography), [file Commons](https://commons.wikimedia.org/wiki/File:Groom_touching_wedding_band_(Unsplash).jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) | `e2d6c6bec0e2a71cbd1fd48c83528014d44b0b5632fc0aeb74d52d8641d7af31` | `d18c05caf750e8bd1d19fda2647a785ff0e4d4b160119508ce993245e7ace4a3` |
| Detail cincin | `production-originals/rings-original.jpg` → `rings.webp` | 1000×667 | [Glen McCallum](https://unsplash.com/@glen_mccallum), [file Commons](https://commons.wikimedia.org/wiki/File:Wedding_rings_(Unsplash).jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) | `88b9663434626157c982d9b28eca2c3b915d6fd68f21cb3f5f85df4df72b5e4b` | `14052505a576f05386db00afe4cc584870ae38789e056dc73ce9a4f1032e8738` |
| Venue dan gerbang bunga | `production-originals/venue-original.jpg` → `venue.webp` | 1000×666 | KOL Giới Trẻ, [file Commons](https://commons.wikimedia.org/wiki/File:C%E1%BB%95ng_hoa_trang_tr%C3%AD_ti%E1%BB%87c_c%C6%B0%E1%BB%9Bi.jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) | `cddc94c71b74a7e4688de53933da263cdb5a82a94fe816640de2d7bd036272cb` | `0dddebab3bb6c7c7e9114e6b86452d2ff66b4e2a759894cd1a4e3aafb98c6466` |

Turunan dibuat dengan `sharp-cli` WebP quality 82 dan ukuran longest edge: hero 1600px; tiga aset lain 1000px. `sips` mengonfirmasi format WebP dan setiap ukuran output. Tidak ada hotlink aplikasi ke Commons/Unsplash.

## Tambahan 2026-09-12 — tema adat

Dua tema baru (`aruna-sogan`, `aruna-gonjong`) memerlukan foto yang benar-benar Indonesia. Pencarian Commons dibatasi ke lisensi Public domain/CC0; kandidat CC BY-SA sengaja dilewati karena kewajiban atribusi dan share-alike tidak cocok untuk aset produk.

Kandidat yang **ditolak**: [Rumah Gadang Tarok Dipo](https://commons.wikimedia.org/wiki/File:Rumah_Gadang_Tarok_Dipo.jpg) (PD, 3840×2160) — dibuka secara visual dan ternyata rumah yang sudah lapuk, terjepit gedung modern, ada parabola dan kabel listrik. Tidak layak untuk undangan pernikahan.

| Peran | Local original → turunan aplikasi | Dimensi output | Author / sumber | Lisensi | SHA-256 original | SHA-256 output |
|---|---|---:|---|---|---|---|
| Pasangan busana adat Jawa (cover `aruna-sogan`) | `production-originals/adat-jawa-original.jpg` → `adat-jawa.webp` | 1400×933 | Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi RI, [file Commons](https://commons.wikimedia.org/wiki/File:Pegon_-_Manten_Pegon_-_Traditional_Surabayanese_Culture_-_Surabaya_-_Indonesia_-_East_Java_-_2021010625.jpg) | Public domain (karya pemerintah RI, UU 28/2014 Ps. 42) | `518fbc9a1017af50fd1f390b9c4d408182955fab5b727af231f80a4a0e4194eb` | `93358326282b3affa47fd08550d9556e97673d7503db387156b06d84e0acf2ca` |
| Rumah gadang (cover `aruna-gonjong`) | `production-originals/rumah-gadang-original.jpg` → `rumah-gadang.webp` | 1400×1047 | Official Website of The Ministry of Education and Culture, [file Commons](https://commons.wikimedia.org/wiki/File:Rumah_Gadang_Minangkabau_PDIKM,_Padang_Panjang.jpg) | Public domain (karya pemerintah RI) | `3c7a93e7820f2a7aea9d2d1a2c8cd66f0b6b8aef844a289207d26dfa0f42da54` | `d467298212a4bb6ce32a6d2b52889ec38cc3954745ed831fb16b1e5b1b5930a7` |

SHA-1 berkas asli dicocokkan dengan nilai yang dikembalikan API Commons sebelum diunduh (`8a58b65ed1c7…` dan `3486cf2291d5…`). Keduanya dibuka secara visual setelah unduh. `adat-jawa.webp` adalah crop `extract 200 450 2600 1733` dari original supaya keramaian di tepi terpotong, lalu di-resize; `rumah-gadang.webp` hanya di-resize. Keduanya `sharp-cli` WebP quality 82.

Perannya dekoratif/editorial. Foto pasangan tersebut **bukan** pengguna Aruna Dewa dan tidak pernah ditampilkan sebagai testimoni.

