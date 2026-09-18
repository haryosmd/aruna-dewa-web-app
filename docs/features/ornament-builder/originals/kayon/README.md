# Pack ornamen original — Kayon

Cokelat krem, gunungan, dan pita medalion. **39 glyph SVG** dan **3 ubin tekstur**,
seluruhnya dihitung secara parametrik. Dibangun 2026-09-17 (Fase 32).

## Asalnya

Kosakata bentuknya dipelajari dari satu desain undangan Canva milik akun pemilik. Arsip
risetnya, lengkap dengan pengukuran dan inventaris kegagalannya, ada di
`../../sources/canva-cokelat-krem/` — **baca `LIMITS.md` di sana sebelum memakai pack ini**.

Yang berpindah ke sini: kosakata bentuk (`BENTUK.md`), proporsi, angka warna (`WARNA.md`),
dan angka motion (`MOTION.md`). Yang **tidak** berpindah: path, piksel, aset, dan font.
Tidak ada satu titik pun di `svg/` yang ditrace dari gambar mana pun; semuanya keluar dari
`geometry.mjs`.

## Isi

| Berkas | Isi |
|---|---|
| `CULTURE.md` | Apa yang diklaim dan **tidak** diklaim tentang asal-usul tiap bentuk |
| `THEME.md` | Usulan tema `aruna-kayon`: palet, kontras terverifikasi, pemetaan slot ornamen |
| `geometry.mjs` | Primitif geometri: siluet kayon, ukel, patran, cincin, tumpal, rosette |
| `build.mjs` | Penyusun 37 glyph + 3 tekstur + `catalog.json` |
| `demo.mjs` | Perakit demo offline |
| `verify.mjs` | Verifikasi demo di browser sungguhan |
| `svg/` | 39 glyph, `currentColor`, path bisa diedit |
| `tekstur/` | 3 ubin latar — **bukan** ornamen, lihat di bawah |
| `demo/` | Demo offline (GSAP disalin lokal, nol permintaan jaringan) |
| `catalog.json` | Katalog v1 |

## Menjalankan

```sh
node docs/features/ornament-builder/originals/kayon/build.mjs
node docs/features/ornament-builder/originals/kayon/demo.mjs
node .claude/skills/aruna-ornament-builder/scripts/validate.mjs docs/features/ornament-builder/originals/kayon
python3 -m http.server 4179 --bind 127.0.0.1 --directory docs/features/ornament-builder
node docs/features/ornament-builder/originals/kayon/verify.mjs
```

Demo: `http://127.0.0.1:4179/originals/kayon/demo/index.html`

## Aturan yang dipatuhi tiap glyph

Dari `DESIGN.md`, bagian **Aset → Ornamen bermassa**:

- badan bentuk `fill="currentColor"` bertanda `data-mass`; tidak ada glyph yang seluruhnya outline
- detail bergaris `stroke-width` 2,5–4 **dalam satuan viewBox**, bertanda `data-draw`
- dua bidang nilai per glyph (`opacity` 1 dan 0,45)
- bingkai dan cincin berongga lewat `fill-rule="evenodd"`, bukan dengan mengisi dalamnya
- tiap `id` diawali `kayon-<slug>-` supaya tidak bertabrakan lintas pack

`validate.mjs` menguji checksum, keamanan SVG, id unik lintas pack, dan keberadaan lapis
yang bisa diedit. Terakhir dijalankan: **39 aset, 39 varian, 0 galat**.

## Tekstur bukan ornamen

`tekstur/` berisi tiga ubin: `pita-medalion` (ubin mendatar, padanan pita batik di kepala
dan kaki referensi), `cecek-ukel` (ubin sebar 160×160), `tumpal-tepi` (ubin tepi mendatar).

`DESIGN.md` menegaskan tekstur **tidak** masuk `ornamentBank`: ia dipasang sebagai
`mask-image` pada `.iv-section::before` dan diwarnai `--iv-accent` saat runtime, jadi ia
tidak bisa `currentColor` dan tidak boleh di-DrawSVG. Kalau pack ini nanti dipasang,
ubin-ubin ini masuk `apps/web/public/textures/`, bukan `apps/web/components/ornament/`.

## Dua bingkai kayon, dan kenapa keduanya ada

`bingkai-kayon` isinya penuh tatahan ukel. `bingkai-kayon-polos` interiornya bersih.
Keduanya ada karena di referensi kartu nama justru gunungan **tanpa** tatahan — tatahan
hidup di rumpun tepi bawah. Memakai bingkai berisi sebagai kartu nama membuat ukel menabrak
teks; itu dicoba di demo dan memang menabrak.

## Dua warna dari dua glyph

Referensi memakai gunungan dua warna: isian tan hangat di dalam garis cokelat gelap. Satu
glyph tidak boleh membawa dua warna — `DESIGN.md` mensyaratkan ornamen satu warna,
`currentColor`. Warna keduanya karena itu datang dari **glyph kedua**: `bidang-kayon` dan
`bidang-rumpun-kayon` adalah siluet padat berbentuk persis sama, dipasang di belakang
bingkai dan diwarnai sendiri oleh pemanggilnya. Demo memakainya di `.alas` / `.garis`.

Tanpa pasangan ini gunungan hanya terbaca sebagai outline di atas latar, dan itu bukan yang
ada di referensi.

## Batasnya

- **Pemakaian: `original-local-demo`.** Belum disetujui produksi. Memasang pack ini ke
  aplikasi adalah lingkup terpisah; pemetaannya disiapkan di `THEME.md` tapi tidak dikerjakan.
- **Font belum ditentukan.** Font referensi tidak teridentifikasi; lihat `LIMITS.md` di arsip
  riset. Pack ini tidak mengusulkan pasangan font dan tidak menyalin biner font apa pun.
- **Amplitudo motion adalah pilihan, bukan hasil ukur.** Yang terukur ease, durasi, jarak,
  dan zona. Amplitudo dalam piksel tidak terpisahkan dari opacity oleh metode pengukurannya.
