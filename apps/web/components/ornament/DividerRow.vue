<script setup lang="ts">
/** Pemisah berjajar: lima kuncup dengan tinggi bergantian. */
</script>

<template>
  <svg viewBox="0 0 320 40" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <path d="M160 4 C150 10 146 20 150 30 C160 26 166 16 160 4 Z" />
      <path d="M160 4 C170 10 174 20 170 30 C160 26 154 16 160 4 Z" />
      <circle cx="122" cy="20" r="9" /><circle cx="198" cy="20" r="9" />
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <circle cx="90" cy="20" r="6" /><circle cx="230" cy="20" r="6" />
    </g>
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" opacity="0.7" data-draw>
      <path d="M14 20 H80" /><path d="M240 20 H306" />
      <path d="M134 20 H146" /><path d="M174 20 H186" />
    </g>
  </svg>
</template>
