<script setup lang="ts">
import type { CopyKey, LegacySectionType, StructureFamily, V2SectionType } from '@aruna/contracts'
import { documentStructureId, structureById } from '@aruna/contracts'
import { pilihCopy, resolveCopy } from '~/utils/invitation-copy'
import type { Component } from 'vue'
import type { GuestProfile, InvitationDocument, RendererMode, RsvpPayload, Section, Wish, WishPayload } from '~/types/aruna'
import { toEntrance, toOrnamentOverrides } from '~/utils/invitation-options'
import { isUnggahan, toIntensity } from '~/utils/ornaments'
import { playLegacyScore, playScore } from '~/utils/motion-play'
import { resolveScore, sectionRole, terapkanMotionDokumen } from '~/utils/motion-score'
import { tandaGerak } from '~/utils/kanvas'
import { toEnvelopeSpeed } from '~/utils/motion-envelope'
import { themeMotion, themeOrnaments } from '~/utils/theme'
import { terapkanOverrides } from '~/utils/ornament-slots'

/*
 * Diimpor eksplisit, bukan disebut lewat nama auto-import.
 *
 * Auto-import Nuxt bekerja saat compile dengan memindai tag yang muncul di template.
 * Section di bawah ini hanya pernah disebut sebagai nilai runtime di `sectionComponents`,
 * jadi tidak satupun akan ikut ter-bundle — dan `resolveComponent` pun gagal, karena
 * modulnya memang tidak pernah ada. Jebakan yang sama sudah pernah kena `OrnamentGlyph`.
 */
import SectionCover from './sections/Cover.vue'
import SectionCouple from './sections/Couple.vue'
import SectionEvents from './sections/Events.vue'
import SectionCountdown from './sections/Countdown.vue'
import SectionGallery from './sections/Gallery.vue'
import SectionStory from './sections/Story.vue'
import SectionRundown from './sections/Rundown.vue'
import SectionDresscode from './sections/Dresscode.vue'
import SectionVideo from './sections/Video.vue'
import SectionGift from './sections/Gift.vue'
import SectionRsvp from './sections/Rsvp.vue'
import SectionWishes from './sections/Wishes.vue'
import SectionClosing from './sections/Closing.vue'
import EleganceHero from './elegance/Hero.vue'
import EleganceCouple from './elegance/Couple.vue'
import EleganceCountdown from './elegance/Countdown.vue'
import EleganceEvent from './elegance/Event.vue'
import EleganceMap from './elegance/Map.vue'
import EleganceUnduhMantu from './elegance/UnduhMantu.vue'
import EleganceQuote from './elegance/Quote.vue'
import EleganceGallery from './elegance/Gallery.vue'
import EleganceGift from './elegance/Gift.vue'
import EleganceWishes from './elegance/Wishes.vue'
import EleganceClosing from './elegance/Closing.vue'

export type { GuestProfile, Wish }

const props = withDefaults(
  defineProps<{
    document: InvitationDocument
    greeting?: string
    guest?: GuestProfile | null
    guestError?: string
    hasToken?: boolean
    wishes?: Wish[]
    rsvpPending?: boolean
    wishPending?: boolean
    /**
     * Cara renderer dipasang (fase 72). `live` = halaman tamu; `compact` = pratinjau tanpa
     * gerbang, pemutar, dan dock; `stage` = panggung editor — gerbang dirender dan partitur
     * dimainkan seperti `live`, tapi semuanya terkurung di dalam `.iv-root`.
     */
    mode?: RendererMode
    /** Bentuk lama: `compact` = `mode: 'compact'`. Dipertahankan untuk pemanggil yang sudah ada. */
    compact?: boolean
    /**
     * Panggung editor: gerak dimatikan seluruhnya (tombol Statis, fase 78).
     *
     * Pilihan menonton milik editor, bukan bagian dokumen — ia tidak pernah sampai ke
     * `InvitationDocument`, jadi undangan yang dilihat tamu selalu bergerak.
     */
    statis?: boolean
    /** Panggung editor: naikkan untuk memutar ulang gerak masuk yang sedang terlihat (tombol ▶, fase 81). */
    putar?: number
  }>(),
  { greeting: '', guest: null, guestError: '', hasToken: false, wishes: () => [], rsvpPending: false, wishPending: false, mode: undefined, compact: false, statis: false, putar: 0 },
)

const emit = defineEmits<{
  coverOpen: []
  rsvp: [payload: RsvpPayload]
  wish: [message: string]
  /** Form ucapan v2 (fase 72): nama + kehadiran + pesan. */
  wishEntry: [payload: WishPayload]
  /** Panggung editor: gerbang minta wadahnya dikunci (true) atau dilepas (false). */
  gateLock: [locked: boolean]
  /**
   * Panggung editor: amplop selesai dibuka, undangannya minta diungkap.
   *
   * Sampai fase 77 pengungkapan itu terjadi dengan sendirinya — gerbangnya melepas diri dari DOM
   * dan isi di bawahnya naik mengisi tempatnya. Kini gerbang tetap berdiri sebagai bagian pertama,
   * jadi yang mengungkap harus panggungnya: ia yang tahu skala bingkai dan wadah gulirnya.
   */
  gateReveal: []
}>()

const root = ref<HTMLElement | null>(null)

const mode = computed<RendererMode>(() => props.mode ?? (props.compact ? 'compact' : 'live'))
/** Bukan `compact` — nama itu milik prop lama; ini nilai yang sudah digabung dengan `mode`. */
const ringkas = computed(() => mode.value === 'compact')
const stage = computed(() => mode.value === 'stage')
/**
 * Struktur dokumen ini, dan dari sanalah keluarga komponennya dipilih (fase 74.10).
 *
 * Sebelumnya peta komponen dipilih dari `schemaVersion`, yang berarti "versi skema" dan "wajah
 * undangan" adalah satu hal — dan itulah yang membuat template kedua tidak bisa dinyatakan.
 * Sekarang `schemaVersion` kembali berarti bentuk data saja, dan strukturnya yang memutuskan
 * siapa merender apa. Dokumen lama tanpa `structureId` diturunkan dari `schemaVersion`, jadi
 * hasilnya sama persis dengan sebelum fase ini.
 */
const structure = computed(() => structureById(documentStructureId(props.document)))

