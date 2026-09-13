<script setup lang="ts">
import { Check } from 'lucide-vue-next'

defineProps<{ value: string; name: string }>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <label
    :class="cn(
      'group relative flex cursor-pointer gap-3 rounded-lg border bg-surface p-4 transition-[border-color,box-shadow,background-color] duration-200',
      model === value
        ? 'border-primary bg-primary-soft/50 shadow-[var(--shadow-lift)]'
        : 'border-border-strong hover:border-ink/40 hover:shadow-[var(--shadow-hairline)]',
    )"
  >
    <input
      v-model="model"
      type="radio"
      :name="name"
      :value="value"
      class="peer sr-only"
    >
    <span
      :class="cn(
        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-200',
        model === value ? 'border-primary bg-primary text-white' : 'border-border-input',
      )"
      aria-hidden="true"
    >
      <Check v-if="model === value" :size="12" :stroke-width="3" />
    </span>

    <span class="min-w-0 flex-1"><slot /></span>

    <span class="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-[var(--color-ring)]" />
  </label>
</template>
