<script setup lang="ts">
import { MailOpen, Volume2 } from 'lucide-vue-next'
import type { ResolvedOrnamentSet } from '~/utils/ornaments'
import type { OrnamentIntensity } from '~/utils/ornaments'
import type { CopyKey, EnvelopeSpeed } from '@aruna/contracts'
import { envelopeTempo, susunAmplop } from '~/utils/motion-envelope'
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
     * Panggung editor: gerbang hidup di dalam `.iv-root`, bukan `fixed` di viewport, dan tidak
     * menyentuh `document.body`.
     *
     * **Sejak fase 76 ia ikut aliran, bukan menindih (`relative`, bukan `absolute`).** Bentuk
     * lamanya menutupi seluruh tinggi undangan dan panggung mengunci gulirnya lewat emit
     * `lock` — jadi di editor, roda tetikus tidak melakukan apa pun sampai amplopnya dibuka.
     * Itu benar untuk tamu dan salah untuk pasangan: yang sedang menyunting undangannya sendiri
     * tidak sedang "diundang", ia sedang melihat-lihat pekerjaannya. Kini gerbang berdiri
     * setinggi satu layar di puncak aliran, dan sisa undangan tinggal digulir di bawahnya.
     */
    contained?: boolean
    /**
     * Id DOM gerbang saat terkurung, supaya rail editor bisa menggulir ke sana seperti ke bagian
     * mana pun. Hanya diisi dokumen v2, yang amplopnya headless: pada v1 `#iv-cover` sudah dipakai
     * section cover yang sungguhan, dan dua elemen berid sama bukan kaitan, melainkan jebakan.
     */
    gateId?: string
  }>(),
  {
    greeting: '', image: '', intensity: 'seimbang', hasMusic: false, speed: 'sedang',
    elegance: false, eyebrow: '', kicker: '', guestLabel: '', noGuest: '', sealMonogram: '', sealLabel: '',
    callout: '', subtitle: '', footer: '', musicNote: '', contained: false, gateId: '',
  },
)

const emit = defineEmits<{ open: []; lock: []; unlock: []; reveal: [] }>()

const root = ref<HTMLElement | null>(null)
const opening = ref(false)
const hidden = ref(false)
/**
 * Gerbang ini sudah pernah dibuka sampai tuntas.
 *
 * Bukan kebalikan dari `opening`: di panggung editor gerbangnya **tersegel lagi** sesudahnya,
 * jadi tidak ada satu pun keadaan yang bertahan untuk ditanyai "tadi jadi terbuka atau tidak".
 * Dipasang sebagai `data-gate-opened` supaya e2e punya tanda yang tidak pernah berbalik —
 * dulu pertanyaan itu dijawab dengan "gerbangnya hilang dari DOM", yang kini tidak lagi benar.
 */
const dibuka = ref(false)
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

/*
 * Klik di badan amplop dan di segel (fase 81, keputusan pemilik).
 *
 * Halaman tamu: membuka, persis janji fase 76 — seluruh badan amplop adalah tombolnya. Panggung
 * editor (`contained`): TIDAK membuka, dan kliknya dibiarkan naik ke kanvas, yang memilih keping
 * segel/flap/kantong di bawah kursor. Amplop di panggung dibuka lewat callout berikon di bawahnya
 * dan tombol "Buka amplop" di toolbar — sebelum ini segel tidak bisa diganti dari kanvas sama
 * sekali, karena satu-satunya aksi kliknya adalah membuka.
 */
function klikAmplop(event: MouseEvent) {
  if (props.contained) return
  event.stopPropagation()
  void open()
}

async function open() {
  // Amplop dan callout ikut jadi pemicu (fase 76); penjaga hidrasinya harus sama dengan segel.
  if (opening.value || !ready.value) return
  opening.value = true
  emit('open')

  // Tabel tempo per tingkat (fase 69); `sedang` = angka fase 68 persis. Segel tetap literal di atas.
  const tempo = envelopeTempo[props.speed]
  const animated = await timeline.play((gsap) => {
    // Jadwalnya di `susunAmplop` supaya bisa dijalankan tes dengan GSAP sungguhan (fase 80).
    susunAmplop(gsap.timeline({ onComplete: finish }), tempo, {
      seal: '[data-gate-seal]',
      sealLeft: '[data-gate-seal-half="left"]',
      sealRight: '[data-gate-seal-half="right"]',
      flap: '[data-gate-flap]',
      card: '[data-gate-card]',
      body: '[data-gate-body]',
      root: root.value,
    }, props.contained ? undefined : ungkap)
  })

  if (!animated) finish()
}

