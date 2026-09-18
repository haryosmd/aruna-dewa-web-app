<script setup lang="ts">
import type { Component } from 'vue'
import type { GuestProfile, InvitationDocument, RsvpPayload, Section, Wish } from '~/types/aruna'
import { toOrnamentOverrides } from '~/utils/invitation-options'
import { toIntensity } from '~/utils/ornaments'
import { playLegacyScore, playScore } from '~/utils/motion-play'
import { resolveScore, sectionRole } from '~/utils/motion-score'
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
    /** Renders a shrunken, gate-free preview for the editor and landing page. */
    compact?: boolean
  }>(),
  { greeting: '', guest: null, guestError: '', hasToken: false, wishes: () => [], rsvpPending: false, wishPending: false, compact: false },
)

const emit = defineEmits<{
  coverOpen: []
  rsvp: [payload: RsvpPayload]
  wish: [message: string]
}>()

const root = ref<HTMLElement | null>(null)

const style = computed(() => themeStyle(props.document))
const visible = computed(() => props.document.sections.filter(section => section.enabled))
const has = (type: string) => visible.value.some(section => section.type === type)
const sectionOf = (type: string) => visible.value.find(section => section.type === type)

/**
 * Peta tipe section ke komponennya.
 *
 * Sebelumnya urutan section dipaku di template ini dan `visible` hanya dipakai untuk
 * lookup — artinya tombol naik/turun di editor tidak berpengaruh sama sekali. Sekarang
 * renderer melakukan `v-for` atas `document.sections`, jadi urutan yang disimpan pasangan
 * adalah urutan yang dilihat tamu. `music` sengaja tidak ada di peta: ia pemutar
 * mengambang, bukan section.
 */
