<script setup lang="ts">
import type { EntranceStyle, EnvelopeSpeed, InvitationMotion } from '@aruna/contracts'
import { selectableEntrances } from '~/utils/invitation-options'
import { selectableEnvelopeSpeeds, toEnvelopeSpeed } from '~/utils/motion-envelope'

/**
 * Pemilih gerak per undangan (fase 69): tempo amplop dan gaya masuk bagian.
 *
 * Dua `<select>` terenumerasi, bukan slider — angka bebas akan membuka jalan ke gerak yang
 * melanggar DESIGN.md tanpa satu gerbang pun menyadarinya (alasan yang sama dengan
 * `backdropWeights`). Amplop hanya terlihat di halaman publik: pratinjau `compact` tidak
 * merender gerbang, dan itu ditulis di hint supaya pasangan tidak mencarinya di panggung.
 */
const props = defineProps<{
  motion: InvitationMotion | undefined
  terkunci: boolean
}>()

const emit = defineEmits<{
  'update:amplop': [EnvelopeSpeed]
  'update:masuk': [EntranceStyle | 'tema']
}>()

const amplop = computed(() => toEnvelopeSpeed(props.motion?.amplop))
const masuk = computed<EntranceStyle | 'tema'>(() => props.motion?.masuk ?? 'tema')
const hintAmplop = computed(() => selectableEnvelopeSpeeds.find(o => o.id === amplop.value)?.hint)
const hintMasuk = computed(() => selectableEntrances.find(o => o.id === masuk.value)?.hint)
</script>

<template>
  <div class="grid gap-3">
    <div class="flex flex-wrap items-baseline gap-x-2">
      <span class="text-caption font-medium text-ink">Gerak</span>
      <span class="text-caption text-ink-subtle">Tempo amplop dan cara bagian masuk. Amplop hanya tampil di halaman publik.</span>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <UiField id="editor-motion-amplop" v-slot="{ id }" label="Kecepatan amplop" :hint="hintAmplop">
        <UiSelect
          :id="id"
          :model-value="amplop"
          :disabled="terkunci"
          :aria-describedby="terkunci ? 'design-locked' : undefined"
          @update:model-value="value => emit('update:amplop', toEnvelopeSpeed(value))"
        >
          <option v-for="option in selectableEnvelopeSpeeds" :key="option.id" :value="option.id">{{ option.label }}</option>
        </UiSelect>
      </UiField>
      <UiField id="editor-motion-masuk" v-slot="{ id }" label="Gaya masuk bagian" :hint="hintMasuk">
        <UiSelect
          :id="id"
          :model-value="masuk"
          :disabled="terkunci"
          :aria-describedby="terkunci ? 'design-locked' : undefined"
          @update:model-value="value => emit('update:masuk', String(value) as EntranceStyle | 'tema')"
        >
          <option v-for="option in selectableEntrances" :key="option.id" :value="option.id">{{ option.label }}</option>
        </UiSelect>
      </UiField>
    </div>
  </div>
</template>
