import { defineFontProvider, providers } from 'unifont'

/**
 * Provider Google yang hanya mengeluarkan woff2.
 *
 * MASALAHNYA. `unifont` mengambil CSS dari Google dua kali, dengan dua user-agent: satu
 * modern, yang dijawab woff2 tersubset dan ber-`unicode-range`, dan satu lawas, yang
 * dijawab woff utuh TANPA `unicode-range`. Keduanya ikut ditulis ke CSS hasil build, dan
 * yang lawas mendarat paling belakang.
 *
 * Aturan pemilihan @font-face memilih deklarasi TERAKHIR yang cocok untuk sebuah titik kode.
 * Face full-range selalu cocok. Jadi woff2-nya diunduh saat build, ikut masuk `_fonts/`,
 * lalu tidak pernah dipakai satu pun pengunjung — semua orang mengunduh woff yang lebih
 * besar. Terukur di produksi pada 2026-09-16: landing mengirim 415 KB font, padahal padanan
 * woff2-latin-nya 296 KB.
 *
 * Membuangnya di sini, bukan menambal urutan di CSS, karena face lawas itu memang tidak ada
 * gunanya: dukungan woff2 sudah di atas 99%, dan browser yang tidak punya woff2 jatuh ke
 * `fonts.defaults.fallbacks` di `nuxt.config.ts` — halamannya tetap terbaca, hanya dengan
 * Georgia dan system-ui.
 *
 * VERSI `unifont` DIPATOK PERSIS di `package.json` (0.4.1), bukan dengan `^`. Paket ini masuk
 * lewat `@nuxt/fonts` dan tidak pernah kita panggil di tempat lain; kalau pnpm sampai memasang
 * dua salinan berbeda, pembungkus ini akan membungkus salinan yang bukan dipakai modulnya dan
 * gagal tanpa suara. Saat `@nuxt/fonts` dinaikkan, samakan patokannya — dan periksa ulang
 * langkah verifikasi di bawah, karena perilaku dua-user-agent itu bug hulu yang bisa hilang
 * sendiri.
 *
 * MEMERIKSANYA: setelah `pnpm build`, di `.output/public/_nuxt/entry.*.css` tidak boleh ada
 * satu pun `format("woff")`, dan `.output/public/_fonts` harus berisi woff2 saja.
 *
 * NAMANYA HARUS TETAP `google`. `@nuxt/fonts` memanggil
 * `unifont.resolveFont(family, opts, [...namaProvider])`, dan unifont menyimpan provider-nya
 * di stack ber-kunci `_name`. Nama lain membuat daftar itu tidak pernah cocok, dan
 * `{ provider: 'google' }` di tiap entri `fonts.families` juga akan meleset — tanpa error,
 * hanya font yang diam-diam hilang.
 */
export const googleWoff2 = defineFontProvider<Parameters<typeof providers.google>[0]>('google', async (options, ctx) => {
  const inner = await providers.google(options)(ctx)
  if (!inner) return

  return {
    ...inner,
    async resolveFont(family, resolveOptions) {
      const result = await inner.resolveFont(family, resolveOptions)
      if (!result) return result

      const fonts = result.fonts.filter(font =>
        font.src.some(source => 'format' in source && source.format === 'woff2'),
      )

      // Kalau penyaringan menghabiskan semuanya, keluarga itu memang tidak punya woff2 —
      // lebih baik kembalikan apa adanya daripada menghilangkan fontnya diam-diam.
      return { ...result, fonts: fonts.length > 0 ? fonts : result.fonts }
    },
  }
})
