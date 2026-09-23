<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'

import type { GalleryLayout } from '~/utils/theme'

const props = withDefaults(
  defineProps<{
    images: string[]
    /** `grid` (fase 72): dua kolom sama besar bernomor 01–04 ala Elegance. */
    layout?: GalleryLayout | 'spotlight' | 'grid'
    compact?: boolean
    /** Teks kecil di bawah nomor pada layout `grid` ("lihat foto"). */
    viewLabel?: string
    /** Judul lightbox (nama pasangan). Kosong = judul bawaan. */
    lightboxTitle?: string
  }>(),
  { layout: 'masonry', compact: false, viewLabel: '', lightboxTitle: '' },
)

/** Nama kelas layout: `spotlight` tanpa JS runtuh ke masonry, dan `grid` punya kelasnya sendiri. */
const gridClass = computed(() => `iv-gallery--${props.layout === 'spotlight' ? 'masonry' : props.layout}`)

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const index = ref(0)

/** Sorot butuh kontainer ter-pin; layout lain tidak, jadi jangan buat ruang untuknya. */
const spotlight = computed(() => props.layout === 'spotlight' && !props.compact && props.images.length > 1)

/*
 * Sorot: satu foto per hentakan scroll, dengan section dipaku di tempat. Tamu dipaksa
 * melihat foto satu per satu alih-alih menggulirkannya dalam dua detik.
 *
 * Semua tile ditulis pada opacity 1. `prefers-reduced-motion` membuat `useArunaMotion`
 * bail total, jadi tanpa JS sorot ini runtuh kembali jadi tumpukan biasa yang tetap
 * terbaca penuh — itulah yang diuji di `tests/e2e/public.spec.ts`.
 */
/*
 * Opsi motion milik renderer (fase 79). Di-`inject` opsional, bukan lewat `useInvitation()`:
 * komponen ini berkontrak prop murni — kedua pembungkusnya yang tahu soal section — dan
 * `useInvitation()` melempar di luar renderer. Sampai fase ini opsinya tidak dioper sama sekali,
 * jadi sorot galeri di panggung editor mengukur jendela alih-alih layar ponsel yang menggulung,
 * dan tombol Statis tidak mematikannya.
 */
const konteksMotion = inject(invitationKey, null)?.motionOptions

useArunaMotion(root, ({ gsap }) => {
  if (!spotlight.value) return
  const tiles = gsap.utils.toArray<HTMLElement>('[data-spotlight-tile]')
  if (tiles.length < 2) return

  const stage = root.value?.querySelector('[data-spotlight-stage]')
  if (!stage) return

  gsap.set(tiles.slice(1), { opacity: 0, scale: 1.06 })

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: stage,
      start: 'center center',
      end: () => `+=${tiles.length * 62}%`,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
    },
  })

  tiles.forEach((tile, at) => {
    if (at === 0) return
    timeline
      .to(tiles[at - 1]!, { opacity: 0, scale: 1.04, duration: 0.5, ease: 'none' })
      .to(tile, { opacity: 1, scale: 1, duration: 0.5, ease: 'none' }, '<')
  })
}, konteksMotion)

/** Foto bisa berubah saat editor menyimpan; indeks lama akan menunjuk ke luar array. */
watch(() => props.images, () => { index.value = 0 })

function show(at: number) {
  index.value = at
  open.value = true
}

function step(delta: number) {
  const total = props.images.length
  index.value = (index.value + delta + total) % total
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') step(1)
  if (event.key === 'ArrowLeft') step(-1)
}
</script>

