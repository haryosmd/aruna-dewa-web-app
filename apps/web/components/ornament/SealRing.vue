<script setup lang="ts">
/** Segel alba: satu cakram dan satu ketupat. Tema ini memang tidak menambah apa-apa. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 120 160" aria-hidden="true">
    <circle data-seal-body cx="60" cy="80" r="52" fill="currentColor" />
    <g data-seal-carve fill="var(--iv-bg)" opacity="0.4">
      <path d="M60 36 L70 46 L60 56 L50 46 Z" />
      <rect x="36" y="116" width="48" height="3" />
    </g>
    <text
      v-if="initials"
      x="60" y="96"
      text-anchor="middle"
      fill="var(--iv-bg)"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 36px; letter-spacing: 0.1em"
    >{{ initials }}</text>
  </svg>
</template>
