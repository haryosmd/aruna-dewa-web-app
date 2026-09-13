<script setup lang="ts">
/** Segel tumpal: pucuk rebung tunggal dengan kaki bertumpal. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 120 160" aria-hidden="true">
    <path data-seal-body d="M60 2 L106 84 V146 H14 V84 Z" fill="currentColor" />
    <g data-seal-carve fill="var(--iv-bg)" opacity="0.45">
      <path d="M60 26 L84 68 H36 Z" />
      <path d="M14 146 L27 124 L40 146 Z" /><path d="M47 146 L60 124 L73 146 Z" />
      <path d="M80 146 L93 124 L106 146 Z" />
    </g>
    <rect data-seal-body x="18" y="148" width="84" height="6" rx="3" fill="currentColor" />
    <text
      v-if="initials"
      x="60" y="112"
      text-anchor="middle"
      fill="var(--iv-bg)"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 30px; letter-spacing: 0.06em"
    >{{ initials }}</text>
  </svg>
</template>
