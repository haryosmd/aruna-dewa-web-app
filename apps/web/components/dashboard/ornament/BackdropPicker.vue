<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import type { BackdropChoice, BackdropWeight } from '@aruna/contracts'
import { backdropWeights } from '@aruna/contracts'
import { backdropWeightLabels, selectableBackdrops } from '~/utils/backdrops'

/**
 * Pemilih ubin latar undangan.
 *
 * Enam ubin sudah ada di `public/textures/` sejak lama dan **hanya satu pernah tayang**
 * (`sekar-damask` pada `aruna-sekar`); lima sisanya digambar, di-commit, dan tidak pernah dilihat
 * siapa pun. Fase 59 membukanya.
 *
 * Swatch-nya dicat persis seperti undangan mencatnya — `--iv-accent` yang di-mask oleh ubinnya,
 * bukan `background-image` — supaya yang dilihat pasangan di sini adalah yang akan ia lihat di
 * undangannya, termasuk saat ia menggeser paletnya.
 */
defineProps<{
  pilihan: BackdropChoice
  bobot: BackdropWeight
  accent: string
  background: string
  terkunci: boolean
}>()

defineEmits<{ 'update:pilihan': [BackdropChoice], 'update:bobot': [BackdropWeight] }>()
</script>

<template>
  <div class="grid gap-2.5">
    <div class="flex flex-wrap items-baseline gap-x-2">
      <span id="editor-backdrop-label" class="text-caption font-medium text-ink">Latar bagian</span>
      <span class="text-caption text-ink-subtle">Ubin tipis di balik teks, mengikuti warna aksen kalian.</span>
    </div>

    <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="editor-backdrop-label">
      <button
        v-for="option in selectableBackdrops"
        :id="`editor-backdrop-${option.id}`"
        :key="option.id"
        type="button"
        role="radio"
        :aria-checked="pilihan === option.id"
        :disabled="terkunci"
        :aria-describedby="terkunci ? 'design-locked' : undefined"
        :class="cn(
          'grid h-16 w-20 place-items-center overflow-hidden rounded-md border transition-[border-color,box-shadow] duration-200',
          pilihan === option.id ? 'border-primary shadow-lift' : 'border-border hover:border-border-strong',
          terkunci && 'cursor-not-allowed opacity-60',
        )"
        :style="{ background }"
        @click="$emit('update:pilihan', option.id)"
      >
        <span class="sr-only">{{ option.label }}</span>
        <!-- Dicat seperti `.iv-section::before`: warna dari aksen, bentuk dari mask. -->
        <span
          v-if="option.src"
          aria-hidden="true"
          class="block h-full w-full"
          :style="{
            backgroundColor: accent,
            maskImage: `url(&quot;${option.src}&quot;)`,
            maskSize: '48px',
            maskRepeat: 'repeat',
            opacity: 0.55,
          }"
        />
        <span v-else aria-hidden="true" class="text-caption font-medium text-ink-muted">{{ option.label }}</span>
        <Check v-if="pilihan === option.id" :size="13" class="absolute translate-x-6 -translate-y-5 text-primary" aria-hidden="true" />
      </button>
    </div>

    <div v-if="pilihan !== 'tema' && pilihan !== 'tanpa'" class="flex flex-wrap items-center gap-2">
      <span id="editor-backdrop-weight" class="text-caption text-ink-muted">Kepekatan</span>
      <div class="flex gap-1 rounded-full bg-surface-3 p-1" role="radiogroup" aria-labelledby="editor-backdrop-weight">
        <button
          v-for="w in backdropWeights"
          :id="`editor-backdrop-weight-${w}`"
          :key="w"
          type="button"
          role="radio"
          :aria-checked="bobot === w"
          :disabled="terkunci"
          :class="cn(
            'min-h-9 rounded-full px-3 text-caption font-semibold transition-colors duration-200',
            bobot === w ? 'bg-surface text-ink shadow-hairline' : 'text-ink-muted',
            terkunci && 'cursor-not-allowed opacity-60',
          )"
          @click="$emit('update:bobot', w)"
        >
          {{ backdropWeightLabels[w] }}
        </button>
      </div>
    </div>
  </div>
</template>
