<script setup lang="ts">
import type { Component } from 'vue'
import { ornamentBank, type OrnamentId } from '~/utils/ornaments'

/**
 * Merender satu ornamen dari bank berdasarkan id-nya.
 *
 * Ornamen dipilih saat runtime lewat set milik tema, jadi tidak ada satupun yang disebut
 * sebagai tag di template. Auto-import Nuxt bekerja saat compile dan melewatkan komponen
 * semacam itu — `resolveComponent` pun gagal karena komponennya tidak pernah ikut ter-bundle.
 * `import.meta.glob` yang eager menyelesaikan keduanya: seluruh isi bank masuk bundle dan
 * ikut ter-render di server.
 */
const modules = import.meta.glob<{ default: Component }>('./*.vue', { eager: true })

const props = defineProps<{ glyph: OrnamentId | null | undefined; initials?: string; flip?: boolean }>()

const resolved = computed(() => {
  if (!props.glyph) return null
  const file = ornamentBank[props.glyph].component.replace(/^Ornament/, '')
  return modules[`./${file}.vue`]?.default ?? null
})

const extra = computed(() => ({
  ...(props.initials === undefined ? {} : { initials: props.initials }),
  ...(props.flip === undefined ? {} : { flip: props.flip }),
}))
</script>

<template>
  <component :is="resolved" v-if="resolved" v-bind="extra" />
</template>
