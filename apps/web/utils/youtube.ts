/**
 * Mengenali tautan YouTube dan membangun alamat sampul serta sematannya (fase 79).
 *
 * Sampai fase ini bagian Video hanya menaruh `<a target="_blank">`: tontonan pindah tab, dan
 * satu-satunya hal yang bisa kita lakukan soal musik latar adalah menjedanya di dalam klik itu.
 * Menyematkan iframe langsung akan membalikkan keadaan jadi lebih buruk — tombol play ada di
 * dalam dokumen lintas-origin, jadi klik tamu tidak menghasilkan event apa pun di halaman kita,
 * dan yang ditimpa musik latar adalah ijab kabul.
 *
 * Jawabannya sampul yang digambar sendiri: kliknya milik kita, jadi musik dijeda lebih dulu dan
 * iframe baru dipasang sesudahnya. Berkas ini bagian murni dari jawaban itu — nol DOM, nol
 * `window`, jadi ia bisa diuji sebagai fungsi biasa di `apps/web/test/youtube.spec.ts`.
 *
 * **Catatan untuk yang memasang Content-Security-Policy nanti.** Hari ini tidak ada CSP di repo:
 * `Caddyfile` hanya memasang HSTS, `X-Content-Type-Options`, `X-Frame-Options`, dan
 * `Referrer-Policy`, dan helmet di `apps/api/src/main.ts` hanya menyentuh respons API — bukan
 * HTML tamu yang dilayani Nitro. `X-Frame-Options: SAMEORIGIN` mengatur siapa yang boleh
 * mem-FRAME kita, bukan siapa yang boleh kita frame, jadi sematan ini jalan. Begitu CSP dipasang
 * di snippet `(keamanan)` Caddyfile, ia butuh `frame-src https://www.youtube-nocookie.com` dan
 * `img-src https://i.ytimg.com` — tanpa keduanya bagian Video jadi kotak kosong tanpa galat yang
 * menunjuk ke sini.
 */

/**
 * Sebelas karakter, charset tetap. Ketat dengan sengaja: nilai ini masuk ke `src` sebuah iframe,
 * jadi apa pun yang lolos dari sini adalah alamat yang kita muat atas nama tamu.
 */
const ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Host yang kita akui. Dicocokkan sebagai himpunan, bukan lewat `endsWith('youtube.com')` —
 * `evil-youtube.com` dan `youtube.com.penipu.id` lolos pemeriksaan akhiran yang ceroboh.
 */
const HOST = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com',
])

/** Segmen pertama yang berarti "yang sesudahnya adalah id video". */
const JALUR = new Set(['embed', 'live', 'shorts', 'v'])

/**
 * Id video dari sebuah tautan, atau `''` kalau itu bukan tautan video YouTube.
 *
 * Dibangun di atas `new URL()`, tidak pernah dengan memotong string mentah: parser URL yang
 * ditulis tangan adalah cara paling umum sebuah allowlist host berubah jadi lubang.
 */
export function youtubeId(value: string): string {
  let url: URL
  try {
    url = new URL(String(value ?? '').trim())
  } catch {
    return ''
  }
  // `javascript:`, `data:`, dan kerabatnya berhenti di sini, sebelum host diperiksa.
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''

  const host = url.hostname.toLowerCase()
  const segmen = url.pathname.split('/').filter(Boolean)

  // youtu.be/<id> — id-nya ada di jalur, bukan di kueri.
  if (host === 'youtu.be' || host === 'www.youtu.be') return sahkan(segmen[0])

  if (!HOST.has(host)) return ''
  // /watch?v=<id>. `/playlist?list=…` tidak punya `v`, jadi ia jatuh ke '' dengan sendirinya.
  if (segmen[0] === 'watch') return sahkan(url.searchParams.get('v') ?? '')
  if (segmen[0] && JALUR.has(segmen[0])) return sahkan(segmen[1])
  return ''
}

const sahkan = (value: string | undefined): string => (value && ID.test(value) ? value : '')

/**
 * Sampul video.
 *
 * `hqdefault`, **bukan** `maxresdefault`: yang terakhir 404 untuk setiap video yang tidak pernah
 * diunggah dalam resolusi tinggi, dan 404 itu muncul sebagai kotak kosong di undangan pernikahan
 * seseorang. `hqdefault` selalu ada. Harganya 480×360 — 4:3 berpita hitam atas-bawah — yang
 * ditutup pemanggil dengan `aspect-ratio: 16/9` plus `object-fit: cover`. Jangan "diperbaiki".
 */
export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

/**
 * Alamat sematan. `-nocookie` supaya tidak ada cookie pelacak yang dipasang atas nama tamu, dan
 * `autoplay=1` yang sah karena pemanggil hanya memasang iframe ini di dalam klik tamu sendiri.
 * `rel=0` menahan YouTube menawarkan video kanal lain di akhir — bukan tempatnya di sini.
 */
export function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
}
