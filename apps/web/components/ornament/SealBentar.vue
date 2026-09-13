<script setup lang="ts">
/** Segel bentar: siluet candi bertingkat yang terbelah tipis di tengah. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 120 160" aria-hidden="true">
    <path
      data-seal-body
      d="M60 4 L74 18 V32 H86 V48 H98 V64 H108 V140 H12 V64 H22 V48 H34 V32 H46 V18 Z"
      fill="currentColor"
    />
    <path data-seal-carve d="M60 30 V132" fill="none" stroke="var(--iv-bg)" stroke-width="3" stroke-dasharray="7 9" opacity="0.5" />
    <rect data-seal-body x="6" y="140" width="108" height="8" rx="2" fill="currentColor" />
    <rect data-seal-body x="14" y="150" width="92" height="6" rx="2" fill="currentColor" opacity="0.5" />
    <text
      v-if="initials"
      x="60" y="112"
      text-anchor="middle"
      fill="var(--iv-bg)"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 28px; letter-spacing: 0.06em"
    >{{ initials }}</text>
  </svg>
</template>