/**
 * Tetap bernama `v2` karena delapan cabang lain di berkas ini membacanya, dan mengubah
 * semuanya dalam satu irisan akan menyembunyikan perubahan yang sebenarnya di balik diff besar.
 * Artinya kini "keluarga komponen Elegance", bukan "schemaVersion 2" — dan untuk seluruh dokumen
 * yang ada hari ini keduanya bernilai sama. Yang benar-benar fakta struktur (`gateType`, nama
 * kolom galeri, versi Dock) naik ke registry di irisan berikutnya.
 */
const v2 = computed(() => structure.value.family === 'elegance')

const style = computed(() => themeStyle(props.document))
const visible = computed(() => props.document.sections.filter(section => section.enabled))
const has = (type: string) => visible.value.some(section => section.type === type)
const sectionOf = (type: string) => visible.value.find(section => section.type === type)

/**
 * Peta tipe section ke komponennya, dipilih menurut `schemaVersion`.
 *
 * Sebelumnya urutan section dipaku di template ini dan `visible` hanya dipakai untuk
 * lookup — artinya tombol naik/turun di editor tidak berpengaruh sama sekali. Sekarang
 * renderer melakukan `v-for` atas `document.sections`, jadi urutan yang disimpan pasangan
 * adalah urutan yang dilihat tamu. `music` (v1) dan `opening-envelope` (v2) sengaja tidak
 * ada di peta: yang pertama pemutar mengambang, yang kedua gerbang di depan halaman —
 * keduanya terdaftar di `headlessSectionTypes` (kontrak), bukan cuma di komentar ini.
 *
 * Tipe kedua peta DIKETATKAN sejak fase 74.4: `Record<Exclude<…>, Component>`, bukan
 * `Record<string, Component>`. Dengan bentuk lama, menambah satu tipe ke `v2SectionTypes`
 * lolos compiler, lolos skema, lolos form, lolos simpan, lolos terbit — lalu TIDAK MERENDER
 * APA PUN untuk tamu, karena `rendered` di bawah membuangnya diam-diam. Sekarang compiler
 * menuntut entrinya, dan `renderer-coverage.spec.ts` menjaga arah sebaliknya.
 *
 * Bagian ekstra v2 (`story`, `rundown`, `dresscode`, `video`) memakai komponen v1-nya:
 * bentuk `data` mereka tidak berubah di fase 72, dan tidak ada wajah Elegance untuk mereka.
 */
const legacyComponents: Record<Exclude<LegacySectionType, 'music'>, Component> = {
  cover: SectionCover,
  couple: SectionCouple,
  events: SectionEvents,
  countdown: SectionCountdown,
  gallery: SectionGallery,
  story: SectionStory,
  rundown: SectionRundown,
  dresscode: SectionDresscode,
  video: SectionVideo,
  gift: SectionGift,
  rsvp: SectionRsvp,
  wishes: SectionWishes,
  closing: SectionClosing,
}
const eleganceComponents: Record<Exclude<V2SectionType, 'opening-envelope'>, Component> = {
  hero: EleganceHero,
  couple: EleganceCouple,
  countdown: EleganceCountdown,
  event: EleganceEvent,
  map: EleganceMap,
  'unduh-mantu': EleganceUnduhMantu,
  quote: EleganceQuote,
  gallery: EleganceGallery,
  gift: EleganceGift,
  wishes: EleganceWishes,
  closing: EleganceClosing,
  story: SectionStory,
  rundown: SectionRundown,
  dresscode: SectionDresscode,
  video: SectionVideo,
}
const componentFamilies: Record<StructureFamily, Record<string, Component>> = {
  elegance: eleganceComponents,
  warisan: legacyComponents,
}
const sectionComponents = computed<Record<string, Component | undefined>>(() => componentFamilies[structure.value.family])

/*
 * Partitur tema, ditimpa pilihan dokumen bila ada (fase 69). Tanpa pilihan hasilnya persis
 * `themeMotion()` — termasuk `undefined` yang membawa tema lama ke `playLegacyScore()`.
 */
const score = computed(() => terapkanMotionDokumen(themeMotion(props.document.templateId), toEntrance(props.document.tokens.motion?.masuk)))
const kecepatanAmplop = computed(() => toEnvelopeSpeed(props.document.tokens.motion?.amplop))

const rendered = computed(() => {
  const peta = sectionComponents.value
  const entries = visible.value
    .map((section, index) => ({ section, index, component: peta[section.type] }))
    .filter((entry): entry is { section: Section; index: number; component: Component } => Boolean(entry.component))
    .map(entry => ({ ...entry, role: sectionRole[entry.section.type] }))

  const partitur = score.value
  if (!partitur) return entries.map(entry => ({ ...entry, segue: null }))

  /*
   * Pita transisi dipasang di batas babak, dan babaknya dihitung dari daftar yang dirender
   * di sini — bukan dari DOM seperti yang dilakukan pemain partitur. Keduanya memang boleh
   * berbeda: `Video` dan `Rundown` bisa merender nol elemen, jadi sebuah pita bisa berdiri
   * tepat sebelum section hantu. Itu tidak merusak apa pun — pita itu tetap menandai babak
   * yang benar-benar berakhir — dan dua pita yang jadi bertetangga disembunyikan CSS lewat
   * `.iv-segue + .iv-segue`, bukan lewat penghitungan yang mencoba menebak isi section.
   */
  const babak = resolveScore(partitur, entries.map(entry => entry.role))
  const segueDiIndeks = new Map<number, (typeof babak)[number]['segue']>()
  let cursor = 0
  for (const act of babak) {
    if (cursor > 0 && act.segue.kind !== 'none') segueDiIndeks.set(cursor, act.segue)
    cursor += act.span
  }

  return entries.map((entry, index) => ({ ...entry, segue: segueDiIndeks.get(index) ?? null }))
})

/*
 * Dicari di seluruh dokumen, bukan hanya section yang tampil: nama pasangan adalah identitas
 * undangan, bukan isi satu section. Di undangan terbit keduanya sama (`couple` wajib dan tidak
 * bisa dimatikan), tapi pratinjau wizard `/order` menyalakan section per langkah, dan tautan
 * kalender di langkah acara sempat berbunyi "Aruna & Dewa" untuk pasangan yang baru saja
 * mengetik namanya sendiri.
 *
 * v2: nama ada di `couple.brideName`/`groomName`; bila salah satunya kosong, judul amplop.
 */
