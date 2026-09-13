<script setup lang="ts">
/** Jendela mawar: dua belas bilah berisi mengelilingi pusat. viewBox persegi. */
</script>

<template>
  <svg viewBox="0 0 300 300" aria-hidden="true">
    <g fill="currentColor" fill-rule="evenodd" data-mass>
      <path
d="M150 8 C228 8 292 72 292 150 C292 228 228 292 150 292 C72 292 8 228 8 150 C8 72 72 8 150 8 Z
               M150 26 C82 26 26 82 26 150 C26 218 82 274 150 274 C218 274 274 218 274 150 C274 82 218 26 150 26 Z"
/>
      <circle cx="150" cy="150" r="26" />
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <g v-for="a in 12" :key="a" :transform="`rotate(${a * 30} 150 150)`">
        <path d="M150 52 C160 72 160 96 150 116 C140 96 140 72 150 52 Z" />
      </g>
      <circle cx="150" cy="150" r="40" fill="none" stroke="currentColor" stroke-width="5" />
    </g>
  </svg>
</template>