/**
 * Halaman tamu: undangan di balik gerbang boleh mulai bergerak (fase 80). Dipanggil timeline
 * saat gerbang mulai pudar, atau oleh `finish()` bila timeline tidak jalan (gerak minimal).
 */
let terungkap = false
function ungkap() {
  if (terungkap) return
  terungkap = true
  emit('reveal')
}

function finish() {
  dibuka.value = true

  /*
   * Halaman tamu: gerbang menindih undangan, jadi selesai berarti pergi. Sama persis seperti
   * undangan terbit yang jadi acuan — menggulir kembali ke puncak di sana mendarat di Hero,
   * bukan di amplop, dan itu memang benar untuk tamu yang sudah diundang masuk.
   */
  if (!props.contained) {
    document.body.style.overflow = ''
    hidden.value = true
    ungkap()
    return
  }

  /*
   * Panggung editor: gerbang TIDAK dilepas.
   *
   * Di sini amplop bukan gerbang, melainkan bagian pertama undangan — ia punya entri sendiri di
   * rail, `id="iv-opening-envelope"`, dan ikut dihitung scroll-spy. Melepasnya sesudah dibuka
   * membuat satu-satunya bagian yang tidak bisa dikunjungi ulang: menggulir mentok ke atas
   * mendarat di Hero, menekan "Opening Envelope" di rail tidak menuju ke mana pun, dan pasangan
   * yang ingin melihat lagi hasil suntingannya harus memuat ulang seluruh pratinjau.
   *
   * Jadi: undangannya yang diungkap (panggung menggulir melewati gerbang), lalu gerbangnya
   * tersegel kembali begitu tidak ada yang melihatnya.
   */
  emit('unlock')
  emit('reveal')
  resegel()
}

/** Pengamat "gerbang sudah pergi dari layar" — hanya hidup di antara terbuka dan tersegel lagi. */
let pengamatSegel: IntersectionObserver | null = null
let temporSegel: ReturnType<typeof setTimeout> | null = null

function lepasPengamatSegel() {
  pengamatSegel?.disconnect()
  pengamatSegel = null
  if (temporSegel) clearTimeout(temporSegel)
  temporSegel = null
}

/**
 * Menyegel ulang begitu gerbangnya keluar dari layar — bukan seketika.
 *
 * Seketika berarti amplop yang baru saja terbuka menutup lagi di depan mata, di tengah gulir
 * pengungkapan; yang dilihat pasangan bukan animasi yang ia minta melainkan kedipan. Menunggu
 * sampai ia tidak terlihat membuat pemulihannya tak kasatmata: yang menggulir balik ke puncak
 * menemukan amplop utuh dan siap ditekan lagi.
 *
 * Tempo cadangan 2,5 detik untuk keadaan yang gulirnya tidak jadi berangkat (mis. undangan
 * tanpa bagian lain di bawah gerbang). Kedipan masih lebih baik daripada layar kosong: tanpa
 * penyegelan itu yang tersisa di puncak adalah gerbang ber-`opacity: 0`.
 */
function resegel() {
  lepasPengamatSegel()
  const el = root.value
  if (!el || typeof IntersectionObserver === 'undefined') { segelUlang(); return }

  /*
   * Ambangnya 0,1, bukan "sama sekali tidak terlihat" — dan angka itu hasil pengukuran, bukan
   * kehati-hatian. `stageScrollOffset` menyisakan 8px napas di atas bagian yang dituju, jadi
   * sesudah pengungkapan **tepi bawah gerbang masih tergantung ~1% di puncak layar**: dengan
   * `threshold: 0` pengamatnya tidak pernah bicara dan yang menyegel ulang justru tempo cadangan,
   * dua detik sesudahnya. Terukur: opacity gerbang masih 0 pada 4 detik, baru pulih pada 5.
   */
  pengamatSegel = new IntersectionObserver((entries) => {
    const terakhir = entries[entries.length - 1]
    if (!terakhir || terakhir.intersectionRatio >= 0.1) return
    segelUlang()
  }, { threshold: [0, 0.1] })
  pengamatSegel.observe(el)
  temporSegel = setTimeout(segelUlang, 2500)
}

