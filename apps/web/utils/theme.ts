import { templates, templateById, resolveTemplateId, type FontChoice, type InvitationDocument, type LiveTemplateId } from '@aruna/contracts'
import type { ThemeMotion } from './motion-score'
import type { OrnamentSet } from './ornaments'
import { onPrimary } from './contrast'
import { ornamentRamp, ornamentRampOnDark, rampStyle } from './ornament-palette'

/** Aksen kaligrafi, dipakai hanya untuk nama pasangan pada tema yang cocok. */
const scriptStack = "'Parisienne', 'Cormorant Garamond', Georgia, cursive"

/**
 * Beberapa font display hanya punya weight 400; memintanya 600 memaksa browser menebalkan sendiri.
 * `charm` punya 400 dan 700 sungguhan, jadi 600 tidak disintesis — pencocokan CSS naik ke 700.
 * Ia tetap dipatok 400 karena 700 pada huruf tangan terbaca gemuk, bukan tegas.
 */
const displayWeights: Partial<Record<FontChoice, string>> = {
  italiana: '400', instrument: '400', charm: '400',
  // Keempat script ini HANYA punya 400. Membiarkannya meminta 600 membuat browser
  // menebalkan sendiri, dan bold sintetis pada huruf sambung merusak sambungannya.
  'great-vibes': '400', parisienne: '400', pinyon: '400', allura: '400',
}

const fontStacks: Record<FontChoice, string> = {
  cormorant: "'Cormorant Garamond', Georgia, serif",
  italiana: "'Italiana', Georgia, serif",
  fraunces: "'Fraunces', Georgia, serif",
  jost: "'Jost', system-ui, sans-serif",
  jakarta: "'Plus Jakarta Sans', system-ui, sans-serif",
  instrument: "'Instrument Serif', Georgia, serif",
  charm: "'Charm', 'Parisienne', Georgia, cursive",
  'great-vibes': "'Great Vibes', 'Parisienne', Georgia, cursive",
  parisienne: "'Parisienne', Georgia, cursive",
  pinyon: "'Pinyon Script', 'Parisienne', Georgia, cursive",
  allura: "'Allura', 'Parisienne', Georgia, cursive",
  // Retired choice kept so pre-theme documents keep rendering.
  'dm-sans': "'Plus Jakarta Sans', system-ui, sans-serif",
}

/**
 * Lapisan latar milik tema. Motif dicat sebagai `mask-image` supaya warnanya mengikuti
 * `--iv-accent` saat pasangan mengubah palet, bukan warna yang sudah dipanggang ke berkas.
 * `plate` adalah foto yang dicuci sangat tipis di balik satu section bernada gelap.
 */
export interface ThemeBackdrop {
  motif?: { src: string; size: string; opacity: number }
  plate?: { src: string; position?: string; opacity: number }
}

/** Bagaimana galeri undangan ditata. Watak tema yang memilih, bukan pasangan. */
export type GalleryLayout = 'masonry' | 'mosaic' | 'rail'

export interface ThemePresentation {
  body: FontChoice
  /**
   * Varian `/images/card/` dari `scripts/optimize-images.ts`, bukan berkas asli di
   * `/images/`. Kartu tema menayangkannya selebar ~272 px dengan `opacity-45` di balik
   * gradient; yang asli 1000–1400 px dan tetap dipakai undangan demo apa adanya. Tema baru
   * ikut aturan yang sama — jalankan `pnpm images:optimize` setelah menambah berkas.
   */
  cover: string
  mood: string
  script: string | null
  ornaments: OrnamentSet
  gallery: GalleryLayout
  backdrop?: ThemeBackdrop
  /**
   * Partitur scroll tema — sumbu ketiga setelah warna dan ornamen.
   *
   * **Opsional dengan sengaja.** Tema tanpa `motion` menjalankan koreografi lama di
   * `playLegacyScore()` apa adanya, jadi sembilan tema yang sudah terbit tidak bergeser
   * satu frame pun sampai masing-masing dipindahkan dan dibandingkan sendiri-sendiri.
   */
  motion?: ThemeMotion
}

/**
 * Presentation details that belong to the web app rather than the shared contract.
 *
 * `ornaments` adalah yang membuat tema benar-benar berbeda: masing-masing membawa bingkai,
 * pemisah, sudut, motif, dan simbolnya sendiri — bukan sekadar tiga warna yang ditukar.
 * Kesembilan frame, divider, corner, motif, dan symbol di bawah ini tidak ada yang berulang.
 */