const coupleSection = computed(() => props.document.sections.find(section => section.type === 'couple'))
const coupleNames = computed(() => {
  const section = coupleSection.value
  if (v2.value) {
    const bride = text(section, 'brideName').trim()
    const groom = text(section, 'groomName').trim()
    if (bride && groom) return `${bride} & ${groom}`
    const amplop = props.document.sections.find(item => item.type === 'opening-envelope')
    return text(amplop, 'title').trim() || 'Aruna & Dewa'
  }
  if (!section) return 'Aruna & Dewa'
  return `${text(section, 'partner1', 'Aruna')} & ${text(section, 'partner2', 'Dewa')}`
})
const initials = computed(() => coupleNames.value.split('&').map(part => part.trim().charAt(0).toUpperCase()).join(''))

/** Bagian yang memegang gerbang dan penukaran ornamen: `cover` (v1) atau `opening-envelope` (v2). */
const gateType = computed(() => (v2.value ? 'opening-envelope' : 'cover'))
const coverSection = computed(() => sectionOf(gateType.value))
const coverImage = computed(() => {
  const foto = v2.value ? text(sectionOf('hero'), 'imageUrl') : text(coverSection.value, 'image')
  return foto || themeOf(props.document.templateId).cover
})

/**
 * Set ornamen milik tema — inilah yang membedakan wajah tiap tema, bukan hanya warnanya —
 * ditimpa penukaran yang dipilih pasangan di Studio Ornamen.
 *
 * Penukarannya hidup di `cover.data` (v1) / `opening-envelope.data` (v2), bukan di `tokens`.
 * Alasannya bukan lagi entitlement: sejak fase 59 `designFingerprint()` di API ikut membaca
 * `ornamentOverrides`, jadi penukaran ornamen **tergerbang `design`** persis seperti warna dan
 * font. Yang membuatnya tetap di `section.data` adalah bentuknya — `tokens` ada di
 * `packages/contracts` dan menaruh id ornamen di sana akan memaksa kontrak mengenal bank yang
 * 328 keping, atau melemahkannya jadi `z.record(z.string())` yang justru memvalidasi lebih
 * sedikit daripada `toOrnamentOverrides()`.
 *
 * `toOrnamentOverrides()` menyaringnya terhadap kategori slot, jadi glyph yang salah tempat
 * tidak bisa masuk lewat dokumen yang disunting tangan. Ia **tidak lagi** melepas penukaran
 * saat tema diganti; itu disengaja dan alasannya ada di sana.
 *
 * `terapkanOverrides()` yang menggabungkannya, bukan spread biasa: `layers` adalah array lima
 * keping yang dibedakan jangkarnya, dan menyebarnya akan merusak invarian "lima layer, satu per
 * jangkar" yang dijaga `theme-identity.spec.ts`.
 */
const orn = computed(() => terapkanOverrides(
  themeOrnaments(props.document.templateId),
  toOrnamentOverrides(coverSection.value?.data.ornamentOverrides, props.document.templateId),
))

/**
 * Seberapa kental ornamen dipasang. Hidup di `cover.data`, bukan di `tokens`: menambah
 * key ke `tokens` akan menggerbangi perubahannya di balik entitlement `design` dan
 * membuat `tests/contracts.test.ts` gagal karena preset tema tidak lagi identik.
 */
const intensity = computed(() => toIntensity(coverSection.value?.data.ornamentIntensity))

const galleryImages = computed(() => list(sectionOf('gallery'), v2.value ? 'imageUrls' : 'images'))

const firstEvent = computed(() => rows(sectionOf('events'), 'events')[0])
const headlineDate = computed(() => {
  if (v2.value) {
    const event = sectionOf('event')
    const bagian = [text(event, 'day'), [text(event, 'date'), text(event, 'monthYear')].filter(Boolean).join(' ')].filter(Boolean)
    return bagian.join(', ')
  }
  return String(firstEvent.value?.date ?? '') || formatLongDate(text(sectionOf('countdown'), 'date'))
})

function submitRsvp(payload: RsvpPayload) {
  emit('rsvp', payload)
}

function submitWish(message: string) {
  emit('wish', message)
}

function submitWishEntry(payload: WishPayload) {
  emit('wishEntry', payload)
}

const player = ref<{ pause: () => void } | null>(null)
const musicSection = computed(() => sectionOf('music'))
/** Musik: `settings` di dokumen v2 (fase 72), section `music` di v1. */
const music = computed(() => {
  if (v2.value) {
    const settings = props.document.settings
    return { url: settings?.musicUrl?.trim() ?? '', title: settings?.musicTitle ?? '', credit: '', volume: settings?.musicVolume ?? 0.6 }
  }
  return { url: has('music') ? text(musicSection.value, 'url') : '', title: text(musicSection.value, 'title'), credit: text(musicSection.value, 'credit'), volume: 0.6 }
})

/**
 * Amplop dibuka.
 *
 * Sampai fase 77 baris pertamanya `player.value?.arm()`, dipanggil sinkron di dalam tumpukan
 * klik gerbang karena itulah izin autoplay yang sah menurut browser. Izinnya memang sah; yang
 * tidak pernah ditanyakan adalah apakah tamunya mau. Sekarang musik menunggu tombolnya —
 * tombol itu juga gestur, jadi tidak ada izin yang hilang, cuma keputusan yang berpindah tangan.
 *
 * `coverOpen` tetap dipancarkan: ia yang mencatat "undangan dibuka" untuk tamu bertoken.
 */
function onGateOpen() {
  emit('coverOpen')
}

/**
 * Fokus tata letak (fase 72): `kartu` = 480px di tengah pada layar lebar, `penuh` = selebar
 * layar. Hanya dokumen v2 di halaman publik: v1 tidak pernah punya pilihan ini dan tidak boleh
 * berubah, dan di panggung/pratinjau lebarnya sudah ditentukan bingkai ponselnya.
 */
/*
 * "Fokuskan untuk Layar" ikut berlaku di panggung editor (`stage`), bukan hanya di halaman tamu.
 * Pratinjau Desktop yang merender lebar penuh sementara tamu desktop melihat kartu 480px adalah
 * pratinjau yang berbohong — dan itu persis yang diukur e2e "device preview": tanpa kartunya,
 * render 1280 justru lebih tinggi daripada render 390. `compact` (kartu landing) tetap di luar.
 */
const kartu = computed(() => v2.value && mode.value !== 'compact' && props.document.tokens.layout !== 'penuh')

/**
 * Tata letak desktop dua kolom (fase 77) — dan syaratnya ada FOTO, bukan cuma lebar.
 *
 * Kelasnya dipasang di sini, bukan disimpulkan CSS lewat `:has()`, karena gridnya tidak boleh
 * menyala tanpa penghuni kolom kiri: `.iv-aside` menyembunyikan dirinya sendiri saat galeri kosong,
 * dan kalau gridnya tetap menyala, kolom undangan jatuh ke trek pertama dan melar jadi 800px.
 * Terukur persis begitu pada undangan QA yang galerinya kosong.
 */
