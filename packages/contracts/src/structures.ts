import {
  createEleganceSections, eleganceSectionTypes, extraSectionTypes, headlessSectionTypes,
  legacySectionTypes, type DefaultDocumentInput, type SectionType, type V2Section,
} from './sections'

/**
 * Template STRUKTURAL: bagian apa saja yang dimiliki sebuah undangan, dan siapa yang merendernya.
 *
 * Sampai fase 74 kata "template" di kode ini hanya berarti **tema** — palet, ornamen, partitur
 * gerak — dan strukturnya satu untuk semua tema, tertanam di skema lewat `schemaVersion`.
 * Akibatnya "template baru" tidak bisa dinyatakan sama sekali: sebuah record template tidak punya
 * tempat untuk menyebut bagiannya, dan `Renderer` memilih keluarga komponennya dari
 * `schemaVersion`, bukan dari templatenya.
 *
 * Yang dibedah dari undang.site (`docs/features/invitation-builder/FASE-72.md:33-40`) justru
 * memakai **dua sumbu** — `templateCode` untuk struktur dan `themeId` untuk warna — dan seluruh
 * salinan di produk kita sudah menyebut `templateId` sebagai "tema". Berkas ini memberi sumbu
 * pertama itu rumahnya.
 *
 * **Berkas sendiri, bukan di dalam `sections.ts`.** Berkas itu sudah menyatakan dirinya sumber
 * tunggal untuk tiga hal; registry akan menjadikannya lima.
 *
 * `warisan` didaftarkan sebagai struktur penuh, bukan dibiarkan jadi cabang `schemaVersion === 1`.
 * Itu yang membuat renderer bisa berhenti mengistimewakan versi: v1 berhenti jadi pengecualian
 * dan menjadi template struktural yang **pensiun** — gerakan yang sama persis dengan
 * `liveTemplateIds` untuk tema pensiun.
 */

/** Hanya tumbuh, alasan identik dengan `templateIds` dan `sectionTypes`: ia sumber `z.enum`. */
export const structureIds = ['warisan', 'elegance'] as const
export type StructureId = (typeof structureIds)[number]

/**
 * Yang ditawarkan pemilih. `warisan` tidak pernah bisa dipilih — ia hanya dibaca dokumen lama,
 * persis seperti tema pensiun yang tetap sah di dalam dokumen tapi hilang dari ketiga pemilih.
 */
export const liveStructureIds = ['elegance'] as const satisfies readonly StructureId[]

/** Kunci keluarga komponen renderer. Satu keluarga boleh melayani lebih dari satu struktur. */
export type StructureFamily = 'warisan' | 'elegance'

export interface StructureTemplate {
  id: StructureId
  name: string
  version: 1
  tagline: string
  /** Urutan bawaan, dan sekaligus jawaban "tipe apa yang sah di struktur ini". */
  sectionTypes: readonly SectionType[]
  /** Tidak bisa disembunyikan di struktur ini. */
  required: ReadonlySet<SectionType>
  /**
   * Lahir menyala. Invariannya dijaga `tests/structures.test.ts`: seluruhnya **wajib** tercakup
   * `baseFeatures`, kalau tidak setiap undangan baru di paket termurah gagal terbit — persis
   * cacat `gift` yang ditutup fase 73.2.
   */
  enabledByDefault: ReadonlySet<SectionType>
  /**
   * Tipe yang memang tidak punya komponen di peta renderer. Dibaca dari `headlessSectionTypes`,
   * bukan diketik ulang: daftar pengecualian yang hidup di dua tempat akan berselisih.
   */
  headless: ReadonlySet<SectionType>
  family: StructureFamily
  build(input: DefaultDocumentInput): V2Section[]
}

/**
 * Bagian dokumen v1, ditarik keluar dari `createLegacyDocument` supaya struktur `warisan` punya
 * pembangun seperti struktur lain. Isinya tidak berubah satu karakter pun.
 */
