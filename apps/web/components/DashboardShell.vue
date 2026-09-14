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
}>(), { eyebrow: undefined, heading: undefined, width: 'reading' })
</script>

<template>
  <div class="flex min-h-svh flex-col bg-surface lg:flex-row">
    <DashboardNav :invitation-id="invitationId" :title="title" />

    <main class="min-w-0 flex-1 pb-24 lg:pb-12">
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
