import { backdropTiles, backdropWeights, type BackdropChoice, type BackdropTile, type BackdropWeight } from '@aruna/contracts'

/**
 * Ubin latar undangan: keenam berkas di `public/textures/`, beserta ukuran dan kepekatannya.
 *
 * Sampai fase 58 keenamnya sudah ada di repo dan **hanya satu tersambung** — `sekar-damask`
 * ke `aruna-sekar`. Lima sisanya digambar, di-commit, dan tidak pernah tayang sekali pun.
 * Fase 59 membukanya ke pemilih, dan itulah seluruh perubahannya: tidak ada ubin baru digambar.
 *
 * Ubin dicat sebagai `mask-image` di `.iv-section::before`, bukan sebagai `background-image`.
 * Konsekuensinya warnanya datang dari `--iv-accent` yang sedang berlaku, jadi latar pilihan
 * pasangan ikut bergeser saat ia menggeser paletnya — bukan warna yang dipanggang ke berkas.
 */

export interface BackdropTileSpec {
  label: string
  src: string
  /**
   * Ukuran ulangan. Diambil dari `width` berkasnya sendiri kecuali `sekar-damask`, yang tayang
   * 180px sejak fase 53 dan **tidak boleh bergeser** — undangan yang sudah terbit memakainya.
   */
  size: string
}

export const backdropBank: Record<BackdropTile, BackdropTileSpec> = {
  catur: { label: 'Poleng', src: '/textures/catur.svg', size: '160px' },
  kawung: { label: 'Kawung', src: '/textures/kawung.svg', size: '200px' },
  kenanga: { label: 'Kenanga', src: '/textures/kenanga.svg', size: '180px' },
  'mega-mendung': { label: 'Mega mendung', src: '/textures/mega-mendung.svg', size: '220px' },
  'sekar-damask': { label: 'Damask sekar', src: '/textures/sekar-damask.svg', size: '180px' },
  songket: { label: 'Songket', src: '/textures/songket.svg', size: '260px' },
}

/**
 * Tiga tingkat kepekatan.
 *
 * `sedang` sengaja 0,07 — nilai yang `aruna-sekar` pakai sejak fase 53 — supaya memilih ubin
 * tanpa menyentuh kepekatannya menghasilkan latar yang sudah terbukti terbaca. `tegas` berhenti
 * di 0,11 karena laporan keterbacaan editor mengukur teks terhadap `--iv-bg` dan **tidak**
 * terhadap ubin; menaikkan angka ini menuntut `checkPalette()` diperluas lebih dulu.
 */
export const backdropOpacity: Record<BackdropWeight, number> = {
  halus: 0.04,
  sedang: 0.07,
  tegas: 0.11,
}

export const backdropWeightLabels: Record<BackdropWeight, string> = {
  halus: 'Halus',
  sedang: 'Sedang',
  tegas: 'Tegas',
}

/** Pilihan yang ditawarkan editor, berurutan: ikut tema, tanpa latar, lalu keenam ubin. */
export const selectableBackdrops: { id: BackdropChoice; label: string; src?: string }[] = [
  { id: 'tema', label: 'Ikut tema' },
  { id: 'tanpa', label: 'Tanpa latar' },
  ...backdropTiles.map(id => ({ id: id as BackdropChoice, label: backdropBank[id].label, src: backdropBank[id].src })),
]

export function toBackdrop(value: unknown): BackdropChoice | undefined {
  return typeof value === 'string' && (['tema', 'tanpa', ...backdropTiles] as readonly string[]).includes(value)
    ? (value as BackdropChoice)
    : undefined
}

export function toBackdropWeight(value: unknown): BackdropWeight | undefined {
  return typeof value === 'string' && (backdropWeights as readonly string[]).includes(value)
    ? (value as BackdropWeight)
    : undefined
}

export interface BackdropVars {
  '--iv-backdrop-mask': string
  '--iv-backdrop-size': string
  '--iv-backdrop-opacity': string
}

/**
 * Ketiga var latar, dari pilihan pasangan kalau ada dan dari tema kalau tidak.
 *
 * **Cabang "tidak ada pilihan" wajib menghasilkan nilai yang identik dengan sebelum fase 59.**
 * Itu bukan kehati-hatian berlebihan: tiap dokumen yang sudah terbit tidak membawa
 * `tokens.backdrop`, jadi cabang inilah yang melayani seluruh undangan yang sedang dibaca tamu
 * hari ini. `apps/web/test/backdrops.spec.ts` menguncinya dengan membandingkan kelima tema hidup.
 */
export function backdropStyle(
  pilihan: BackdropChoice | undefined,
  bobot: BackdropWeight | undefined,
  tema: { motif?: { src: string; size: string; opacity: number } } | undefined,
): BackdropVars {
  if (!pilihan || pilihan === 'tema') {
    return {
      '--iv-backdrop-mask': tema?.motif ? `url("${tema.motif.src}")` : 'none',
      '--iv-backdrop-size': tema?.motif?.size ?? '240px',
      '--iv-backdrop-opacity': String(tema?.motif?.opacity ?? 0),
    }
  }

  if (pilihan === 'tanpa') {
    return { '--iv-backdrop-mask': 'none', '--iv-backdrop-size': '240px', '--iv-backdrop-opacity': '0' }
  }

  const ubin = backdropBank[pilihan]
  return {
    '--iv-backdrop-mask': `url("${ubin.src}")`,
    '--iv-backdrop-size': ubin.size,
    '--iv-backdrop-opacity': String(backdropOpacity[bobot ?? 'sedang']),
  }
}