/**
 * Foto panel kiri: galeri kalau ada, foto utama kalau tidak.
 *
 * Cadangan ini bukan kemewahan. Undangan yang belum mengunggah galeri — dan itu keadaan tiap
 * undangan yang baru dibuat — akan kehilangan seluruh tata letak desktopnya dan kembali jadi
 * kartu sendirian di tengah layar 1440. Foto utama selalu ada: `coverImage` jatuh ke foto bawaan
 * tema kalau pasangan belum mengunggah apa pun, jadi kolom kiri tidak pernah kosong.
 */
const fotoSisi = computed(() => (galleryImages.value.length ? galleryImages.value : [coverImage.value].filter(Boolean)))

const berpanelSisi = computed(() => kartu.value && !ringkas.value && fotoSisi.value.length > 0)


/*
 * Konteks bersama, bukan tiga belas daftar prop. Setiap section mengambil potongan yang
 * dibutuhkannya lewat `useInvitation()`.
 */
const copy = computed(() => resolveCopy(props.document.copy))
const t = (key: CopyKey) => pilihCopy(copy.value, key)

/**
 * Penggulung undangan saat ia dipasang di panggung editor.
 *
 * Dibaca dari DOM, bukan dioper sebagai prop: `[data-preview-stage]` milik `PhoneFrame`, yang
 * berdiri di antara panggung dan renderer, dan menyalurkannya lewat dua lapis prop hanya untuk
 * sampai ke sini berarti dua komponen tahu soal bingkai yang bukan urusan mereka.
 *
 * Null di halaman tamu — di sana yang menggulung memang jendela.
 */
const penggulung = computed(() => (stage.value ? root.value?.closest<HTMLElement>('[data-preview-stage]') ?? null : null))
const statis = computed(() => props.statis)

/*
 * Tanda tangan gerak (fase 81): gerak masuk per bagian, gerak per keping kanvas, dan tombol ▶.
 * Berubah → timeline dibangun ulang dan bagian yang sedang terlihat diputar dari awal. Hanya di
 * panggung: dokumen halaman tamu tidak pernah berubah di tempat.
 */
const tandaGerakDokumen = computed(() => (stage.value ? `${props.putar}|${tandaGerak(props.document.sections)}` : ''))

/**
 * Pita babak pilihan pasangan (slot `segue`, fase 80). Menang atas bentuk partitur di SETIAP pita;
 * kosong berarti tiap babak memakai bentuk partiturnya sendiri. Slot ini tidak menerima unggahan.
 */
const pitaBabak = computed(() => {
  const pilihan = orn.value.segue
  return pilihan && !isUnggahan(pilihan) ? pilihan : null
})

/**
 * Halaman tamu: gerak masuk ditahan selama gerbang amplop menutup undangan (fase 80).
 *
 * Tanpa ini hero sudah memutar gerak masuknya saat halaman dimuat — di belakang amplop yang masih
 * utuh — jadi yang dilihat tamu sesudah membuka adalah hero yang sudah diam. Dilepas oleh `reveal`
 * gerbang, yang di halaman tamu datang tepat saat gerbangnya mulai pudar. Panggung editor tidak
 * ditahan: di sana gerbang ikut aliran, dan hero baru masuk layar setelah panggung menggulir.
 */
const gerbangTertahan = ref(!stage.value && !ringkas.value && (v2.value ? Boolean(coverSection.value) : has('cover')))
function onGateReveal() {
  gerbangTertahan.value = false
  emit('gateReveal')
}

/*
 * Ditulis SEBELUM `provideInvitation` sejak fase 79, bukan di bawah bersama `useArunaMotion`:
 * konteks menyalurkan keduanya ke section yang memanggil motion sendiri, dan `const` tidak
 * di-hoist.
 */
provideInvitation({
  document: computed(() => props.document),
  orn,
  intensity,
  compact: ringkas,
  mode,
  t,
  coupleNames,
  initials,
  greeting: computed(() => props.greeting),
  guest: computed(() => props.guest),
  guestError: computed(() => props.guestError),
  hasToken: computed(() => props.hasToken),
  wishes: computed(() => props.wishes),
  rsvpPending: computed(() => props.rsvpPending),
  wishPending: computed(() => props.wishPending),
  galleryImages,
  fotoSisi,
  headlineDate,
  sectionOf,
  submitRsvp,
  submitWish,
  submitWishEntry,
  // Saat `compact`, pemutarnya memang tidak dirender — `?.` di sini bukan kemalasan.
  pauseMusic: () => player.value?.pause(),
  motionOptions: { scrollRoot: penggulung, statis, tahan: gerbangTertahan, ulang: tandaGerakDokumen },
})

// --- Motion ------------------------------------------------------------------
useArunaMotion(root, (api) => {
  /*
   * Tema tanpa partitur menjalankan koreografi lama **persis** seperti sebelumnya, bukan
   * partitur bawaan yang kira-kira sama. Sembilan tema yang sudah terbit hanya boleh
   * berubah ketika masing-masing dipindahkan dan dibandingkan sendiri-sendiri.
   */
  const partitur = score.value
  if (!partitur) return playLegacyScore(api, root.value)
  playScore(api, { root: root.value!, score: partitur, compact: ringkas.value })
}, { scrollRoot: penggulung, statis, tahan: gerbangTertahan, ulang: tandaGerakDokumen })
</script>

