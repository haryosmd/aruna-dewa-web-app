<script setup lang="ts">
/** Frame shared by every per-invitation dashboard screen: rail on desktop, dock on mobile. */
withDefaults(defineProps<{
  invitationId: string
  title: string
  eyebrow?: string
  heading?: string
  /**
   * Lebar konten. `reading` untuk layar yang **dibaca** — ringkasan, daftar tamu, RSVP,
   * pesanan; baris sepanjang 1450px justru lebih susah dipindai. `wide` untuk layar yang
   * **dikerjakan**, dan sejauh ini cuma editor: ia satu-satunya yang menaruh tiga panel
   * berdampingan, dan pada 1024px kolom pengaturannya tinggal 312px.
   */
  width?: 'reading' | 'wide'
  /**
   * `page` (bawaan): konten di tengah, halaman yang menggulung. `studio`: main setinggi layar di
   * `lg`, tanpa `max-w` dan padding — **panel di dalamnya yang menggulung, bukan halamannya**.
   * Dipakai editor sejak fase 62; `heading`/`eyebrow` diabaikan karena toolbar studio memegang
   * `<h1>`-nya sendiri.
   */
  variant?: 'page' | 'studio'
}>(), { eyebrow: undefined, heading: undefined, width: 'reading', variant: 'page' })
</script>

<template>
  <div class="flex min-h-svh flex-col bg-surface lg:flex-row">
    <DashboardNav :invitation-id="invitationId" :title="title" />

    <!--
      `pb-24` di ponsel menyisakan ruang untuk dock navigasi bawah (fixed, 56px + safe-area).
      Di `lg` dock itu hilang dan rail samping yang memegang navigasi, jadi ruangnya dikembalikan.
    -->
    <main v-if="variant === 'studio'" class="flex min-w-0 flex-1 flex-col pb-24 lg:h-svh lg:overflow-hidden lg:pb-0">
      <!-- Di ponsel rail tidak ada, jadi lencana demo ikut di sini; di `lg` rail yang memegangnya. -->
      <DemoBadge class="rounded-none border-x-0 lg:hidden" />
      <slot />
    </main>

    <main v-else class="min-w-0 flex-1 pb-24 lg:pb-12">
      <DemoBadge class="rounded-none border-x-0 lg:hidden" />
      <div
        :class="cn(
          'mx-auto grid w-full content-start gap-8 px-5 py-8 lg:px-10 lg:py-12',
          width === 'wide' ? 'max-w-[96rem]' : 'max-w-5xl',
        )"
      >
        <header v-if="heading" class="grid gap-2.5">
          <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
          <h1 class="m-0 font-display text-h1 font-semibold text-ink">{{ heading }}</h1>
          <slot name="subheading" />
        </header>

        <slot />
      </div>
    </main>
  </div>
</template>
