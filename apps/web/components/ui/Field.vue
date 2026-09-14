<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'

const props = defineProps<{
  label: string
  hint?: string
  error?: string
  required?: boolean
  /** Render the label for a control the caller owns, e.g. a radio group. */
  as?: 'label' | 'fieldset'
  /**
   * Id stabil untuk kontrol di dalamnya. `useId()` hanya menjamin label dan kontrolnya
   * berpasangan; nilainya berubah tiap render, jadi tidak bisa jadi sandaran tes atau
   * tautan dalam. Satu prop di sini membuat 52 `:id="id"` yang sudah ada jadi stabil.
   */
  id?: string
}>()

const generatedId = useId()
const id = computed(() => props.id ?? generatedId)
const describedBy = computed(() => [props.hint ? `${id.value}-hint` : null, props.error ? `${id.value}-error` : null].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="grid gap-1.5">
    <!-- The asterisk sits outside the label so the accessible name stays exactly the field name. -->
    <span class="flex items-center gap-1 text-[0.8125rem] font-semibold text-ink">
      <component :is="as === 'fieldset' ? 'span' : 'label'" :for="as === 'fieldset' ? undefined : id">{{ label }}</component>
      <span v-if="required" class="text-primary" aria-hidden="true">*</span>
    </span>

    <slot :id="id" :described-by="describedBy" :invalid="Boolean(error)" />

    <p v-if="hint && !error" :id="`${id}-hint`" class="text-caption text-ink-subtle">{{ hint }}</p>

    <p v-if="error" :id="`${id}-error`" role="alert" class="flex items-start gap-1.5 text-caption font-medium text-danger">
      <AlertCircle :size="15" class="mt-px shrink-0" aria-hidden="true" />
      {{ error }}
    </p>
  </div>
</template>
