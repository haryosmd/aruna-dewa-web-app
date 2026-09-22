<script setup lang="ts">
import type { Invitation } from '~/types/aruna'
import { ArrowRight, Plus } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: false })

const invitationsApi = useInvitations()
const { pending: loading, error, run } = useLoader(true)
const invitations = ref<Invitation[]>([])

async function load() {
  invitations.value = (await run(() => invitationsApi.list())) ?? []
}
await load()

useHead({ title: 'Undangan kalian — Aruna Dewa' })
</script>

<template>
  <div class="min-h-svh bg-surface">
    <header class="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-xl">
      <div class="shell flex h-[4.5rem] items-center justify-between gap-4">
        <NuxtLink id="dash-home" to="/" class="no-underline" aria-label="Aruna Dewa, ke beranda">
          <BrandLogo />
        </NuxtLink>
        <div class="flex items-center gap-2">
          <UiButton id="dash-new-invitation" as="NuxtLink" to="/order" size="sm">
            <Plus :size="16" aria-hidden="true" />
            Buat undangan
          </UiButton>
          <AccountMenu />
        </div>
      </div>
    </header>

    <main class="shell grid content-start gap-8 py-10 lg:py-14">
      <header class="grid gap-2.5">
        <p class="eyebrow">Ruang persiapan</p>
        <h1 class="m-0 font-display text-h1 font-semibold text-ink">Undangan kalian</h1>
        <p class="copy m-0">Pilih undangan untuk melanjutkan rancangan, daftar tamu, dan publikasi.</p>
        <DemoBadge note="Buat undangan baru langsung aktif tanpa pembayaran." />
      </header>

      <div v-if="loading" class="grid gap-3 sm:grid-cols-2">
        <UiSkeleton v-for="index in 2" :key="index" class="h-44" />
      </div>

      <p v-else-if="error" class="notice m-0" role="alert">
        {{ error }}
        <button id="dash-retry" class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
      </p>

      <div v-else-if="!invitations.length" class="card grid justify-items-start gap-4 p-8">
        <OrnamentSprig class="h-24 w-16 text-sage/60" />
        <h2 class="m-0 font-display text-h2 font-semibold text-ink">Belum ada undangan</h2>
        <p class="copy m-0">Mulai dari nama pasangan dan rencana acara. Sisanya bisa menyusul.</p>
        <UiButton id="dash-first-invitation" as="NuxtLink" to="/order" size="lg">
          Buat undangan pertama
          <ArrowRight :size="17" aria-hidden="true" />
        </UiButton>
      </div>

      <ul v-else class="m-0 grid gap-4 p-0 list-none sm:grid-cols-2">
        <li v-for="invitation in invitations" :key="invitation.id">
          <NuxtLink
            :id="`dash-invitation-${invitation.id}`"
            :to="`/dashboard/${invitation.id}`"
            class="card grid h-full content-between gap-6 p-6 no-underline transition-[transform,box-shadow,border-color] duration-300 ease-out-quart hover:-translate-y-1 hover:border-border-strong hover:shadow-lift"
          >
            <div class="flex items-start justify-between gap-3">
              <UiBadge :tone="invitation.status === 'PUBLISHED' ? 'sage' : 'gold'">{{ invitation.status === 'PUBLISHED' ? 'Tayang' : 'Draf' }}</UiBadge>
              <ArrowRight :size="18" class="text-ink-subtle" aria-hidden="true" />
            </div>

            <div class="grid gap-1.5">
              <h2 class="m-0 font-display text-h2 font-semibold text-ink">{{ invitation.title }}</h2>
              <p class="m-0 text-ui-lg text-ink-muted">/i/{{ invitation.slug }}</p>
              <p class="m-0 text-caption text-ink-subtle">
                {{ invitation.publishedAt ? 'Sudah dipublikasikan' : 'Belum dipublikasikan' }}
              </p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </main>
  </div>
</template>
