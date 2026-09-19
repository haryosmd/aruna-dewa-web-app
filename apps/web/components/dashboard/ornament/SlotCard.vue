<script setup lang="ts">
import type { OrnamentId } from '~/utils/ornaments'
import { ornament } from '~/utils/ornaments'

/**
 * Satu ubin slot di ringkasan ornamen inspektor (fase 70).
 *
 * Bentuk lamanya baris tiga teks — label, "nama glyph · hint", syarat — di samping pratinjau
 * 40px. Pemilik menilai detail di samping itu bising, dan ia benar: hint dan syarat menjelaskan
 * *slotnya*, bukan pilihan pasangan, jadi tempatnya di header Studio saat slot itu dibuka
 * (`Studio.vue`), bukan diulang empat belas kali di panel yang selalu terlihat. Yang tersisa
 * di sini adalah yang benar-benar milik pilihan: pratinjau, nama slot, nama glyph, dan tombol.
 *
 * Kotak pratinjaunya memakai `grid-rows-[minmax(0,1fr)]` dengan alasan yang sama dengan
 * `StudioTile.vue`: aset referensi adalah `<img>` berdimensi, dan track `auto` akan
 * mengikutinya melampaui kotak.
 */
defineProps<{
  kunci: string
  label: string
  glyph: OrnamentId
  bawaan: boolean
  ramp: Record<string, string>
  terkunci: boolean
}>()

const emit = defineEmits<{ buka: [] }>()
</script>

<template>
  <div class="grid gap-2 rounded-md border border-border bg-surface p-2">
    <span
      class="grid h-16 grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden rounded-sm bg-surface-2 p-1.5"
      :style="ramp"
    >
      <OrnamentGlyph :glyph="glyph" ubin class="min-h-0 max-h-full max-w-full object-contain text-[color:var(--iv-orn-body)]" aria-hidden="true" />
    </span>
    <span class="grid gap-0.5">
      <span class="flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] font-medium text-ink">
        {{ label }}
        <span v-if="!bawaan" class="rounded-full bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">Diganti</span>
      </span>
      <span class="truncate text-caption text-ink-subtle">{{ ornament(glyph).name }}</span>
    </span>
    <UiButton
      :id="`ornament-ganti-${kunci}`"
      tone="outline"
      size="sm"
      class="justify-self-start"
      :disabled="terkunci"
      :aria-describedby="terkunci ? 'ornament-locked' : undefined"
      @click="emit('buka')"
    >
      Ganti<span class="sr-only"> {{ label.toLowerCase() }}</span>
    </UiButton>
  </div>
</template>
