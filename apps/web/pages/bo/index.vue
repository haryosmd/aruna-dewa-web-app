<script setup lang="ts">
/** `/bo` sendiri tidak punya isi; ia pintu ke daftar undangan. */
definePageMeta({
  middleware: [
    'auth',
    'operator',
    () => navigateTo('/bo/undangan', { replace: true }),
  ],
  layout: false,
})
</script>

<template>
  <div />
</template>
