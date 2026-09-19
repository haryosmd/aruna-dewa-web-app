import type { LayerSlot, OrnamentCategory, OrnamentId, OrnamentSet } from './ornaments'
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
 * Slot skalar yang bisa ditukar. **Sembilan, bukan sepuluh** — `motif` sengaja tidak ada.
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
] as const
export type OrnamentSlotKey = (typeof ornamentSlots)[number]

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
}

/**
 * Penukaran pasangan. Hidup di `sections[cover].data.ornamentOverrides`, bukan di `tokens`.
 *
 * Bentuk lamanya empat key skalar; bentuk ini menambah lima sisanya plus `layers` yang
 * berkunci `LayerSlot`. Dokumen lama tetap terbaca apa adanya — tidak ada migrasi.
 */
export interface OrnamentOverrides extends Partial<Record<OrnamentSlotKey, OrnamentId>> {
  layers?: Partial<Record<LayerSlot, OrnamentId>>
}

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
  return `${Math.round(Math.min(batas, Math.max(64, tinggi * ornament(glyph).ratio)))}px`
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
export function terapkanOverrides(set: OrnamentSet, overrides: OrnamentOverrides): OrnamentSet {
  const { layers: tukarLayer, ...skalar } = overrides
  const layers = tukarLayer
    ? set.layers.map(glyph => {
      const jangkar = layerSlot(glyph)
      const pengganti = jangkar ? tukarLayer[jangkar] : undefined
      return pengganti ?? glyph
    })
    : set.layers

  return { ...set, ...skalar, layers }
}

/** Berapa slot yang sedang menyimpang dari bawaan tema. Dipakai penanda "n diganti". */
export function jumlahDiganti(overrides: OrnamentOverrides): number {
  const { layers, ...skalar } = overrides
  return Object.keys(skalar).length + Object.keys(layers ?? {}).length
}
