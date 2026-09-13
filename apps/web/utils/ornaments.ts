/**
 * Bank ornamen undangan.
 *
 * Setiap entri menunjuk ke satu komponen SVG di `components/ornament/`, yang semuanya
 * memakai `currentColor` sehingga ikut palet pasangan. Registry ini yang membuat ornamen
 * bisa dipilih per tema, bukan dipaku satu-satu di dalam renderer.
 *
 * Sejak rombak 2026-09-12 ornamen digambar **bermassa**: badan bentuk `fill="currentColor"`
 * bertanda `data-mass`, detail bergaris `stroke-width` 2,5–4 dalam satuan viewBox bertanda
 * `data-draw`. Sebelumnya semuanya `fill="none"` dengan stroke 1,1–1,4, yang di titik
 * pakainya hanya menyisakan 0,11–0,60px tinta — praktis tidak terlihat.
 *
 * Konsekuensinya: **DrawSVG hanya menganimasi stroke**, jadi bentuk berisi tidak bisa
 * diungkap dengannya. `bloomIn`/`cascadeIn` di `useArunaMotion()` yang menggantikannya.
 */

export type OrnamentCategory =
  | 'frame' | 'divider' | 'corner' | 'floral' | 'monogram' | 'motif' | 'symbol'
  | 'layer' | 'venue' | 'attire' | 'seal'

/**
 * Jangkar sebuah layer. Bukan posisi CSS-nya — `OrnamentField` yang menerjemahkan slot
 * ini menjadi satu atau beberapa penempatan (misalnya `cluster` dipasang empat kali dan
 * dicerminkan), sekaligus memilih primitif motion yang cocok.
 */
export type LayerSlot = 'bloom' | 'cascade' | 'crown' | 'cluster' | 'swag'

export interface OrnamentEntry {
  /** Nama komponen Vue yang diauto-import Nuxt. */
  component: string
  name: string
  category: OrnamentCategory
  /** Lebar dibagi tinggi viewBox — dipakai untuk memilih kelas ukuran yang tidak menggepengkan bentuk. */
  ratio: number
  /** Hanya untuk kategori `layer`. */
  slot?: LayerSlot
}

const layer = (component: string, name: string, slot: LayerSlot, ratio: number) =>
  ({ component, name, category: 'layer', ratio, slot }) as const

