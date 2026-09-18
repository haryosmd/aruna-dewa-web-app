# Provenance aset original

Tanggal: 2026-09-17. Dua ilustrasi dibuat dengan built-in image_gen, bukan Canva atau salinan aset kompetitor. Enam SVG ditulis sebagai path/group original dalam `tooling/create-sunda.mjs`.

## Rangkaian bunga

Prompt awal:

Create ONE original botanical ornament asset for a premium Sundanese wedding invitation, not a whole invitation. An airy asymmetric crescent spray of small ivory jasmine blossoms, a few warm cream buds and sage-green leaves on delicate ochre stems, fine botanical watercolor with visible pigment and refined edges, softly dimensional, elegant restrained antique botanical plate quality. Palette ivory, muted sage, deep forest green, small antique gold accents. Landscape arrangement sweeping from lower left to upper right, generous space between clusters, all foliage and petals fully within frame with 8% transparent margin. Absolutely transparent alpha background, no paper background, no shadow behind the entire asset, no typography, no logos, no frame, no watermark. This flora is decorative companion imagery, not a claimed sacred or uniquely Sundanese symbol. Output a high-resolution PNG with real transparency. Save output for use in local project.

Revisi terpilih (`rangkaian-bunga-final.png`, WebP `rangkaian-bunga.webp`):

Edit this botanical ornament preserving the flowers, leaves, stems, exact shape and painterly detail. Remove ALL the diffuse olive/yellow glow, haze, blurred shadows and background around the botanical shapes. The background must be fully transparent (alpha zero) right up to the actual crisp yet naturally antialiased edges of each leaf, petal and stem. No colored wash outside the plant silhouette. Keep soft pigment texture only INSIDE the botanical shapes. Do not add anything. Return transparent PNG.

Output awal tetap disimpan sebagai `rangkaian-bunga.png` untuk provenance, tetapi bukan varian yang dipilih katalog. Pengecekan alpha dan browser memastikan cutout, bukan latar kotak. RGB pada pixel alpha nol tidak memengaruhi komposisi browser.

## Layer dedaunan

Prompt:

Create ONE original ornament cutout asset: a luxuriant yet airy cluster of bamboo leaves mixed with delicate fern fronds, inspired by a misty West Java garden, for premium Sundanese wedding stationery. Fine hand-painted botanical watercolor, muted sage, eucalyptus green, deep forest green, tiny antique ochre stems. Asymmetric lower-right corner composition, arching upward and left, no pot, no ground, no flowers, no buildings. Detailed organic veining and translucent pigment, dimensional foliage, elegant and natural rather than clipart. Keep every leaf inside canvas with 8% empty margin. Genuinely transparent alpha background: no white paper, no painted backdrop, no checkerboard baked into the image. No text, no logos, no watermark. Output high-resolution PNG. Decorative garden foliage; do not claim this is a sacred or uniquely Sundanese symbol.

Output terpilih: `layer-dedaunan.png` dan turunan `layer-dedaunan.webp`.

## Persiapan dan penggunaan

Konversi WebP menggunakan sharp, quality 88, alphaQuality 100, lebar maksimum 1200 px; source PNG dipertahankan. Metadata ukuran, checksum dan role budaya ada dalam catalog.json. Tidak ada tracking raster otomatis atau bitmap yang disamarkan sebagai SVG.

GSAP demo disalin dari dependency lokal proyek (versi tercantum pada header file); bukan script kompetitor. Font demo menggunakan font sistem. Perlu sumber font resmi saat integrasi tema yang memilih font khusus.
