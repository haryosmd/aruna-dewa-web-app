<script setup lang="ts">
/** Kawung: empat lonjong mengelilingi satu titik, motif batik tertua. Berulang mendatar. */
</script>

<template>
  <svg viewBox="0 0 240 80" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <g v-for="x in [40, 120, 200]" :key="x" :transform="`translate(${x} 40)`">
        <ellipse cx="-16" cy="0" rx="14" ry="19" />
        <ellipse cx="16" cy="0" rx="14" ry="19" />
      </g>
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <g v-for="x in [40, 120, 200]" :key="x" :transform="`translate(${x} 40)`">
        <ellipse cx="0" cy="-19" rx="19" ry="13" />
        <ellipse cx="0" cy="19" rx="19" ry="13" />
        <circle cx="0" cy="0" r="5" />
      </g>
      <circle cx="80" cy="40" r="4" /><circle cx="160" cy="40" r="4" />
    </g>
  </svg>
</template>
