<script setup lang="ts">
/** Laurel: dua sayap daun berisi mengurung inisial pasangan. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <path d="M64 146 C44 134 32 112 34 86 C52 100 64 122 64 146 Z" />
      <path d="M136 146 C156 134 168 112 166 86 C148 100 136 122 136 146 Z" />
      <path d="M52 112 C36 106 26 92 26 74 C42 82 52 96 52 112 Z" />
      <path d="M148 112 C164 106 174 92 174 74 C158 82 148 96 148 112 Z" />
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <path d="M76 166 C58 160 44 148 38 132 C58 136 72 148 76 166 Z" />
      <path d="M124 166 C142 160 156 148 162 132 C142 136 128 148 124 166 Z" />
      <path d="M100 18 L110 34 L100 50 L90 34 Z" />
    </g>
    <text
      v-if="initials"
      x="100" y="112"
      text-anchor="middle"
      fill="currentColor"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 62px; letter-spacing: 0.04em"
    >{{ initials }}</text>
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.55" data-draw>
      <path d="M78 176 C90 182 110 182 122 176" />
    </g>
  </svg>
</template>