export const themePresentation: Record<LiveTemplateId, ThemePresentation> = {
  'aruna-bloom': {
    body: 'jakarta',
    cover: '/images/card/couple.webp',
    mood: 'Hangat · Botanical · Klasik',
    script: scriptStack,
    gallery: 'masonry',
    /*
     * Wajah Bloom kini digambar tangan, bukan dibangkitkan.
     *
     * Kesebelas slotnya diambil dari pack `melati` — 45 glyph hasil fitur ornament-builder
     * yang selama ini menganggur di `docs/` tanpa pernah dipakai satu baris pun oleh aplikasi.
     * Bloom yang dipilih karena kosakatanya memang paling dekat: ronce, kantil, kenanga, dan
     * sedap malam adalah bunga upacara yang sama yang dirujuk mood "Hangat · Botanical".
     *
     * Glyph lama tidak dibuang; ia turun ke kolam varian di `ornament-variants.ts`, jadi
     * pasangan yang menyukai wajah lama tetap bisa memilihnya dari panel Ornamen.
     */
    ornaments: {
      frame: 'melati-bingkai-ronce',
      divider: 'melati-pemisah-ronce',
      corner: 'melati-sudut-melati',
      floral: 'melati-dedaunan-pandan',
      floralAlt: 'melati-ranting-kuncup',
      monogram: 'melati-monogram-cincin',
      motif: 'melati-motif-tumpal',
      symbol: 'melati-merpati-sepasang',
      garland: 'garland',
      seal: 'melati-segel-kuncup',
      /*
       * Empat keping dari pack, satu dipinjam. Pack melati tidak punya keping berasio 2,7
       * untuk slot `swag`, dan `layers` memang bukan kategori yang DESIGN.md wajibkan unik
       * antar tema — jadi meminjam lebih benar daripada memaksa keping berasio 1 mengisi
       * tepi bawah selebar 600 satuan.
       */
      layers: ['melati-layer-karangan', 'melati-layer-untai-tunggal', 'melati-layer-untaian', 'melati-layer-rumpun', 'layer-swag-botanical'],
    },
  },
  'aruna-wastra': {
    body: 'jakarta',
    cover: '/images/card/adat-jawa.webp',
    mood: 'Etnik · Modern · Bidang besar',
    // Tanpa kaligrafi: huruf Fraunces-nya sudah bersuara, dan script di atas bidang tumpal
    // yang tebal terbaca sebagai dua hal yang saling berebut, bukan satu.
    script: null,
    gallery: 'rail',
    ornaments: {
      frame: 'frame-wastra',
      divider: 'divider-wastra',
      corner: 'corner-wastra',
      floral: 'branch',
      floralAlt: 'monstera',
      monogram: 'monogram-diamond',
      motif: 'motif-wastra',
      symbol: 'symbol-wastra',
      garland: 'garland-slim',
      seal: 'seal-wastra',
      layers: ['layer-bloom-songket', 'layer-cascade-songket', 'layer-crown-songket', 'layer-cluster-songket', 'layer-swag-songket'],
    },
    /**
     * Partitur pertama yang benar-benar dipakai. Sampai tema ini ada, `motion` terdeklarasi
     * di tipe, tersambung ke `resolveScore`, dan diisi nol tema — jalurnya mati di runtime.
     *
     * Wataknya: bidang besar yang menyapu masuk dan menumpuk. `crescendo` karena undangan
     * bergaya etnik modern menahan ornamennya di awal lalu membukanya di galeri; `wipe`
     * memakai bentuk pemisahnya sendiri, jadi transisinya membawa wajah temanya.
     */
    motion: {
      entrance: 'sweep',
      ornament: 'drift',
      density: 'crescendo',
      drift: 10,
      segue: { kind: 'wipe', shape: 'divider-wastra', from: 'bottom' },
    },
  },
  'aruna-hening': {
    body: 'jost',
    cover: '/images/card/rings.webp',
    mood: 'Tenang · Editorial · Minimal',
    // Editorial minimal: hurufnya yang jadi ornamen, jadi kaligrafi justru merusaknya.
    script: null,
    gallery: 'mosaic',
    // Tanpa `backdrop`, dan itu disengaja: tekstur latar adalah hal pertama yang membuat
    // sebuah halaman berhenti terbaca hening.
    ornaments: {
      frame: 'frame-hening',
      divider: 'divider-hening',
      corner: 'corner-hening',
      floral: 'stem-single',
      floralAlt: 'sprig',
      monogram: 'monogram-ring',
      motif: 'motif-hening',
      symbol: 'symbol-hening',
      garland: 'garland-slim',
      seal: 'seal-hening',
      layers: ['layer-bloom-geometris', 'layer-cascade-geometris', 'layer-crown-geometris', 'layer-cluster-geometris', 'layer-swag-geometris'],
    },
    /**
     * Partitur paling tertahan di repo, dan satu-satunya dengan `drift: 0`.
     *
     * Hening yang ikut bergeser mengikuti jam scroll bukan hening. `steady` karena kurva
     * kepadatan yang naik-turun adalah dramatisasi, dan `dissolve` karena pita transisi
     * bergambar akan jadi elemen paling ramai di halaman yang seluruhnya tenang.
     */
    motion: {
      entrance: 'rise',
      ornament: 'draw',
      density: 'steady',
      drift: 0,
      segue: { kind: 'dissolve' },
    },
  },
  'aruna-pelita': {
    body: 'jakarta',
    cover: '/images/card/venue.webp',
    mood: 'Mewah · Gelap · Emas',
    script: scriptStack,
    gallery: 'masonry',
    ornaments: {
      frame: 'frame-pelita',
      divider: 'divider-pelita',
      corner: 'corner-pelita',
      floral: 'branch',
      floralAlt: 'eucalyptus',
      monogram: 'monogram-shield',
      motif: 'motif-pelita',
      symbol: 'symbol-pelita',
      garland: 'garland',
      seal: 'seal-pelita',
      layers: ['layer-bloom-deco', 'layer-cascade-deco', 'layer-crown-deco', 'layer-cluster-deco', 'layer-swag-deco'],
    },
    /**
     * Tema pertama yang latarnya gelap, dan ia baru mungkin setelah fase 45 menurunkan tinta
     * tombol jadi `--iv-on-primary`. Terukur dengan palet ini: tinta terang memberi pasangan
     * `button` 1,97; tinta turunan `#171203` memberi 9,09.
     *
     * Partiturnya memakai `silhouette` karena pada bidang gelap yang paling dulu terbaca
     * adalah tepi, bukan isi — masuknya dimulai dari siluet lalu diisi.
     */
    motion: {
      entrance: 'silhouette',
      ornament: 'bloom',
      density: 'arch',
      drift: 14,
      segue: { kind: 'veil', shape: 'divider-pelita', from: 'top' },
    },
  },
  /**
   * Tema permintaan pemilik, dan tema pertama yang latarnya bermotif.
   *
   * Seluruh sepuluh slot ornamennya datang dari satu pack — `sekar` — termasuk kelima
   * layernya, jadi ia tidak perlu meminjam satu keping pun seperti `aruna-bloom` meminjam
   * `swag` dari botanical. Yang dibagi cuma `garland`, dan DESIGN.md memang mengizinkan
   * garland dibagi.
   *
   * **Pasangan hurufnya sengaja dibedakan lewat huruf badan, bukan huruf display.** Cormorant
   * sudah dipakai `aruna-bloom`; yang membuat keduanya tidak tertukar adalah Jost di badan
   * teks melawan Plus Jakarta Sans, ditambah palet sogan dan latar berdamask yang tidak
   * dimiliki bloom sama sekali.
   */
  'aruna-sekar': {
    body: 'jost',
    cover: '/images/card/hero.webp',
    mood: 'Krem sogan · Damask · Cat air',
    script: scriptStack,
    gallery: 'masonry',
    /**
     * Tema pertama yang mengisi `backdrop`, dan lapisannya sudah ada sejak lama.
     *
     * Sampai fase ini keempat tema mengosongkannya, jadi `.iv-section::before` selalu
     * `mask-image: none; opacity: 0` — mesinnya lengkap dan datanya nol. `aruna-hening`
     * mengosongkannya dengan alasan yang ditulis; ketiga sisanya tidak punya alasan, hanya
     * belum ada yang mengisinya.
     *
     * Ukuran 180px: ubinnya berapport 144 satuan, jadi satu simpul per 180px layar — cukup
     * jarang untuk tidak berebut dengan ornamen ladang, cukup rapat untuk terbaca sebagai kain
     * dan bukan sebagai noda.
     *
     * Opacity 0,07 **dilihat, bukan disalin**. `originals/kayon/THEME.md` mengusulkan 0,05, dan
     * angka itu ditulis ketika ubinnya masih bermassa. Ubin ini bergaris, jadi tintanya jauh
     * lebih sedikit per ubin: pada 0,05 ia praktis hilang, pada 0,10 ia mulai berebut dengan
     * keping ladang yang juga berwarna aksen. Diperiksa bertiga di layar pada bidang kertas
     * dan bidang tint.
     */
    backdrop: { motif: { src: '/textures/sekar-damask.svg', size: '180px', opacity: 0.07 } },
    ornaments: {
      frame: 'sekar-bingkai-gapura',
      divider: 'sekar-pemisah-mahkota',
      corner: 'sekar-sudut-sulur-kiri',
      floral: 'sekar-rangkaian-kiri',
      floralAlt: 'sekar-rangkaian-kanan',
      monogram: 'sekar-monogram-karangan',
      motif: 'sekar-motif-damask',
      symbol: 'sekar-simbol-kembang-air',
      garland: 'garland',
      seal: 'sekar-segel-rozet',
      layers: ['sekar-layer-mekar', 'sekar-layer-jatuh', 'sekar-layer-mahkota', 'sekar-layer-rumpun', 'sekar-layer-untai'],
    },
    /**
     * Wataknya: bunga yang membuka, bukan bidang yang menyapu.
     *
     * `iris` karena foto di tema ini dibingkai gapura dan oval — bukaan melingkar menyelesaikan
     * bentuk yang sudah ada di halamannya. `cascade` karena kepingnya memang rangkaian yang
     * menggantung. `ebb` karena kepadatan tertingginya di cover dan penutup, sementara bagian
     * informasi di tengah harus tetap terbaca. Dan `veil` memakai pemisahnya sendiri, jadi
     * transisinya membawa wajah temanya.
     */
    motion: {
      entrance: 'iris',
      ornament: 'cascade',
      density: 'ebb',
      drift: 8,
      segue: { kind: 'veil', shape: 'sekar-pemisah-mahkota', from: 'bottom' },
    },
  },
}

