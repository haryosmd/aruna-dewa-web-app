<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{ invalid?: boolean }>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <textarea
    v-bind="$attrs"
    v-model="model"
    :aria-invalid="props.invalid || undefined"
    :class="cn(
      'min-h-28 w-full resize-y rounded-md border border-border-input bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-subtle/80',
      'transition-[border-color,box-shadow] duration-200',
      'hover:border-ink/60 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)] focus:outline-none',
      'aria-[invalid=true]:border-danger',
    )"
  />
</template>
