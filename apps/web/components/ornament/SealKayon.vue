<script setup lang="ts">
/**
 * Segel kayon. Menggantikan cakram bulat 56px yang dulu menutup amplop — bentuk yang
 * tidak mengatakan apa pun tentang tema. Siluet gunungan: puncak runcing, bahu melebar,
 * kaki bertingkat, dengan satu garis ukir di dalam.
 */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 120 160" aria-hidden="true">
    <path
      data-seal-body
      d="M60 2 C60 2 34 40 28 72 C23 99 29 124 41 146 H79 C91 124 97 99 92 72 C86 40 60 2 60 2 Z"
      fill="currentColor"
    />
    <path
      data-seal-carve
      d="M60 22 C60 22 42 52 38 76 C35 96 39 116 48 134"
      fill="none" stroke="var(--iv-bg)" stroke-width="2.5" stroke-linecap="round" opacity="0.55"
    />
    <path
      data-seal-carve
      d="M60 22 C60 22 78 52 82 76 C85 96 81 116 72 134"
      fill="none" stroke="var(--iv-bg)" stroke-width="2.5" stroke-linecap="round" opacity="0.55"
    />
    <rect data-seal-body x="34" y="146" width="52" height="6" rx="3" fill="currentColor" />
    <rect data-seal-body x="26" y="154" width="68" height="5" rx="2.5" fill="currentColor" />
    <text
      v-if="initials"
      x="60" y="106"
      text-anchor="middle"
      fill="var(--iv-bg)"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 30px; letter-spacing: 0.06em"
    >{{ initials }}</text>
  </svg>
</template>