/**
 * Presentasi lengkap sebuah dokumen.
 *
 * `resolveTemplateId()` dipanggil di sini — bukan di pemanggilnya — supaya tidak ada jalur
 * render yang bisa menerima id pensiun tanpa melewatinya. Ketiga accessor di bawah lewat
 * fungsi ini, jadi satu terjemahan menjaga semuanya.
 */
export function themeOf(templateId: string): ThemePresentation {
  return themePresentation[resolveTemplateId(templateId)]
}

/**
 * Set ornamen kedelapan tema yang dipensiunkan di fase 48.
 *
 * Yang mati adalah palet, font, dan foto covernya; ornamennya tidak — sebelas keping tiap tema
 * masih lolos gerbang mutu, dan mereka jadi kolam varian terkurasi di `ornament-variants.ts`.
 * Komponennya karena itu tetap di disk: `Glyph.vue` sudah glob malas sejak fase 44, jadi tamu
 * hanya mengunduh yang benar-benar dipakai dan menghapusnya tidak menghemat apa pun.
 *
 * **Bentuknya sengaja identik dengan blok tema di atas**: kunci id tema, penutup di kolom dua.
 * (Contohnya tidak ditulis di sini dengan tanda kutip — regexnya akan ikut memakan komentar ini,
 * dan itu sudah terjadi sekali: `aruna-lumine` terbaca sebagai nama contohnya.) `bacaTema()` di `scripts/ornament-forge/verify.mjs` memindai berkas ini dengan
 * satu regex, jadi kedelapannya tetap terbaca dan gerbang keunikan tetap mengukur 54 glyph.
 * Menyimpannya dalam bentuk lain akan membuat gerbang itu turun ke enam glyph sambil tetap
 * melaporkan "0 pelanggaran" — hijau, dan tidak berarti apa-apa.
 *
 * Daftar ini **beku**. Tema pensiun tidak pernah bertambah ornamen.
 */
