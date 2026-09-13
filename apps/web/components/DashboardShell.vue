<script setup lang="ts">
/** Frame shared by every per-invitation dashboard screen: rail on desktop, dock on mobile. */
defineProps<{ invitationId: string; title: string; eyebrow?: string; heading?: string }>()
</script>

<template>
  <div class="flex min-h-svh flex-col bg-surface lg:flex-row">
    <DashboardNav :invitation-id="invitationId" :title="title" />

    <main class="min-w-0 flex-1 pb-24 lg:pb-12">
      <div class="mx-auto grid w-full max-w-5xl content-start gap-8 px-5 py-8 lg:px-10 lg:py-12">
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
