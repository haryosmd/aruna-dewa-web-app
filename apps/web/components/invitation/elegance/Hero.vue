<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'

/**
 * Hero Elegance (fase 72): foto penuh satu layar, bingkai garis tipis warna primary di
 * dalamnya, monogram di puncak, nama script besar, tanggal, nama tamu, dan petunjuk gulir.
 * Menggantikan peran `cover` v1 sebagai bagian pertama di balik amplop.
 */
const props = defineProps<{ section: Section; seed: number }>()
const invitation = useInvitation()
/* `h1` hanya di halaman tamu: di panggung editor `h1`-nya milik toolbar (axe: satu h1 per halaman). */
const mode = invitation.mode
const { orn, compact, coupleNames, initials, greeting } = invitation

/** Foto pasangan, atau foto sampul tema bila belum diunggah — hero tanpa foto bukan hero. */
const photo = computed(() => text(props.section, 'imageUrl') || themeOf(invitation.document.value.templateId).cover)
const latar = computed(() => latarBagian(props.section))
const gerak = computed(() => gerakBagian(props.section))
const entrance = computed(() => (gerak.value && gerak.value !== 'tema' ? gerak.value : undefined))
</script>

<template>
  <header
    :id="sectionDomId('hero')"
    data-iv-section
    :data-iv-entrance="entrance"
    :class="cn('iv-hero relative grid place-items-center overflow-hidden px-5 text-center', compact ? 'min-h-[30rem] py-12' : 'min-h-[var(--iv-layar-h,100svh)] py-16')"
    :style="{ color: '#fffdf7', background: latar?.color || 'var(--iv-fg)' }"
  >
    <img data-iv-parallax data-iv-photo :src="photo" :alt="`Foto ${coupleNames}`" class="absolute inset-0 h-[118%] w-full object-cover">
    <!-- Tabir gelap dari bawah: teks selalu di atas bidang yang cukup gelap, apa pun fotonya. -->
    <div class="absolute inset-0" style="background: linear-gradient(to top, rgb(0 0 0 / 0.74) 8%, rgb(0 0 0 / 0.26) 52%, rgb(0 0 0 / 0.38))" />

    <!-- Bingkai garis tipis primary, dengan sudut ornamen di dua pojoknya. -->
    <div class="iv-hero-frame" aria-hidden="true">
      <OrnamentGlyph :glyph="orn.corner" data-iv-ornament class="iv-hero-corner iv-hero-corner--tl" />
      <OrnamentGlyph :glyph="orn.corner" data-iv-ornament class="iv-hero-corner iv-hero-corner--br" />
    </div>

    <div class="relative grid w-full justify-items-center gap-3">
      <OrnamentGlyph :glyph="orn.monogram" :initials="initials" data-iv-ornament data-iv-lead class="h-20 w-20 opacity-90" />
      <InvitationText :section="props.section" field="monogram" tag="p" data-iv-lead class="iv-display m-0 text-[0.9375rem] tracking-[0.3em]" />
      <InvitationText :section="props.section" field="kicker" tag="p" data-iv-lead class="iv-kicker m-0 opacity-90" />

      <OrnamentGlyph :glyph="orn.symbol" data-iv-ornament class="h-10 w-14 opacity-85" />
      <InvitationText
        :section="props.section"
        field="title"
        :tag="mode === 'live' ? 'h1' : 'h2'"
        :fallback="coupleNames"
        data-iv-lead
        class="iv-display iv-script m-0 text-[clamp(2.8rem,12cqw,5rem)]"
      />
      <OrnamentGlyph :glyph="orn.symbol" data-iv-ornament class="h-10 w-14 rotate-180 opacity-85" />

      <InvitationText :section="props.section" field="subtitle" tag="p" data-iv-reveal class="iv-body m-0 text-[0.9375rem] opacity-95" />

      <!-- Satu paragraf: label dan nama terbaca sebagai satu kalimat "Kepada Yth. …" (dijaga e2e landing). -->
      <p v-if="greeting" data-iv-reveal class="iv-body m-0 mt-4 text-[0.9375rem] opacity-95">
        <InvitationText :section="props.section" field="guestLabel" tag="span" fallback="Kepada Yth." /> <span class="iv-display text-[1.35rem] leading-tight">{{ greeting }}</span>
      </p>

      <p v-if="!compact && text(props.section, 'scrollLabel')" class="iv-hero-scroll iv-kicker m-0 mt-8 flex flex-col items-center gap-1 opacity-85" aria-hidden="true">
        <span>{{ text(props.section, 'scrollLabel') }}</span>
        <ChevronDown :size="18" />
      </p>
    </div>
  </header>
</template>

<style>
.iv-hero-frame {
  position: absolute;
  inset: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--iv-primary) 70%, #fffdf7);
  pointer-events: none;
}
.iv-hero-corner {
  position: absolute;
  width: 3rem;
  height: auto;
  aspect-ratio: 1;
  /* Ramp kertas: di atas foto, primary tema mana pun bisa lenyap. Sama alasannya dengan `.iv-portrait-corner`. */
  --iv-orn-deep: #fffdf7;
  --iv-orn-body: #fffdf7;
  --iv-orn-accent: rgb(255 253 247 / 0.6);
  --iv-orn-glow: rgb(255 253 247 / 0.75);
  color: #fffdf7;
  opacity: 0.8;
  filter: drop-shadow(0 0 1px rgb(0 0 0 / 0.5));
}
.iv-hero-corner--tl { top: -0.5rem; left: -0.5rem; }
.iv-hero-corner--br { bottom: -0.5rem; right: -0.5rem; transform: rotate(180deg); }

/* Petunjuk gulir mengayun pelan; diam bagi yang meminta gerak minimal. */
.iv-hero-scroll svg { animation: iv-hero-bob 1.6s ease-in-out infinite; }
@keyframes iv-hero-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(5px); }
}
@media (prefers-reduced-motion: reduce) { .iv-hero-scroll svg { animation: none; } }
</style>