<template>
  <div v-if="props.images.length" ref="root" class="grid w-full gap-3">
    <!--
      Tata letak ditentukan watak tema, bukan pasangan. Semua tile ditulis pada posisi
      dan opacity akhirnya; gerakannya murni `gsap.from` dari Renderer, jadi tanpa JS
      galerinya tetap utuh.
    -->
    <div v-if="spotlight" data-spotlight-stage class="iv-spotlight">
      <button
        v-for="(image, at) in props.images"
        :id="`iv-gallery-tile-${at + 1}`"
        :key="image"
        type="button"
        data-spotlight-tile
        class="iv-spotlight-tile"
        :aria-label="`Perbesar foto ${at + 1}`"
        @click="show(at)"
      >
        <img :src="image" :alt="`Potret pasangan ${at + 1}`" loading="lazy" class="iv-spotlight-img">
      </button>
    </div>

    <div v-else :class="['iv-gallery', gridClass]">
      <button
        v-for="(image, at) in props.images"
        :id="`iv-gallery-tile-${at + 1}`"
        :key="image"
        type="button"
        :data-iv-reveal="at < 12 ? '' : undefined"
        :data-iv-gallery-slow="at < 12 && at % 2 === 1 ? '' : undefined"
        class="iv-gallery-tile"
        :aria-label="`Perbesar foto ${at + 1}`"
        @click="show(at)"
      >
        <img :src="image" :alt="`Potret pasangan ${at + 1}`" loading="lazy" data-iv-photo class="iv-gallery-img">
        <!--
          Nomor 01–04 ala referensi: hanya pada layout `grid`, di atas tabir tipis di dasar foto.

          **Berputar** sejak fase 79, bukan menghitung terus. Kuota paket Purnama 60 foto, dan
          sampai fase ini tile ke-57 menulis `57` — angka yang tidak pernah ada di desain yang
          melahirkan elemen ini, dan yang terbaca sebagai nomor inventaris, bukan sebagai
          ornamen editorial. Seluruh `<span>` ini `aria-hidden`; nomor yang dibacakan pembaca
          layar ada di `aria-label` tombolnya dan tetap berurutan sampai foto terakhir.
        -->
        <span v-if="props.layout === 'grid'" class="iv-gallery-num" aria-hidden="true">
          <span class="iv-gallery-num-index">{{ String((at % 4) + 1).padStart(2, '0') }}</span>
          <span v-if="props.viewLabel" class="iv-gallery-num-label">{{ props.viewLabel }}</span>
        </span>
      </button>
    </div>

    <DialogRoot v-model:open="open">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-black/88 backdrop-blur-sm" />
        <DialogContent
          class="fixed inset-0 z-50 grid place-items-center p-4 focus:outline-none"
          @keydown="onKey"
        >
          <DialogTitle class="sr-only">{{ props.lightboxTitle || 'Galeri foto' }}</DialogTitle>
          <DialogDescription class="sr-only">
            Gunakan tombol panah kiri dan kanan untuk berpindah foto, Escape untuk menutup.
          </DialogDescription>

          <!--
            `svh` DI SINI BENAR, dan sengaja tidak ikut `--iv-layar-h` (fase 74.2).

            Lightbox adalah `DialogContent` reka-ui yang di-portal ke `body`: ia hidup di luar
            bingkai pratinjau, jadi pembandingnya memang viewport sungguhan. Menukarnya dengan
            tinggi layar perangkat akan membuat foto diperbesar melampaui jendela dan sisi
            bawahnya terpotong. Jangan "diseragamkan".
          -->
          <img
            :src="props.images[index]"
            :alt="`Potret pasangan ${index + 1}`"
            class="max-h-[82svh] w-auto max-w-full rounded-md object-contain"
          >

          <p class="mt-4 text-caption text-white/65" style="font-family: var(--iv-body)">
            {{ index + 1 }} dari {{ props.images.length }}
          </p>

          <button
            v-if="props.images.length > 1"
            id="iv-gallery-prev"
            type="button"
            aria-label="Foto sebelumnya"
            class="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            @click="step(-1)"
          >
            <ChevronLeft :size="22" aria-hidden="true" />
          </button>
          <button
            v-if="props.images.length > 1"
            id="iv-gallery-next"
            type="button"
            aria-label="Foto berikutnya"
            class="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            @click="step(1)"
          >
            <ChevronRight :size="22" aria-hidden="true" />
          </button>

          <DialogClose
            class="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Tutup galeri"
          >
            <X :size="20" aria-hidden="true" />
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>

