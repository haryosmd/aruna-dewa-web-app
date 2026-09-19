<script setup lang="ts">
import { LayoutDashboard, LogOut, MessageSquareText, PanelLeftClose, PanelLeftOpen, PencilLine, ReceiptText, UserRound, Users } from 'lucide-vue-next'

const props = defineProps<{ invitationId: string; title: string }>()
const auth = useAuthStore()

const links = computed(() => [
  { key: 'summary', label: 'Ringkasan', short: 'Ringkasan', to: `/dashboard/${props.invitationId}`, icon: LayoutDashboard },
  { key: 'editor', label: 'Edit undangan', short: 'Edit', to: `/dashboard/${props.invitationId}/editor`, icon: PencilLine },
  { key: 'guests', label: 'Kelola tamu', short: 'Tamu', to: `/dashboard/${props.invitationId}/guests`, icon: Users },
  { key: 'rsvps', label: 'RSVP & ucapan', short: 'RSVP', to: `/dashboard/${props.invitationId}/rsvps`, icon: MessageSquareText },
  { key: 'orders', label: 'Pesanan', short: 'Pesanan', to: `/dashboard/${props.invitationId}/orders`, icon: ReceiptText },
])

/**
 * Rail ciut (fase 67). Preferensinya milik semua halaman dasbor, bukan editor — dan editor tidak
 * memaksanya: pemilik memilih "ikut preferensi tersimpan" supaya pindah halaman tidak melompat.
 *
 * Transisi lebar baru dipasang sesudah mount. `initOnMounted` menukar bawaan (lebar) dengan yang
 * tersimpan pada frame pertama sesudah hidrasi; kalau transisinya sudah aktif saat itu, setiap
 * muat halaman diawali animasi ciut 320ms yang bukan tanggapan atas apa pun.
 */
const prefs = useDashboardPrefs()
const ready = useInteractiveReady()
const collapsed = computed(() => prefs.value.sidebarCollapsed)
function toggle() { prefs.value = { ...prefs.value, sidebarCollapsed: !prefs.value.sidebarCollapsed } }

const railLink = 'flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-md px-3 text-[0.9375rem] font-medium text-ink-muted no-underline transition-colors duration-200 hover:bg-surface-3 hover:text-ink [&.router-link-exact-active]:bg-primary-soft [&.router-link-exact-active]:font-semibold [&.router-link-exact-active]:text-primary-strong'
const railLinkCollapsed = 'h-11 w-11 justify-center gap-0 px-0'
const railIconButton = 'grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors duration-200 hover:bg-surface-3 hover:text-ink'
</script>

<template>
  <!-- Desktop rail -->
  <aside
    id="dash-nav-rail"
    :class="cn(
      'sticky top-0 hidden h-svh shrink-0 flex-col gap-6 overflow-x-hidden border-r border-border bg-surface-2 lg:flex',
      collapsed ? 'w-14 px-1.5 py-5' : 'w-64 p-5',
      ready && 'transition-[width,padding] duration-[var(--duration-slow)] ease-[var(--ease-out-quart)]',
    )"
  >
    <!--
      Toggle di baris brand, bukan di bawah: rail struktur editor menaruh toggle-nya di sudut
      kiri-atas panelnya, dan di editor kedua rail berdiri berdampingan — dua toggle pada
      ketinggian yang sama terbaca sebagai satu sistem.
    -->
    <div :class="cn('flex items-center justify-between gap-2', collapsed && 'grid justify-items-center gap-1')">
      <NuxtLink
        id="dash-nav-home"
        to="/dashboard"
        :class="cn('no-underline', collapsed && 'grid h-11 w-11 place-items-center rounded-md')"
        aria-label="Aruna Dewa, ke daftar undangan"
      >
        <BrandLogo :compact="collapsed" />
      </NuxtLink>

      <UiTooltip :content="collapsed ? 'Lebarkan navigasi' : 'Ciutkan navigasi'" side="right" :side-offset="10">
        <button
          id="dash-nav-toggle"
          type="button"
          :class="railIconButton"
          :aria-label="collapsed ? 'Lebarkan navigasi' : 'Ciutkan navigasi'"
          :aria-expanded="!collapsed"
          aria-controls="dash-nav-rail"
          @click="toggle"
        >
          <PanelLeftOpen v-if="collapsed" :size="18" aria-hidden="true" />
          <PanelLeftClose v-else :size="18" aria-hidden="true" />
        </button>
      </UiTooltip>
    </div>

    <p v-if="!collapsed" class="m-0 truncate text-caption font-semibold uppercase tracking-[0.12em] text-ink-subtle" :title="title">
      {{ title }}
    </p>

    <DemoBadge :compact="collapsed" />

    <nav aria-label="Navigasi undangan" :class="cn('grid gap-1', collapsed && 'justify-items-center')">
      <UiTooltip v-for="link in links" :key="link.to" :content="link.label" side="right" :side-offset="10" :disabled="!collapsed">
        <NuxtLink
          :id="`dash-nav-${link.key}`"
          :to="link.to"
          :class="cn(railLink, collapsed && railLinkCollapsed)"
          :aria-label="collapsed ? link.label : undefined"
        >
          <component :is="link.icon" :size="18" aria-hidden="true" />
          <span :class="cn(collapsed && 'hidden')">{{ link.label }}</span>
        </NuxtLink>
      </UiTooltip>
    </nav>

    <div :class="cn('mt-auto grid gap-1', collapsed && 'justify-items-center')">
      <UiTooltip content="Profil & akun" side="right" :side-offset="10" :disabled="!collapsed">
        <NuxtLink
          id="dash-nav-account"
          to="/account"
          :class="cn(railLink, collapsed && railLinkCollapsed)"
          :aria-label="collapsed ? 'Profil & akun' : undefined"
        >
          <UserRound :size="17" aria-hidden="true" />
          <span :class="cn(collapsed && 'hidden')">Profil &amp; akun</span>
        </NuxtLink>
      </UiTooltip>

      <UiTooltip content="Keluar" side="right" :side-offset="10" :disabled="!collapsed">
        <button
          id="dash-nav-logout"
          type="button"
          :class="cn(railLink, collapsed && railLinkCollapsed)"
          :aria-label="collapsed ? 'Keluar' : undefined"
          @click="auth.logout"
        >
          <LogOut :size="17" aria-hidden="true" />
          <span :class="cn(collapsed && 'hidden')">Keluar</span>
        </button>
      </UiTooltip>
    </div>
  </aside>

  <!-- Mobile: a header for identity, plus a bottom bar that can actually navigate. -->
  <header class="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface/92 px-4 backdrop-blur-xl lg:hidden">
    <NuxtLink id="dash-tab-home" to="/dashboard" class="no-underline" aria-label="Aruna Dewa, ke daftar undangan">
      <BrandLogo compact />
    </NuxtLink>
    <p class="m-0 min-w-0 flex-1 truncate text-[0.9375rem] font-semibold text-ink">{{ title }}</p>
    <AccountMenu />
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
