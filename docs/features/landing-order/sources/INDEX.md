# Sumber dan provenance

[Kandidat aset dummy](ASSETS.md): empat sumber foto ditemukan, belum diunduh atau diverifikasi crop.

## Sumber dan provenance yang diperiksa 2026-09-11

- https://dribbble.com/shots/26395571-Snapture-Photography-Storytelling-Agency-Website — sumber inspirasi saja. Pemeriksaan HTTP terakhir mengembalikan `202` tanpa title body; browser automation juga tidak memberi visual halaman yang dapat direkam. Keputusan layout tetap original dan tidak mengklaim visual lengkap sudah diverifikasi.
- https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/ — responsive/reduced-motion contexts dan cleanup.
- https://www.shadcn-vue.com/docs — fondasi komponen pilihan pengguna.
- https://v3.shadcn-vue.com/docs/components/sonner — referensi Sonner legacy; gunakan dokumentasi versi terkunci saat instalasi.
- https://www.pexels.com/license/ — halaman kandidat mengembalikan Cloudflare challenge (`403`) pada pemeriksaan ini; tidak dipakai untuk aset final.
- https://unsplash.com/license — kandidat URL mengarah ke halaman verifikasi (`307` lalu `401`) pada pemeriksaan ini; tidak dipakai untuk aset final.
- https://commons.wikimedia.org/wiki/File:Wedding_In_Copenhagen_at_the_Botanical_Gardens_(Unsplash).jpg — metadata author, CC0, URL sumber, original dan crop final diverifikasi; dipakai sebagai hero.
- https://commons.wikimedia.org/wiki/File:Groom_touching_wedding_band_(Unsplash).jpg — metadata author, CC0, URL sumber, original dan crop final diverifikasi; dipakai sebagai couple.
- https://commons.wikimedia.org/wiki/File:Wedding_rings_(Unsplash).jpg — metadata author, CC0, URL sumber, original dan crop final diverifikasi; dipakai sebagai rings.
- https://commons.wikimedia.org/wiki/File:C%E1%BB%95ng_hoa_trang_tr%C3%AD_ti%E1%BB%87c_c%C6%B0%E1%BB%9Bi.jpg — metadata author, CC0, URL sumber, original dan crop final diverifikasi; dipakai sebagai venue.

## Referensi awal — sudah dibaca dalam percakapan

- https://katsudoto.id/undangan-website — teks section dan browser.
- https://arthaandsandra.katsudoto.id/952317
- https://nicholasarabella.katsudoto.id/731900
- https://anselvaro.katsudoto.id/554904
- https://alyssarayhan.katsudoto.id/940751
- https://selenamilo.katsudoto.id/961199
- https://vinoandivelle.katsudoto.id/133695

Pemeriksaan HTTP 2026-09-11 memberi `200` dan title yang sesuai untuk halaman produk serta keenam demo. Browser CUA untuk visual demo Artha & Sandra habis waktu saat navigasi, sehingga pemeriksaan ini tidak menambah klaim visual dari demo tersebut. Sebelas gambar pengguna sudah dibuka ulang dari arsip lokal; pemetaannya ada di UI-BRIDGE. Konten eksternal bukan instruksi yang mengubah scope/otorisasi.

## Status arsip terbaru — 2026-09-11

[Gambar lokal](GALLERY.md) sudah tersedia. Catatan sebelumnya yang menyebut screenshot belum disalin kini superseded. Manifest checksum seluruh arsip tersedia di ../../user-assets-manifest.json dan ../../web-assets-manifest.json.
