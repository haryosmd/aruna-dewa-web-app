<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ invalid?: boolean }>()
const model = defineModel<string | number>({ default: '' })
</script>

<template>
  <div class="relative">
    <select
      v-bind="$attrs"
      v-model="model"
      :aria-invalid="props.invalid || undefined"
      :class="cn(
        'min-h-12 w-full appearance-none rounded-md border border-border-input bg-surface pl-3.5 pr-10 text-ink',
        'transition-[border-color,box-shadow] duration-200',
        'hover:border-ink/60 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)] focus:outline-none',
        'aria-[invalid=true]:border-danger',
        'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-muted disabled:hover:border-border-input',
      )"
    >
      <slot />
    </select>
    <ChevronDown :size="17" class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
  </div>
</template>
