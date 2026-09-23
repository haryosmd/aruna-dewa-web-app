import type { sectionTypes } from '@aruna/contracts'
import type { LayerSlot, OrnamentCategory, OrnamentId, OrnamentSet, ResolvedOrnamentSet, UploadedOrnament } from './ornaments'
import { layerSlot, ornament } from './ornaments'

/**
 * Kosakata slot ornamen: apa yang bisa ditukar pasangan, dan apa yang sah mengisinya.
 *
 * Sampai fase 58 hanya empat slot bisa ditukar, dan hanya dari kolam terkurasi per tema
 * (`ornament-variants.ts`). Fase 59 membuka seluruh bank atas keputusan pemilik — kolam
 * terkurasi **tetap ada** sebagai tab "Disarankan", dan berkas ini yang menyediakan jalur
 * keduanya: penjaga korektnes, bukan kurasi.
 *
 * Bedanya penting. `ornament-variants.ts` menjawab "apakah keping ini seresep dengan
 * temanya"; berkas ini menjawab "apakah keping ini bisa dipasang di slot ini sama sekali".
 * Yang pertama boleh dilanggar pasangan dengan sadar; yang kedua tidak pernah.
 */

/**
 * Slot skalar yang bisa ditukar. **Sebelas sejak fase 69** (sembilan + dua bentuk amplop);
 * `motif` sengaja tidak ada.
 *
 * `OrnamentSet.motif` terdaftar, dijaga gerbang keunikan, dan **tidak pernah dirender di
 * undangan**: diukur pada seluruh `components/invitation/`, satu-satunya pembacanya adalah
 * penghitung teaser di `components/landing/Themes.vue:18`. Menawarkannya di pemilih berarti
 * memberi pasangan kontrol yang tidak mengubah apa pun yang bisa ia lihat — cacat yang lebih
 * buruk daripada slot yang tidak ditawarkan, karena ia terbaca sebagai aplikasi yang rusak.
 *
 * Slot itu tetap hidup di `OrnamentSet` dan tetap digerbangi; yang belum ada adalah tempat
 * merendernya. Memberinya tempat adalah keputusan desain tersendiri, bukan pekerjaan sambil
 * lalu di dalam pemilih.
 */
export const ornamentSlots = [
  'frame', 'divider', 'corner', 'floral', 'floralAlt', 'monogram', 'symbol', 'garland', 'seal',
  // Fase 69: dua bentuk amplop gerbang, dulu path inline di CoverGate.vue.
  'envelopePocket', 'envelopeFlap',
  // Fase 80: dua slot yang bawaannya garis, bukan keping — lihat `slotGaris`.
  'segue', 'heroFrame',
] as const
export type OrnamentSlotKey = (typeof ornamentSlots)[number]

/**
 * Slot yang bawaannya garis, bukan keping bank (fase 80). Tema tidak mengisinya, jadi
 * `set[slot]` untuk keduanya `undefined` sampai pasangan menggantinya — dan pemanggil harus
 * menggambar garisnya sendiri untuk keadaan itu.
 */
export const slotGaris = ['segue', 'heroFrame'] as const satisfies readonly OrnamentSlotKey[]

/**
 * Slot skalar yang benar-benar **dirender** tiap section (fase 71).
 *
 * Nilai ornamen tetap global — satu keping `divider` dipakai amplop, hitung mundur, mempelai,
 * galeri, dan rundown sekaligus — tapi pasangan yang sedang menyunting "Mempelai" tidak perlu
 * melihat sebelas slot untuk menemukan tiga yang mengubah bagian itu. Tabel ini yang menentukan
 * kartu "Ornamen di bagian ini" di form tiap bagian; cover memegang ringkasan penuh dan karena
 * itu membawa juga slot amplop yang dirender `CoverGate.vue` di depannya.
 *
 * Ditulis dari pembacaan `components/invitation/sections/*.vue` dan `CoverGate.vue`, dan
 * **dijaga vitest yang membaca sumbernya** (`ornament-slots.spec.ts`): section yang mulai atau
 * berhenti memakai satu slot akan memerahkan tes sampai tabel ini ikut diubah.
 */