<template>
  <!--
    Pembungkus pengukur. Aturan kartu 480px di bawah bertanya pada wadah ini, bukan pada jendela:
    di panggung editor keduanya berbeda jauh (render 1280 di dalam jendela 420), dan aturan
    ber-`@media` membuat pratinjau Desktop berbohong — terukur di e2e "device preview", tinggi
    render 1280 berubah 7210 → 8148 hanya karena jendela editornya menyempit. `.iv-root` tidak
    bisa menanyai dirinya sendiri, jadi wadahnya berdiri satu tingkat di luar.
  -->
  <div :class="['iv-frame', { 'iv-frame--kartu': kartu, 'iv-frame--sisi': berpanelSisi }]">
    <div
      ref="root"
      class="iv-root"
      :style="style"
      :class="{ 'iv-root--kartu': kartu, 'iv-root--stage': stage }"
      :data-iv-mode="mode"
      :data-iv-struktur="structure.family"
    >
    <!--
      Panel foto kiri (fase 77). Hanya dirender pada tata letak `kartu` dan hanya terlihat di
      container ≥64rem; tanpa foto galeri ia menyembunyikan dirinya sendiri dan gridnya runtuh
      jadi satu kolom.
    -->
    <InvitationDesktopAside v-if="berpanelSisi" />

    <!--
      Kolom undangan. **Ia yang membawa `container-type`, bukan `.iv-root` lagi.**

      Seluruh container query di section membaca wadah terdekat, dan begitu `.iv-root` jadi grid
      selebar 1280 ia akan menjawab 1280 — tiap section lalu menata diri untuk layar lebar padahal
      duduk di kolom 480. Di bawah 64rem kolom ini selebar `.iv-root`, jadi tidak ada satu pun
      section yang bergeser: itu yang membuat perubahan ini bisa dibuktikan, bukan cuma diyakini.
    -->
    <div :class="['iv-column', { 'pb-24': !ringkas }]">
    <!--
      Gerbang selalu ada pada undangan yang terbit, jadi musik selalu punya gestur untuk
      menumpang: `validatePublishableDocument` menolak publish kalau section `cover` mati.
      Sempat ada pendengar `pointerdown` di sini sebagai cadangan untuk undangan tanpa gerbang —
      dibuang setelah diuji, karena keadaan itu tidak bisa dicapai lewat publish.
    -->
    <InvitationLingkupBagian v-if="v2 && !ringkas && coverSection" :section="coverSection">
      <InvitationEleganceOpeningEnvelope
        :section="coverSection"
        :image="coverImage"
        :speed="kecepatanAmplop"
        :has-music="Boolean(music.url)"
        :contained="stage"
        @open="onGateOpen"
        @lock="emit('gateLock', true)"
        @unlock="emit('gateLock', false)"
        @reveal="onGateReveal"
      />
    </InvitationLingkupBagian>
    <InvitationCoverGate
      v-if="!v2 && !ringkas && has('cover')"
      :couple="coupleNames"
      :date="headlineDate"
      :greeting="greeting"
      :initials="initials"
      :image="coverImage"
      :ornaments="orn"
      :intensity="intensity"
      :speed="kecepatanAmplop"
      :has-music="Boolean(music.url)"
      :contained="stage"
      @open="onGateOpen"
      @lock="emit('gateLock', true)"
      @unlock="emit('gateLock', false)"
      @reveal="onGateReveal"
    />

    <!--
      Urutan diambil dari dokumen, bukan dari urutan tag di berkas ini. Itulah yang
      membuat tombol naik/turun di editor akhirnya berpengaruh pada yang dilihat tamu.
    -->
    <!-- Lingkup tanpa DOM (fase 81): keping kanvas di dalam bagian — dan pita sebelumnya — tahu pemiliknya. -->
    <InvitationLingkupBagian v-for="entry in rendered" :key="entry.section.id" :section="entry.section">
      <InvitationSegue
        v-if="entry.segue"
        :kind="entry.segue.kind"
        :shape="pitaBabak ?? ('shape' in entry.segue ? entry.segue.shape : null)"
        :from="'from' in entry.segue ? entry.segue.from : 'bottom'"
      />
      <component
        :is="entry.component"
        :section="entry.section"
        :seed="entry.index"
        :data-iv-act="entry.role"
      />
    </InvitationLingkupBagian>

    <template v-if="!ringkas">
      <InvitationMusicPlayer
        v-if="music.url"
        ref="player"
        :url="music.url"
        :title="music.title"
        :credit="music.credit"
        :volume="music.volume"
        :contained="stage"
      />
      <InvitationDock :available="visible.map(section => section.type)" :version="v2 ? 2 : 1" :contained="stage" />
      </template>
    </div>
    </div>
  </div>
</template>

<style>
/*
 * Sudut ornamen yang membingkai potret pasangan. Dekoratif, jadi selalu aria-hidden.
 * Warnanya kertas, bukan `--iv-primary`: ornamen ini selalu berdiri di atas foto, dan
 * primary tema mana pun bisa lenyap di atas foto yang kebetulan senada. Bayangan tipis
 * menjaganya tetap terbaca di atas foto terang maupun gelap.
 */
.iv-portrait-corner {
  position: absolute;
  /*
   * 20%, bukan 34%. Ukuran lama dipilih saat ornamen masih garis tipis, di mana sepertiga
   * lebar potret hanya terbaca sebagai sulur samar. Setelah digambar bermassa, bidang
   * seluas itu berubah jadi kepingan putih yang menempel di atas wajah — terbaca sebagai
   * stiker, bukan hiasan. Bayangan tipis tetap menjaganya terbaca di foto terang.
   */
  width: 20%;
  height: auto;
  aspect-ratio: 1;
  /*
   * Ramp kertas, ditulis di sini dan bukan diwarisi.
   *
   * `color` saja tidak cukup dan belum pernah cukup: tiap `<g>` hasil forge memakai
   * `var(--iv-orn-*, currentColor)`, dan cadangan itu hanya terpakai kalau var-nya TIDAK
   * terdefinisi — padahal `themeStyle()` selalu mendefinisikannya di `.iv-root`. Jadi
   * selama empat var di bawah tidak ditulis ulang, baris `color` hanyalah kode mati dan
   * sudut ini memakai warna tema, bukan warna kertas.
   *
   * Empat tingkatnya dipertahankan sebagai tingkat TEMBUS, bukan tingkat warna. Di atas
   * foto itu justru yang benar: hue apa pun bertabrakan dengan sebagian foto, sedangkan
   * putih berjenjang terbaca sebagai hiasan pada foto terang maupun gelap. Badan solid,
   * plat aksen lebih lembut supaya tepinya menyembul, rel garis penuh supaya detailnya
   * tidak hilang di ~64px — dan bayangan tipis di bawah yang menahannya di foto terang.
   */
  --iv-orn-deep: #fffdf7;
  --iv-orn-body: #fffdf7;
  --iv-orn-accent: rgb(255 253 247 / 0.55);
  --iv-orn-glow: rgb(255 253 247 / 0.72);
  color: #fffdf7;
  opacity: 0.72;
  /*
   * Dua bayangan, dan yang pertama yang mengerjakan pekerjaan sesungguhnya.
   *
   * Tinta kertas menyelesaikan foto gelap tapi menciptakan kebalikannya: di atas bidang
   * foto yang terang — langit, dinding putih — putih 0,72 nyaris menghilang. Bayangan
   * tunggal 3px yang lama terlalu lembut untuk menahannya, karena ornamen ini berlubang
   * isen dan yang perlu ditegaskan adalah TEPI tiap lubang, bukan siluet luarnya.
   * `0 0 1px` rapat menempel di tepi dan bekerja seperti garis luar setipis rambut;
   * `0 1px 3px` yang lama tetap ada untuk memberi kedalaman.
   */
  filter: drop-shadow(0 0 1px rgb(0 0 0 / 0.55)) drop-shadow(0 1px 3px rgb(0 0 0 / 0.45));
  pointer-events: none;
}
.iv-portrait-corner--tl { top: 3.5%; left: 3.5%; }
.iv-portrait-corner--br { bottom: 3.5%; right: 3.5%; transform: rotate(180deg); }
.iv-portrait-corner--tr { top: 3.5%; right: 3.5%; transform: rotate(90deg); }
.iv-portrait-corner--bl { bottom: 3.5%; left: 3.5%; transform: rotate(-90deg); }

