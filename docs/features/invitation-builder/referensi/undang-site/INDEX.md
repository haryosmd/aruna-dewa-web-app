# Referensi undang.site

Folder ini dijanjikan `../../FASE-72.md:2` saat fase 72 ditulis, tapi tidak pernah dibuat —
seluruh hasil bedahnya hidup sebagai prosa di `FASE-72.md`. Dibuat 2026-09-22 (fase 74.0)
supaya hasil bedah itu punya bentuk yang bisa dibandingkan baris per baris dengan kode,
bukan hanya dibaca sebagai paragraf.

**Isinya teks, dengan sengaja.** `.gitignore:12-26` menjaga png/jpg/html/txt di dalam `docs/`
tetap di luar git: yang ikut rilis adalah catatannya, bukan bahannya. Jadi tangkapan layar
tidak disimpan di sini — yang disimpan adalah apa yang terbaca dari halamannya.

| Berkas | Isi |
|---|---|
| [`SECTIONS.md`](SECTIONS.md) | Dua belas bagian halaman terbit referensi, dengan teksnya, dibandingkan dengan `createEleganceSections()` |
| [`RENDER.md`](RENDER.md) | Bagaimana referensi merendernya: enam elemen `<section>`, bukan dua belas |
| [`ASSETS.md`](ASSETS.md) | Font dan audio yang benar-benar dimuat halamannya |

## Sumber

- Halaman terbit **publik**: `https://arunadewa.undang.site/` — dibaca ulang 2026-09-22
  (teks, pohon DOM, dan font terkomputasi). Inilah satu-satunya sumber yang bisa diverifikasi
  ulang kapan saja oleh sesi mana pun.
- Editor `https://undang.site/editor/hjydg/<id>` menuntut login Google dan **tidak** dibuka.
  Yang kita tahu tentang editornya berasal dari sebelas tangkapan layar pemilik, yang
  dirangkum `FASE-72.md:42-60` dan `:295-330`.
- **Sebelas tangkapan layar itu tetap di luar git**, pola yang sama dengan
  `../../sources/INDEX.md`: berkasnya ada di arsip lokal pemilik, catatannya ada di sini.

## Kenapa ini penting

Referensi adalah **acuan struktur**, bukan aset yang boleh disalin. Teks bawaan kita memang
mirip karena keduanya memakai kalimat undangan pernikahan Indonesia yang lazim (bismillah,
salam, QS. Ar-Rum: 21); yang kita tiru dengan sengaja adalah **daftar dan urutan bagiannya**,
sesuai keputusan pemilik 2026-09-19 di `../../FASE-72.md:8-17`. Foto, lagu, dan nama pada
halaman referensi milik pemiliknya sendiri dan tidak pernah masuk produk.