export function createLegacySections(input: DefaultDocumentInput): V2Section[] {
  const { partner1, partner2 } = input
  return [
    { id: 'cover', type: 'cover', enabled: true, data: { title: `${partner1} & ${partner2}`, subtitle: 'The wedding of', image: '/images/couple.webp', layout: 'arch-potret', ornamentIntensity: 'seimbang' } },
    { id: 'couple', type: 'couple', enabled: true, data: { partner1, partner2, description: 'Dengan penuh kebahagiaan, kami mengundang Anda merayakan hari pernikahan kami.' } },
    { id: 'events', type: 'events', enabled: true, data: { events: [{ id: 'ceremony', name: 'Akad nikah', date: '', time: '09:00', venue: 'Lokasi akan diumumkan', address: '', mapUrl: '', public: true }, { id: 'reception', name: 'Resepsi', date: '', time: '11:00', venue: 'Lokasi akan diumumkan', address: '', mapUrl: '', public: true }], venueIllustration: '' } },
    { id: 'countdown', type: 'countdown', enabled: true, data: { date: '' } },
    { id: 'gallery', type: 'gallery', enabled: true, data: { images: [], motion: 'tema' } },
    { id: 'story', type: 'story', enabled: false, data: { title: 'Awal sebuah cerita', text: '', steps: [] as unknown[] } },
    { id: 'rundown', type: 'rundown', enabled: false, data: { items: [] } },
    { id: 'dresscode', type: 'dresscode', enabled: false, data: { text: '', attire: [] as string[], colors: [] as unknown[] } },
    { id: 'video', type: 'video', enabled: false, data: { url: '', title: 'Saksikan kebahagiaan kami' } },
    { id: 'gift', type: 'gift', enabled: false, data: { title: 'Hadiah untuk kami', note: '', accounts: [] as never[], address: '' } },
    { id: 'rsvp', type: 'rsvp', enabled: true, data: { deadline: '' } },
    { id: 'wishes', type: 'wishes', enabled: true, data: {} },
    { id: 'closing', type: 'closing', enabled: true, data: { text: 'Terima kasih telah menjadi bagian dari cerita kami.' } },
    { id: 'music', type: 'music', enabled: false, data: { url: '' } },
  ] as V2Section[]
}

const saring = (dari: readonly SectionType[]) => new Set<SectionType>(dari)

export const structures: Record<StructureId, StructureTemplate> = {
  /*
   * Struktur pertama kita, dan yang satu-satunya bisa dipilih hari ini. Namanya mengikuti nama
   * yang dipakai pemilik dan referensinya ("Wedding Elegance"), bukan `aruna-*` — `aruna-*` adalah
   * ruang nama TEMA, dan mencampurnya akan menghidupkan lagi kebingungan yang fase ini tutup.
   */
  elegance: {
    id: 'elegance',
    name: 'Wedding Elegance',
    version: 1,
    tagline: 'Dua belas bagian, dari amplop pembuka sampai penutup.',
    sectionTypes: [...eleganceSectionTypes, ...extraSectionTypes],
    required: saring(['opening-envelope', 'hero', 'couple', 'event', 'closing']),
    enabledByDefault: saring(['opening-envelope', 'hero', 'couple', 'countdown', 'event', 'map', 'quote', 'gallery', 'wishes', 'closing']),
    headless: headlessSectionTypes,
    family: 'elegance',
    // `createEleganceSections` DITUNJUK, bukan dipindahkan: irisan ini harus nol perubahan
    // perilaku, dan ayat QS. Ar-Rum: 21 serta bismillah di dalamnya tidak ikut diketik ulang.
    build: createEleganceSections,
  },
  /*
   * Dokumen v1. Pensiun: tidak ada di `liveStructureIds`, jadi tidak pernah muncul di pemilih —
   * tapi tetap penuh, karena undangan yang sudah terbit dengannya masih dibaca tamu hari ini.
   */
  warisan: {
    id: 'warisan',
    name: 'Aruna Warisan',
    version: 1,
    tagline: 'Struktur sebelum fase 72. Tidak lagi dibuat baru.',
    sectionTypes: legacySectionTypes,
    required: saring([]),
    enabledByDefault: saring(['cover', 'couple', 'events', 'countdown', 'gallery', 'rsvp', 'wishes', 'closing']),
    headless: headlessSectionTypes,
    family: 'warisan',
    build: createLegacySections,
  },
}

/** Struktur sebuah id, dengan id tak dikenal jatuh ke `elegance` — dokumen rusak tetap terbuka. */
export function structureById(id: string): StructureTemplate {
  return structures[id as StructureId] ?? structures.elegance
}

