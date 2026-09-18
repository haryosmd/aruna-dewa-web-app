# SPEC — Ornament Builder v1

Disetujui pengguna melalui rencana implementasi 2026-09-17.

| ID | Kebutuhan dan penerimaan |
|---|---|
| OB-01 | Delapan URL seed diarsipkan dengan HTML, screenshot, stylesheet, aset, font, motion dan batas cakupan per halaman. |
| OB-02 | Unduhan memakai SHA-256, MIME/signature, byte count, dimensi, timestamp, sumber dan status. File respons error tidak menjadi gambar valid. |
| OB-03 | Deklarasi font dibedakan dari computed family dan font glyph terender; blokir Inspect ditentukan dengan bukti skrip/browser. |
| OB-04 | Skill lokal menyediakan audit, hunting budaya, kurasi, recreate SVG/raster, motion, katalog dan panduan integrasi. |
| OB-05 | Paket Sunda original berisi 6 SVG berlapis + 2 raster transparan; makna budaya dan flora pendamping dibedakan. |
| OB-06 | Demo lokal memakai GSAP, reveal/sway/parallax ringan, pause offscreen, tombol pause, reduced motion dan fallback tanpa JS. |
| OB-07 | Demo 360/768/1440 tanpa overflow, semua aset termuat, nol violation axe WCAG A/AA yang diuji. |
| OB-08 | Tidak ada API/DB/migrasi/entitlement baru; tidak memasang tema aplikasi; perubahan SMTP yang sudah ada tetap utuh. |

FE: hanya demo statis dalam docs, bukan route aplikasi. BE: tidak berubah. Permission: hanya membaca referensi publik, membuka cover dan scroll; tidak mengirim RSVP atau formulir. Research/original dipisahkan sesuai AGENTS.md.