<style scoped>
/*
 * Sorot. Semua tile ditumpuk pada grid cell yang sama dan ditulis pada opacity 1; GSAP
 * yang memadamkan yang belum gilirannya. Tanpa JS tumpukan ini tetap menampilkan foto
 * teratas dengan penuh, bukan bidang kosong.
 */
.iv-spotlight {
  display: grid;
  width: 100%;
  grid-template-areas: 'stack';
  place-items: center;
}
.iv-spotlight-tile {
  grid-area: stack;
  display: block;
  width: min(100%, 28rem);
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: var(--radius-md, 12px);
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  box-shadow: var(--iv-shadow-lift);
}
.iv-spotlight-img { width: 100%; height: 100%; display: block; object-fit: cover; }

.iv-gallery-tile {
  display: block;
  width: 100%;
  overflow: hidden;
  border-radius: var(--radius-md, 12px);
  /* Target sentuh: tile terkecil pun tetap lewat 44px karena foto mengisi seluruh tombol. */
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.iv-gallery-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 520ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}
.iv-gallery-tile:hover .iv-gallery-img { transform: scale(1.03); }

/*
 * Grid (fase 72) — dua kolom sama besar 4:5, seperti referensi Elegance. Tetap dua kolom di
 * wadah lebar: undangan v2 berlayout kartu 480px, dan empat foto memang dibaca berpasangan.
 */
.iv-gallery--grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.iv-gallery--grid .iv-gallery-tile { position: relative; aspect-ratio: 4 / 5; }
/*
 * Tile terakhir pada jumlah GANJIL mengisi kedua kolom, bukan meninggalkan sel kosong di
 * sebelahnya. `:last-child:nth-child(odd)` benar tanpa menghitung apa pun di JavaScript: anak
 * terakhir yang posisinya ganjil hanya mungkin terjadi kalau totalnya ganjil.
 *
 * Paling terasa pada satu foto — yang sampai fase 79 berdiri di kolom kiri dengan separuh baris
 * kosong di kanannya, bentuk yang terbaca sebagai foto yang gagal dimuat. Rasionya turun dari
 * 4:5 ke 16:10 karena tile selebar dua kolom pada rasio potret akan setinggi dua baris dan
 * mendominasi seluruh galeri.
 */
.iv-gallery--grid .iv-gallery-tile:last-child:nth-child(odd) {
  grid-column: 1 / -1;
  aspect-ratio: 16 / 10;
}
/*
 * Enam puluh foto adalah tiga puluh baris tile — kuota paket Purnama, dan sampai fase 79
 * seluruhnya dirender dan diberi ScrollTrigger sendiri-sendiri.
 *
 * Dua hal diperbaiki sekaligus, dan **batasnya sengaja sama**: `data-iv-reveal` dan parallax
 * berhenti di tile ke-12 (lihat markup), dan `content-visibility` mulai di tile ke-13. Jadi
 * tidak ada satu pun tile yang memegang keduanya.
 *
 * Itu bukan kebetulan melainkan syaratnya. `content-visibility: auto` melewati render tata
 * letak, dan elemen yang dilewati bisa menjawab ScrollTrigger dengan geometri cadangan alih-alih
 * geometri sesungguhnya — memicu reveal pada posisi yang salah, atau tidak sama sekali. Alih-alih
 * bertaruh pada perilaku yang hanya bisa diukur dengan enam puluh foto sungguhan, interaksinya
 * DIHILANGKAN: tile yang di-skip render tidak pernah punya trigger untuk dirusak.
 *
 * Harganya jujur dan kecil: tile ke-13 dan seterusnya muncul tanpa gerak masuk. Markup undangan
 * ditulis pada keadaan akhir, jadi mereka tetap terbaca penuh — persis seperti ketika anggaran
 * 240 trigger habis dan `useArunaMotion` menjatuhkan sisanya. Untungnya dua: 60 tile yang dulu
 * menghabiskan ~90 dari anggaran itu sekarang memakai 18, sebelum dua puluh langkah cerita dan
 * tiga puluh baris rundown ikut mengantre.
 */
