<script setup lang="ts">
/** Siku poleng: papan catur hitam-putih Bali, dipotong diagonal oleh undakan candi. */
</script>

<template>
  <svg viewBox="0 0 170 170" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <rect x="6" y="122" width="24" height="24" /><rect x="54" y="122" width="24" height="24" />
      <rect x="30" y="98" width="24" height="24" /><rect x="78" y="98" width="24" height="24" />
      <rect x="54" y="74" width="24" height="24" /><rect x="102" y="74" width="24" height="24" />
      <rect x="78" y="50" width="24" height="24" /><rect x="126" y="50" width="24" height="24" />
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <rect x="30" y="122" width="24" height="24" /><rect x="6" y="98" width="24" height="24" />
      <rect x="54" y="98" width="24" height="24" /><rect x="30" y="74" width="24" height="24" />
      <rect x="78" y="74" width="24" height="24" /><rect x="54" y="50" width="24" height="24" />
      <rect x="102" y="50" width="24" height="24" /><rect x="102" y="26" width="24" height="24" />
      <rect x="6" y="146" width="120" height="10" rx="2" />
    </g>
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.7" data-draw>
      <path d="M150 20 L164 6" /><path d="M126 44 L164 44" />
    </g>
  </svg>
</template>
