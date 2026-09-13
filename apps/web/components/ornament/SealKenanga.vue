<script setup lang="ts">
/** Segel kenanga: cakram berlobus enam — tiap lobus satu kelopak. */
defineProps<{ initials?: string }>()
</script>

<template>
  <svg viewBox="0 0 120 160" aria-hidden="true">
    <path
      data-seal-body
      d="M60 6 C70 6 78 14 79 24 C89 18 101 22 106 31 C111 40 108 52 99 58 C108 64 111 76 106 85 C101 94 89 98 79 92 C78 102 70 110 60 110 C50 110 42 102 41 92 C31 98 19 94 14 85 C9 76 12 64 21 58 C12 52 9 40 14 31 C19 22 31 18 41 24 C42 14 50 6 60 6 Z"
      fill="currentColor"
    />
    <circle data-seal-carve cx="60" cy="58" r="30" fill="none" stroke="var(--iv-bg)" stroke-width="2.5" opacity="0.5" />
    <rect data-seal-body x="54" y="106" width="12" height="44" rx="6" fill="currentColor" />
    <path data-seal-body d="M60 128 C44 128 32 140 30 156 C46 154 56 144 60 128 Z" fill="currentColor" opacity="0.5" />
    <path data-seal-body d="M60 128 C76 128 88 140 90 156 C74 154 64 144 60 128 Z" fill="currentColor" opacity="0.5" />
    <text
      v-if="initials"
      x="60" y="70"
      text-anchor="middle"
      fill="var(--iv-bg)"
      style="font-family: var(--iv-display, Georgia, serif); font-size: 30px; letter-spacing: 0.06em"
    >{{ initials }}</text>
  </svg>
</template>
