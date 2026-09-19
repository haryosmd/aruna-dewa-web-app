<script setup lang="ts">
import { MailOpen, Volume2 } from 'lucide-vue-next'
import type { OrnamentSet } from '~/utils/ornaments'
import type { OrnamentIntensity } from '~/utils/ornaments'
import type { CopyKey, EnvelopeSpeed } from '@aruna/contracts'
import { envelopeTempo } from '~/utils/motion-envelope'
import { invitationKey } from '~/composables/useInvitationContext'
import { copyDefaults } from '~/utils/invitation-copy'

/*
 * Kata-kata gerbang (fase 69). Gerbang selalu anak `InvitationRenderer`, tapi `inject` diberi
 * cadangan bawaan supaya ia tetap bisa dirender sendirian — mis. di pratinjau motion — tanpa
 * melempar seperti `useInvitation()`.
 */
const konteks = inject(invitationKey, null)
const t = (key: CopyKey) => konteks?.t(key) ?? copyDefaults[key]

const props = withDefaults(
  defineProps<{
    couple: string
    date: string
    greeting?: string
    initials: string
    image?: string
    /** Set ornamen tema, supaya amplopnya ikut berganti wajah saat tema diganti. */
    ornaments: OrnamentSet
    intensity?: OrnamentIntensity
    /** Mengumumkan musiknya sebelum dibuka, bukan mengejutkan tamu sesudahnya. */
    hasMusic?: boolean
    /** Tempo flap dan surat (fase 69); segel tidak ikut. Lihat `motion-envelope.ts`. */
    speed?: EnvelopeSpeed
  }>(),
  { greeting: '', image: '', intensity: 'seimbang', hasMusic: false, speed: 'sedang' },
)

const emit = defineEmits<{ open: [] }>()

const root = ref<HTMLElement | null>(null)
const opening = ref(false)
const hidden = ref(false)
/** The gate is inert until Vue has hydrated, so an early tap cannot be swallowed. */
const ready = useInteractiveReady()
const timeline = useArunaTimeline(root)

/** Nothing behind the gate should scroll while it is closed. */
onMounted(() => { document.body.style.overflow = 'hidden' })
onBeforeUnmount(() => { document.body.style.overflow = '' })

async function open() {
  if (opening.value) return
  opening.value = true
  emit('open')

  // Tabel tempo per tingkat (fase 69); `sedang` = angka fase 68 persis. Segel tetap literal di atas.
  const tempo = envelopeTempo[props.speed]
  const animated = await timeline.play((gsap) => {
    gsap.timeline({ onComplete: finish })
      /*
       * Segel kayon dibuka dalam tiga hitungan, bukan sekadar dipudarkan: naik sedikit
       * dan berkilau, lalu terbelah dari puncak, baru flapnya membuka. Kilau dijalankan
       * lewat `--seal-sheen` supaya hanya satu properti yang dianimasikan.
       */
      .to('[data-gate-seal]', { y: -10, scale: 1.06, duration: 0.42, ease: 'power2.out' })
      .to('[data-gate-seal]', { '--seal-sheen': 1, duration: 0.36, ease: 'sine.inOut', yoyo: true, repeat: 1 }, '<0.1')
      .to('[data-gate-seal-half="left"]', { xPercent: -54, rotate: -13, opacity: 0, duration: 0.5, ease: 'power3.in' })
      .to('[data-gate-seal-half="right"]', { xPercent: 54, rotate: 13, opacity: 0, duration: 0.5, ease: 'power3.in' }, '<')
      /*
       * Flap dan surat dilambatkan (fase 68) dan surat baru mulai naik saat flap setengah
       * terbuka (0,45 detik sesudah flap bergerak): sebelumnya surat menyusul 0,38 detik
       * kemudian dan selesai dalam 0,8 detik, jadi keduanya terbaca sebagai satu jentakan.
       * Segel di atas sengaja tidak ikut — bagian itu justru enak karena tegas.
       */
      .to('[data-gate-flap]', { rotateX: -168, duration: tempo.flap, ease: 'power3.inOut' }, `${tempo.flapOffset}`)
      .to('[data-gate-card]', { opacity: 1, duration: tempo.cardFade }, `<${tempo.cardFadeAt}`)
      .to('[data-gate-card]', { y: '-64%', scale: 1.04, duration: tempo.cardRise, ease: 'power3.out' }, '<')
      .to('[data-gate-body]', { yPercent: 10, opacity: 0, duration: tempo.body, ease: 'power2.in' }, `${tempo.bodyOffset}`)
      .to(root.value, { opacity: 0, duration: tempo.root, ease: 'power2.inOut' }, `${tempo.rootOffset}`)
  })

  if (!animated) finish()
}