/* ── Hadiah ─────────────────────────────────────────────────────────────────── */
/*
 * Auto-fit, bukan dua kolom tetap: batas rekening naik dari dua ke delapan, dan aturan
 * lama akan menyusun enam kartu jadi tiga baris sempit di layar lebar. 17rem adalah
 * lebar terkecil yang masih memuat nomor rekening enam belas digit tanpa membungkusnya.
 */
.iv-gift-grid {
  display: grid;
  gap: 0.875rem;
  grid-template-columns: 1fr;
}
@container (min-width: 40rem) {
  .iv-gift-grid:has(> li + li) { grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); }
}
.iv-gift-card { padding: 0; }
/* Tile lambang berlatar merek di atas pita merek yang sama: cincin terang tipis + bayangan netral memisahkannya. */
.iv-gift-logo { box-shadow: 0 0 0 1px rgb(255 255 255 / 0.4), 0 1px 3px rgb(0 0 0 / 0.2); }

/* ── Rundown ────────────────────────────────────────────────────────────────── */
/*
 * ⚠ Tiga angka di blok ini TERIKAT satu sama lain dan dihitung dengan tangan:
 *   `--iv-timeline-waktu` (kolom jam) + `gap` + setengah `--iv-timeline-mark` (lencana)
 * adalah pusat kolom lencana, dan itulah tempat rel harus berdiri. Sampai fase 79 ketiganya
 * ditulis sebagai literal di dua aturan berbeda, jadi menaikkan lencana di satu tempat membuat
 * rel meleset dari titik-titiknya tanpa satu tes pun berbunyi. Sekarang ketiganya satu variabel,
 * dan `calc()` di bawah menghitungnya, bukan orang.
 */
.iv-timeline {
  position: relative;
  display: grid;
  gap: 0;
  --iv-timeline-waktu: 4.5rem;
  --iv-timeline-mark: 1.75rem;
  --iv-timeline-gap: 1rem;
}
/*
 * Wajah Elegance (fase 79) dipagari ke keluarganya, dan itu bukan kehati-hatian berlebih:
 * berkas `sections/Rundown.vue` dipakai BERSAMA oleh `elegance` dan `warisan`, dan undangan v1
 * yang sudah terbit masih dibaca tamu hari ini. Melebarkan lencana dan memberi kartu pada baris
 * di sana berarti mengubah undangan orang yang tidak meminta apa-apa.
 *
 * Yang TIDAK dipagari adalah pengikatan tiga angka jadi variabel di atas — itu koreksi, dan ia
 * berlaku untuk kedua keluarga: sebelumnya posisi rel dihitung tangan di aturan terpisah, jadi
 * salah satunya bisa bergeser sendirian tanpa satu tes pun berbunyi.
 */
[data-iv-struktur='elegance'] .iv-timeline { --iv-timeline-mark: 2.5rem; }
.iv-timeline-rail {
  position: absolute;
  left: calc(var(--iv-timeline-waktu) + var(--iv-timeline-gap) + var(--iv-timeline-mark) / 2);
  top: 1.75rem;
  bottom: 1.75rem;
  width: 1px;
  background: color-mix(in srgb, var(--iv-primary) 30%, transparent);
}
.iv-timeline-row {
  display: grid;
  grid-template-columns: var(--iv-timeline-waktu) var(--iv-timeline-mark) 1fr;
  gap: var(--iv-timeline-gap);
  align-items: start;
  padding-block: 1rem;
}
/*
 * Isi baris duduk di kartu, meminjam kosakata kartu `event` (fase 79) supaya rundown berhenti
 * terbaca sebagai daftar tempelan v1 di tengah undangan Elegance. Radiusnya gema `.iv-event-arch`
 * yang dilunakkan: kubah 999px di atas baris setinggi 3rem terbaca sebagai kesalahan, bukan
 * sebagai arch.
 */
[data-iv-struktur='elegance'] .iv-timeline-isi {
  padding: 0.7rem 0.9rem;
  border-radius: 1.25rem 1.25rem 0.75rem 0.75rem;
  background: color-mix(in srgb, var(--iv-primary) 6%, transparent);
}
.iv-timeline-time {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 1rem;
  line-height: 1.75rem;
  color: var(--iv-primary);
  white-space: nowrap;
}
/*
 * Lencana penanda, seukuran medali `.iv-event-badge` yang dikecilkan (3,5rem → 2,5rem: ini
 * berdiri per baris, bukan per kartu). Cakramnya WAJIB opaque — rel melintas tepat di belakang
 * pusatnya, dan cincin tembus pandang membuat garis itu terlihat memotong penandanya sendiri.
 */
.iv-timeline-mark {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: var(--iv-timeline-mark);
  height: var(--iv-timeline-mark);
  padding: 0.45rem;
  border-radius: 999px;
  background: var(--iv-bg);
  color: var(--iv-primary);
}
[data-iv-struktur='elegance'] .iv-timeline-mark {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--iv-primary) 22%, transparent);
}
/*
 * Penanda ini dicat `--iv-fg`, jadi tintanya harus `--iv-bg` — bukan putih yang dipanggang.
 * Pada tema gelap `--iv-fg` justru terang, dan tinta nyaris putih di atasnya hilang sama sekali.
 */
.iv-section[data-tone='ink'] .iv-timeline-mark,
.iv-section[data-tone='primary'] .iv-timeline-mark { background: var(--iv-fg); color: var(--iv-bg); }

/* ── Ucapan menunggu moderasi ───────────────────────────────────────────────── */
.iv-pending {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-family: var(--iv-body);
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  opacity: 0.75;
}

/*
 * Potret dengan mask arch — bentuk paling cepat terbaca sebagai "undangan pernikahan",
 * dan cara termurah memberi kedalaman pada section yang tadinya hanya teks.
 */
