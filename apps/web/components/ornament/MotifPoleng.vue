<script setup lang="ts">
/** Poleng: kotak selang-seling hitam-putih, kain yang membalut pelinggih dan pohon di Bali. */
</script>

<template>
  <svg viewBox="0 0 240 80" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <g v-for="x in [0, 60, 120, 180]" :key="`a${x}`">
        <rect :x="x" y="12" width="30" height="28" />
        <rect :x="x + 30" y="40" width="30" height="28" />
      </g>
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <g v-for="x in [0, 60, 120, 180]" :key="`b${x}`">
        <rect :x="x + 30" y="12" width="30" height="28" />
        <rect :x="x" y="40" width="30" height="28" />
      </g>
    </g>
  </svg>
</template>
