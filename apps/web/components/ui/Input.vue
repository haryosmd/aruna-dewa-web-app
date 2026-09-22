<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{ invalid?: boolean; prefix?: string }>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="relative flex items-stretch">
    <span
      v-if="props.prefix"
      class="flex items-center rounded-l-md border border-r-0 border-border-input bg-surface-3 px-3 text-ui text-ink-muted"
    >{{ props.prefix }}</span>

    <input
      v-bind="$attrs"
      v-model="model"
      :aria-invalid="props.invalid || undefined"
      :class="cn(
        'min-h-12 w-full rounded-md border border-border-input bg-surface px-3.5 text-ink placeholder:text-ink-subtle/80',
        'transition-[border-color,box-shadow] duration-200',
        'hover:border-ink/60 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)] focus:outline-none',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_3px_var(--color-danger-soft)]',
        props.prefix && 'rounded-l-none',
      )"
    >
  </div>
</template>
