<script setup lang="ts">
import { LayoutDashboard, LogOut, MessageSquareText, PencilLine, ReceiptText, Users } from 'lucide-vue-next'

const props = defineProps<{ invitationId: string; title: string }>()
const auth = useAuthStore()

const links = computed(() => [
  { key: 'summary', label: 'Ringkasan', short: 'Ringkasan', to: `/dashboard/${props.invitationId}`, icon: LayoutDashboard },
  { key: 'editor', label: 'Edit undangan', short: 'Edit', to: `/dashboard/${props.invitationId}/editor`, icon: PencilLine },
  { key: 'guests', label: 'Kelola tamu', short: 'Tamu', to: `/dashboard/${props.invitationId}/guests`, icon: Users },
  { key: 'rsvps', label: 'RSVP & ucapan', short: 'RSVP', to: `/dashboard/${props.invitationId}/rsvps`, icon: MessageSquareText },
  { key: 'orders', label: 'Pesanan', short: 'Pesanan', to: `/dashboard/${props.invitationId}/orders`, icon: ReceiptText },
])
</script>

<template>
  <!-- Desktop rail -->
  <aside class="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface-2 p-5 lg:flex">
    <NuxtLink id="dash-nav-home" to="/dashboard" class="no-underline" aria-label="Aruna Dewa, ke daftar undangan">
      <BrandLogo />
    </NuxtLink>

    <p class="m-0 truncate text-caption font-semibold uppercase tracking-[0.12em] text-ink-subtle" :title="title">
      {{ title }}
    </p>

    <nav aria-label="Navigasi undangan" class="grid gap-1">
      <NuxtLink
        v-for="link in links"
        :id="`dash-nav-${link.key}`"
        :key="link.to"
        :to="link.to"
        class="flex min-h-11 items-center gap-2.5 rounded-md px-3 text-[0.9375rem] font-medium text-ink-muted no-underline transition-colors duration-200 hover:bg-surface-3 hover:text-ink [&.router-link-exact-active]:bg-primary-soft [&.router-link-exact-active]:font-semibold [&.router-link-exact-active]:text-primary-strong"
      >
        <component :is="link.icon" :size="18" aria-hidden="true" />
        {{ link.label }}
      </NuxtLink>
    </nav>

    <button
      id="dash-nav-logout"
      type="button"
      class="mt-auto flex min-h-11 items-center gap-2.5 rounded-md px-3 text-[0.9375rem] font-medium text-ink-muted transition-colors duration-200 hover:bg-surface-3 hover:text-ink"
      @click="auth.logout"
    >
      <LogOut :size="17" aria-hidden="true" />
      Keluar
    </button>
  </aside>

  <!-- Mobile: a header for identity, plus a bottom bar that can actually navigate. -->
  <header class="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface/92 px-4 backdrop-blur-xl lg:hidden">
    <NuxtLink id="dash-tab-home" to="/dashboard" class="no-underline" aria-label="Aruna Dewa, ke daftar undangan">
      <BrandLogo compact />
    </NuxtLink>
    <p class="m-0 min-w-0 flex-1 truncate text-[0.9375rem] font-semibold text-ink">{{ title }}</p>
    <button
      id="dash-tab-logout"
      type="button"
      class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border-strong text-ink-muted"
      aria-label="Keluar"
      @click="auth.logout"
    >
      <LogOut :size="17" aria-hidden="true" />
    </button>
  </header>

  <nav
    aria-label="Navigasi undangan"
    class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
  >
    <ul class="m-0 grid grid-cols-5 list-none p-0">
      <li v-for="link in links" :key="link.to">
        <NuxtLink
          :id="`dash-tab-${link.key}`"
          :to="link.to"
          class="grid min-h-14 place-items-center gap-0.5 py-1.5 text-ink-subtle no-underline transition-colors duration-200 [&.router-link-exact-active]:text-primary"
        >
          <component :is="link.icon" :size="19" aria-hidden="true" />
          <span class="text-[0.625rem] font-semibold">{{ link.short }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
