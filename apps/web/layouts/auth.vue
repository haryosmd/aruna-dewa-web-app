<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
</script>

<template>
  <div class="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
    <!-- Editorial half: only shown once there is room for it to mean something. -->
    <aside class="relative hidden overflow-hidden bg-surface-inverse lg:block">
      <img
        src="/images/hero.webp"
        alt=""
        width="1600"
        height="1067"
        class="absolute inset-0 h-full w-full object-cover opacity-70"
      >
      <div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/10" />

      <OrnamentCorner class="absolute left-8 top-8 h-28 w-28 text-ink-inverse/35" />

      <div class="relative flex h-full flex-col justify-end gap-6 p-12">
        <OrnamentGarland class="h-14 w-56 text-ink-inverse/50" />
        <p class="max-w-sm font-display text-[2.25rem] leading-[1.1] text-ink-inverse">
          Satu hari yang disiapkan bertahun-tahun.
        </p>
        <p class="max-w-sm text-[0.9375rem] leading-relaxed text-ink-inverse/70">
          Susun undangan, kelola daftar tamu, dan terima konfirmasi kehadiran dalam satu ruang persiapan.
        </p>
      </div>
    </aside>

    <div class="relative flex flex-col">
      <div class="flex items-center justify-between gap-4 p-6 sm:p-8">
        <NuxtLink to="/" class="no-underline" aria-label="Aruna Dewa, ke beranda">
          <BrandLogo />
        </NuxtLink>
        <NuxtLink
          to="/"
          class="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium text-ink-muted no-underline transition-colors hover:text-ink"
        >
          <ArrowLeft :size="16" aria-hidden="true" />
          Beranda
        </NuxtLink>
      </div>

      <main class="flex flex-1 items-center justify-center px-6 pb-16 sm:px-8">
        <slot />
      </main>
    </div>
  </div>
</template>