export const isLiveStructureId = (id: string): id is StructureId =>
  (liveStructureIds as readonly string[]).includes(id)

/**
 * Struktur sebuah dokumen.
 *
 * `structureId` yang absen **bukan** kesalahan: seluruh dokumen yang lahir sebelum fase 74 tidak
 * punya kunci itu, dan tidak satu pun ditulis ulang (revisi terbit dibaca, tidak pernah disimpan
 * ulang). Jadi absennya diturunkan dari `schemaVersion`, dan hasilnya sama persis dengan
 * perilaku sebelum fase ini.
 */
export function documentStructureId(document: { schemaVersion?: number; structureId?: string }): StructureId {
  if (document.structureId && document.structureId in structures) return document.structureId as StructureId
  return document.schemaVersion === 2 ? 'elegance' : 'warisan'
}

/* ── Pindah struktur ─────────────────────────────────────────────────────── */

type DokumenApaPun = {
  schemaVersion?: number
  structureId?: string
  sections?: { id: string; type: string; enabled: boolean; data: Record<string, unknown> }[]
  [k: string]: unknown
}

/**
 * Memindahkan sebuah dokumen ke struktur lain.
 *
 * Berdiri terhadap STRUKTUR persis seperti `migrateLegacyDocument` berdiri terhadap VERSI: murni,
 * idempoten (struktur yang sama masuk → objek yang sama keluar), dan kehilangannya disebutkan
 * alih-alih disembunyikan.
 *
 * **Isinya dibawa menurut TIPE, bukan menurut posisi.** Dua struktur boleh punya `gallery` di
 * urutan yang berbeda, dan yang harus ikut pindah adalah foto-fotonya — bukan bagian yang
 * kebetulan berada di indeks yang sama.
 *
 * Tiga kehilangan yang dipilih, masing-masing dipin tes:
 *
 * 1. **Tipe yang tidak ada di struktur tujuan hilang.** Pindah ke struktur tanpa `unduh-mantu`
 *    berarti alamat acara ketiga tidak punya tempat untuk ditulis. Ia tidak diselundupkan
 *    sebagai kunci passthrough tanpa pembaca — itu cuma menunda kebingungannya.
 * 2. **`enabled` bagian WAJIB tujuan dipaksa menyala.** Kalau tidak, pindah struktur bisa
 *    melahirkan dokumen yang langsung ditolak `validatePublishableDocument`.
 * 3. **Id bagian mengikuti struktur tujuan.** Itu memang berarti seluruh `order` berganti — dan
 *    itulah kenapa `hasDesignChange` memakai fungsi ini sebagai PEMBANDING, bukan melewati
 *    gerbangnya.
 *
 * Yang dipertahankan apa adanya: `tokens`, `copy`, `settings`, `shareCard`, `templateId`, dan
 * `themeId` — semuanya sumbu tema, bukan sumbu struktur.
 */
export function restructureDocument<T extends DokumenApaPun>(document: T, tujuanId: StructureId): T {
  if (documentStructureId(document) === tujuanId) return document
  const tujuan = structures[tujuanId] ?? structures.elegance
  const lama = new Map((document.sections ?? []).map(section => [section.type, section]))

  const sections = tujuan.build({ partner1: 'Aruna', partner2: 'Dewa' }).map(bawaan => {
    const sebelumnya = lama.get(bawaan.type)
    if (!sebelumnya) return bawaan
    return {
      ...bawaan,
      // Bagian wajib tidak boleh mewarisi `enabled: false` dari struktur sebelumnya — dokumen
      // yang lahir begitu langsung gagal terbit.
      enabled: tujuan.required.has(bawaan.type) ? true : sebelumnya.enabled,
      // Bawaan tujuan jadi ALAS, bukan penimpa: kolom yang belum pernah diisi pasangan tetap
      // mendapat kata-kata bawaannya, dan yang sudah diisi menang.
      data: { ...bawaan.data, ...sebelumnya.data },
    }
  })

  return {
    ...document,
    schemaVersion: tujuan.family === 'warisan' ? 1 : 2,
    structureId: tujuan.id,
    sections,
  }
}