.iv-portrait {
  position: relative;
  width: min(100%, 17rem);
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 999px 999px 0.75rem 0.75rem;
  box-shadow: var(--iv-shadow-lift);
}
.iv-portrait--wide {
  width: min(100%, 24rem);
  aspect-ratio: 4 / 3;
  border-radius: 0.75rem;
}
.iv-portrait::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #ffffff 45%, transparent);
  border-radius: inherit;
}

/*
 * Undangan mengukur dirinya sendiri, bukan layar.
 *
 * Nyaris seluruh undangan sudah bekerja begitu — `OrnamentField` memakai `cqw`, sisanya
 * memakai `clamp()`. Yang tersisa cuma lima utilitas ber-`md:`/`sm:`, dan lima itu cukup
 * untuk membuat pratinjau perangkat berbohong: di editor pada layar 1440, `md:` selalu
 * benar, jadi pratinjau "Ponsel" akan menampilkan cover dua kolom yang tidak akan pernah
 * dilihat tamu di ponselnya. Ambangnya tetap 640/768px persis seperti sebelumnya —
 * yang berubah hanya apa yang diukur, jadi yang dilihat tamu tidak bergeser sedikit pun.
 */
.iv-root {
  background: var(--iv-bg);
  color: var(--iv-fg);
  font-family: var(--iv-body);
}
/*
 * `container-type` pindah ke sini dari `.iv-root` (fase 77): di desktop `.iv-root` jadi grid dua
 * kolom selebar layar, dan section yang menanyainya akan menjawab lebar layar padahal ia duduk di
 * kolom 480. Yang harus diukur tiap section adalah kolomnya, bukan halamannya.
 */
.iv-column { container-type: inline-size; }

/*
 * Bingkai diberi NAMA (fase 77), dan itu bukan kerapian melainkan syarat.
 *
 * `@container` tanpa nama menanyai wadah TERDEKAT. Dock dan pemutar musik hidup di dalam
 * `.iv-column`, yang juga sebuah container — jadi aturan desktop yang ditulis tanpa nama
 * menanyai kolom 480px dan tidak pernah cocok, berapa pun lebar layarnya. Terukur: dock tetap
 * dipusatkan ke layar dan menindih nama pasangan di panel foto meski aturannya sudah ditulis.
 *
 * Nama tidak menutup pertanyaan tanpa nama: section di dalam `.iv-column` tetap menanyai
 * kolomnya seperti sebelumnya.
 */
.iv-frame {
  container-type: inline-size;
  container-name: iv-frame;
}

/*
 * Tablet (fase 77): tetap satu kolom seperti ponsel, hanya melapang.
 *
 * Sebelumnya rentang ini sudah mengunci kartu 480px — angka ponsel yang dipasang di layar
 * tablet, jadi 768px menampilkan kolom 480 dengan dua bidang kosong selebar 144px di sisinya.
 */
@container iv-frame (min-width: 48rem) {
  .iv-frame--kartu .iv-column {
    max-width: 40rem;
    margin-inline: auto;
  }
}

/*
 * Desktop (fase 77): panel foto galeri yang diam di kiri, undangan yang digulir di kanan.
 *
 * Bentuk lama — kartu 480px di tengah kanvas 1280 — adalah tata letak ponsel yang dipasang di
 * layar lebar: dua per tiga layar kosong, dan tidak ada satu pun aturan yang membedakan desktop
 * dari ponsel selain lebar kosongnya. `30rem` di kanan menjaga kolomnya tetap selebar kartu lama,
 * jadi tiap section merender dirinya persis seperti yang sudah diuji.
 */
@container iv-frame (min-width: 64rem) {
  /*
   * Tanpa foto galeri tidak ada panel untuk didampingi, dan kolom yang melar sendirian sampai
   * 1280 adalah tata letak yang tidak pernah dirancang siapa pun. Ia kembali ke kartu di tengah —
   * bentuk fase 72, yang setidaknya sudah diuji.
   */
  .iv-frame--kartu .iv-column { max-width: 30rem; }

  .iv-frame--sisi > .iv-root {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 30rem;
    align-items: start;
  }
  .iv-frame--sisi .iv-aside {
    display: block;
    position: sticky;
    top: 0;
    height: var(--iv-layar-h, 100svh);
  }
  .iv-frame--sisi .iv-column {
    max-width: none;
    margin-inline: 0;
    min-height: var(--iv-layar-h, 100svh);
    box-shadow: -24px 0 70px -40px rgb(0 0 0 / 0.5);
  }
  /*
   * Dock dan pemutar musik ikut kolomnya, bukan layarnya.
   *
   * Keduanya `fixed inset-x-0` — benar selama undangan memenuhi layar, salah begitu ia tinggal
   * sepertiga kanannya: dock yang dipusatkan ke layar mendarat di tengah PANEL FOTO dan menindih
   * nama pasangan di sana. Terlihat langsung pada tangkapan layar pertama tata letak ini.
   */
  .iv-frame--sisi .iv-dock,
  .iv-frame--sisi .iv-player {
    left: auto;
    right: 0;
    width: 30rem;
  }
}
/* Panggung editor: gerbang, pemutar, dan dock terkurung di root ini, jadi ia harus jadi wadah posisinya. */
.iv-root--stage { position: relative; }

/*
 * Afordans ornamen di panggung editor (fase 76).
 *
 * Ornamen di undangan tidak pernah punya isyarat bahwa ia bisa disentuh — pasangan harus tahu
 * lebih dulu bahwa panel kanan punya tab Ornamen, lalu menebak keping mana yang mengisi slot
 * mana. Kotak putus-putus tipis membalik arahnya: yang terlihat di kanvas yang ditunjuk.
 *
 * Seluruhnya digerbangi `.iv-root--stage`, dan itu bukan kehati-hatian melainkan syarat: kelas
 * ini hanya ada di `mode="stage"`, jadi halaman tamu `/i/[slug]` tidak pernah melihat satu pun
 * garis putus-putus dan ornamennya tetap tidak menangkap pointer.
 *
 * `outline`, bukan `border`: ia tidak ikut menghitung tata letak, jadi tidak ada satu piksel pun
 * yang bergeser saat kursor lewat. 1px dan 65% supaya ia menandai, bukan meneriaki.
 */
/*
 * Fase 81: garis hover, pilihan, dan pegangan kini digambar overlay kanvas editor
 * (`KanvasOverlay.vue`) di LUAR bingkai yang diperkecil — ukurannya px layar, bukan px render, jadi
 * tetap setipis 1px pada pratinjau 26 % maupun 100 %. Yang tersisa di sini hanya kursor.
 */