.iv-gallery--grid .iv-gallery-tile:nth-child(n+13) {
  content-visibility: auto;
  contain-intrinsic-size: auto 1px auto 22rem;
}
.iv-gallery-num {
  position: absolute;
  inset: auto 0 0 0;
  display: grid;
  justify-items: start;
  gap: 0.1rem;
  padding: 0.75rem 0.85rem;
  text-align: left;
  color: #fffdf7;
  /*
   * Tabir dipendekkan dan diringankan (fase 79), BUKAN disembunyikan sampai di-hover.
   *
   * Yang salah sebelumnya bukan keberadaannya melainkan jangkauannya: `to top` tanpa henti
   * menggelapkan sepertiga bawah setiap foto secara permanen, di setiap tema. Sekarang ia
   * berhenti di 42% dan turun dari 0,55 ke 0,45 — cukup untuk menahan teks putih terbaca di
   * atas foto apa pun, tidak cukup untuk ikut mewarnai fotonya.
   *
   * Menyembunyikannya di `:hover` sempat dicoba dan **ditarik**: aturan repo melarang markup
   * undangan menyembunyikan apa pun lewat CSS (`apps/web/test/motion-rules.spec.ts`), dan
   * aturan itu benar — undangan ini harus terbaca penuh tanpa JavaScript. Lagi pula ia dibaca
   * di ponsel, yang tidak punya hover sama sekali.
   */
  background: linear-gradient(to top, rgb(0 0 0 / 0.45), transparent 42%);
  font-family: var(--iv-body);
  pointer-events: none;
}

.iv-gallery-num-index { font-family: var(--iv-display); font-size: 1.25rem; line-height: 1; }
.iv-gallery-num-label { font-size: 0.625rem; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.85; }

/* Masonry — proporsi asli tiap foto dipertahankan. */
.iv-gallery--masonry { column-count: 2; column-gap: 0.75rem; }
@container (min-width: 40rem) { .iv-gallery--masonry { column-count: 3; } }
.iv-gallery--masonry .iv-gallery-tile { margin-bottom: 0.75rem; break-inside: avoid; }
.iv-gallery--masonry .iv-gallery-img { height: auto; object-fit: fill; }

/* Mosaic — grid tegas, foto pertama dua kali lebih besar. Editorial, bukan acak. */
.iv-gallery--mosaic {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-flow: dense;
}
@container (min-width: 40rem) { .iv-gallery--mosaic { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.iv-gallery--mosaic .iv-gallery-tile { aspect-ratio: 1; }
.iv-gallery--mosaic .iv-gallery-tile:first-child { grid-column: span 2; grid-row: span 2; }

/*
 * Rail — strip horizontal dengan scroll-snap. Wajib punya kontainer overflow sendiri:
 * inilah satu-satunya layout yang bisa membuat halaman ikut menggeser ke samping.
 */
.iv-gallery--rail {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 0.25rem;
  padding-bottom: 0.5rem;
  /* Menahan strip di dalam lebar section, apa pun jumlah fotonya. */
  max-width: 100%;
}
.iv-gallery--rail .iv-gallery-tile {
  flex: 0 0 auto;
  width: min(72%, 18rem);
  aspect-ratio: 3 / 4;
  scroll-snap-align: center;
  scroll-margin-inline: 0.5rem;
}
@container (min-width: 40rem) {
  .iv-gallery--rail .iv-gallery-tile { width: 15rem; }
}
</style>
