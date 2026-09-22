<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'

const badge = cva('inline-flex items-center gap-1.5 rounded-full font-semibold leading-none', {
  variants: {
    tone: {
      gold: 'bg-gold text-ink',
      primary: 'bg-primary-soft text-primary-strong',
      sage: 'bg-sage-soft text-sage',
      neutral: 'bg-surface-3 text-ink-muted',
      outline: 'border border-border-strong text-ink-muted',
    },
    size: {
      sm: 'px-2.5 py-1 text-ui-label tracking-[0.08em] uppercase',
      md: 'px-3 py-1.5 text-caption',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'sm' },
})

const props = defineProps<{ tone?: VariantProps<typeof badge>['tone']; size?: VariantProps<typeof badge>['size'] }>()
</script>

<template>
  <span :class="cn(badge({ tone: props.tone, size: props.size }))"><slot /></span>
</template>