export const ornamentBank = {
  // Frame
  'arch': { component: 'OrnamentArch', name: 'Gerbang ganda', category: 'frame', ratio: 300 / 420 },
  'frame-oval': { component: 'OrnamentFrameOval', name: 'Oval', category: 'frame', ratio: 300 / 420 },
  'frame-ogee': { component: 'OrnamentFrameOgee', name: 'Gerbang runcing', category: 'frame', ratio: 300 / 420 },
  'frame-deco': { component: 'OrnamentFrameDeco', name: 'Art deco', category: 'frame', ratio: 300 / 420 },
  'frame-rounded': { component: 'OrnamentFrameRounded', name: 'Sudut lengkung', category: 'frame', ratio: 300 / 420 },
  'frame-rose': { component: 'OrnamentFrameRose', name: 'Jendela mawar', category: 'frame', ratio: 1 },
  'frame-tumpal': { component: 'OrnamentFrameTumpal', name: 'Gerbang tumpal', category: 'frame', ratio: 300 / 420 },
  'frame-line': { component: 'OrnamentFrameLine', name: 'Garis polos', category: 'frame', ratio: 300 / 420 },
  'frame-gunungan': { component: 'OrnamentFrameGunungan', name: 'Gunungan', category: 'frame', ratio: 300 / 420 },
  'frame-gonjong': { component: 'OrnamentFrameGonjong', name: 'Gerbang gonjong', category: 'frame', ratio: 300 / 420 },
  'frame-mendung': { component: 'OrnamentFrameMendung', name: 'Gerbang mendung', category: 'frame', ratio: 300 / 420 },
  'frame-kenanga': { component: 'OrnamentFrameKenanga', name: 'Gerbang kenanga', category: 'frame', ratio: 300 / 420 },
  'frame-bentar': { component: 'OrnamentFrameBentar', name: 'Candi bentar', category: 'frame', ratio: 300 / 420 },

  // Divider
  'divider-leaf': { component: 'OrnamentDivider', name: 'Daun', category: 'divider', ratio: 8 },
  'divider-diamond': { component: 'OrnamentDividerDiamond', name: 'Berlian', category: 'divider', ratio: 8 },
  'divider-row': { component: 'OrnamentDividerRow', name: 'Berjajar', category: 'divider', ratio: 8 },
  'divider-knot': { component: 'OrnamentDividerKnot', name: 'Simpul', category: 'divider', ratio: 8 },
  'divider-wave': { component: 'OrnamentDividerWave', name: 'Ombak', category: 'divider', ratio: 8 },
  'divider-rope': { component: 'OrnamentDividerRope', name: 'Tali', category: 'divider', ratio: 8 },
  'divider-dotted': { component: 'OrnamentDividerDotted', name: 'Bertitik', category: 'divider', ratio: 8 },
  'divider-lung-lungan': { component: 'OrnamentDividerLungLungan', name: 'Lung-lungan', category: 'divider', ratio: 8 },
  'divider-songket': { component: 'OrnamentDividerSongket', name: 'Songket', category: 'divider', ratio: 8 },

  // Corner
  'corner-flourish': { component: 'OrnamentCorner', name: 'Flourish', category: 'corner', ratio: 1 },
  'corner-vine': { component: 'OrnamentCornerVine', name: 'Sulur', category: 'corner', ratio: 1 },
  'corner-angle': { component: 'OrnamentCornerAngle', name: 'Siku', category: 'corner', ratio: 1 },
  'corner-deco': { component: 'OrnamentCornerDeco', name: 'Siku art deco', category: 'corner', ratio: 1 },
  'corner-batik': { component: 'OrnamentCornerBatik', name: 'Siku batik', category: 'corner', ratio: 1 },
  'corner-fan': { component: 'OrnamentCornerFan', name: 'Kipas sudut', category: 'corner', ratio: 1 },
  'corner-pucuak-rabuang': { component: 'OrnamentCornerPucuakRabuang', name: 'Pucuak rabuang', category: 'corner', ratio: 1 },
  'corner-wadasan': { component: 'OrnamentCornerWadasan', name: 'Karang wadasan', category: 'corner', ratio: 1 },
  'corner-kenanga': { component: 'OrnamentCornerKenanga', name: 'Sulur kenanga', category: 'corner', ratio: 1 },
  'corner-poleng': { component: 'OrnamentCornerPoleng', name: 'Siku poleng', category: 'corner', ratio: 1 },

  // Floral
  'sprig': { component: 'OrnamentSprig', name: 'Ranting berdaun', category: 'floral', ratio: 120 / 168 },
  'bloom': { component: 'OrnamentBloom', name: 'Kuncup', category: 'floral', ratio: 140 / 176 },
  'branch': { component: 'OrnamentBranch', name: 'Ranting', category: 'floral', ratio: 120 / 168 },
  'frangipani': { component: 'OrnamentFrangipani', name: 'Kamboja', category: 'floral', ratio: 140 / 176 },
  'jasmine': { component: 'OrnamentJasmine', name: 'Melati', category: 'floral', ratio: 140 / 176 },
  'monstera': { component: 'OrnamentMonstera', name: 'Monstera', category: 'floral', ratio: 140 / 176 },
  'eucalyptus': { component: 'OrnamentEucalyptus', name: 'Eukaliptus', category: 'floral', ratio: 120 / 168 },
  'garland': { component: 'OrnamentGarland', name: 'Karangan', category: 'floral', ratio: 420 / 90 },
  'garland-slim': { component: 'OrnamentGarlandSlim', name: 'Karangan tipis', category: 'floral', ratio: 420 / 90 },
  'stem-single': { component: 'OrnamentStemSingle', name: 'Tangkai tunggal', category: 'floral', ratio: 120 / 168 },
  'melati-ronce': { component: 'OrnamentMelatiRonce', name: 'Ronce melati', category: 'floral', ratio: 140 / 176 },

  // Motif
  'motif-kawung': { component: 'OrnamentMotifKawung', name: 'Kawung', category: 'motif', ratio: 3 },
  'motif-tumpal': { component: 'OrnamentMotifTumpal', name: 'Tumpal', category: 'motif', ratio: 3 },
  'motif-songket': { component: 'OrnamentMotifSongket', name: 'Songket', category: 'motif', ratio: 3 },
  'motif-arabesque': { component: 'OrnamentMotifArabesque', name: 'Arabesque', category: 'motif', ratio: 3 },
  'motif-geometric': { component: 'OrnamentMotifGeometric', name: 'Geometris', category: 'motif', ratio: 3 },
  'motif-rule': { component: 'OrnamentMotifRule', name: 'Rel hairline', category: 'motif', ratio: 3 },
  'motif-mega-mendung': { component: 'OrnamentMotifMegaMendung', name: 'Mega mendung', category: 'motif', ratio: 3 },
  'motif-kenanga': { component: 'OrnamentMotifKenanga', name: 'Kenanga', category: 'motif', ratio: 3 },
  'motif-poleng': { component: 'OrnamentMotifPoleng', name: 'Poleng', category: 'motif', ratio: 3 },

  // Symbol
  'symbol-rings': { component: 'OrnamentSymbolRings', name: 'Dua cincin', category: 'symbol', ratio: 1.4 },
  'symbol-dove': { component: 'OrnamentSymbolDove', name: 'Merpati', category: 'symbol', ratio: 140 / 120 },
  'symbol-crescent': { component: 'OrnamentSymbolCrescent', name: 'Bulan sabit', category: 'symbol', ratio: 1 },
  'symbol-lotus': { component: 'OrnamentSymbolLotus', name: 'Lotus', category: 'symbol', ratio: 1.4 },
  'symbol-fan': { component: 'OrnamentSymbolFan', name: 'Kipas', category: 'symbol', ratio: 140 / 110 },
  'symbol-candle': { component: 'OrnamentSymbolCandle', name: 'Lilin', category: 'symbol', ratio: 90 / 140 },
  'symbol-wadasan': { component: 'OrnamentSymbolWadasan', name: 'Karang & awan', category: 'symbol', ratio: 140 / 110 },
  'symbol-kupu': { component: 'OrnamentSymbolKupu', name: 'Kupu-kupu', category: 'symbol', ratio: 140 / 120 },
  'symbol-payung': { component: 'OrnamentSymbolPayung', name: 'Payung pagut', category: 'symbol', ratio: 110 / 140 },

  // Monogram — semuanya menerima prop `initials`.
  'monogram-laurel': { component: 'OrnamentMonogram', name: 'Laurel', category: 'monogram', ratio: 1 },
  'monogram-ring': { component: 'OrnamentMonogramRing', name: 'Lingkaran', category: 'monogram', ratio: 1 },
  'monogram-shield': { component: 'OrnamentMonogramShield', name: 'Perisai', category: 'monogram', ratio: 1 },
  'monogram-diamond': { component: 'OrnamentMonogramDiamond', name: 'Berlian', category: 'monogram', ratio: 1 },

  /*
   * Layer — komposisi tepi, bukan glyph tunggal. Inilah yang membuat section terbaca
   * "kental": 3–6 keping per section pada 200–480px dengan bleed keluar tepi, bukan satu
   * bingkai 34rem beropacity 0,18 di tengah.
   */
  'layer-bloom-botanical': layer('OrnamentLayerBloomBotanical', 'Mekar botanical', 'bloom', 480 / 260),
  'layer-cascade-botanical': layer('OrnamentLayerCascadeBotanical', 'Untaian botanical', 'cascade', 260 / 480),
  'layer-crown-botanical': layer('OrnamentLayerCrownBotanical', 'Mahkota botanical', 'crown', 480 / 200),
  'layer-cluster-botanical': layer('OrnamentLayerClusterBotanical', 'Rumpun sudut botanical', 'cluster', 1),
  'layer-swag-botanical': layer('OrnamentLayerSwagBotanical', 'Penutup botanical', 'swag', 600 / 220),

  'layer-bloom-deco': layer('OrnamentLayerBloomDeco', 'Mekar deco', 'bloom', 480 / 260),
  'layer-cascade-deco': layer('OrnamentLayerCascadeDeco', 'Untaian deco', 'cascade', 260 / 480),
  'layer-crown-deco': layer('OrnamentLayerCrownDeco', 'Mahkota deco', 'crown', 480 / 200),
  'layer-cluster-deco': layer('OrnamentLayerClusterDeco', 'Rumpun sudut deco', 'cluster', 1),
  'layer-swag-deco': layer('OrnamentLayerSwagDeco', 'Penutup deco', 'swag', 600 / 220),

  'layer-bloom-tropis': layer('OrnamentLayerBloomTropis', 'Mekar tropis', 'bloom', 480 / 260),
  'layer-cascade-tropis': layer('OrnamentLayerCascadeTropis', 'Untaian tropis', 'cascade', 260 / 480),
  'layer-crown-tropis': layer('OrnamentLayerCrownTropis', 'Mahkota tropis', 'crown', 480 / 200),
  'layer-cluster-tropis': layer('OrnamentLayerClusterTropis', 'Rumpun sudut tropis', 'cluster', 1),
  'layer-swag-tropis': layer('OrnamentLayerSwagTropis', 'Penutup tropis', 'swag', 600 / 220),

  'layer-bloom-geometris': layer('OrnamentLayerBloomGeometris', 'Mekar geometris', 'bloom', 480 / 260),
  'layer-cascade-geometris': layer('OrnamentLayerCascadeGeometris', 'Untaian geometris', 'cascade', 260 / 480),
  'layer-crown-geometris': layer('OrnamentLayerCrownGeometris', 'Mahkota geometris', 'crown', 480 / 200),
  'layer-cluster-geometris': layer('OrnamentLayerClusterGeometris', 'Rumpun sudut geometris', 'cluster', 1),
  'layer-swag-geometris': layer('OrnamentLayerSwagGeometris', 'Penutup geometris', 'swag', 600 / 220),

  'layer-bloom-sogan': layer('OrnamentLayerBloomSogan', 'Mekar sogan', 'bloom', 480 / 260),
  'layer-cascade-sogan': layer('OrnamentLayerCascadeSogan', 'Ronce sogan', 'cascade', 260 / 480),
  'layer-crown-sogan': layer('OrnamentLayerCrownSogan', 'Mahkota sogan', 'crown', 480 / 200),
  'layer-cluster-sogan': layer('OrnamentLayerClusterSogan', 'Rumpun sudut sogan', 'cluster', 1),
  'layer-swag-sogan': layer('OrnamentLayerSwagSogan', 'Penutup sogan', 'swag', 600 / 220),

  'layer-bloom-songket': layer('OrnamentLayerBloomSongket', 'Mekar songket', 'bloom', 480 / 260),
  'layer-cascade-songket': layer('OrnamentLayerCascadeSongket', 'Untaian songket', 'cascade', 260 / 480),
  'layer-crown-songket': layer('OrnamentLayerCrownSongket', 'Mahkota gonjong', 'crown', 480 / 200),
  'layer-cluster-songket': layer('OrnamentLayerClusterSongket', 'Rumpun pucuak rabuang', 'cluster', 1),
  'layer-swag-songket': layer('OrnamentLayerSwagSongket', 'Penutup songket', 'swag', 600 / 220),

  'layer-bloom-mendung': layer('OrnamentLayerBloomMendung', 'Mekar mendung', 'bloom', 480 / 260),
  'layer-cascade-mendung': layer('OrnamentLayerCascadeMendung', 'Pilinan mendung', 'cascade', 260 / 480),
  'layer-crown-mendung': layer('OrnamentLayerCrownMendung', 'Mahkota mendung', 'crown', 480 / 200),
  'layer-cluster-mendung': layer('OrnamentLayerClusterMendung', 'Rumpun sudut mendung', 'cluster', 1),
  'layer-swag-mendung': layer('OrnamentLayerSwagMendung', 'Penutup mendung', 'swag', 600 / 220),

  'layer-bloom-kenanga': layer('OrnamentLayerBloomKenanga', 'Mekar kenanga', 'bloom', 480 / 260),
  'layer-cascade-kenanga': layer('OrnamentLayerCascadeKenanga', 'Untaian kenanga', 'cascade', 260 / 480),
  'layer-crown-kenanga': layer('OrnamentLayerCrownKenanga', 'Mahkota kenanga', 'crown', 480 / 200),
  'layer-cluster-kenanga': layer('OrnamentLayerClusterKenanga', 'Rumpun sudut kenanga', 'cluster', 1),
  'layer-swag-kenanga': layer('OrnamentLayerSwagKenanga', 'Penutup kenanga', 'swag', 600 / 220),

  'layer-bloom-bentar': layer('OrnamentLayerBloomBentar', 'Undakan bentar', 'bloom', 480 / 260),
  'layer-cascade-bentar': layer('OrnamentLayerCascadeBentar', 'Pita poleng', 'cascade', 260 / 480),
  'layer-crown-bentar': layer('OrnamentLayerCrownBentar', 'Mahkota bentar', 'crown', 480 / 200),
  'layer-cluster-bentar': layer('OrnamentLayerClusterBentar', 'Rumpun sudut bentar', 'cluster', 1),
  'layer-swag-bentar': layer('OrnamentLayerSwagBentar', 'Penutup bentar', 'swag', 600 / 220),

  /*
   * Seal — penutup amplop di cover gate. Menerima prop `initials` dan mengukir tembus
   * dengan `var(--iv-bg)`, jadi ukirannya selalu senada latar tema.
   */
  'seal-kayon': { component: 'OrnamentSealKayon', name: 'Kayon', category: 'seal', ratio: 120 / 160 },
  'seal-laurel': { component: 'OrnamentSealLaurel', name: 'Laurel', category: 'seal', ratio: 120 / 160 },
  'seal-crest': { component: 'OrnamentSealCrest', name: 'Crest deco', category: 'seal', ratio: 120 / 160 },
  'seal-tumpal': { component: 'OrnamentSealTumpal', name: 'Tumpal', category: 'seal', ratio: 120 / 160 },
  'seal-ring': { component: 'OrnamentSealRing', name: 'Cakram', category: 'seal', ratio: 120 / 160 },
  'seal-gonjong': { component: 'OrnamentSealGonjong', name: 'Gonjong', category: 'seal', ratio: 120 / 160 },
  'seal-mendung': { component: 'OrnamentSealMendung', name: 'Mendung', category: 'seal', ratio: 120 / 160 },
  'seal-kenanga': { component: 'OrnamentSealKenanga', name: 'Kenanga', category: 'seal', ratio: 120 / 160 },
  'seal-bentar': { component: 'OrnamentSealBentar', name: 'Bentar', category: 'seal', ratio: 120 / 160 },

  // Venue — ilustrasi gedung untuk kartu acara. Dipilih pasangan, bukan tema.
  'venue-joglo': { component: 'OrnamentVenueJoglo', name: 'Joglo', category: 'venue', ratio: 1.5 },
  'venue-gadang': { component: 'OrnamentVenueGadang', name: 'Rumah gadang', category: 'venue', ratio: 1.5 },
  'venue-limasan': { component: 'OrnamentVenueLimasan', name: 'Limasan', category: 'venue', ratio: 1.5 },
  'venue-pendopo': { component: 'OrnamentVenuePendopo', name: 'Pendopo', category: 'venue', ratio: 1.5 },
  'venue-masjid': { component: 'OrnamentVenueMasjid', name: 'Masjid', category: 'venue', ratio: 1.5 },
  'venue-gereja': { component: 'OrnamentVenueGereja', name: 'Gereja', category: 'venue', ratio: 1.5 },
  'venue-ballroom': { component: 'OrnamentVenueBallroom', name: 'Ballroom', category: 'venue', ratio: 1.5 },
  'venue-taman': { component: 'OrnamentVenueTaman', name: 'Taman', category: 'venue', ratio: 1.5 },

  // Attire — berjejer di dresscode.
  'attire-batik': { component: 'OrnamentAttireBatik', name: 'Batik', category: 'attire', ratio: 120 / 180 },
  'attire-kebaya': { component: 'OrnamentAttireKebaya', name: 'Kebaya', category: 'attire', ratio: 120 / 180 },
  'attire-dress': { component: 'OrnamentAttireDress', name: 'Gaun', category: 'attire', ratio: 120 / 180 },
  'attire-jas': { component: 'OrnamentAttireJas', name: 'Jas', category: 'attire', ratio: 120 / 180 },
  'attire-kemeja': { component: 'OrnamentAttireKemeja', name: 'Kemeja', category: 'attire', ratio: 120 / 180 },
} as const satisfies Record<string, OrnamentEntry>

