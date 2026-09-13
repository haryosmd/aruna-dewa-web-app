<script setup lang="ts">
/** Perisai art deco: bidang bertingkat yang berisi, bukan garis luar. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <g fill="currentColor" fill-rule="evenodd" data-mass>
      <path
d="M100 10 L176 42 V104 C176 146 144 176 100 192 C56 176 24 146 24 104 V42 Z
               M100 26 L38 52 V104 C38 138 64 162 100 176 C136 162 162 138 162 104 V52 Z"
/>
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <path d="M100 40 L150 62 V104 C150 132 128 152 100 164 C72 152 50 132 50 104 V62 Z" opacity="0.5" />
      <rect x="62" y="120" width="76" height="5" />
    </g>
    <text
      v-if="initials"
      x="100" y="112"
      text-anchor="middle"
      fill="currentColor"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 58px; letter-spacing: 0.04em"
    >{{ initials }}</text>
  </svg>
</template>