function segelUlang() {
  lepasPengamatSegel()
  timeline.revert()
  opening.value = false
  // Tertutup lagi berarti tertutup lagi: `terkunci` di panggung adalah "gerbang masih tertutup".
  if (props.contained) emit('lock')
}

onBeforeUnmount(lepasPengamatSegel)
</script>

<template>
  <div
    v-if="!hidden"
    :id="contained && gateId ? gateId : undefined"
    ref="root"
    :class="cn('iv-gate z-50 grid place-items-center overflow-hidden px-5', contained ? 'iv-gate--contained relative' : 'fixed inset-0')"
    :data-gate-variant="elegance ? 'elegance' : 'v1'"
    :data-gate-opened="dibuka ? '' : undefined"
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
    <!-- Ornamen tambahan pasangan untuk layar amplop (fase 81). -->
    <InvitationKanvasLapisan v-if="elegance" />

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

        <!--
          Seluruh amplop adalah pemicunya (fase 76), bukan cuma segelnya.

          Sebelum ini satu-satunya target klik adalah segel selebar 4,75rem, sementara callout di
          bawahnya berbunyi "Klik di sini untuk membuka" — kalimat yang tidak ditepati markupnya.
          Tamu yang menekan amplopnya tidak mendapat apa pun dan menyimpulkan undangannya rusak.

          Tetap `<div>`, bukan `<button>`: segel sudah jadi tombolnya, tombol di dalam tombol tidak
          sah, dan jalur keyboard tidak boleh bercabang dua untuk satu aksi yang sama. `@click.stop`
          supaya panggung editor tidak ikut membaca kliknya sebagai "ganti ornamen".
        -->
        <div data-gate-envelope class="relative w-full cursor-pointer" style="aspect-ratio: 3 / 2" @click="klikAmplop">
          <div class="absolute inset-0 overflow-hidden rounded-md" style="box-shadow: 0 24px 60px -24px rgb(0 0 0 / 0.45)">
            <div class="absolute inset-0" style="background: color-mix(in srgb, var(--iv-primary) 16%, var(--iv-bg))" />
            <InvitationOrnamen
              :glyph="props.ornaments.envelopePocket"
              slot-id="envelopePocket" posisi="kantong"
              class="absolute inset-0 z-20 h-full w-full"
              :style="{ color: 'color-mix(in srgb, var(--iv-primary) 26%, var(--iv-bg))', '--amplop-garis': 'var(--iv-fg)' }"
            />
          </div>

          <div
            data-gate-card
            class="pointer-events-none absolute inset-x-[7%] top-[16%] z-20 grid justify-items-center gap-2 rounded-sm px-5 py-5 opacity-0"
            style="background: color-mix(in srgb, #ffffff 90%, var(--iv-bg)); box-shadow: 0 12px 30px -14px rgb(0 0 0 / 0.55)"
          >
            <InvitationOrnamen :glyph="props.ornaments.divider" data-iv-ornament slot-id="divider" posisi="surat" class="h-4 w-28 opacity-70" :style="{ color: 'var(--iv-primary)' }" />
            <p v-if="props.kicker" class="iv-kicker m-0">{{ props.kicker }}</p>
            <p class="iv-display iv-script m-0 text-[1.7rem] leading-none">{{ props.couple }}</p>
            <p v-if="props.date" class="iv-body m-0 text-[0.75rem]">{{ props.date }}</p>
          </div>

          <div data-gate-flap class="absolute inset-x-0 top-0 z-30 origin-top" style="height: 58%; transform-style: preserve-3d; backface-visibility: hidden">
            <InvitationOrnamen
              :glyph="props.ornaments.envelopeFlap"
              slot-id="envelopeFlap" posisi="tutup"
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
            @click="klikAmplop"
          >
            <span data-gate-seal-half="left" class="iv-seal-half iv-seal-half--left">
              <InvitationOrnamen :glyph="props.ornaments.seal" :initials="sealInitials" slot-id="seal" posisi="segel" class="iv-seal-art" />
            </span>
            <span data-gate-seal-half="right" class="iv-seal-half iv-seal-half--right">
              <InvitationOrnamen :glyph="props.ornaments.seal" :initials="sealInitials" slot-id="seal" posisi="segel" class="iv-seal-art" />
            </span>
          </button>
        </div>

        <!-- Callout berdenyut di bawah segel: judul petunjuk + petunjuk segel. Ikut jadi pemicu (fase 76). -->
        <!--
          Callout = tombol sungguhan berikon (fase 81). Di panggung ia SATU-SATUNYA pembuka di dalam
          undangan, karena klik amplop di sana memilih kepingnya; pemilik meminta ikonnya supaya
          ajakannya tidak hanya tulisan.
        -->
        <button
          v-if="props.callout || props.subtitle"
          data-gate-callout
          type="button"
          class="iv-gate-callout m-0 grid cursor-pointer justify-items-center gap-1 border-0 bg-transparent p-0 text-center text-inherit"
          :disabled="!ready || opening"
          @click.stop="open"
        >
          <MailOpen :size="22" aria-hidden="true" class="iv-gate-callout-icon" />
          <span v-if="props.callout" class="iv-display block text-[1.05rem]">{{ props.callout }}</span>
          <span v-if="props.subtitle" class="iv-body block text-[0.8125rem]">{{ props.subtitle }}</span>
        </button>

        <!-- Kartu "Kepada Yth." — nama tamu dari `?to=` atau tautan personal. -->
        <div class="iv-gate-guest relative grid w-full justify-items-center gap-1.5 rounded-md px-5 py-4 text-center">
          <InvitationOrnamen :glyph="props.ornaments.corner" data-iv-ornament slot-id="corner" posisi="tl" class="iv-gate-guest-corner iv-gate-guest-corner--tl" aria-hidden="true" />
          <InvitationOrnamen :glyph="props.ornaments.corner" data-iv-ornament slot-id="corner" posisi="tr" :tampil-bawaan="false" class="iv-gate-guest-corner iv-gate-guest-corner--tr" aria-hidden="true" />
          <InvitationOrnamen :glyph="props.ornaments.corner" data-iv-ornament slot-id="corner" posisi="bl" :tampil-bawaan="false" class="iv-gate-guest-corner iv-gate-guest-corner--bl" aria-hidden="true" />
          <InvitationOrnamen :glyph="props.ornaments.corner" data-iv-ornament slot-id="corner" posisi="br" class="iv-gate-guest-corner iv-gate-guest-corner--br" aria-hidden="true" />
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
            <InvitationOrnamen
              :glyph="props.ornaments.envelopePocket"
              slot-id="envelopePocket" posisi="kantong"
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
            <InvitationOrnamen :glyph="props.ornaments.divider" data-iv-ornament slot-id="divider" posisi="surat" class="h-4 w-28 opacity-70" :style="{ color: 'var(--iv-primary)' }" />
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
            <InvitationOrnamen
              :glyph="props.ornaments.envelopeFlap"
              slot-id="envelopeFlap" posisi="tutup"
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
              <InvitationOrnamen :glyph="props.ornaments.seal" :initials="props.initials" slot-id="seal" posisi="segel" class="iv-seal-art" />
            </span>
            <span data-gate-seal-half="right" class="iv-seal-half iv-seal-half--right">
              <InvitationOrnamen :glyph="props.ornaments.seal" :initials="props.initials" slot-id="seal" posisi="segel" class="iv-seal-art" />
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
 * Gerbang terkurung (panggung editor).
 *
 * Fase 72 membuatnya `absolute inset-0` di dalam `.iv-root` yang tingginya ribuan piksel, dengan
 * isi `sticky top-0` setinggi satu layar. Bentuk itu punya satu akibat yang baru ketahuan di
 * fase 76: karena ia menindih SELURUH undangan, satu-satunya cara agar gulir tidak menampakkan
 * gerbang tanpa ujung adalah mengunci gulirnya — dan pasangan yang memutar roda tetikus di
 * panggung mendapati layarnya diam, tanpa tahu bahwa ia harus membuka amplop lebih dulu.
 *
 * Sekarang ia sekadar anak pertama setinggi satu layar. Tidak ada yang perlu dikunci, tidak ada
 * yang ditindih, dan menggulir ke bawah memperlihatkan undangannya seperti di ponsel tamu yang
 * sudah membuka amplop.
 */
.iv-gate--contained {
  min-height: var(--iv-layar-h, 100svh);
  place-items: center;
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
.iv-gate-guest-corner--tr { top: 0.3rem; right: 0.3rem; transform: rotate(90deg); }
.iv-gate-guest-corner--bl { bottom: 0.3rem; left: 0.3rem; transform: rotate(-90deg); }

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
