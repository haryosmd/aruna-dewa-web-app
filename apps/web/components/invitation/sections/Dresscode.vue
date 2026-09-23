<script setup lang="ts">
import type { Section } from '~/types/aruna'
import { toAttire, toDresscodeColors } from '~/utils/invitation-options'

/**
 * Fase 79 menaikkan bagian ini ke kontrak Elegance: `kicker`, `title`, dan `note` dibaca dari
 * `section.data` (ketiganya punya kolom form sejak fase 72 dan tidak satu pun pernah sampai ke
 * layar), gaya teks berlaku lewat `InvitationText`, dan latar serta gerak per bagian diteruskan.
 */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, t } = useInvitation()

const attire = computed(() => toAttire(props.section.data.attire))
const colors = computed(() => toDresscodeColors(props.section.data.colors))

/**
 * Bagian ini tanpa isi apa pun. Sampai fase 79 keadaan inilah satu-satunya tempat
 * `t('dresscode.note')` muncul — sebagai satu kalimat besar yang berdiri sendiri.
 *
 * Itu yang membuat fallback `note` di bawah harus BERSYARAT. Fallback tanpa syarat akan
 * menumbuhkan satu baris baru di setiap dokumen warisan yang sudah mengisi keterangannya:
 * `createLegacySections` tidak pernah menulis `note`, jadi di sana kolomnya selalu kosong, dan
 * kosong berarti fallback yang menang. Undangan yang sudah terbit bertahun-tahun tiba-tiba
 * menumbuhkan kalimat yang tidak pernah ditulis pasangannya.
 */
const kosong = computed(() => !attire.value.length && !colors.value.length && !text(props.section, 'text'))
</script>

<template>
  <InvitationSection
    :id="sectionDomId('dresscode')"
    tone="tint"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="kicker" tag="p" data-iv-lead class="iv-kicker m-0" :fallback="t('dresscode.kicker')" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" :fallback="t('dresscode.title')" />

    <!-- Busana berjejer dulu: tamu memutuskan pakai apa jauh sebelum membaca nama warnanya. -->
    <ul v-if="attire.length" class="iv-attire-row m-0 p-0 list-none">
      <li v-for="(id, index) in attire" :key="id" data-iv-reveal class="iv-attire-item">
        <InvitationOrnamen slot-id="attire" :posisi="`busana-${index}`" :glyph="id" data-iv-ornament class="iv-attire-art" />
        <span class="iv-body text-caption">{{ ornament(id).name }}</span>
      </li>
    </ul>
    <InvitationOrnamen
      v-else
      data-iv-ornament
      slot-id="floralAlt" posisi="utama"
      class="h-24 w-20 opacity-80"
      :style="{ color: 'var(--iv-primary)' }"
    />

    <!--
      Bundaran warna selalu membawa namanya tertulis. Warna saja bukan penanda yang bisa
      diakses: tamu dengan buta warna, atau yang membaca lewat pembaca layar, tidak
      mendapat apa-apa dari lingkaran tanpa label.
    -->
    <ul v-if="colors.length" class="iv-swatch-row m-0 p-0 list-none">
      <li v-for="color in colors" :key="color.hex" data-iv-reveal class="iv-swatch">
        <span class="iv-swatch-dot" :style="{ background: color.hex }" aria-hidden="true" />
        <span class="iv-body text-caption">{{ color.name }}</span>
      </li>
    </ul>

    <InvitationText :section="props.section" field="text" tag="p" data-iv-reveal class="iv-body m-0 max-w-md" multiline />

    <!--
      Dua peran, satu kolom. Saat bagian ini kosong `note` berdiri sendiri sebagai kalimat besar —
      itu wajah lamanya, dan fallback menjaganya utuh untuk dokumen warisan. Saat busana dan warna
      sudah ada di atasnya, ia jadi catatan kecil di bawah, karena di situ ia memang catatan.
    -->
    <InvitationText
      :section="props.section"
      field="note"
      tag="p"
      data-iv-reveal
      :fallback="kosong ? t('dresscode.note') : ''"
      :class="kosong ? 'iv-display m-0 text-[clamp(1.6rem,6cqw,2.4rem)]' : 'iv-body m-0 max-w-md text-caption opacity-80'"
    />
  </InvitationSection>
</template>

<style>
.iv-attire-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.25rem 1.75rem;
}
.iv-attire-item {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  width: 4.5rem;
}
.iv-attire-art {
  width: 100%;
  height: auto;
  aspect-ratio: 120 / 180;
  color: var(--iv-primary);
  opacity: 0.85;
}

.iv-swatch-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem 1.5rem;
}
.iv-swatch {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  width: 5rem;
}
.iv-swatch-dot {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  /* Cincin tipis supaya warna sepucat krem pun tetap punya tepi di atas latar tint. */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 30%, transparent), var(--iv-shadow-card);
}
</style>
