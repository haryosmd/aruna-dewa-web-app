<script setup lang="ts">
import { MailOpen, Volume2 } from 'lucide-vue-next'
import type { ResolvedOrnamentSet } from '~/utils/ornaments'
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
    ornaments: ResolvedOrnamentSet
    intensity?: OrnamentIntensity
    /** Mengumumkan musiknya sebelum dibuka, bukan mengejutkan tamu sesudahnya. */
    hasMusic?: boolean
    /** Tempo flap dan surat (fase 69); segel tidak ikut. Lihat `motion-envelope.ts`. */
    speed?: EnvelopeSpeed
    /*
     * Wajah Elegance (fase 72): kata-katanya dari `opening-envelope.data`, bukan `copy`, segelnya
     * tombol dengan callout berdenyut, dan tombol "Buka Undangan" v1 tidak ada. Semua prop teks di
     * bawah hanya dibaca saat `elegance` menyala; wajah v1 tidak berubah satu piksel pun.
     */
    elegance?: boolean
    eyebrow?: string
    kicker?: string
    guestLabel?: string
    noGuest?: string
    sealMonogram?: string
    sealLabel?: string
    callout?: string
    subtitle?: string
    footer?: string
    musicNote?: string
    /**
     * Panggung editor (fase 72): gerbang `absolute` di dalam `.iv-root`, bukan `fixed` di
     * viewport, dan tidak menyentuh `document.body` — panggungnya yang memutuskan lewat emit
     * `lock`/`unlock` apa yang harus dikunci.
     */
    contained?: boolean
  }>(),
  {
    greeting: '', image: '', intensity: 'seimbang', hasMusic: false, speed: 'sedang',
    elegance: false, eyebrow: '', kicker: '', guestLabel: '', noGuest: '', sealMonogram: '', sealLabel: '',
    callout: '', subtitle: '', footer: '', musicNote: '', contained: false,
  },
)

const emit = defineEmits<{ open: []; lock: []; unlock: [] }>()

const root = ref<HTMLElement | null>(null)
const opening = ref(false)
const hidden = ref(false)
/** The gate is inert until Vue has hydrated, so an early tap cannot be swallowed. */
const ready = useInteractiveReady()
const timeline = useArunaTimeline(root)

/**
 * Inisial di dalam segel. Teks SVG segel dipatok 32px pada viewBox 120, jadi "A & D" akan
 * meluap; monogram pasangan dipadatkan (spasi dan `&` dibuang, maksimal tiga huruf) dan
 * jatuh ke inisial nama bila kosong.
 */
const sealInitials = computed(() => {
  const padat = props.sealMonogram.replace(/[\s&·.]+/g, '').slice(0, 3)
  return props.elegance && padat ? padat : props.initials
})

/** Nothing behind the gate should scroll while it is closed. */
onMounted(() => {
  if (props.contained) emit('lock')
  else document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  if (props.contained) emit('unlock')
  else document.body.style.overflow = ''
})

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
  if (props.contained) emit('unlock')
  else document.body.style.overflow = ''
  hidden.value = true
}
</script>

