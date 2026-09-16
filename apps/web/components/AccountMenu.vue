<script setup lang="ts">
/**
 * Satu menu akun untuk tiga header: landing, daftar undangan, dan header ponsel dasbor.
 *
 * Sebelum ini logout memang sudah ada dan memang sudah bekerja — tapi tombolnya cuma hidup di
 * rail `DashboardNav`, yang baru muncul setelah sebuah undangan dibuka, dan di footer. Layar
 * pertama setelah masuk tidak punya satu pun jalan keluar, dan fitur yang tidak bisa dijangkau
 * tidak bisa dibedakan dari fitur yang belum dibuat.
 */
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuSeparator, DropdownMenuTrigger } from 'reka-ui'
import { BadgeCheck, LayoutDashboard, LogOut, ShieldAlert, UserRound } from 'lucide-vue-next'

const auth = useAuthStore()
/** Pemicunya dialog klien; sebelum hidrasi ia tidak boleh menjanjikan apa pun — sama seperti laci di `AppHeader`. */
const ready = useInteractiveReady()
const open = ref(false)

const item = 'flex min-h-11 w-full cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 text-[0.9375rem] font-medium text-ink-muted no-underline outline-none transition-colors duration-150 data-[highlighted]:bg-surface-3 data-[highlighted]:text-ink'
</script>

<template>
  <DropdownMenuRoot v-if="auth.me" v-model:open="open">
    <!--
      `as-child` bukan gaya penulisan: `DropdownMenuTrigger` menerbitkan id-nya sendiri dan
      menimpa id yang dipasang di sini, jadi pemicunya berakhir bernama `reka-dropdown-menu-
      trigger-v-0-0` — id yang berubah mengikuti urutan render dan tidak bisa jadi sandaran
      tes mana pun. Dengan `as-child`, tombolnya milik kita dan id-nya bertahan.
    -->
    <DropdownMenuTrigger as-child>
      <button
        id="account-menu-trigger"
        type="button"
        class="grid h-11 w-11 place-items-center rounded-full border border-border-strong bg-surface transition-colors duration-200 hover:border-ink/60 disabled:opacity-60"
        :aria-label="`Menu akun, ${auth.me.user.name}`"
        :disabled="!ready"
      >
        <UiAvatar :id="auth.me.user.id" :size="34" />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        align="end"
        :side-offset="10"
        :collision-padding="12"
        class="z-50 grid min-w-[16rem] max-w-[calc(100vw-1.5rem)] gap-0.5 rounded-lg border border-border bg-surface p-1.5 shadow-[var(--shadow-veil)] data-[state=open]:animate-[account-menu-in_180ms_var(--ease-out-quart)]"
      >
        <DropdownMenuLabel class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-2.5 py-2.5">
          <UiAvatar :id="auth.me.user.id" :size="40" />
          <span class="grid gap-0.5">
            <span class="truncate text-[0.9375rem] font-semibold text-ink">{{ auth.me.user.name }}</span>
            <span class="flex items-center gap-1.5 text-caption text-ink-subtle">
              <span class="truncate">{{ auth.me.user.email }}</span>
              <BadgeCheck v-if="auth.me.user.emailVerified" :size="14" class="shrink-0 text-sage" aria-hidden="true" />
              <ShieldAlert v-else :size="14" class="shrink-0 text-warning" aria-hidden="true" />
              <span class="sr-only">{{ auth.me.user.emailVerified ? 'Email terverifikasi' : 'Email belum terverifikasi' }}</span>
            </span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator class="mx-1 my-1 h-px bg-border" />

        <DropdownMenuItem as-child>
          <NuxtLink id="account-menu-dashboard" to="/dashboard" :class="item" @click="open = false">
            <LayoutDashboard :size="18" aria-hidden="true" />
            Undangan saya
          </NuxtLink>
        </DropdownMenuItem>

        <DropdownMenuItem as-child>
          <NuxtLink id="account-menu-account" to="/account" :class="item" @click="open = false">
            <UserRound :size="18" aria-hidden="true" />
            Profil &amp; akun
          </NuxtLink>
        </DropdownMenuItem>

        <DropdownMenuSeparator class="mx-1 my-1 h-px bg-border" />

        <DropdownMenuItem
          id="account-menu-logout"
          :class="cn(item, 'data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger')"
          @select="auth.logout()"
        >
          <LogOut :size="18" aria-hidden="true" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style>
@keyframes account-menu-in {
  from { opacity: 0; transform: translateY(-4px) }
  to { opacity: 1; transform: translateY(0) }
}
</style>
