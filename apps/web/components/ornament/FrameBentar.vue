<script setup lang="ts">
/**
 * Candi bentar: satu gerbang yang dibelah tepat di tengah, dua paruhnya cermin. Celah
 * di puncak itu bukan kekurangan bentuk — justru itu yang membuatnya bentar, bukan kori.
 * Tiap paruh bertingkat tiga, mengecil ke atas seperti candi Bali.
 */
</script>

<template>
  <svg viewBox="0 0 300 420" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <path d="M24 420 V118 H44 V96 H62 V74 H86 V58 H120 V420 H98 V86 H80 V108 H60 V130 H44 V420 Z" />
      <path d="M276 420 V118 H256 V96 H238 V74 H214 V58 H180 V420 H202 V86 H220 V108 H240 V130 H256 V420 Z" />
      <rect x="12" y="404" width="120" height="14" rx="3" />
      <rect x="168" y="404" width="120" height="14" rx="3" />
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <rect x="48" y="152" width="44" height="12" /><rect x="48" y="196" width="44" height="12" />
      <rect x="48" y="240" width="44" height="12" /><rect x="48" y="284" width="44" height="12" />
      <rect x="208" y="152" width="44" height="12" /><rect x="208" y="196" width="44" height="12" />
      <rect x="208" y="240" width="44" height="12" /><rect x="208" y="284" width="44" height="12" />
      <path d="M104 44 L112 28 L120 44 Z" /><path d="M180 44 L188 28 L196 44 Z" />
    </g>
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.6" data-draw>
      <path d="M150 22 V392" stroke-dasharray="10 14" />
    </g>
  </svg>
</template>