export const ornamenPensiun: Record<string, OrnamentSet> = {
  'aruna-lumine': {
    frame: 'frame-deco',
    divider: 'divider-diamond',
    corner: 'corner-deco',
    floral: 'monstera',
    floralAlt: 'branch',
    monogram: 'monogram-shield',
    motif: 'motif-geometric',
    symbol: 'symbol-fan',
    garland: 'garland-slim',
    seal: 'seal-crest',
    layers: ['layer-bloom-deco', 'layer-cascade-deco', 'layer-crown-deco', 'layer-cluster-deco', 'layer-swag-deco'],
  },
  'aruna-senja': {
    frame: 'frame-ogee',
    divider: 'divider-rope',
    corner: 'corner-flourish',
    floral: 'frangipani',
    floralAlt: 'bloom',
    monogram: 'monogram-diamond',
    motif: 'motif-tumpal',
    symbol: 'symbol-crescent',
    garland: 'garland',
    seal: 'seal-tumpal',
    layers: ['layer-bloom-tropis', 'layer-cascade-tropis', 'layer-crown-tropis', 'layer-cluster-tropis', 'layer-swag-tropis'],
  },
  'aruna-alba': {
    frame: 'frame-line',
    divider: 'divider-dotted',
    corner: 'corner-angle',
    floral: 'stem-single',
    floralAlt: 'branch',
    monogram: 'monogram-ring',
    motif: 'motif-rule',
    symbol: 'symbol-rings',
    garland: 'garland-slim',
    seal: 'seal-ring',
    layers: ['layer-bloom-geometris', 'layer-cascade-geometris', 'layer-crown-geometris', 'layer-cluster-geometris', 'layer-swag-geometris'],
  },
  'aruna-sogan': {
    frame: 'frame-gunungan',
    divider: 'divider-lung-lungan',
    corner: 'corner-batik',
    floral: 'melati-ronce',
    floralAlt: 'sprig',
    monogram: 'monogram-laurel',
    motif: 'motif-kawung',
    symbol: 'symbol-lotus',
    garland: 'garland',
    seal: 'seal-kayon',
    layers: ['layer-bloom-sogan', 'layer-cascade-sogan', 'layer-crown-sogan', 'layer-cluster-sogan', 'layer-swag-sogan'],
  },
  'aruna-gonjong': {
    frame: 'frame-gonjong',
    divider: 'divider-songket',
    corner: 'corner-pucuak-rabuang',
    floral: 'frangipani',
    floralAlt: 'sprig',
    monogram: 'monogram-diamond',
    motif: 'motif-songket',
    symbol: 'symbol-candle',
    garland: 'garland',
    seal: 'seal-gonjong',
    layers: ['layer-bloom-songket', 'layer-cascade-songket', 'layer-crown-songket', 'layer-cluster-songket', 'layer-swag-songket'],
  },
  'aruna-mendung': {
    frame: 'frame-mendung',
    divider: 'divider-wave',
    corner: 'corner-wadasan',
    floral: 'bloom',
    floralAlt: 'sprig',
    monogram: 'monogram-shield',
    motif: 'motif-mega-mendung',
    symbol: 'symbol-wadasan',
    garland: 'garland-slim',
    seal: 'seal-mendung',
    layers: ['layer-bloom-mendung', 'layer-cascade-mendung', 'layer-crown-mendung', 'layer-cluster-mendung', 'layer-swag-mendung'],
  },
  'aruna-kenanga': {
    frame: 'frame-kenanga',
    divider: 'divider-row',
    corner: 'corner-kenanga',
    floral: 'jasmine',
    floralAlt: 'bloom',
    monogram: 'monogram-laurel',
    motif: 'motif-kenanga',
    symbol: 'symbol-kupu',
    garland: 'garland',
    seal: 'seal-kenanga',
    layers: ['layer-bloom-kenanga', 'layer-cascade-kenanga', 'layer-crown-kenanga', 'layer-cluster-kenanga', 'layer-swag-kenanga'],
  },
  'aruna-bentar': {
    frame: 'frame-bentar',
    divider: 'divider-knot',
    corner: 'corner-catur',
    floral: 'frangipani',
    floralAlt: 'jasmine',
    monogram: 'monogram-diamond',
    motif: 'motif-catur',
    symbol: 'symbol-payung',
    garland: 'garland',
    seal: 'seal-bentar',
    layers: ['layer-bloom-bentar', 'layer-cascade-bentar', 'layer-crown-bentar', 'layer-cluster-bentar', 'layer-swag-bentar'],
  },
}

