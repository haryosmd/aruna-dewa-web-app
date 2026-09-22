<script setup lang="ts">
import type { EnvelopeSpeed } from '@aruna/contracts'
import type { Section } from '~/types/aruna'

/**
 * Amplop pembuka Elegance (fase 72) = `CoverGate` dengan kata-kata dari `opening-envelope.data`.
 *
 * Komponen ini sengaja tipis: mekanik amplop, segel, dan tempo tetap milik `CoverGate` supaya
 * gerbang v1 dan v2 tidak pernah punya dua salinan timeline. Yang ditambahkan di sini hanya
 * pembacaan kolom bagian dan penerusan konteks (nama pasangan, tamu, ornamen).
 */
const props = withDefaults(defineProps<{
  section: Section
  speed?: EnvelopeSpeed
  hasMusic?: boolean
  image?: string
  /** Panggung editor: gerbang terkurung di `.iv-root`. Lihat `CoverGate`. */
  contained?: boolean
}>(), { speed: 'sedang', hasMusic: false, image: '', contained: false })

const emit = defineEmits<{ open: []; lock: []; unlock: [] }>()

const { orn, intensity, coupleNames, initials, greeting } = useInvitation()
const kolom = (key: string, fallback = '') => text(props.section, key, fallback)
</script>

<template>
  <InvitationCoverGate
    elegance
    :couple="kolom('title', coupleNames)"
    :date="kolom('date')"
    :greeting="greeting"
    :initials="initials"
    :image="image"
    :ornaments="orn"
    :intensity="intensity"
    :speed="speed"
    :has-music="hasMusic"
    :eyebrow="kolom('eyebrow')"
    :kicker="kolom('kicker')"
    :guest-label="kolom('guestLabel')"
    :no-guest="'Bapak/Ibu/Saudara/i'"
    :seal-monogram="kolom('sealMonogram')"
    :seal-label="kolom('sealLabel', 'Buka')"
    :callout="kolom('callout')"
    :subtitle="kolom('subtitle')"
    :footer="kolom('footer')"
    :contained="contained"
    :gate-id="sectionDomId('opening-envelope')"
    @open="emit('open')"
    @lock="emit('lock')"
    @unlock="emit('unlock')"
  />
</template>
