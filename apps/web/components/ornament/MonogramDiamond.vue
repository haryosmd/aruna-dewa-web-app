<script setup lang="ts">
/** Berlian: ketupat ganda dengan tepi berisi dan pusat dibiarkan kosong untuk inisial. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <g fill="currentColor" fill-rule="evenodd" data-mass>
      <path
d="M100 6 L194 100 L100 194 L6 100 Z
               M100 26 L26 100 L100 174 L174 100 Z"
/>
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <path
d="M100 36 L164 100 L100 164 L36 100 Z
               M100 48 L48 100 L100 152 L152 100 Z" fill-rule="evenodd"
/>
      <circle cx="100" cy="18" r="5" /><circle cx="100" cy="182" r="5" />
      <circle cx="18" cy="100" r="5" /><circle cx="182" cy="100" r="5" />
    </g>
    <text
      v-if="initials"
      x="100" y="120"
      text-anchor="middle"
      fill="currentColor"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 54px; letter-spacing: 0.04em"
    >{{ initials }}</text>
  </svg>
</template>
