/**
 * Tiga rute pemasaran, ditulis tangan.
 *
 * Slug undangan tidak pernah masuk ke sini, dan itu bukan kelalaian: undangan memuat nama
 * pasangan, tanggal, dan alamat gedung, dan halamannya sengaja `noindex`. Sitemap yang
 * menyebutnya akan mengundang persis apa yang dihindari halamannya.
 */
/**
 * `/order` sengaja tidak di sini meski ia halaman jualan: middleware `auth` mengembalikan 302
 * ke `/login` untuk siapa pun yang belum masuk, jadi perayap tidak pernah melihat isinya.
 * Mencantumkannya hanya menghasilkan "Page with redirect" di Search Console. Harga dan paket
 * sudah tayang di beranda.
 */
const MARKETING_ROUTES = ['/', '/i/demo'] as const

export default defineEventHandler((event) => {
  const base = String(useRuntimeConfig(event).public.webBase ?? '').replace(/\/$/u, '')
  // Tanpa garis miring tambahan di belakang: itu URL lain bagi perayap, dan bukan yang
  // ditunjuk canonical halamannya.
  const urls = MARKETING_ROUTES.map(route => `  <url><loc>${base}${route}</loc></url>`).join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
})