export const sectionOrnamentSlots: Record<(typeof sectionTypes)[number], readonly OrnamentSlotKey[]> = {
  cover: ['frame', 'corner', 'garland', 'symbol', 'divider', 'seal', 'envelopePocket', 'envelopeFlap'],
  couple: ['floral', 'corner', 'divider'],
  events: ['corner'],
  countdown: ['divider'],
  gallery: ['divider'],
  story: ['floralAlt', 'monogram', 'divider'],
  rundown: ['divider', 'symbol'],
  dresscode: ['floralAlt'],
  video: ['symbol'],
  gift: [],
  rsvp: ['floral', 'seal'],
  wishes: [],
  closing: ['garland', 'monogram'],
  music: [],
  // Struktur Elegance (fase 72): dirender `components/invitation/elegance/*.vue`.
  'opening-envelope': ['divider', 'seal', 'envelopePocket', 'envelopeFlap', 'corner'],
  // `segue` tidak milik bagian mana pun: pitanya dirender Renderer DI ANTARA bagian, jadi kartunya
  // hanya ada di ringkasan penuh. Klik pitanya di kanvas menyorot kartu itu.
  hero: ['monogram', 'symbol', 'corner', 'heroFrame'],
  event: ['divider', 'corner'],
  map: ['symbol'],
  'unduh-mantu': ['symbol'],
  quote: ['divider'],
}

/**
 * Glyph yang **tidak ditawarkan** Studio Ornamen, meski tetap sah dipasang.
 *
 * Keputusan pemilik 2026-09-19 (fase 70), dari tangkapan layar tab "Semua" slot Bingkai:
 * sembilan bingkai koleksi inti ini diminta berhenti tayang. Fase 58 sudah pernah
 * memensiunkan bingkai forge dengan mencabut keanggotaannya dari `themeOrnaments` dan
 * `themeVariants` — dan fase 59, yang membuka seluruh bank lewat `kandidat()`, diam-diam
 * membatalkan pensiun itu. Set ini adalah mekanisme yang seharusnya ada sejak saat itu.
 *
 * Berkas dan entri banknya **tidak dihapus**: enam di antaranya bawaan tema pensiun di
 * `ornamenPensiun` (daftar beku yang dipindai `bacaTema()` supaya gerbang keunikan tetap
 * mengukur 54 slot). `muatSlot()` juga sengaja tidak membacanya — dokumen yang sudah
 * memilih salah satunya tetap tervalidasi dan terrender; ia hanya tidak ditawarkan lagi.
 */
export const ornamenDisembunyikan: ReadonlySet<OrnamentId> = new Set<OrnamentId>([
  'frame-bentar', 'frame-kenanga', 'frame-mendung', 'frame-gonjong', 'frame-gunungan',
  'frame-hening', 'frame-line', 'frame-pelita', 'frame-wastra',
])

/**
 * Kategori bank yang boleh mengisi sebuah slot.
 *
 * Jamak, bukan satu-lawan-satu, dan tiap pelebaran punya alasannya sendiri:
 * `floral`/`floralAlt`/`garland` memang satu kategori di bank, dan `seal` ikut menerima
 * `monogram` karena `CoverGate.vue:142-145` mengoper `:initials` ke glyph segel — monogram
 * satu-satunya keluarga yang memakai prop itu.
 */
export const slotCategories: Record<OrnamentSlotKey, readonly OrnamentCategory[]> = {
  frame: ['frame'],
  divider: ['divider'],
  corner: ['corner'],
  floral: ['floral'],
  floralAlt: ['floral'],
  monogram: ['monogram'],
  symbol: ['symbol'],
  garland: ['floral'],
  seal: ['seal', 'monogram'],
  envelopePocket: ['envelopePocket'],
  envelopeFlap: ['envelopeFlap'],
  segue: ['divider'],
  heroFrame: ['frame'],
}

