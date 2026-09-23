<script setup lang="ts">
import type { Component } from 'vue'
import type { Section } from '~/types/aruna'
import { storyVariantEfektif, toStorySteps, type StoryVariant } from '~/utils/invitation-options'

/**
 * Cerita Cinta — satu pintu untuk lima wajah (fase 79).
 *
 * Sampai fase ini bagian ini punya dua wajah yang dipilih **tanpa pasangan tahu**: tanpa langkah
 * satu foto dan satu paragraf, dengan langkah rel melengkung. Keduanya bagus, dan tidak satu pun
 * bisa dipilih. Fase 79 membuka pilihannya lewat kolom `variant` di kontrak, dan menambah tiga
 * wajah lagi — sambil menjaga kedua cabang lama persis di tempatnya, lewat `storyVariantEfektif`:
 * varian berbasis langkah yang tidak punya langkah tetap jatuh ke prosa.
 *
 * `kicker`, `title`, dan `closing` akhirnya dibaca dari `section.data`; sampai fase ini ketiganya
 * punya kolom form yang tidak berefek apa pun. `closing` memakai fallback **bersyarat** — baris
 * penutup hari ini hanya muncul di cabang berlangkah, dan fallback tanpa syarat akan menumbuhkan
 * kalimat baru di dokumen warisan yang tidak pernah menulisnya.
 */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, t } = useInvitation()

const steps = computed(() => toStorySteps(props.section.data.steps))
const efektif = computed(() => storyVariantEfektif(props.section.data, steps.value.length))

/**
 * Varian dimuat MALAS, satu per dokumen.
 *
 * Pola dan alasannya sama dengan `OrnamentGlyph`: `import.meta.glob` tanpa `eager` memberi tiap
 * varian chunk-nya sendiri, jadi undangan yang memilih "Kartu bertumpuk" tidak ikut mengunduh
 * ResizeObserver, DrawSVG, dan MotionPath milik varian rel. Nuxt membungkus halaman dengan
 * `<Suspense>`, jadi komponen async tetap diselesaikan saat SSR.
 *
 * Cache-nya wajib, bukan optimasi: tanpa itu tiap perubahan prop melahirkan komponen baru dan
 * me-*remount* ceritanya di tengah gulir tamu.
 */
const modules = import.meta.glob<{ default: Component }>('./story/*.vue')
const berkas: Record<StoryVariant, string> = {
  'rel': 'Rel',
  'prosa': 'Prosa',
  'tumpuk': 'Tumpuk',
  'buku': 'Buku',
  'rel-datar': 'RelDatar',
}
const cache = new Map<string, Component>()
const varian = computed<Component | null>(() => {
  const nama = berkas[efektif.value]
  const muat = modules[`./story/${nama}.vue`]
  if (!muat) return null
  let komponen = cache.get(nama)
  if (!komponen) {
    komponen = defineAsyncComponent(muat as () => Promise<{ default: Component }>)
    cache.set(nama, komponen)
  }
  return komponen
})
</script>

<template>
  <InvitationSection
    :id="sectionDomId('story')"
    tone="ink"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="kicker" tag="p" data-iv-lead class="iv-kicker m-0" :fallback="t('story.kicker')" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" fallback="Dari satu percakapan" />

    <component :is="varian" v-if="varian" :section="props.section" :steps="steps" />

    <InvitationText
      :section="props.section"
      field="closing"
      tag="p"
      data-iv-reveal
      class="iv-body m-0 text-caption opacity-80"
      :fallback="steps.length ? t('story.closing') : ''"
    />
  </InvitationSection>
</template>