export type OrnamentId = keyof typeof ornamentBank

export function ornament(id: OrnamentId): OrnamentEntry {
  return ornamentBank[id]
}

/** Nama komponen yang bisa langsung dipakai `<component :is>`. Menerima null agar pemanggil bisa mengandalkan `v-if`. */
export function ornamentComponent(id: OrnamentId | null | undefined): string | undefined {
  return id ? ornamentBank[id].component : undefined
}

export function ornamentsByCategory(category: OrnamentCategory): (OrnamentEntry & { id: OrnamentId })[] {
  return (Object.entries(ornamentBank) as [OrnamentId, OrnamentEntry][])
    .filter(([, entry]) => entry.category === category)
    .map(([id, entry]) => ({ id, ...entry }))
}

/**
 * Slot jangkar sebuah layer; `undefined` untuk ornamen kategori lain.
 * Dilebarkan ke `OrnamentEntry` dulu: literal `as const` di atas membuat entri non-layer
 * benar-benar tidak punya key `slot`, bukan sekadar bernilai undefined.
 */
export function layerSlot(id: OrnamentId): LayerSlot | undefined {
  return (ornamentBank[id] as OrnamentEntry).slot
}

export function isOrnamentId(value: unknown): value is OrnamentId {
  return typeof value === 'string' && value in ornamentBank
}

