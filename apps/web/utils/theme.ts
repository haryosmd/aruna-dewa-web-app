import { templates, templateById, type FontChoice, type InvitationDocument, type TemplateId } from '@aruna/contracts'
import type { OrnamentSet } from './ornaments'

/** Aksen kaligrafi, dipakai hanya untuk nama pasangan pada tema yang cocok. */
const scriptStack = "'Parisienne', 'Cormorant Garamond', Georgia, cursive"

/** Beberapa font display hanya punya weight 400; memintanya 600 memaksa browser menebalkan sendiri. */
const displayWeights: Partial<Record<FontChoice, string>> = { italiana: '400', instrument: '400' }

const fontStacks: Record<FontChoice, string> = {
  cormorant: "'Cormorant Garamond', Georgia, serif",
  italiana: "'Italiana', Georgia, serif",
  fraunces: "'Fraunces', Georgia, serif",
  jost: "'Jost', system-ui, sans-serif",
  jakarta: "'Plus Jakarta Sans', system-ui, sans-serif",
  instrument: "'Instrument Serif', Georgia, serif",
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
}

/**
 * Presentation details that belong to the web app rather than the shared contract.
 *
 * `ornaments` adalah yang membuat tema benar-benar berbeda: masing-masing membawa bingkai,
 * pemisah, sudut, motif, dan simbolnya sendiri — bukan sekadar tiga warna yang ditukar.
 * Kesembilan frame, divider, corner, motif, dan symbol di bawah ini tidak ada yang berulang.
 */
export const themePresentation: Record<TemplateId, ThemePresentation> = {
  'aruna-bloom': {
    body: 'jakarta',
    cover: '/images/card/couple.webp',
    mood: 'Hangat · Botanical · Klasik',
    script: scriptStack,
    gallery: 'masonry',
    ornaments: {
      frame: 'arch',
      divider: 'divider-leaf',
      corner: 'corner-vine',
      floral: 'eucalyptus',
      floralAlt: 'jasmine',
      monogram: 'monogram-laurel',
      motif: 'motif-arabesque',
      symbol: 'symbol-dove',
      garland: 'garland',
      seal: 'seal-laurel',
      layers: ['layer-bloom-botanical', 'layer-cascade-botanical', 'layer-crown-botanical', 'layer-cluster-botanical', 'layer-swag-botanical'],
    },
  },
  'aruna-lumine': {
    body: 'jost',
    cover: '/images/card/rings.webp',
    mood: 'Tenang · Emas · Modern',
    // Lumine sengaja tanpa kaligrafi: huruf art-deco-nya justru lemah kalau dicampur script.
    script: null,
    gallery: 'mosaic',
    ornaments: {
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
  },
  'aruna-senja': {
    body: 'jakarta',
    cover: '/images/card/venue.webp',
    mood: 'Dramatis · Plum · Amber',
    script: scriptStack,
    gallery: 'rail',
    ornaments: {
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
  },
  'aruna-alba': {
    body: 'jakarta',
    cover: '/images/card/rings.webp',
    mood: 'Bersih · Tegas · Modern',
    script: null,
    gallery: 'mosaic',
    // Minimalis berarti kosong: alba sengaja tidak punya backdrop sama sekali.
    ornaments: {
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
  },
  'aruna-sogan': {
    body: 'jakarta',
    cover: '/images/card/adat-jawa.webp',
    mood: 'Sogan · Kunir · Jawa',
    script: scriptStack,
    gallery: 'masonry',
    backdrop: {
      motif: { src: '/textures/kawung.svg', size: '200px', opacity: 0.05 },
    },
    ornaments: {
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
  },
  'aruna-gonjong': {
    body: 'jakarta',
    cover: '/images/card/rumah-gadang.webp',
    mood: 'Marun · Songket · Minang',
    script: scriptStack,
    gallery: 'rail',
    backdrop: {
      motif: { src: '/textures/songket.svg', size: '260px', opacity: 0.05 },
    },
    ornaments: {
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
  },
  'aruna-mendung': {
    body: 'jost',
    cover: '/images/card/venue.webp',
    mood: 'Pesisiran · Biru · Awan',
    script: scriptStack,
    gallery: 'mosaic',
    backdrop: {
      motif: { src: '/textures/mega-mendung.svg', size: '220px', opacity: 0.05 },
    },
    ornaments: {
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
  },
  'aruna-kenanga': {
    body: 'jakarta',
    cover: '/images/card/couple.webp',
    mood: 'Blush · Kenanga · Lembut',
    script: scriptStack,
    gallery: 'rail',
    backdrop: {
      motif: { src: '/textures/kenanga.svg', size: '180px', opacity: 0.05 },
    },
    ornaments: {
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
  },
  'aruna-bentar': {
    body: 'jost',
    cover: '/images/card/hero.webp',
    mood: 'Bali · Padas · Poleng',
    script: scriptStack,
    gallery: 'masonry',
    backdrop: {
      motif: { src: '/textures/poleng.svg', size: '160px', opacity: 0.04 },
    },
    ornaments: {
      frame: 'frame-bentar',
      divider: 'divider-knot',
      corner: 'corner-poleng',
      floral: 'frangipani',
      floralAlt: 'jasmine',
      monogram: 'monogram-diamond',
      motif: 'motif-poleng',
      symbol: 'symbol-payung',
      garland: 'garland',
      seal: 'seal-bentar',
      layers: ['layer-bloom-bentar', 'layer-cascade-bentar', 'layer-crown-bentar', 'layer-cluster-bentar', 'layer-swag-bentar'],
    },
  },
}

/** Set ornamen milik sebuah dokumen, dengan tema pertama sebagai cadangan. */
export function themeOrnaments(templateId: TemplateId): OrnamentSet {
  return (themePresentation[templateId] ?? themePresentation[templates[0]!.id as TemplateId]).ornaments
}

/** Presentasi lengkap sebuah dokumen, dengan tema pertama sebagai cadangan. */
export function themeOf(templateId: TemplateId): ThemePresentation {
  return themePresentation[templateId] ?? themePresentation[templates[0]!.id as TemplateId]
}

export const invitationThemes = templates.map(template => ({ ...template, ...themePresentation[template.id] }))

/** Inline custom properties every invitation section reads. */
export function themeStyle(document: Pick<InvitationDocument, 'tokens' | 'templateId'>): Record<string, string> {
  const preset = templateById(document.templateId) ?? templates[0]!
  const presentation = themePresentation[preset.id]
  const body = presentation.body
  const backdrop = presentation.backdrop
  return {
    '--iv-bg': document.tokens.background,
    '--iv-fg': document.tokens.foreground,
    '--iv-primary': document.tokens.primary,
    '--iv-accent': preset.accent,
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