<template>
  <div
    v-if="!hidden"
    ref="root"
    :class="cn('iv-gate inset-0 z-50 grid place-items-center overflow-hidden px-5', contained ? 'iv-gate--contained absolute' : 'fixed')"
    :data-gate-variant="elegance ? 'elegance' : 'v1'"
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

    <!--
      Wajah Elegance (fase 72). Amplop yang sama, tapi segelnya adalah tombolnya: callout
      "Klik di sini" berdenyut di bawahnya, kartu "Kepada Yth." berdiri di bawah amplop, dan
      catatan bawah menutup layar. Kata-katanya seluruhnya dari `opening-envelope.data`.
    -->
    <div v-if="elegance" class="iv-gate-elegance relative grid w-full max-w-sm justify-items-center gap-6" style="perspective: 1400px">
      <div data-gate-body class="relative grid w-full justify-items-center gap-6">
        <div class="grid justify-items-center gap-1.5 text-center">
          <p v-if="props.eyebrow" class="iv-body m-0 text-[0.8125rem]">{{ props.eyebrow }}</p>
          <p v-if="props.kicker" class="iv-kicker m-0">{{ props.kicker }}</p>
        </div>

        <div class="relative w-full" style="aspect-ratio: 3 / 2">
          <div class="absolute inset-0 overflow-hidden rounded-md" style="box-shadow: 0 24px 60px -24px rgb(0 0 0 / 0.45)">
            <div class="absolute inset-0" style="background: color-mix(in srgb, var(--iv-primary) 16%, var(--iv-bg))" />
            <OrnamentGlyph
              :glyph="props.ornaments.envelopePocket"
              class="absolute inset-0 z-20 h-full w-full"
              :style="{ color: 'color-mix(in srgb, var(--iv-primary) 26%, var(--iv-bg))', '--amplop-garis': 'var(--iv-fg)' }"
            />
          </div>

          <div
            data-gate-card
            class="pointer-events-none absolute inset-x-[7%] top-[16%] z-20 grid justify-items-center gap-2 rounded-sm px-5 py-5 opacity-0"
            style="background: color-mix(in srgb, #ffffff 90%, var(--iv-bg)); box-shadow: 0 12px 30px -14px rgb(0 0 0 / 0.55)"
          >
            <OrnamentGlyph :glyph="props.ornaments.divider" data-iv-ornament class="h-4 w-28 opacity-70" :style="{ color: 'var(--iv-primary)' }" />
            <p v-if="props.kicker" class="iv-kicker m-0">{{ props.kicker }}</p>
            <p class="iv-display iv-script m-0 text-[1.7rem] leading-none">{{ props.couple }}</p>
            <p v-if="props.date" class="iv-body m-0 text-[0.75rem]">{{ props.date }}</p>
          </div>

          <div data-gate-flap class="absolute inset-x-0 top-0 z-30 origin-top" style="height: 58%; transform-style: preserve-3d; backface-visibility: hidden">
            <OrnamentGlyph
              :glyph="props.ornaments.envelopeFlap"
              class="h-full w-full drop-shadow-sm"
              :style="{ color: 'color-mix(in srgb, var(--iv-primary) 34%, var(--iv-bg))', '--amplop-garis': 'var(--iv-fg)' }"
            />
          </div>

          <!--
            Segel = tombol. Nama aksesibelnya `sealLabel` ("Buka"); isinya dua separuh segel
            yang terbelah saat ditekan, persis mekanik v1 — hanya pemicunya yang pindah.
          -->
          <button
            data-gate-seal
            type="button"
            class="iv-seal iv-seal--button absolute left-1/2 top-[58%] z-40 -translate-x-1/2 -translate-y-1/2"
            :aria-label="props.sealLabel || 'Buka'"
            :disabled="!ready || opening"
            @click="open"
          >
            <span data-gate-seal-half="left" class="iv-seal-half iv-seal-half--left">
              <OrnamentGlyph :glyph="props.ornaments.seal" :initials="sealInitials" class="iv-seal-art" />
            </span>
            <span data-gate-seal-half="right" class="iv-seal-half iv-seal-half--right">
              <OrnamentGlyph :glyph="props.ornaments.seal" :initials="sealInitials" class="iv-seal-art" />
            </span>
          </button>
        </div>

        <!-- Callout berdenyut di bawah segel: judul petunjuk + petunjuk segel. -->
        <p v-if="props.callout || props.subtitle" data-gate-callout class="iv-gate-callout m-0 text-center" aria-hidden="true">
          <span v-if="props.callout" class="iv-display block text-[1.05rem]">{{ props.callout }}</span>
          <span v-if="props.subtitle" class="iv-body block text-[0.8125rem]">{{ props.subtitle }}</span>
        </p>

        <!-- Kartu "Kepada Yth." — nama tamu dari `?to=` atau tautan personal. -->
        <div class="iv-gate-guest relative grid w-full justify-items-center gap-1.5 rounded-md px-5 py-4 text-center">
          <OrnamentGlyph :glyph="props.ornaments.corner" data-iv-ornament class="iv-gate-guest-corner iv-gate-guest-corner--tl" aria-hidden="true" />
          <OrnamentGlyph :glyph="props.ornaments.corner" data-iv-ornament class="iv-gate-guest-corner iv-gate-guest-corner--br" aria-hidden="true" />
          <!-- Satu paragraf seperti v1: label dan nama tamu terbaca sebagai satu kalimat "Kepada Yth. …". -->
          <p v-if="props.greeting" class="iv-body m-0 text-[0.9375rem]">
            {{ props.guestLabel }}<br><span class="iv-display text-[1.35rem] leading-tight">{{ props.greeting }}</span>
          </p>
          <template v-else>
            <p v-if="props.guestLabel" class="iv-kicker m-0">{{ props.guestLabel }}</p>
            <p v-if="props.noGuest" class="iv-body m-0 text-[0.9375rem]">{{ props.noGuest }}</p>
          </template>
        </div>

        <p v-if="props.footer" class="iv-body m-0 text-center text-[0.8125rem]">{{ props.footer }}</p>

        <p v-if="props.hasMusic && props.musicNote" class="iv-body m-0 mx-auto flex max-w-[19rem] items-start justify-center gap-1.5 text-center text-[0.8125rem] opacity-75">
          <Volume2 :size="15" class="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{{ props.musicNote }}</span>
        </p>
      </div>
    </div>

    <div v-else class="relative grid w-full max-w-sm justify-items-center gap-8" style="perspective: 1400px">
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
 * Gerbang terkurung (fase 72, panggung editor): `absolute inset-0` di dalam `.iv-root` yang
 * tingginya sepanjang undangan, jadi isinya ditempelkan ke tepi atas wadah gulirnya
 * (`sticky top-0`) setinggi satu layar — bukan di tengah root yang ribuan piksel.
 */
