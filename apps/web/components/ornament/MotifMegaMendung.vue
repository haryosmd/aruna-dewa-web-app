<script setup lang="ts">
/** Mega mendung: pilinan awan berundak yang berulang mendatar, ekornya melingkar ke dalam. */
</script>

<template>
  <svg viewBox="0 0 240 80" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <g v-for="x in [0, 80, 160]" :key="x" :transform="`translate(${x} 0)`">
        <path d="M8 58 C8 42 18 32 34 32 C38 18 50 10 64 12 C72 2 76 18 70 24 C58 22 50 28 48 40 C34 38 24 46 24 58 Z" />
      </g>
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <g v-for="x in [0, 80, 160]" :key="x" :transform="`translate(${x} 0)`">
        <path d="M14 70 C14 60 22 54 34 54 C36 44 44 38 56 40 C54 48 48 52 40 52 C30 52 24 58 24 70 Z" />
        <circle cx="66" cy="64" r="5" />
      </g>
    </g>
  </svg>
</template>