function finish() {
  document.body.style.overflow = ''
  hidden.value = true
}
</script>

<template>
  <div
    v-if="!hidden"
    ref="root"
    class="iv-gate fixed inset-0 z-50 grid place-items-center overflow-hidden px-5"
    style="background: var(--iv-bg); color: var(--iv-fg)"
  >
    <img
      v-if="props.image"
      :src="props.image"
      alt=""
      class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
    >
    <div class="pointer-events-none absolute inset-0" :style="{ background: `radial-gradient(circle at 50% 40%, transparent 10%, var(--iv-bg) 78%)` }" />

    <!-- Ladang ornamen yang sama seperti section, supaya amplop tidak jadi halaman paling sepi. -->
    <InvitationOrnamentField :set="props.ornaments" :intensity="props.intensity" tone="base" :seed="1" />

    <div class="relative grid w-full max-w-sm justify-items-center gap-8" style="perspective: 1400px">
      <!-- Envelope: back wall, letter, then the flap folding over the top. -->
      <div data-gate-body class="relative grid w-full justify-items-center gap-7">
        <!--
          Layer order matters: back wall, then the letter, then the front pocket that
          hides it, then the flap folded over the top, then the seal on the fold.
        -->
        <div class="relative w-full" style="aspect-ratio: 3 / 2">
          <div
            class="absolute inset-0 overflow-hidden rounded-md"
            style="box-shadow: 0 24px 60px -24px rgb(0 0 0 / 0.45)"
          >
            <div class="absolute inset-0" style="background: color-mix(in srgb, var(--iv-primary) 16%, var(--iv-bg))" />

            <!--
              Kantong depan — glyph slot `envelopePocket` (fase 69), dulu path inline di sini.
              Badannya `currentColor` = campuran warna utama; garis tepinya `--amplop-garis`.
            -->
            <OrnamentGlyph
              :glyph="props.ornaments.envelopePocket"
              class="absolute inset-0 z-20 h-full w-full"
              :style="{ color: 'color-mix(in srgb, var(--iv-primary) 26%, var(--iv-bg))', '--amplop-garis': 'var(--iv-fg)' }"
            />
          </div>

          <!--
            The letter lives outside the clipped envelope so it can rise clear of it,
            and starts invisible because it is only ever seen mid-animation.
          -->
          <div
            data-gate-card
            class="pointer-events-none absolute inset-x-[7%] top-[16%] z-20 grid justify-items-center gap-2 rounded-sm px-5 py-5 opacity-0"
            style="background: color-mix(in srgb, #ffffff 90%, var(--iv-bg)); box-shadow: 0 12px 30px -14px rgb(0 0 0 / 0.55)"
          >
            <OrnamentGlyph :glyph="props.ornaments.divider" data-iv-ornament class="h-4 w-28 opacity-70" :style="{ color: 'var(--iv-primary)' }" />
            <p class="iv-kicker m-0">{{ t('gate.kicker') }}</p>
            <p class="iv-display iv-script m-0 text-[1.7rem] leading-none">{{ props.couple }}</p>
            <p v-if="props.date" class="iv-body m-0 text-[0.75rem]">{{ props.date }}</p>
          </div>

          <div
            data-gate-flap
            class="absolute inset-x-0 top-0 z-30 origin-top"
            style="height: 58%; transform-style: preserve-3d; backface-visibility: hidden"
          >
            <!-- Flap — glyph slot `envelopeFlap` (fase 69). -->
            <OrnamentGlyph
              :glyph="props.ornaments.envelopeFlap"
              class="h-full w-full drop-shadow-sm"
              :style="{ color: 'color-mix(in srgb, var(--iv-primary) 34%, var(--iv-bg))', '--amplop-garis': 'var(--iv-fg)' }"
            />
          </div>

          <!--
            Segel kayon. Dua salinan bertindih yang masing-masing terpotong separuh:
            itulah yang membuatnya bisa benar-benar terbelah dari puncak saat dibuka,
            bukan sekadar mengecil. Inisial dibaca sebagai teks di dalam SVG-nya.
          -->
          <div
            data-gate-seal
            class="iv-seal absolute left-1/2 top-[58%] z-40 -translate-x-1/2 -translate-y-1/2"
          >
            <span data-gate-seal-half="left" class="iv-seal-half iv-seal-half--left">
              <OrnamentGlyph :glyph="props.ornaments.seal" :initials="props.initials" class="iv-seal-art" />
            </span>
            <span data-gate-seal-half="right" class="iv-seal-half iv-seal-half--right">
              <OrnamentGlyph :glyph="props.ornaments.seal" :initials="props.initials" class="iv-seal-art" />
            </span>
          </div>
        </div>

        <div class="grid justify-items-center gap-2 text-center">
          <p class="iv-kicker m-0">{{ t('gate.kicker') }}</p>
          <p v-if="props.greeting" class="iv-body m-0 text-[0.9375rem]">
            {{ t('gate.greeting') }}<br><span class="iv-display text-[1.35rem]">{{ props.greeting }}</span>
          </p>
          <p v-else class="iv-body m-0 text-[0.9375rem]">{{ t('gate.noGuest') }}</p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex min-h-12 items-center gap-2.5 rounded-full px-7 text-[0.9375rem] font-semibold transition-transform duration-300 hover:scale-[1.03] disabled:opacity-70"
        style="background: var(--iv-fg); color: var(--iv-bg); font-family: var(--iv-body)"
        :disabled="!ready || opening"
        @click="open"
      >
        <MailOpen :size="18" aria-hidden="true" />
        {{ t('gate.open') }}
      </button>

      <!--
        Diumumkan sebelum dibuka, bukan sesudahnya. Tamu yang dikejutkan suara di ruang rapat
        menutup tab — ia tidak mencari tombol kecil di pojok untuk mengecilkannya.
      -->
      <p v-if="props.hasMusic" class="iv-body m-0 -mt-4 mx-auto flex max-w-[19rem] items-start justify-center gap-1.5 text-center text-[0.8125rem] opacity-75">
        <Volume2 :size="15" class="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{{ t('gate.music') }}</span>
      </p>
    </div>
  </div>