const sectionComponents: Record<string, Component> = {
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

const score = computed(() => themeMotion(props.document.templateId))

const rendered = computed(() => {
  const entries = visible.value
    .map((section, index) => ({ section, index, component: sectionComponents[section.type] }))
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

const coupleSection = computed(() => sectionOf('couple'))
const coupleNames = computed(() => {
  const section = coupleSection.value
  if (!section) return 'Aruna & Dewa'
  return `${text(section, 'partner1', 'Aruna')} & ${text(section, 'partner2', 'Dewa')}`
})
const initials = computed(() => coupleNames.value.split('&').map(part => part.trim().charAt(0).toUpperCase()).join(''))

const coverSection = computed(() => sectionOf('cover'))
const coverImage = computed(() => text(coverSection.value, 'image') || themeOf(props.document.templateId).cover)

/**
 * Set ornamen milik tema — inilah yang membedakan wajah tiap tema, bukan hanya warnanya —
 * ditimpa penukaran yang dipilih pasangan di Studio Ornamen.
 *
 * Penukarannya hidup di `cover.data`, bukan di `tokens`. Alasannya bukan lagi entitlement:
 * sejak fase 59 `designFingerprint()` di API ikut membaca `ornamentOverrides`, jadi penukaran
 * ornamen **tergerbang `design`** persis seperti warna dan font. Yang membuatnya tetap di
 * `section.data` adalah bentuknya — `tokens` ada di `packages/contracts` dan menaruh id
 * ornamen di sana akan memaksa kontrak mengenal bank yang 328 keping, atau melemahkannya jadi
 * `z.record(z.string())` yang justru memvalidasi lebih sedikit daripada `toOrnamentOverrides()`.
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

const galleryImages = computed(() => list(sectionOf('gallery'), 'images'))

const firstEvent = computed(() => rows(sectionOf('events'), 'events')[0])
const headlineDate = computed(() =>
  String(firstEvent.value?.date ?? '') || formatLongDate(text(sectionOf('countdown'), 'date')))

function submitRsvp(payload: RsvpPayload) {
  emit('rsvp', payload)
}

function submitWish(message: string) {
  emit('wish', message)
}

const player = ref<{ arm: () => void; pause: () => void } | null>(null)
const musicSection = computed(() => sectionOf('music'))
const musicUrl = computed(() => (has('music') ? text(musicSection.value, 'url') : ''))

function onGateOpen() {
  // Sinkron, di dalam tumpukan panggilan klik gerbang — itulah izin autoplay yang sesungguhnya.
  player.value?.arm()
  emit('coverOpen')
}


/*
 * Konteks bersama, bukan tiga belas daftar prop. Setiap section mengambil potongan yang
 * dibutuhkannya lewat `useInvitation()`.
 */
provideInvitation({
  document: computed(() => props.document),
  orn,
  intensity,
  compact: computed(() => props.compact),
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
  headlineDate,
  sectionOf,
  submitRsvp,
  submitWish,
  // Saat `compact`, pemutarnya memang tidak dirender — `?.` di sini bukan kemalasan.
  pauseMusic: () => player.value?.pause(),
})

// --- Motion ------------------------------------------------------------------
useArunaMotion(root, (api) => {
  /*
   * Tema tanpa partitur menjalankan koreografi lama **persis** seperti sebelumnya, bukan
   * partitur bawaan yang kira-kira sama. Sembilan tema yang sudah terbit hanya boleh
   * berubah ketika masing-masing dipindahkan dan dibandingkan sendiri-sendiri.
   */
  const partitur = score.value
  if (!partitur) return playLegacyScore(api)
  playScore(api, { root: root.value!, score: partitur, compact: props.compact })
})
</script>

<template>
  <div ref="root" class="iv-root" :style="style" :class="{ 'pb-24': !compact }">
    <!--
      Gerbang selalu ada pada undangan yang terbit, jadi musik selalu punya gestur untuk
      menumpang: `validatePublishableDocument` menolak publish kalau section `cover` mati.
      Sempat ada pendengar `pointerdown` di sini sebagai cadangan untuk undangan tanpa gerbang —
      dibuang setelah diuji, karena keadaan itu tidak bisa dicapai lewat publish.
    -->
    <InvitationCoverGate
      v-if="!compact && has('cover')"
      :couple="coupleNames"
      :date="headlineDate"
      :greeting="greeting"
      :initials="initials"
      :image="coverImage"
      :ornaments="orn"
      :intensity="intensity"
      :has-music="Boolean(musicUrl)"
      @open="onGateOpen"
    />

    <!--
      Urutan diambil dari dokumen, bukan dari urutan tag di berkas ini. Itulah yang
      membuat tombol naik/turun di editor akhirnya berpengaruh pada yang dilihat tamu.
    -->
    <template v-for="entry in rendered" :key="entry.section.id">
      <InvitationSegue
        v-if="entry.segue"
        :kind="entry.segue.kind"
        :shape="'shape' in entry.segue ? entry.segue.shape : null"
        :from="'from' in entry.segue ? entry.segue.from : 'bottom'"
      />
      <component
        :is="entry.component"
        :section="entry.section"
        :seed="entry.index"
        :data-iv-act="entry.role"
      />
    </template>

    <template v-if="!compact">
      <InvitationMusicPlayer
        v-if="musicUrl"
        ref="player"
        :url="musicUrl"
        :title="text(musicSection, 'title')"
        :credit="text(musicSection, 'credit')"
      />
      <InvitationDock :available="visible.map(section => section.type)" />
    </template>
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
.iv-gift-logo { box-shadow: 0 1px 0 rgb(0 0 0 / 0.06); }

/* ── Rundown ────────────────────────────────────────────────────────────────── */
.iv-timeline {
  position: relative;
  display: grid;
  gap: 0;
}
.iv-timeline-rail {
  position: absolute;
  /* Sejajar dengan pusat kolom penanda: 4.5rem waktu + 1rem gap + setengah 1.75rem. */
  left: calc(4.5rem + 1rem + 0.875rem);
  top: 1.75rem;
  bottom: 1.75rem;
  width: 1px;
  background: color-mix(in srgb, var(--iv-primary) 30%, transparent);
}
.iv-timeline-row {
  display: grid;
  grid-template-columns: 4.5rem 1.75rem 1fr;
  gap: 1rem;
  align-items: start;
  padding-block: 1rem;
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
.iv-timeline-mark {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0.3rem;
  border-radius: 999px;
  /* Cakram sewarna latar supaya penanda memotong rel, bukan menumpang di atasnya. */
  background: var(--iv-bg);
  color: var(--iv-primary);
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
  container-type: inline-size;
  background: var(--iv-bg);
  color: var(--iv-fg);
  font-family: var(--iv-body);
}

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
