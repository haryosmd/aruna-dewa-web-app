# Case-study dasbor di landing

`LandingDashboard` memakai **tangkapan layar dasbor yang sungguhan**, bukan tiruan yang
digambar tangan.

## Kenapa bukan tiruan

Tiruan berbohong pelan-pelan. Ia tidak ikut berubah saat dasbornya berubah, jadi setelah
beberapa rilis calon pembeli mengambil keputusan berdasarkan layar yang tidak pernah ada —
dan pasangan yang baru membeli menemukan produk yang berbeda dari yang dijanjikan. Foto
layar asli punya sifat yang berlawanan: begitu usang, ia terlihat usang.

## Regenerasi — WAJIB setiap dasbor berubah

Kalau menyentuh apa pun di `apps/web/pages/dashboard/`, jalankan ulang:

```bash
pnpm capture:dashboard
```

Prasyarat:

1. `pnpm test:integration` sudah pernah dijalankan — itu yang membuat akun QA terisolasi
   dan menulis `.data/qa-account.json` (email, kata sandi, `invitationId`, slug).
2. Server web berjalan (`pnpm dev`) dan API-nya hidup.
3. Port selain 3000: `E2E_BASE_URL=http://127.0.0.1:3200 pnpm capture:dashboard`.

Skrip memakai ulang alur login yang sama dengan `tests/e2e/dashboard.spec.ts`, memotret
lima layar di dua ukuran, dan menulisnya ke `apps/web/public/dashboard/`:

| Berkas | Layar |
|---|---|
| `ringkasan-*.webp` | Ringkasan undangan |
| `editor-*.webp` | Editor: sidebar section + panel pratinjau |
| `tamu-*.webp` | Kelola tamu, termasuk impor |
| `rsvp-*.webp` | RSVP &amp; ucapan |
| `pesanan-*.webp` | Pesanan |

Setiap layar diambil pada `deviceScaleFactor: 2` dengan `reducedMotion: 'reduce'`, supaya
potretnya menangkap keadaan istirahat yang sama, bukan satu frame acak di tengah reveal.

## Sesudah capture: periksa ulang koordinat callout

`Dashboard.vue` menaruh pill callout dengan **persen** (`{ x, y }` per layar), jadi pill itu
menunjuk ke tata letak — dan tata letak yang berubah justru alasan potretnya diambil ulang.
Fase 11 memindahkan jalur pratinjau di editor, dan `x: 79` yang dulu tepat di tengah pratinjau
berubah jadi menunjuk ke ruang kosong.

Buka potret yang baru, cari elemen yang dimaksud callout, hitung pusatnya sebagai persen dari
lebar potret, lalu periksa dua hal sebelum menerimanya:

1. Pill-nya benar-benar menutupi elemen yang dimaksud.
2. Tepi pill masih di dalam potret — lebarnya `max-width: 13rem` dengan
   `translate(-50%, -50%)`, jadi titik di atas ~90% akan menggantung di tepi kanan.

Kesimpulan "koordinatnya masih pas" tetap harus datang dari pengukuran. REV-008 memindahkan rel
pratinjau dua kali dan koordinatnya memang tidak perlu diubah — tapi itu baru diketahui setelah
diukur (77,5%–92,5%), bukan sebelum.

## Format

Skrip menulis **WebP langsung** (`sharp`, `quality: 84`, `effort: 6`) — tidak ada langkah
konversi manual. Sebelumnya berkasnya PNG dengan satu perintah `cwebp` opsional di akhir
skrip, yang tidak pernah dijalankan karena `cwebp` tidak terpasang, jadi landing memuat
1,38 MB PNG. Sepuluh berkas yang sama sebagai WebP: **471 KB**.

Kalau menambah layar baru, jangan kembali ke PNG di `apps/web/public/dashboard/` — markup
di `components/landing/Dashboard.vue` menunjuk ke `.webp`.

## Yang tidak boleh masuk potret

Akun QA memakai data contoh, tapi tetap periksa sebelum commit — potret ini **publik**:

- Tidak ada email atau nomor telepon sungguhan di daftar tamu.
- Tidak ada nomor rekening sungguhan di bagian hadiah.
- Tidak ada token tamu yang terlihat di bilah alamat.
