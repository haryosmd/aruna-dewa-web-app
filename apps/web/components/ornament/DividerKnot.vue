<script setup lang="ts">
/** Pemisah simpul: dua lengkung berisi yang saling mengunci di tengah. */
</script>

<template>
  <svg viewBox="0 0 320 40" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <path d="M160 20 C160 8 150 2 140 6 C130 10 130 24 140 30 C150 36 160 32 160 20 Z" />
      <path d="M160 20 C160 32 170 38 180 34 C190 30 190 16 180 10 C170 4 160 8 160 20 Z" />
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <circle cx="106" cy="20" r="6" /><circle cx="214" cy="20" r="6" />
    </g>
    <g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" opacity="0.7" data-draw>
      <path d="M14 20 H96" /><path d="M224 20 H306" />
    </g>
  </svg>
</template>
