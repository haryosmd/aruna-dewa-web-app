<script setup lang="ts">
/** Segel laurel: perisai bulat telur yang dikurung dua sayap daun. Untuk tema botanical. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 120 160" aria-hidden="true">
    <path
      data-seal-body
      d="M60 6 C88 6 104 34 104 74 C104 114 86 144 60 154 C34 144 16 114 16 74 C16 34 32 6 60 6 Z"
      fill="currentColor"
    />
    <g data-seal-carve fill="var(--iv-bg)" opacity="0.5">
      <path d="M34 100 C28 88 28 72 34 58 C42 70 42 88 34 100 Z" />
      <path d="M86 100 C92 88 92 72 86 58 C78 70 78 88 86 100 Z" />
      <path d="M60 14 L68 26 L60 38 L52 26 Z" />
    </g>
    <text
      v-if="initials"
      x="60" y="94"
      text-anchor="middle"
      fill="var(--iv-bg)"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 34px; letter-spacing: 0.06em"
    >{{ initials }}</text>
  </svg>
</template>
