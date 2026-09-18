# Provenance — impor Canva "Merah Emas"

Dibuat 2026-09-18 atas permintaan pemilik, yang mengirim 1 berkas SVG hasil ekspor dari akun
Canva Pro-nya sendiri.

**Ini bukan aset original.** Batas lisensinya sama dengan pack impor lain di repo ini; uraian
lengkapnya di [`../canva-cokelat-krem/PROVENANCE.md`](../canva-cokelat-krem/PROVENANCE.md) dan tidak
diulang di sini. Semuanya `"usage": "imported-local-demo"`, tidak masuk `apps/web/public` maupun
`ornamentBank`. Aturan konversinya di [`../lib/convert.mjs`](../lib/convert.mjs); tiap `d` disalin
karakter per karakter dan diuji dengan pemeriksaan "koordinat utuh".

| | |
|---|---|
| Template | *Merah Emas Tradisional Pernikahan Undangan* |
| Berkas mentah | `source/` — 1 berkas, disimpan apa adanya |
| Diterima | 2026-09-18 |

## Satu aset, dan kenapa tidak dipecah

`kayon-sudut-merah` — kayon merah-emas bertumpuk dengan sulur batik di bawahnya, disajikan sebagai
raster ber-alpha (isinya bitmap di dalam SVG sumbernya).

Permintaan pemilik adalah memecah berkas yang memuat lebih dari satu benda. Berkas ini terlihat
seperti dua benda — kayon di atas, sulur di bawah — tapi **profil alpha-nya menerus dari y 0 sampai
237 tanpa satu pun celah**. Keduanya saling menimpa di sekitar y 170–200. Memotongnya di situ bukan
memisahkan dua ornamen, melainkan mengiris keduanya. Jadi tidak dipecah, dan ini alasannya.
