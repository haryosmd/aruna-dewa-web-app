# UI bridge — Taman Pasundan

- Invitation palette: paper `#f7f3e9`, ink `#263e31`, sage `#6d8065`, decorative gold `#a38348`. Token aplikasi tidak diubah.
- Demo memakai Georgia/Arial sistem agar offline. Rekomendasi integrasi Cormorant Garamond + Plus Jakarta Sans harus memakai sumber resmi dan lisensi; font kompetitor tidak disalin ke demo.
- Julang Ngapak adalah anchor cover; botanical kiri/kanan membingkai ruang baca. Divider mengakhiri narasi; angklung dan anyaman mengikat section acara. Galeri memperlihatkan seluruh delapan aset termasuk opsi bingkai.
- Bangunan rigid; sway hanya pada flora. Parallax 8–16 px; rotasi sekitar 1,5°; reveal 1,1 s. GSAP lokal digunakan ulang dari dependency proyek.
- Teks tersedia sejak HTML awal. Ornament decorative tidak dapat menangkap pointer, dan tidak menjadi accessible name. Tombol jeda minimal 44 px; reduced motion menonaktifkan loop dan smooth scroll.
- Integrasi berikutnya harus memetakan SVG ke bank dan glyph yang ada. Raster memerlukan dukungan eksplisit renderer, karena registry saat ini berisi komponen SVG. Tidak ada perubahan tersebut pada milestone ini.
