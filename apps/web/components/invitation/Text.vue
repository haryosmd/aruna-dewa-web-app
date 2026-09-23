<script setup lang="ts">
import type { Section } from '~/types/aruna'
import { textStyleOf } from '~/composables/useTextStyle'
import { bacaKanvas, gayaTeks } from '~/utils/kanvas'

/**
 * Satu kolom teks bagian v2 (fase 72), lengkap dengan gaya per kolomnya.
 *
 * Merender `section.data[field]` di tag yang diminta dan menaruh `textStyles[field]` sebagai
 * `style` inline — tempat yang sama dengan referensi. Kelas tema (`.iv-display`, `.iv-body`)
 * tetap dipasang pemanggil lewat `class`, jadi gaya pasangan menimpa hanya yang ia pilih.
 *
 * Kolom yang kosong tidak dirender sama sekali (bukan tag kosong) — kecuali pemanggil memberi
 * `fallback`, untuk kolom yang tanpa isi masih butuh wajah (nama pasangan di hero).
 */
const props = withDefaults(defineProps<{
  section: Section | undefined
  field: string
  tag?: string
  fallback?: string
  /** Menjaga baris baru di paragraf (alamat, kalimat pengantar) tanpa `v-html`. */
  multiline?: boolean
}>(), { tag: 'p', fallback: '', multiline: false })

const value = computed(() => {
  const raw = props.section?.data[props.field]
  const text = typeof raw === 'string' ? raw : raw == null ? '' : String(raw)
  return text.trim() ? text : props.fallback
})
const style = computed(() => textStyleOf(props.section, props.field))

/*
 * Keping kanvas teks (fase 81): `t:<kolom>`. Geseran lewat `left`/`top` relatif (lihat
 * `gayaTeks`) karena elemen ini sendiri dianimasikan GSAP; ukuran lewat `textStyles` di atas.
 * Dibaca dari `props.section`, bukan lingkup — teks selalu tahu bagiannya.
 */
const kunci = computed(() => `t:${props.field}`)
const keping = computed(() => bacaKanvas(props.section?.data).keping[kunci.value])
const gerak = computed(() => (keping.value?.gerak && keping.value.gerak !== 'bagian' ? keping.value.gerak : undefined))
</script>

<template>
  <component
    :is="tag"
    v-if="value"
    :data-iv-el="kunci"
    :data-iv-bagian="section?.id"
    :data-iv-terkunci="keping?.terkunci ? '' : undefined"
    :data-iv-gerak="gerak"
    :data-iv-tunda="keping?.tunda || undefined"
    :style="[style, gayaTeks(keping)]"
    :class="['iv-keping', { 'whitespace-pre-line': multiline }]"
  >
{{ value }}
</component>
</template>
