<script setup lang="ts">
/** Kenanga berjajar: kuntum berkelopak enam yang berulang, diselingi kuncup kecil. */
</script>

<template>
  <svg viewBox="0 0 240 80" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <g v-for="x in [40, 120, 200]" :key="x" :transform="`translate(${x} 40)`">
        <path d="M0 -4 C-6 -20 -4 -32 2 -38 C6 -28 6 -14 0 -4 Z" />
        <path d="M0 -4 C-16 -14 -24 -24 -24 -34 C-14 -28 -6 -16 0 -4 Z" />
        <path d="M0 -4 C16 -14 24 -24 24 -34 C14 -28 6 -16 0 -4 Z" />
        <path d="M0 -4 C-14 4 -22 16 -22 30 C-10 20 -2 8 0 -4 Z" />
        <path d="M0 -4 C14 4 22 16 22 30 C10 20 2 8 0 -4 Z" />
        <circle cx="0" cy="-2" r="5" />
      </g>
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <g v-for="x in [80, 160]" :key="x" :transform="`translate(${x} 40)`">
        <ellipse cx="0" cy="0" rx="6" ry="11" />
        <path d="M0 12 C-8 20 -12 30 -12 38 C-4 32 0 22 0 12 Z" />
        <path d="M0 12 C8 20 12 30 12 38 C4 32 0 22 0 12 Z" />
      </g>
    </g>
  </svg>
</template>