.iv-gate--contained { place-items: start center; }
.iv-gate--contained > .relative {
  position: sticky;
  top: 0;
  display: grid;
  align-content: center;
  min-height: min(100svh, 100%);
}

/* Segel yang jadi tombol: tanpa kromium tombol bawaan, dan kursor mengatakan ia bisa ditekan. */
.iv-seal--button {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
}
.iv-seal--button:focus-visible { outline: 3px solid var(--iv-primary); outline-offset: 6px; border-radius: 999px; }
.iv-seal--button:disabled { cursor: default; }

/*
 * Callout "Klik di sini" berdenyut — keadaan diamnya terlihat penuh; animasinya hanya
 * mengayun antara 0,55 dan 1, dan berhenti sama sekali bagi yang meminta gerak minimal.
 */
.iv-gate-callout { animation: iv-gate-pulse 1.8s ease-in-out infinite; }
@keyframes iv-gate-pulse {
  0%, 100% { opacity: 1; transform: translateY(0); }
  50% { opacity: 0.55; transform: translateY(-3px); }
}
@media (prefers-reduced-motion: reduce) { .iv-gate-callout { animation: none; } }

/* Kartu tamu: kertas tipis berbingkai garis primary dan sudut ornamen kecil. */
.iv-gate-guest {
  background: color-mix(in srgb, #ffffff 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--iv-primary) 45%, transparent);
}
.iv-gate-guest-corner {
  position: absolute;
  width: 1.75rem;
  height: auto;
  aspect-ratio: 1;
  color: var(--iv-primary);
  opacity: 0.7;
  pointer-events: none;
}
.iv-gate-guest-corner--tl { top: 0.3rem; left: 0.3rem; }
.iv-gate-guest-corner--br { bottom: 0.3rem; right: 0.3rem; transform: rotate(180deg); }

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
