<script setup lang="ts">
/** Lingkaran: band tebal, bukan hairline — cincinnya sendiri yang jadi massanya. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <g fill="currentColor" fill-rule="evenodd" data-mass>
      <path
d="M100 14 C147 14 186 53 186 100 C186 147 147 186 100 186 C53 186 14 147 14 100 C14 53 53 14 100 14 Z
               M100 26 C59 26 26 59 26 100 C26 141 59 174 100 174 C141 174 174 141 174 100 C174 59 141 26 100 26 Z"
/>
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <path d="M100 32 L108 44 L100 56 L92 44 Z" />
      <path d="M100 144 L108 156 L100 168 L92 156 Z" />
    </g>
    <text
      v-if="initials"
      x="100" y="122"
      text-anchor="middle"
      fill="currentColor"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 66px; letter-spacing: 0.04em"
    >{{ initials }}</text>
  </svg>
</template>