/**
 * Penukaran pasangan. Hidup di `sections[cover].data.ornamentOverrides`, bukan di `tokens`.
 *
 * Bentuk lamanya empat key skalar; bentuk ini menambah lima sisanya plus `layers` yang
 * berkunci `LayerSlot`. Dokumen lama tetap terbaca apa adanya — tidak ada migrasi.
 */
export interface OrnamentOverrides extends Partial<Record<OrnamentSlotKey, OrnamentId>> {
  layers?: Partial<Record<LayerSlot, OrnamentId>>
  /** Ornamen unggahan per slot (fase 69). Bila ada, ia menang atas id bank di slot yang sama. */
  unggahan?: Partial<Record<UploadableSlot, UploadedOrnament>>
}

/**
 * Slot yang menerima unggahan: sembilan slot skalar lama. Bukan dua slot amplop — mereka
 * harus melar (`preserveAspectRatio="none"`) dan mewarnai diri dari palet, dua hal yang raster
 * tidak bisa. Bukan pula `layers`, dengan alasan berat yang sama dengan aset referensi.
 */
export const uploadableSlots = [
  'frame', 'divider', 'corner', 'floral', 'floralAlt', 'monogram', 'symbol', 'garland', 'seal',
] as const
export type UploadableSlot = (typeof uploadableSlots)[number]
export const bolehUnggah = (slot: OrnamentSlotKey): slot is UploadableSlot => (uploadableSlots as readonly string[]).includes(slot)

/** Urutan dan nama kelima jangkar ladang ornamen, untuk rel slot di Studio. */
export const layerSlots = ['bloom', 'cascade', 'crown', 'cluster', 'swag'] as const

export interface SlotLabel {
  label: string
  /**
   * Di mana keping ini benar-benar terlihat tamu.
   *
   * Ditulis dari pembacaan `components/invitation/`, bukan dari dugaan. Label lama `frame`
   * berbunyi "Dipakai sampul dan amplop pembuka" dan itu **salah**: amplop memakai `divider`
   * dan `seal`, sementara `frame` hanya muncul pada satu komposisi cover. Pasangan yang
   * menukar bingkai lalu tidak melihat apa pun berubah akan menyimpulkan aplikasinya rusak,
   * bukan bahwa ia memakai komposisi yang lain.
   */
  hint: string
  /** Terisi kalau keping ini hanya tampil pada keadaan tertentu. Ditampilkan sebagai catatan. */
  syarat?: string
}

export const slotLabels: Record<OrnamentSlotKey, SlotLabel> = {
  frame: {
    label: 'Bingkai',
    hint: 'Siluet yang memeluk foto cover.',
    syarat: 'Hanya tampil pada komposisi cover “Bingkai kayon”.',
  },
  divider: { label: 'Pemisah', hint: 'Pita tipis di amplop, hitung mundur, mempelai, galeri, dan rundown.' },
  corner: { label: 'Sudut', hint: 'Hiasan pojok foto cover, potret mempelai, dan kartu acara.' },
  floral: { label: 'Rangkaian', hint: 'Bunga di bagian mempelai dan kelopak pada kartu RSVP.' },
  floralAlt: { label: 'Rangkaian kedua', hint: 'Bunga pendamping di bagian cerita dan dresscode.' },
  monogram: { label: 'Monogram', hint: 'Inisial kalian di bagian cerita dan penutup.' },
  symbol: { label: 'Simbol', hint: 'Lambang kecil di cover, rundown, dan bagian video.' },
  garland: { label: 'Karangan', hint: 'Untaian melintang di cover dan penutup.' },
  seal: { label: 'Segel', hint: 'Lilin penutup amplop yang terbelah saat dibuka, dan cap pada kartu RSVP.' },
  envelopePocket: { label: 'Kantong amplop', hint: 'Bagian depan amplop yang menutupi surat sebelum dibuka.' },
  envelopeFlap: { label: 'Flap amplop', hint: 'Tutup amplop yang terbuka setelah segel terbelah.' },
  segue: { label: 'Pita babak', hint: 'Pita tipis yang menandai pergantian babak di antara bagian.' },
  heroFrame: {
    label: 'Bingkai hero',
    hint: 'Garis yang membingkai layar pembuka setelah amplop dibuka.',
    syarat: 'Hanya struktur Elegance.',
  },
}

