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
  /** Fixed-color vector or native raster from the owner's reference collection. */
  asset?: string
  format?: 'svg' | 'png'
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
  'frame-wastra': { component: 'OrnamentFrameWastra', name: 'Bidang tumpal', category: 'frame', ratio: 300 / 420 },
  'frame-hening': { component: 'OrnamentFrameHening', name: 'Takik tunggal', category: 'frame', ratio: 300 / 420 },
  'frame-pelita': { component: 'OrnamentFramePelita', name: 'Kubah pelita', category: 'frame', ratio: 300 / 420 },

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
  'divider-wastra': { component: 'OrnamentDividerWastra', name: 'Lajur wastra', category: 'divider', ratio: 8 },
  'divider-hening': { component: 'OrnamentDividerHening', name: 'Guratan hening', category: 'divider', ratio: 8 },
  'divider-pelita': { component: 'OrnamentDividerPelita', name: 'Deret pelita', category: 'divider', ratio: 8 },

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
  'corner-catur': { component: 'OrnamentCornerCatur', name: 'Siku catur', category: 'corner', ratio: 1 },
  'corner-wastra': { component: 'OrnamentCornerWastra', name: 'Siku wastra', category: 'corner', ratio: 1 },
  'corner-hening': { component: 'OrnamentCornerHening', name: 'Siku hening', category: 'corner', ratio: 1 },
  'corner-pelita': { component: 'OrnamentCornerPelita', name: 'Siku pelita', category: 'corner', ratio: 1 },

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
  'motif-catur': { component: 'OrnamentMotifCatur', name: 'Papan catur', category: 'motif', ratio: 3 },
  'motif-wastra': { component: 'OrnamentMotifWastra', name: 'Bidang berjajar', category: 'motif', ratio: 3 },
  'motif-hening': { component: 'OrnamentMotifHening', name: 'Takik berjajar', category: 'motif', ratio: 3 },
  'motif-pelita': { component: 'OrnamentMotifPelita', name: 'Kubah berjajar', category: 'motif', ratio: 3 },

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
  'symbol-wastra': { component: 'OrnamentSymbolWastra', name: 'Anyaman', category: 'symbol', ratio: 140 / 110 },
  'symbol-hening': { component: 'OrnamentSymbolHening', name: 'Dua sabit', category: 'symbol', ratio: 130 / 120 },
  'symbol-pelita': { component: 'OrnamentSymbolPelita', name: 'Nyala pelita', category: 'symbol', ratio: 120 / 130 },

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
  'layer-cascade-bentar': layer('OrnamentLayerCascadeBentar', 'Pita catur', 'cascade', 260 / 480),
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
  'seal-wastra': { component: 'OrnamentSealWastra', name: 'Wastra', category: 'seal', ratio: 120 / 160 },
  'seal-hening': { component: 'OrnamentSealHening', name: 'Hening', category: 'seal', ratio: 120 / 160 },
  'seal-pelita': { component: 'OrnamentSealPelita', name: 'Pelita', category: 'seal', ratio: 120 / 160 },

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
  /* ── pack: diimpor scripts/ornament-pack — jangan sunting tangan ── */
  'melati-bingkai-ronce': { component: 'OrnamentMelatiBingkaiRonce', name: 'Bingkai ronce', category: 'frame', ratio: 420 / 588 },
  'melati-bingkai-segi': { component: 'OrnamentMelatiBingkaiSegi', name: 'Bingkai segi melati', category: 'frame', ratio: 1 },
  'melati-bingkai-kembar-mayang': { component: 'OrnamentMelatiBingkaiKembarMayang', name: 'Bingkai kembar mayang', category: 'frame', ratio: 420 / 588 },
  'melati-bingkai-oval-kantil': { component: 'OrnamentMelatiBingkaiOvalKantil', name: 'Bingkai oval kantil', category: 'frame', ratio: 420 / 588 },
  'melati-bingkai-anyaman': { component: 'OrnamentMelatiBingkaiAnyaman', name: 'Bingkai anyaman janur', category: 'frame', ratio: 420 / 588 },
  'melati-pemisah-ronce': { component: 'OrnamentMelatiPemisahRonce', name: 'Pemisah ronce', category: 'divider', ratio: 8 },
  'melati-pemisah-kenanga': { component: 'OrnamentMelatiPemisahKenanga', name: 'Pemisah kenanga', category: 'divider', ratio: 8 },
  'melati-pemisah-janur': { component: 'OrnamentMelatiPemisahJanur', name: 'Pemisah janur', category: 'divider', ratio: 8 },
  'melati-pemisah-titik': { component: 'OrnamentMelatiPemisahTitik', name: 'Pemisah titik melati', category: 'divider', ratio: 8 },
  'melati-pemisah-sulur': { component: 'OrnamentMelatiPemisahSulur', name: 'Pemisah sulur melati', category: 'divider', ratio: 8 },
  'melati-pemisah-kantil': { component: 'OrnamentMelatiPemisahKantil', name: 'Pemisah kantil', category: 'divider', ratio: 8 },
  'melati-sudut-sulur': { component: 'OrnamentMelatiSudutSulur', name: 'Sudut sulur melati', category: 'corner', ratio: 1 },
  'melati-sudut-kantil': { component: 'OrnamentMelatiSudutKantil', name: 'Sudut kantil', category: 'corner', ratio: 1 },
  'melati-sudut-anyam': { component: 'OrnamentMelatiSudutAnyam', name: 'Sudut anyaman', category: 'corner', ratio: 1 },
  'melati-sudut-ceplok': { component: 'OrnamentMelatiSudutCeplok', name: 'Sudut ceplok', category: 'corner', ratio: 1 },
  'melati-sudut-ronce': { component: 'OrnamentMelatiSudutRonce', name: 'Sudut ronce', category: 'corner', ratio: 1 },
  'melati-sudut-melati': { component: 'OrnamentMelatiSudutMelati', name: 'Sudut melati', category: 'corner', ratio: 1 },
  'melati-tangkai-melati': { component: 'OrnamentMelatiTangkaiMelati', name: 'Tangkai melati', category: 'floral', ratio: 200 / 320 },
  'melati-tangkai-kenanga': { component: 'OrnamentMelatiTangkaiKenanga', name: 'Tangkai kenanga', category: 'floral', ratio: 200 / 320 },
  'melati-tangkai-sedap-malam': { component: 'OrnamentMelatiTangkaiSedapMalam', name: 'Tangkai sedap malam', category: 'floral', ratio: 200 / 320 },
  'melati-rumpun-kantil': { component: 'OrnamentMelatiRumpunKantil', name: 'Rumpun kantil', category: 'floral', ratio: 1 },
  'melati-dedaunan-pandan': { component: 'OrnamentMelatiDedaunanPandan', name: 'Dedaunan pandan', category: 'floral', ratio: 240 / 320 },
  'melati-ranting-kuncup': { component: 'OrnamentMelatiRantingKuncup', name: 'Ranting kuncup', category: 'floral', ratio: 1 },
  'melati-layer-ronce-gantung': { component: 'OrnamentMelatiLayerRonceGantung', name: 'Ronce gantung', category: 'layer', ratio: 260 / 360, slot: 'cascade' },
  'melati-layer-karangan': { component: 'OrnamentMelatiLayerKarangan', name: 'Karangan melati', category: 'layer', ratio: 420 / 200, slot: 'bloom' },
  'melati-layer-rumpun': { component: 'OrnamentMelatiLayerRumpun', name: 'Rumpun melati', category: 'layer', ratio: 1, slot: 'cluster' },
  'melati-layer-untaian': { component: 'OrnamentMelatiLayerUntaian', name: 'Untaian melati', category: 'layer', ratio: 480 / 200, slot: 'crown' },
  'melati-layer-mekar': { component: 'OrnamentMelatiLayerMekar', name: 'Mekar kantil', category: 'layer', ratio: 1, slot: 'bloom' },
  'melati-layer-untai-tunggal': { component: 'OrnamentMelatiLayerUntaiTunggal', name: 'Untai tunggal', category: 'layer', ratio: 120 / 400, slot: 'cascade' },
  'melati-monogram-cincin': { component: 'OrnamentMelatiMonogramCincin', name: 'Monogram cincin ronce', category: 'monogram', ratio: 1 },
  'melati-monogram-perisai': { component: 'OrnamentMelatiMonogramPerisai', name: 'Monogram perisai melati', category: 'monogram', ratio: 244 / 260 },
  'melati-monogram-lingkar': { component: 'OrnamentMelatiMonogramLingkar', name: 'Monogram lingkar ronce', category: 'monogram', ratio: 1 },
  'melati-motif-ceplok': { component: 'OrnamentMelatiMotifCeplok', name: 'Motif ceplok melati', category: 'motif', ratio: 1 },
  'melati-motif-anyaman': { component: 'OrnamentMelatiMotifAnyaman', name: 'Motif anyaman janur', category: 'motif', ratio: 1 },
  'melati-motif-kuncup': { component: 'OrnamentMelatiMotifKuncup', name: 'Motif kuncup', category: 'motif', ratio: 1 },
  'melati-motif-tumpal': { component: 'OrnamentMelatiMotifTumpal', name: 'Motif tumpal melati', category: 'motif', ratio: 1 },
  'melati-motif-jala': { component: 'OrnamentMelatiMotifJala', name: 'Motif jala melati', category: 'motif', ratio: 1 },
  'melati-kembar-mayang': { component: 'OrnamentMelatiKembarMayang', name: 'Kembar mayang', category: 'symbol', ratio: 200 / 280 },
  'melati-janur-kuning': { component: 'OrnamentMelatiJanurKuning', name: 'Janur kuning', category: 'symbol', ratio: 200 / 280 },
  'melati-payung-teduh': { component: 'OrnamentMelatiPayungTeduh', name: 'Payung teduh', category: 'symbol', ratio: 200 / 280 },
  'melati-merpati-sepasang': { component: 'OrnamentMelatiMerpatiSepasang', name: 'Sepasang merpati', category: 'symbol', ratio: 260 / 200 },
  'melati-segel-melati': { component: 'OrnamentMelatiSegelMelati', name: 'Segel melati', category: 'seal', ratio: 1 },
  'melati-segel-janur': { component: 'OrnamentMelatiSegelJanur', name: 'Segel janur', category: 'seal', ratio: 1 },
  'melati-segel-kuncup': { component: 'OrnamentMelatiSegelKuncup', name: 'Segel kuncup', category: 'seal', ratio: 1 },
  'melati-pendopo-joglo': { component: 'OrnamentMelatiPendopoJoglo', name: 'Pendopo joglo', category: 'venue', ratio: 200 / 260 },
  'kayon-bingkai-medalion': { component: 'OrnamentKayonBingkaiMedalion', name: 'Bingkai medalion', category: 'frame', ratio: 1 },
  'kayon-bingkai-tumpal': { component: 'OrnamentKayonBingkaiTumpal', name: 'Bingkai tumpal', category: 'frame', ratio: 380 / 520 },
  'kayon-bingkai-lung': { component: 'OrnamentKayonBingkaiLung', name: 'Bingkai lung-lungan', category: 'frame', ratio: 440 / 300 },
  'kayon-bidang-kayon': { component: 'OrnamentKayonBidangKayon', name: 'Bidang kayon', category: 'motif', ratio: 420 / 560 },
  'kayon-bidang-rumpun-kayon': { component: 'OrnamentKayonBidangRumpunKayon', name: 'Bidang rumpun kayon', category: 'motif', ratio: 460 / 340 },
  'kayon-pemisah-medalion': { component: 'OrnamentKayonPemisahMedalion', name: 'Pemisah pita medalion', category: 'divider', ratio: 420 / 74 },
  'kayon-pemisah-ukel': { component: 'OrnamentKayonPemisahUkel', name: 'Pemisah ukel', category: 'divider', ratio: 340 / 76 },
  'kayon-pemisah-patran': { component: 'OrnamentKayonPemisahPatran', name: 'Pemisah patran', category: 'divider', ratio: 320 / 86 },
  'kayon-pemisah-kayon': { component: 'OrnamentKayonPemisahKayon', name: 'Pemisah kayon', category: 'divider', ratio: 300 / 120 },
  'kayon-pemisah-cecek': { component: 'OrnamentKayonPemisahCecek', name: 'Pemisah cecek', category: 'divider', ratio: 300 / 46 },
  'kayon-pemisah-tumpal': { component: 'OrnamentKayonPemisahTumpal', name: 'Pemisah tumpal', category: 'divider', ratio: 6 },
  'kayon-sudut-ukel': { component: 'OrnamentKayonSudutUkel', name: 'Sudut ukel', category: 'corner', ratio: 1 },
  'kayon-sudut-kayon': { component: 'OrnamentKayonSudutKayon', name: 'Sudut kayon', category: 'corner', ratio: 1 },
  'kayon-sudut-patran': { component: 'OrnamentKayonSudutPatran', name: 'Sudut patran', category: 'corner', ratio: 1 },
  'kayon-sudut-medalion': { component: 'OrnamentKayonSudutMedalion', name: 'Sudut medalion', category: 'corner', ratio: 1 },
  'kayon-sudut-mawar': { component: 'OrnamentKayonSudutMawar', name: 'Sudut mawar', category: 'corner', ratio: 1 },
  'kayon-motif-ukel': { component: 'OrnamentKayonMotifUkel', name: 'Motif ukel', category: 'motif', ratio: 1 },
  'kayon-motif-medalion': { component: 'OrnamentKayonMotifMedalion', name: 'Motif medalion', category: 'motif', ratio: 1 },
  'kayon-motif-patran': { component: 'OrnamentKayonMotifPatran', name: 'Motif patran', category: 'motif', ratio: 140 / 120 },
  'kayon-motif-tumpal': { component: 'OrnamentKayonMotifTumpal', name: 'Motif tumpal', category: 'motif', ratio: 140 / 120 },
  'kayon-motif-cecek': { component: 'OrnamentKayonMotifCecek', name: 'Motif cecek', category: 'motif', ratio: 1 },
  'kayon-layer-rumpun-kayon': { component: 'OrnamentKayonLayerRumpunKayon', name: 'Rumpun kayon', category: 'layer', ratio: 460 / 340, slot: 'bloom' },
  'kayon-layer-kayon-tunggal': { component: 'OrnamentKayonLayerKayonTunggal', name: 'Kayon tunggal', category: 'layer', ratio: 260 / 360, slot: 'cascade' },
  'kayon-layer-sulur-mawar': { component: 'OrnamentKayonLayerSulurMawar', name: 'Sulur mawar', category: 'layer', ratio: 340 / 300, slot: 'swag' },
  'kayon-layer-patran-gantung': { component: 'OrnamentKayonLayerPatranGantung', name: 'Patran gantung', category: 'layer', ratio: 300 / 260, slot: 'crown' },
  'kayon-layer-pita-medalion': { component: 'OrnamentKayonLayerPitaMedalion', name: 'Pita medalion', category: 'layer', ratio: 420 / 150, slot: 'crown' },
  'kayon-layer-dedaunan': { component: 'OrnamentKayonLayerDedaunan', name: 'Dedaunan', category: 'layer', ratio: 1, slot: 'cluster' },
  'kayon-simbol-kayon': { component: 'OrnamentKayonSimbolKayon', name: 'Simbol kayon', category: 'symbol', ratio: 130 / 170 },
  'kayon-simbol-cincin': { component: 'OrnamentKayonSimbolCincin', name: 'Simbol cincin medalion', category: 'symbol', ratio: 1 },
  'kayon-simbol-mawar': { component: 'OrnamentKayonSimbolMawar', name: 'Simbol mawar', category: 'symbol', ratio: 1 },
  'kayon-segel-kayon': { component: 'OrnamentKayonSegelKayon', name: 'Segel kayon', category: 'seal', ratio: 1 },
  'kayon-segel-medalion': { component: 'OrnamentKayonSegelMedalion', name: 'Segel medalion', category: 'seal', ratio: 1 },
  'kayon-monogram-kayon': { component: 'OrnamentKayonMonogramKayon', name: 'Monogram kayon', category: 'monogram', ratio: 200 / 260 },
  'kayon-monogram-medalion': { component: 'OrnamentKayonMonogramMedalion', name: 'Monogram medalion', category: 'monogram', ratio: 1 },
  'kayon-mawar-mekar': { component: 'OrnamentKayonMawarMekar', name: 'Mawar mekar', category: 'floral', ratio: 160 / 220 },
  'kayon-tangkai-daun': { component: 'OrnamentKayonTangkaiDaun', name: 'Tangkai daun', category: 'floral', ratio: 140 / 220 },
  'sunda-julang-ngapak': { component: 'OrnamentSundaJulangNgapak', name: 'Rumah Julang Ngapak', category: 'venue', ratio: 720 / 480 },
  'sunda-angklung': { component: 'OrnamentSundaAngklung', name: 'Angklung', category: 'symbol', ratio: 260 / 400 },
  'sunda-anyaman-bambu': { component: 'OrnamentSundaAnyamanBambu', name: 'Anyaman bambu', category: 'motif', ratio: 1 },
  'sunda-bingkai-sunda': { component: 'OrnamentSundaBingkaiSunda', name: 'Bingkai taman', category: 'frame', ratio: 420 / 580 },
  'sunda-divider-sunda': { component: 'OrnamentSundaDividerSunda', name: 'Pucuk dan pertemuan', category: 'divider', ratio: 600 / 90 },
  'sunda-sudut-daun': { component: 'OrnamentSundaSudutDaun', name: 'Sudut dedaunan', category: 'corner', ratio: 1 },
  'sekar-bingkai-gapura': { component: 'OrnamentSekarBingkaiGapura', name: 'Gapura sekar', category: 'frame', ratio: 300 / 420 },
  'sekar-bingkai-oval': { component: 'OrnamentSekarBingkaiOval', name: 'Oval sekar', category: 'frame', ratio: 300 / 420 },
  'sekar-bingkai-segi': { component: 'OrnamentSekarBingkaiSegi', name: 'Segi bersilang', category: 'frame', ratio: 1 },
  'sekar-layer-jatuh': { component: 'OrnamentSekarLayerJatuh', name: 'Untaian sekar', category: 'layer', ratio: 260 / 480, slot: 'cascade' },
  'sekar-layer-mahkota': { component: 'OrnamentSekarLayerMahkota', name: 'Mahkota sekar', category: 'layer', ratio: 480 / 200, slot: 'crown' },
  'sekar-layer-mekar': { component: 'OrnamentSekarLayerMekar', name: 'Mekar sekar', category: 'layer', ratio: 480 / 260, slot: 'bloom' },
  'sekar-layer-rumpun': { component: 'OrnamentSekarLayerRumpun', name: 'Rumpun sekar', category: 'layer', ratio: 1, slot: 'cluster' },
  'sekar-layer-untai': { component: 'OrnamentSekarLayerUntai', name: 'Penutup sekar', category: 'layer', ratio: 600 / 220, slot: 'swag' },
  'sekar-monogram-karangan': { component: 'OrnamentSekarMonogramKarangan', name: 'Karangan sekar', category: 'monogram', ratio: 1 },
  'sekar-motif-damask': { component: 'OrnamentSekarMotifDamask', name: 'Pita damask', category: 'motif', ratio: 3 },
  'sekar-pemisah-mahkota': { component: 'OrnamentSekarPemisahMahkota', name: 'Mahkota berel', category: 'divider', ratio: 8 },
  'sekar-pemisah-sulur': { component: 'OrnamentSekarPemisahSulur', name: 'Sulur berjalan', category: 'divider', ratio: 8 },
  'sekar-rangkaian-kanan': { component: 'OrnamentSekarRangkaianKanan', name: 'Rangkaian kanan', category: 'floral', ratio: 140 / 176 },
  'sekar-rangkaian-kiri': { component: 'OrnamentSekarRangkaianKiri', name: 'Rangkaian kiri', category: 'floral', ratio: 140 / 176 },
  'sekar-ranting-kanan': { component: 'OrnamentSekarRantingKanan', name: 'Ranting kanan', category: 'floral', ratio: 120 / 168 },
  'sekar-ranting-kiri': { component: 'OrnamentSekarRantingKiri', name: 'Ranting kiri', category: 'floral', ratio: 120 / 168 },
  'sekar-segel-rozet': { component: 'OrnamentSekarSegelRozet', name: 'Rozet sekar', category: 'seal', ratio: 1 },
  'sekar-segel-tumpal': { component: 'OrnamentSekarSegelTumpal', name: 'Liontin tumpal', category: 'seal', ratio: 120 / 160 },
  'sekar-simbol-kembang-air': { component: 'OrnamentSekarSimbolKembangAir', name: 'Kembang air', category: 'symbol', ratio: 140 / 120 },
  'sekar-sudut-damask': { component: 'OrnamentSekarSudutDamask', name: 'Sudut damask', category: 'corner', ratio: 1 },
  'sekar-sudut-sulur-kanan': { component: 'OrnamentSekarSudutSulurKanan', name: 'Sudut sulur kanan', category: 'corner', ratio: 1 },
  'sekar-sudut-sulur-kiri': { component: 'OrnamentSekarSudutSulurKiri', name: 'Sudut sulur kiri', category: 'corner', ratio: 1 },
  'pusaka-segel-tumpal-jajar': { component: 'OrnamentPusakaSegelTumpalJajar', name: 'Segel tumpal berjajar', category: 'seal', ratio: 1 },
  'pusaka-segel-sulur-bintang': { component: 'OrnamentPusakaSegelSulurBintang', name: 'Segel sulur bintang', category: 'seal', ratio: 1 },
  'pusaka-segel-karangan-tipis': { component: 'OrnamentPusakaSegelKaranganTipis', name: 'Segel karangan tipis', category: 'seal', ratio: 1 },
  'pusaka-bingkai-kubah': { component: 'OrnamentPusakaBingkaiKubah', name: 'Bingkai kubah', category: 'frame', ratio: 300 / 420 },
  /* ── /pack ── */
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