</template>

<style>
/*
 * Segel: dua separuh yang ditumpuk persis, masing-masing memotong setengah bentuknya
 * dengan `clip-path`. Di keadaan diam keduanya menyatu jadi satu kayon utuh, jadi tanpa
 * JS segelnya tetap benar; `prefers-reduced-motion` pun mendapat bentuk yang sama.
 */
.iv-seal {
  --seal-sheen: 0;
  position: absolute;
  width: 4.75rem;
  height: 6.3rem;
  filter: drop-shadow(0 6px 16px rgb(0 0 0 / 0.42));
}
.iv-seal-half {
  position: absolute;
  inset: 0;
  display: block;
}
.iv-seal-half--left { clip-path: inset(0 50% 0 0); }
.iv-seal-half--right { clip-path: inset(0 0 0 50%); }

.iv-seal-art {
  width: 100%;
  height: 100%;
  color: var(--iv-primary);
}

/*
 * Kilau. Satu sapuan diagonal yang hanya muncul saat `--seal-sheen` naik ke 1 — dalam
 * keadaan diam benar-benar tidak terlihat, jadi tidak ada kilau yang menetap di layar
 * pengunjung yang meminta gerak minimal.
 */
.iv-seal::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--seal-sheen, 0);
  background: linear-gradient(114deg, transparent 38%, rgb(255 255 255 / 0.55) 50%, transparent 62%);
  mix-blend-mode: screen;
}
</style>
