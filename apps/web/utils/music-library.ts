/**
 * Pustaka musik bawaan.
 *
 * Ada di lapisan web, sejajar dengan `themePresentation` di `utils/theme.ts`: kontrak tidak
 * perlu tahu daftar lagu, dan dokumen undangan hanya menyimpan URL-nya. Kalau sebuah lagu
 * dicabut dari pustaka, undangan yang sudah memakainya tetap berbunyi selama berkasnya masih
 * ada — itulah sebabnya yang disimpan URL, bukan `trackId`.
 *
 * Berkasnya disajikan Nuxt dari `public/audio/`, jadi path relatif `/audio/…` — lolos
 * `assertSafeUrls` di API tanpa perlu lewat jalur MediaAsset sama sekali.
 *
 * Provenance, lisensi, checksum, dan resep potongnya ada di
 * `docs/features/invitation-builder/sources/MUSIC.md`. **Hanya CC0/PD** yang boleh masuk sini.
 */
export interface MusicTrack {
  id: string
  title: string
  /** Ditulis apa adanya di pemutar. Untuk PD pun tetap dipasang — tamu berhak tahu ini lagu apa. */
  credit: string
  mood: string
  seconds: number
  url: string
}

export const musicLibrary: MusicTrack[] = [
  {
    id: 'gymnopedie-1',
    title: 'Gymnopédie No. 1',
    credit: 'Erik Satie · gitar oleh Michael Laucke',
    mood: 'Tenang, melangkah pelan',
    seconds: 120,
    url: '/audio/gymnopedie-1.mp3',
  },
  {
    id: 'gymnopedie-3',
    title: 'Gymnopédie No. 3',
    credit: 'Erik Satie · gitar oleh Michael Laucke',
    mood: 'Tenang, sedikit sendu',
    seconds: 120,
    url: '/audio/gymnopedie-3.mp3',
  },
  {
    id: 'etude-harpa',
    title: 'Étude "Harpa", Op. 25 No. 1',
    credit: 'Frédéric Chopin · piano oleh Edward Neeman',
    mood: 'Mengalir, hangat',
    seconds: 120,
    url: '/audio/etude-harpa.mp3',
  },
  {
    id: 'esta-tarde',
    title: 'Esta Tarde Vi Llover',
    credit: 'aransemen piano oleh Mike Luisi',
    mood: 'Romantis, lambat',
    seconds: 120,
    url: '/audio/esta-tarde.mp3',
  },
  {
    id: 'balletto',
    title: 'Balletto "Il conte Orlando"',
    credit: 'Ottorino Respighi',
    mood: 'Khidmat, kuno',
    seconds: 119,
    url: '/audio/balletto.mp3',
  },
  {
    id: 'invensi-8',
    title: 'Invensi No. 8, BWV 779',
    credit: 'J.S. Bach · US Air Force Strolling Strings',
    mood: 'Riang, gesekan dawai',
    seconds: 61,
    url: '/audio/invensi-8.mp3',
  },
  {
    id: 'mazurka-g',
    title: 'Mazurka No. 42 in G',
    credit: 'Frédéric Chopin · piano oleh Edward Neeman',
    mood: 'Riang, ringan',
    seconds: 81,
    url: '/audio/mazurka-g.mp3',
  },
]

export function trackByUrl(url: string): MusicTrack | undefined {
  return musicLibrary.find(track => track.url === url)
}

/** "2 menit" / "1 menit 21 detik" — dibaca, bukan dihitung. */
export function trackLength(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (!minutes) return `${rest} detik`
  return rest ? `${minutes} menit ${rest} detik` : `${minutes} menit`
}
