<script setup lang="ts">
import { sharePresets, type SharePreset } from '@aruna/contracts/api'
import { Check } from 'lucide-vue-next'
import { presetMeta } from './templates'

/**
 * Blok (1) halaman Generator: lima kartu gaya bahasa. Satu grup radio sungguhan di balik kartu —
 * panah kiri/kanan berpindah gaya, dan pembaca layar membacanya sebagai satu pilihan, bukan
 * lima tombol yang tidak saling kenal.
 */
const model = defineModel<SharePreset>({ default: 'formal' })
</script>

<template>
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    <legend class="m-0 mb-1 grid gap-1 p-0">
      <span class="font-display text-h3 font-semibold text-ink">Pilih Format & Gaya Bahasa Template WhatsApp</span>
      <span class="text-ui-lg text-ink-muted">Setiap gaya punya teks bawaan yang dirakit dari data acara di editor.</span>
    </legend>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label
        v-for="preset in sharePresets"
        :key="preset"
        :class="cn(
          'group relative grid cursor-pointer content-start gap-1.5 rounded-lg border bg-surface p-4 transition-[border-color,box-shadow,background-color] duration-200',
          model === preset ? 'border-sage bg-sage-soft/60 shadow-[var(--shadow-lift)]' : 'border-border-strong hover:border-ink/40 hover:shadow-[var(--shadow-hairline)]',
        )"
      >
        <input
          :id="`share-preset-${preset}`"
          v-model="model"
          type="radio"
          name="share-preset"
          :value="preset"
          class="peer sr-only"
        >
        <span class="flex items-start justify-between gap-2">
          <span class="font-semibold text-ink">{{ presetMeta[preset].label }}</span>
          <span
            :class="cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-200', model === preset ? 'border-sage bg-sage text-white' : 'border-border-input')"
            aria-hidden="true"
          >
            <Check v-if="model === preset" :size="12" :stroke-width="3" />
          </span>
        </span>
        <span class="text-caption text-ink-muted">{{ presetMeta[preset].description }}</span>
        <span class="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-[var(--color-ring)]" />
      </label>
    </div>
  </fieldset>
</template>
