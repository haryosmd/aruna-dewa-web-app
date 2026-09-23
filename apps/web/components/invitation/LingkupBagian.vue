<script setup lang="ts">
import type { Section } from '~/types/aruna'

/**
 * Pembungkus tanpa DOM (fase 81): menyediakan bagian ini untuk keping kanvas di dalamnya.
 * Lihat `useKanvasBagian.ts`. Hanya slot — tidak ada elemen, jadi tata letak dan pemilih CSS
 * seperti `.iv-column > section` tidak bergeser.
 */
const props = defineProps<{ section: Section | undefined }>()
sediakanBagian(() => props.section)
</script>

<template>
  <slot />
</template>
