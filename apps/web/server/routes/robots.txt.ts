/**
 * Dibuat sebagai rute, bukan berkas statis di `public/`, karena hanya rute yang bisa membedakan
 * produksi dari staging. Berkas statis akan mengundang perayap ke setiap lingkungan yang pernah
 * kita nyalakan, dan staging yang terindeks bersaing dengan produksi di hasil pencarian.
 *
 * Menambah host produksi baru berarti satu baris di sini — perubahan yang terlihat di review,
 * bukan variabel lingkungan yang bisa salah diam-diam.
 */
const INDEXABLE_HOSTS = new Set(['arunadewa.id', 'www.arunadewa.id'])

/**
 * `Disallow` bukan `noindex`, dan perbedaannya menentukan di sini.
 *
 * `Disallow` hanya mencegah perayapan; URL yang ditautkan dari luar tetap bisa muncul di hasil
 * pencarian tanpa isi. Dan yang di-`Disallow` tidak pernah dibaca isinya — termasuk `noindex`-nya.
 * Karena itu `/i/*` sengaja **tidak** ada di daftar ini: halaman undangan harus tetap boleh
 * dirayapi supaya `noindex` di kepalanya terbaca dan benar-benar mengeluarkannya dari indeks.
 *
 * Yang ditutup di sini adalah permukaan yang memang tidak punya isi untuk siapa pun: halaman
 * auth, dasbor, dan URL berparameter — `?to=` membawa nama tamu, `?g=` membawa token tamu, dan
 * `?tema=`/`?galeri=` melipatgandakan halaman demo jadi puluhan URL yang isinya nyaris sama.
 */
const PRODUCTION_ROBOTS = `User-agent: *
Disallow: /dashboard/
Disallow: /order
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email
Disallow: /*?g=
Disallow: /*?to=
Disallow: /*?tema=
Disallow: /*?galeri=
`

const BLOCK_EVERYTHING = `User-agent: *
Disallow: /
`

function hostOf(base: string): string {
  try {
    return new URL(base).host
  } catch {
    return ''
  }
}

export default defineEventHandler((event) => {
  const { webBase } = useRuntimeConfig(event).public
  const host = hostOf(String(webBase ?? ''))
  const indexable = INDEXABLE_HOSTS.has(host)

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  if (!indexable) return BLOCK_EVERYTHING

  return `${PRODUCTION_ROBOTS}\nSitemap: ${String(webBase).replace(/\/$/u, '')}/sitemap.xml\n`
})