export const layerSlotLabels: Record<LayerSlot, SlotLabel> = {
  bloom: { label: 'Mekar', hint: 'Keping bermassa yang mekar dari jangkar tepi.' },
  cascade: { label: 'Untai', hint: 'Untaian yang jatuh dan bergoyang dari tepi atas.' },
  crown: { label: 'Mahkota', hint: 'Keping lebar di puncak bagian.' },
  cluster: { label: 'Rumpun', hint: 'Rumpun kecil, dipasang beberapa kali dan dicerminkan.' },
  swag: { label: 'Juntai', hint: 'Lengkungan menjuntai di sisi bagian.' },
}

/** Apakah sebuah glyph boleh mengisi slot skalar ini sama sekali. */
export function muatSlot(slot: OrnamentSlotKey, glyph: OrnamentId): boolean {
  return slotCategories[slot].includes(ornament(glyph).category)
}

/** Apakah sebuah glyph boleh mengisi jangkar ladang ini. Kategori DAN jangkarnya harus cocok. */
export function muatLayer(slot: LayerSlot, glyph: OrnamentId): boolean {
  return ornament(glyph).category === 'layer' && layerSlot(glyph) === slot
}

/**
 * Lebar ubin pratinjau, diturunkan dari rasio glyph-nya sendiri.
 *
 * Pindah ke sini dari `pages/dashboard/[id]/editor.vue` supaya ringkasan panel dan grid Studio
 * memakai satu fungsi, bukan dua salinan yang bisa menyimpang. Alasan aslinya tetap berlaku:
 * ubin persegi membuat pemisah berasio 8:1 terbaca sebagai garis tipis yang sama persis, dan
 * pasangan tidak bisa memilih bentuk yang tidak bisa ia bedakan.
 */
export function tileWidth(glyph: OrnamentId, tinggi = 56, batas = 168): string {
  return tileWidthRasio(ornament(glyph).ratio, tinggi, batas)
}

/** Versi yang menerima rasio langsung — untuk unggahan, yang rasionya dari `width/height`. */
export function tileWidthRasio(ratio: number, tinggi = 56, batas = 168): string {
  return `${Math.round(Math.min(batas, Math.max(64, tinggi * (ratio || 1))))}px`
}

/**
 * Set tema setelah penukaran pasangan ditumpangkan.
 *
 * Slot skalar disebar biasa. `layers` **tidak bisa** disebar: ia array lima keping yang
 * dibedakan `layerSlot()`, jadi penukaran dipetakan per jangkar. Hasilnya dibangun dengan
 * memetakan array tema, bukan dengan mendorong ke array baru — itu yang menjamin invarian
 * yang dijaga `theme-identity.spec.ts` (lima layer, satu per jangkar) tidak bisa dilanggar
 * lewat pemilih.
 */
export function terapkanOverrides(set: OrnamentSet, overrides: OrnamentOverrides): ResolvedOrnamentSet {
  const { layers: tukarLayer, unggahan, ...skalar } = overrides
  const layers = tukarLayer
    ? set.layers.map(glyph => {
      const jangkar = layerSlot(glyph)
      const pengganti = jangkar ? tukarLayer[jangkar] : undefined
      return pengganti ?? glyph
    })
    : set.layers

  // Unggahan disebar TERAKHIR: ia menang atas id bank di slot yang sama (fase 69).
  return { ...set, ...skalar, ...(unggahan ?? {}), layers }
}

/** Berapa slot yang sedang menyimpang dari bawaan tema. Dipakai penanda "n diganti". */
export function jumlahDiganti(overrides: OrnamentOverrides): number {
  const { layers, unggahan, ...skalar } = overrides
  return Object.keys(skalar).length + Object.keys(layers ?? {}).length + Object.keys(unggahan ?? {}).length
}
