<script setup lang="ts">
import type { OrnamentIntensity, OrnamentSet } from '~/utils/ornaments'

withDefaults(
  defineProps<{
    id?: string
    tone?: 'base' | 'paper' | 'tint' | 'ink' | 'primary'
    kicker?: string
    title?: string
    compact?: boolean
    /**
     * Set ornamen milik tema. Dulu section hanya menerima satu `frame` yang dipasang di
     * tengah pada `opacity-[0.18]`; sekarang `OrnamentField` yang memasang 2–6 keping
     * bermassa di jangkar tepi. Null mematikan ladangnya (dipakai pratinjau compact).
     */
    ornaments?: OrnamentSet | null
    intensity?: OrnamentIntensity
    /** Membedakan resep jangkar antar section. Cukup indeks section-nya. */
    seed?: number
  }>(),
  {
    id: undefined, tone: 'base', kicker: '', title: '', compact: false,
    ornaments: null, intensity: 'seimbang', seed: 0,
  },
)
</script>

<template>
  <section
    :id="id"
    :data-tone="tone"
    data-iv-section
    :class="cn('iv-section relative overflow-hidden px-5 text-center', compact ? 'py-12' : 'py-20 @min-[48rem]:py-28')"
  >
    <InvitationOrnamentField
      v-if="ornaments"
      :set="ornaments"
      :intensity="intensity"
      :tone="tone"
      :seed="seed"
    />

    <div :class="cn('relative mx-auto grid justify-items-center', compact ? 'gap-4' : 'gap-6')" style="width: min(100%, 42rem)">
      <p v-if="kicker" data-iv-lead class="iv-kicker m-0">{{ kicker }}</p>

      <h2 v-if="title" data-iv-lead :class="cn('iv-display m-0', compact ? 'text-[2rem]' : 'text-[clamp(2.1rem,7vw,3.4rem)]')">
        {{ title }}
      </h2>

      <slot />
    </div>
  </section>
</template>

<style>
.iv-section[data-tone='base'] { background: var(--iv-bg); color: var(--iv-fg); }
.iv-section[data-tone='paper'] {
  color: var(--iv-fg);
  /* Cahaya lembut dari atas, supaya bidang ini tidak terbaca sebagai satu lapis cat. */
  background:
    radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, #ffffff 86%, var(--iv-bg)) 0%, transparent 70%),
    color-mix(in srgb, #ffffff 72%, var(--iv-bg));
}
.iv-section[data-tone='tint'] {
  color: var(--iv-fg);
  background:
    radial-gradient(110% 70% at 50% 100%, color-mix(in srgb, var(--iv-primary) 16%, var(--iv-bg)) 0%, transparent 72%),
    color-mix(in srgb, var(--iv-primary) 9%, var(--iv-bg));
}
.iv-section[data-tone='ink'] {
  color: var(--iv-bg);
  /* Vignette memberi pusat pada blok gelap yang tanpa itu terbaca rata. */
  background:
    radial-gradient(75% 60% at 50% 42%, color-mix(in srgb, var(--iv-primary) 22%, var(--iv-fg)) 0%, var(--iv-fg) 78%);
}
.iv-section[data-tone='primary'] {
  color: #fffdf7;
  background:
    radial-gradient(80% 65% at 50% 38%, color-mix(in srgb, #ffffff 16%, var(--iv-primary)) 0%, var(--iv-primary) 76%);
}

/*
 * Latar motif milik tema. Dicat lewat `mask-image` supaya warnanya mengikuti --iv-accent
 * runtime: pasangan yang mengubah palet tetap dapat backdrop yang selaras, bukan warna
 * yang sudah dipanggang ke berkas SVG-nya. Tema tanpa backdrop memancarkan mask `none`
 * dan opacity `0`, jadi lapisan ini tidak terlihat sama sekali.
 */
.iv-section::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: var(--iv-backdrop-opacity, 0);
  background-color: var(--iv-accent);
  mask-image: var(--iv-backdrop-mask, none);
  mask-size: var(--iv-backdrop-size, 240px);
  mask-repeat: repeat;
  -webkit-mask-image: var(--iv-backdrop-mask, none);
  -webkit-mask-size: var(--iv-backdrop-size, 240px);
  -webkit-mask-repeat: repeat;
}
/* Di atas bidang gelap motifnya harus terang, bukan aksen yang ikut tenggelam. */
.iv-section[data-tone='ink']::before,
.iv-section[data-tone='primary']::before { background-color: #fffdf7; }

/*
 * Butiran kertas. Sangat tipis dan ditumpuk di atas warna section, tapi cukup untuk
 * menghilangkan kesan bidang digital yang rata sempurna.
 */
.iv-section::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
}
.iv-section[data-tone='ink']::after,
.iv-section[data-tone='primary']::after { opacity: 0.07; }

.iv-display {
  font-family: var(--iv-display);
  font-weight: var(--iv-display-weight, 600);
  line-height: 1.08;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

/*
 * Aksen kaligrafi untuk nama pasangan. Tema yang tidak memakainya memetakan
 * --iv-script kembali ke font display-nya, jadi kelas ini selalu aman dipasang.
 */
.iv-script {
  font-family: var(--iv-script, var(--iv-display));
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: 0;
}

.iv-kicker {
  font-family: var(--iv-body);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.7;
}

.iv-body {
  font-family: var(--iv-body);
  font-size: 1rem;
  line-height: 1.7;
  opacity: 0.85;
  text-wrap: pretty;
}

/*
 * On the saturated primary band there is no contrast headroom left to spend on
 * dimming, so supporting text keeps its full value there.
 */
.iv-section[data-tone='primary'] .iv-kicker,
.iv-section[data-tone='primary'] .iv-body {
  opacity: 1;
}

/* Kartu di dalam undangan: satu kosakata bayangan, dipakai ulang semua section. */
.iv-card {
  background: color-mix(in srgb, #ffffff 70%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  box-shadow: var(--iv-shadow-card);
}
.iv-section[data-tone='ink'] .iv-card,
.iv-section[data-tone='primary'] .iv-card {
  background: rgb(0 0 0 / 0.16);
  border-color: rgb(255 255 255 / 0.22);
  box-shadow: none;
}
</style>
