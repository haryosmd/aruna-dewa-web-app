<script setup lang="ts">
/**
 * Rumpun sudut. Dipasang di kiri-atas dan diputar 180° untuk kanan-bawah.
 * Massanya duduk di siku sudut; sulurnya yang bergaris tetap bisa digambar saat scroll.
 */
</script>

<template>
  <svg viewBox="0 0 170 170" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <path d="M14 156 C14 118 30 84 58 60 C64 90 52 128 14 156 Z" />
      <path d="M20 112 C40 116 58 108 66 90 C46 84 28 94 20 112 Z" />
      <path d="M52 66 C70 74 90 70 102 54 C84 46 64 52 52 66 Z" />
      <path d="M96 36 C106 52 124 62 144 58 C136 38 116 30 96 36 Z" />
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <path d="M8 166 C8 96 60 30 150 14 C144 24 136 32 126 38 C66 56 26 106 20 166 Z" />
      <circle cx="150" cy="26" r="8" /><circle cx="24" cy="146" r="7" />
    </g>
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" data-draw>
      <path d="M28 142 C48 136 62 124 70 106" opacity="0.7" />
      <path d="M120 24 C114 44 102 58 84 66" opacity="0.7" />
    </g>
  </svg>
</template>
