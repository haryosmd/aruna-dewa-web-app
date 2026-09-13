<script setup lang="ts">
// vue-sonner 1.x ships its styles inside the bundle; there is no separate stylesheet to import.
import { Toaster } from 'vue-sonner'

const ready = ref(false)
onMounted(() => { ready.value = true })
</script>

<template>
  <NuxtLoadingIndicator color="#b4472a" :height="2" />

  <div :data-ready="ready ? 'true' : 'false'">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>

  <Toaster
    position="top-center"
    :toast-options="{
      class: 'aruna-toast',
      style: {
        background: 'var(--color-surface)',
        color: 'var(--color-ink)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-float)',
        fontFamily: 'var(--font-sans)',
      },
    }"
  />
</template>

<style>
.aruna-toast [data-icon] { color: var(--color-primary); }

/*
 * vue-sonner sizes its list with an explicit width plus 16px insets, which on a 390px
 * phone pushes the document 16px wider than the viewport. Cap it instead.
 */
[data-sonner-toaster] { max-width: calc(100vw - 2rem); }
</style>
