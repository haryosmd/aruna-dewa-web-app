<script setup lang="ts">
/** Segel mendung: perisai berpuncak awan berundak, kakinya karang bertingkat. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 120 160" aria-hidden="true">
    <path
      data-seal-body
      d="M60 4 C44 4 34 14 32 28 C18 32 12 44 12 58 V112 C12 132 32 144 60 150 C88 144 108 132 108 112 V58 C108 44 102 32 88 28 C86 14 76 4 60 4 Z"
      fill="currentColor"
    />
    <path
      data-seal-carve
      d="M26 44 C26 32 36 26 48 28 C52 18 62 14 72 18"
      fill="none" stroke="var(--iv-bg)" stroke-width="2.5" stroke-linecap="round" opacity="0.55"
    />
    <path
      data-seal-carve
      d="M94 44 C94 32 84 26 72 28"
      fill="none" stroke="var(--iv-bg)" stroke-width="2.5" stroke-linecap="round" opacity="0.55"
    />
    <rect data-seal-body x="30" y="150" width="60" height="6" rx="3" fill="currentColor" />
    <text
      v-if="initials"
      x="60" y="98"
      text-anchor="middle"
      fill="var(--iv-bg)"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 30px; letter-spacing: 0.06em"
    >{{ initials }}</text>
  </svg>
</template>
