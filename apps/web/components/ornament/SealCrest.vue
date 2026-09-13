<script setup lang="ts">
/** Segel art deco: perisai bertingkat dengan kipas di puncak. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 120 160" aria-hidden="true">
    <path
      data-seal-body
      d="M60 4 L74 18 H104 V96 C104 126 86 148 60 158 C34 148 16 126 16 96 V18 H46 Z"
      fill="currentColor"
    />
    <g data-seal-carve fill="var(--iv-bg)" opacity="0.45">
      <path d="M60 22 L60 48 L74 34 Z" /><path d="M60 22 L60 48 L46 34 Z" />
      <rect x="26" y="118" width="68" height="3" />
      <rect x="34" y="126" width="52" height="3" />
    </g>
    <text
      v-if="initials"
      x="60" y="102"
      text-anchor="middle"
      fill="var(--iv-bg)"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 34px; letter-spacing: 0.08em"
    >{{ initials }}</text>
  </svg>
</template>
