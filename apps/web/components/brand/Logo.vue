<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'ink' | 'inverse'; compact?: boolean }>(), { tone: 'ink', compact: false })
</script>

<template>
  <span
    class="inline-flex items-center gap-2.5 leading-none"
    :class="tone === 'inverse' ? 'text-ink-inverse' : 'text-ink'"
  >
    <svg viewBox="0 0 40 40" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" stroke="currentColor" stroke-width="1.2" opacity="0.3" />
      <g stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 33 C19 26 19 22 20 17" />
        <path d="M20 27 C25 27 29 24 30 19 C25 19 21 22 20 27 Z" />
        <path d="M20 24 C15 24 11 21 10 16 C15 16 19 19 20 24 Z" />
        <path d="M20 16 C16 13 15 8 18 5 C22 8 23 13 20 16 Z" />
        <path d="M20 16 C24 13 25 8 22 5 C18 8 17 13 20 16 Z" />
      </g>
      <circle cx="20" cy="11" r="2.2" :fill="tone === 'inverse' ? 'var(--color-gold)' : 'var(--color-primary)'" />
    </svg>

    <span v-if="!compact" class="font-display text-[1.32rem] font-semibold tracking-[-0.02em]">
      <!-- Terakota tidak punya kontras yang cukup di atas latar gelap; emas yang mengambil alih. -->
      Aruna<span class="italic" :class="tone === 'inverse' ? 'text-gold' : 'text-primary'"> Dewa</span>
    </span>
  </span>
</template>