/**
 * Seberapa kental ornamen dipasang. Dipilih pasangan di editor dan disimpan di
 * `document.sections[cover].data.ornamentIntensity`, bukan di `tokens` — menambah key
 * ke `tokens` akan memicu gerbang entitlement `design` dan merusak `tests/contracts.test.ts`.
 */
export const ornamentIntensities = ['lembut', 'seimbang', 'pekat'] as const
export type OrnamentIntensity = (typeof ornamentIntensities)[number]

export const selectableIntensities: { id: OrnamentIntensity; label: string; hint: string }[] = [
  { id: 'lembut', label: 'Lembut', hint: 'Sedikit keping, ukuran kecil — untuk tema minimalis.' },
  { id: 'seimbang', label: 'Seimbang', hint: 'Bawaan. Tiga sampai empat keping per bagian.' },
  { id: 'pekat', label: 'Pekat', hint: 'Enam keping, lebih besar dan lebih tegas warnanya.' },
]

/** Pengali yang dibaca `OrnamentField`: berapa keping, seberapa besar, seberapa pekat. */
export const intensityScale: Record<OrnamentIntensity, { count: number; size: number; opacity: number }> = {
  lembut: { count: 2, size: 0.78, opacity: 0.62 },
  seimbang: { count: 4, size: 1, opacity: 1 },
  pekat: { count: 6, size: 1.18, opacity: 1.15 },
}

export function toIntensity(value: unknown): OrnamentIntensity {
  return (ornamentIntensities as readonly string[]).includes(String(value))
    ? (value as OrnamentIntensity)
    : 'seimbang'
}

/** Satu set lengkap yang dipakai sebuah tema di seluruh section undangan. */
export interface OrnamentSet {
  frame: OrnamentId
  divider: OrnamentId
  corner: OrnamentId
  floral: OrnamentId
  floralAlt: OrnamentId
  monogram: OrnamentId
  motif: OrnamentId
  symbol: OrnamentId
  garland: OrnamentId
  /** Penutup amplop di cover gate. */
  seal: OrnamentId
  /** Lima layer milik tema, satu per slot. Urutannya tidak penting — `slot` yang dibaca. */
  layers: OrnamentId[]
}
