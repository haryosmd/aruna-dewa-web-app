<script setup lang="ts">
/** Segel gonjong: sepasang atap runcing rumah gadang menaungi inisial. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 120 160" aria-hidden="true">
    <path
      data-seal-body
      d="M60 2 C56 32 44 50 24 62 C46 62 58 68 60 78 C62 68 74 62 96 62 C76 50 64 32 60 2 Z"
      fill="currentColor"
    />
    <path data-seal-body d="M18 70 H102 V146 H18 Z" fill="currentColor" />
    <g data-seal-carve fill="var(--iv-bg)" opacity="0.42">
      <path d="M60 124 L76 146 H44 Z" />
      <rect x="18" y="76" width="84" height="3" />
    </g>
    <rect data-seal-body x="12" y="148" width="96" height="6" rx="3" fill="currentColor" />
    <text
      v-if="initials"
      x="60" y="112"
      text-anchor="middle"
      fill="var(--iv-bg)"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 28px; letter-spacing: 0.06em"
    >{{ initials }}</text>
  </svg>
</template>
