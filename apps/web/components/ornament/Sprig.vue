<script setup lang="ts">
/**
 * Ranting berdaun. Daun berisi penuh (`data-mass`), tangkai tetap bergaris (`data-draw`)
 * supaya ada satu elemen yang masih bisa tumbuh saat scroll.
 */
</script>

<template>
  <svg viewBox="0 0 120 168" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <path d="M60 112 C44 106 34 90 36 72 C52 80 62 96 60 112 Z" />
      <path d="M60 86 C76 80 86 64 84 46 C68 54 58 70 60 86 Z" />
      <path d="M60 60 C46 52 40 34 46 18 C60 28 66 46 60 60 Z" />
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <path d="M60 130 C74 126 84 114 84 100 C70 102 60 116 60 130 Z" />
      <path d="M60 104 C46 98 38 86 38 72 C52 76 60 90 60 104 Z" />
      <path d="M60 38 C70 30 74 16 70 4 C60 12 56 26 60 38 Z" />
    </g>
    <g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" data-draw>
      <path d="M60 166 C58 132 58 78 60 22" />
    </g>
  </svg>
</template>