/** Set ornamen milik sebuah dokumen. */
export function themeOrnaments(templateId: string): OrnamentSet {
  return themeOf(templateId).ornaments
}

/** Partitur tema, atau `undefined` untuk tema yang belum dipindahkan ke partitur. */
export function themeMotion(templateId: string): ThemeMotion | undefined {
  return themeOf(templateId).motion
}

export const invitationThemes = templates.map(template => ({ ...template, ...themePresentation[template.id] }))

/** Inline custom properties every invitation section reads. */
export function themeStyle(document: Pick<InvitationDocument, 'tokens' | 'templateId'>): Record<string, string> {
  const preset = templateById(document.templateId) ?? templates[0]!
  const presentation = themeOf(document.templateId)
  const body = presentation.body
  const backdrop = presentation.backdrop
  return {
    '--iv-bg': document.tokens.background,
    '--iv-fg': document.tokens.foreground,
    '--iv-primary': document.tokens.primary,
    '--iv-accent': preset.accent,
    /*
     * Tinta tombol, DITURUNKAN dari `primary` yang sedang berlaku — bukan dipanggang.
     *
     * Ini yang membuka tema gelap. Selama tintanya tetap `#FFFDF7` di CSS, pasangan `accent`
     * dan `button` saling meniadakan pada latar gelap dan tidak ada palet yang bisa lolos
     * keduanya. Diturunkan, bukan disimpan di `tokens`: menambah key ke `tokens` menggerbangi
     * perubahannya di balik entitlement `design` dan memecah `tests/contracts.test.ts`.
     *
     * Ia mengikuti warna pilihan pasangan juga, bukan hanya preset — pasangan yang menggeser
     * `primary` jadi terang mendapat tinta gelap tanpa perlu tahu tombolnya punya token.
     */
    '--iv-on-primary': onPrimary(document.tokens.primary),
    /*
     * Ramp ornamen. Empat stop hex, bukan empat string `color-mix()` — lihat
     * `utils/ornament-palette.ts` untuk alasannya (Node tidak bisa mengevaluasi `color-mix`,
     * jadi gerbangnya tidak akan pernah bisa memeriksa nilai yang sebenarnya).
     *
     * `--iv-orn-body` sengaja persis `primary`, jadi ornamen yang sudah tayang tidak bergeser
     * warnanya hanya karena rampnya ditambahkan; yang baru adalah tiga tetangganya.
     */
    ...rampStyle(ornamentRamp(document.tokens, preset.accent)),
    /*
     * Ramp untuk bidang gelap, dipancarkan berdampingan dan dipilih CSS di `Renderer.vue`.
     *
     * Diturunkan terhadap `primary`, bidang gelap yang paling sering dipakai; diukur terhadap
     * `foreground` ia justru lebih longgar (7,x banding 2,9), jadi satu ramp cukup untuk
     * keduanya dan `Section.vue` tidak perlu dua aturan yang berbeda.
     */
    ...rampStyle(ornamentRampOnDark(preset.accent, document.tokens.primary), '--iv-orn-dark'),
    '--iv-display': fontStacks[document.tokens.font],
    '--iv-body': fontStacks[body],
    // Tema tanpa kaligrafi jatuh kembali ke font display-nya sendiri.
    '--iv-script': presentation.script ?? fontStacks[document.tokens.font],
    '--iv-display-weight': displayWeights[document.tokens.font] ?? '600',
    // Bayangan dibangun dari warna teks tema, jadi ikut hangat/dingin mengikuti paletnya.
    '--iv-shadow-card': `0 18px 36px -26px color-mix(in srgb, ${document.tokens.foreground} 60%, transparent)`,
    '--iv-shadow-lift': `0 28px 60px -32px color-mix(in srgb, ${document.tokens.foreground} 70%, transparent)`,
    // Latar tema. Nilai `none`/`0` membuat tema tanpa backdrop identik dengan sebelumnya.
    '--iv-backdrop-mask': backdrop?.motif ? `url("${backdrop.motif.src}")` : 'none',
    '--iv-backdrop-size': backdrop?.motif?.size ?? '240px',
    '--iv-backdrop-opacity': String(backdrop?.motif?.opacity ?? 0),
  }
}

export function fontStack(font: FontChoice): string {
  return fontStacks[font]
}