.iv-root--stage [data-iv-el] { cursor: pointer; }
.iv-root--stage [data-iv-el][data-iv-terkunci] { cursor: default; }

/*
 * Keping kanvas (fase 81). `position: relative` supaya geseran teks (`left`/`top`) dan `z-index`
 * lapis berlaku — di lapisan `base`, jadi `absolute` milik kelas komponen (tanpa lapisan) dan utilitas
 * Tailwind (lapisan `utilities`) tetap menang atasnya. Pembungkus ornamen `inline-block` tanpa tinggi
 * baris: glyph di dalamnya mengisi kotak yang dulu dipegang glyph itu sendiri.
 */
@layer base {
  .iv-keping { position: relative; }
  .iv-keping--ornamen { display: inline-block; line-height: 0; }
}
.iv-keping-isi--penuh { display: block; width: 100%; height: 100%; }

/*
 * Tanpa kecuali (fase 81): setiap keping bisa ditunjuk di panggung, termasuk yang dulu tembus
 * pointer — sudut potret, kartu acara, kartu tamu, kelopak RSVP, bingkai hero. Diukur sebelum ini:
 * lima pembawa sudut dan tiga keping amplop tidak pernah menerima klik.
 */
.iv-root--stage .iv-keping--ornamen { pointer-events: auto; }
/*
 * Kotak isi bagian menutup seluruh lebarnya, termasuk celah kosong di antara baris — dan di bawahnya
 * tinggal keping ladang. Di panggung kotak itu tembus pointer; anak-anaknya (teks, foto, kartu,
 * tombol) tetap menerima klik. Terukur di fase 81: ladang Hitung Mundur, Galeri, dan Cerita tidak
 * bisa ditunjuk sama sekali sebelum aturan ini.
 */
.iv-root--stage .iv-section-isi { pointer-events: none; }
.iv-root--stage .iv-section-isi > * { pointer-events: auto; }
/* Surat di dalam amplop bening sampai dibuka; kepingnya tidak boleh menghalangi kantong di bawahnya. */
.iv-root--stage [data-gate-card] .iv-keping { pointer-events: none; }

/*
 * Ladangnya tetap tembus pointer — ia menutupi seluruh section dan akan menelan klik ke isinya.
 * Yang dihidupkan hanya kepingnya (aturan `.iv-keping--ornamen` di atas).
 *
 * Amplop di panggung (fase 81, keputusan pemilik): klik segel, flap, atau kantong MEMILIH
 * kepingnya; amplop dibuka lewat callout berikon dan tombol di toolbar. Halaman tamu tidak berubah.
 */

/*
 * Ramp ornamen di bidang gelap, ditulis SEKALI.
 *
 * Empat belas tempat di undangan memaksa `color: #fffdf7` masing-masing, karena di atas bidang
 * gelap `primary` tema mana pun ikut tenggelam. Sejak ornamen punya empat tingkat warna, aturan
 * itu perlu empat pasangannya — dan menempelkannya di empat belas tempat berarti tiga belas
 * kesempatan untuk lupa. Satu aturan di sini yang menukar rampnya; yang di bawah tinggal
 * mengurus `color`-nya sendiri seperti sebelumnya.
 *
 * `--iv-orn-dark-*` dipancarkan `themeStyle()` berdampingan dengan ramp terangnya.
 *
 * **`.iv-portrait-corner` sengaja TIDAK ada di daftar ini, dan itu bukan kelalaian.** Ramp
 * gelap dihitung `ornamentRampOnDark(accent, tokens.primary)` — terhadap `primary`, karena
 * itulah bidang yang ditempati keempat tempat di atas. Sudut potret tidak duduk di atas
 * `primary`; ia duduk di atas FOTO. Diukur pada `aruna-pelita` (`primary #D9B978`), ramp
 * gelapnya keluar `#7e6b41` · `#171203` · `#4f3c1d` · `#2c2410` — tiga dari empat stop
 * praktis satu warna, jadi ornamen empat tingkat runtuh jadi satu bidang cokelat kusam di
 * atas foto malam. Efek sampingnya lebih buruk lagi: `color: #fffdf7` di bawah berhenti
 * berarti apa-apa, karena tiap `<g>` memakai `var(--iv-orn-*, currentColor)` dan
 * cadangannya tidak pernah terpakai selama var-nya terdefinisi.
 *
 * Dibiarkan di luar, sudut potret jatuh ke ramp terang `.iv-root` sementara `color`-nya
 * sendiri yang mengurus kertas — persis maksud yang sudah tertulis di DESIGN.md.
 */
.iv-field[data-dark='true'] .iv-field-piece,
.iv-section[data-tone='ink'],
.iv-section[data-tone='primary'],
.iv-story-finale {
  --iv-orn-deep: var(--iv-orn-dark-deep);
  --iv-orn-body: var(--iv-orn-dark-body);
  --iv-orn-accent: var(--iv-orn-dark-accent);
  --iv-orn-glow: var(--iv-orn-dark-glow);
}

.iv-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
  font-family: var(--iv-body);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  color: inherit;
  transition: background-color 200ms, border-color 200ms;
}
.iv-chip:hover { background: color-mix(in srgb, currentColor 10%, transparent); }

.iv-choice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 3rem;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 200ms, border-color 200ms;
}
.iv-choice[data-selected='true'] {
  border-color: var(--iv-primary);
  background: color-mix(in srgb, var(--iv-primary) 14%, transparent);
  color: var(--iv-primary);
}
.iv-choice:has(:focus-visible) { outline: 3px solid var(--iv-primary); outline-offset: 3px; }

.iv-control {
  min-height: 3rem;
  width: 100%;
  padding: 0.7rem 0.85rem;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  background: color-mix(in srgb, #ffffff 68%, transparent);
  color: inherit;
  font-family: var(--iv-body);
  font-size: 1rem;
}
.iv-control:focus { outline: 3px solid var(--iv-primary); outline-offset: 2px; }

.iv-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0 1.4rem;
  border: 0;
  border-radius: 0.5rem;
  background: var(--iv-primary);
  /* Tinta mengikuti `primary`, bukan dipanggang: lihat `onPrimary()` di `utils/contrast.ts`. */
  color: var(--iv-on-primary, #fffdf7);
  font-family: var(--iv-body);
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition: filter 200ms;
}
.iv-submit:hover:not(:disabled) { filter: brightness(0.92); }
.iv-submit:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
