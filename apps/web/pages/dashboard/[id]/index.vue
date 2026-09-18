<script setup lang="ts">
import type { Invitation } from '~/types/aruna'
import { ExternalLink, PencilLine } from 'lucide-vue-next'

const toast = useToast()

definePageMeta({ middleware: 'auth', layout: false })

const route = useRoute()
const invitationsApi = useInvitations()
const auth = useAuthStore()
const invitation = ref<Invitation | null>(null)
const { error, run } = useLoader()
const actionPending = ref(false)
/** Status di database adalah DRAFT | PUBLISHED | ARCHIVED — tidak pernah 'ACTIVE'. */
const isPublished = computed(() => invitation.value?.status === 'PUBLISHED')

async function load() {
  invitation.value = (await run(() => invitationsApi.get(String(route.params.id)))) ?? invitation.value
}
await load()

async function activate() {
  actionPending.value = true
  try {
    await invitationsApi.activate(String(route.params.id))
    toast.success('Undangan diaktifkan.')
    await load()
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  } finally {
    actionPending.value = false
  }
}

/* Empat halaman dasbor sempat tidak punya `<title>` sama sekali — axe menandainya
   `document-title`, dan tab tamu berisi URL mentah. Reaktif karena undangannya
   dimuat setelah mount. */
useHead({ title: () => invitation.value?.title
  ? `Ringkasan · ${invitation.value.title} — Aruna Dewa`
  : 'Ringkasan — Aruna Dewa' })
</script>

<template>
  <DashboardShell
    v-if="invitation"
    :invitation-id="invitation.id"
    :title="invitation.title"
    eyebrow="Ringkasan"
    :heading="invitation.title"
  >
    <template #subheading>
      <div class="mt-1 flex flex-wrap items-center gap-3">
        <UiBadge :tone="isPublished ? 'sage' : 'gold'" size="md">{{ isPublished ? 'Tayang' : 'Draf' }}</UiBadge>
        <NuxtLink
          id="dash-view-public"
          :to="`/i/${invitation.slug}`"
          target="_blank"
          class="inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-semibold text-primary no-underline underline-offset-4 hover:underline"
        >
          Lihat halaman publik
          <ExternalLink :size="15" aria-hidden="true" />
        </NuxtLink>
      </div>
    </template>

    <!--
      Tiap kartu adalah satu `div` pembungkus pasangan istilah/deskripsi. Pembungkus itu
      hanya boleh memuat `dt` dan `dd` — keterangan di bawah angka karena itu `dd` kedua,
      bukan `p`. Satu istilah memang boleh punya lebih dari satu deskripsi.
    -->
    <dl class="m-0 grid gap-3 sm:grid-cols-3">
      <div class="card grid content-between gap-3 p-5">
        <dt class="text-caption font-semibold uppercase tracking-[0.1em] text-ink-subtle">Draft</dt>
        <dd class="m-0 font-display text-[2rem] leading-none font-semibold text-ink">r{{ invitation.revision ?? 0 }}</dd>
        <dd class="m-0 text-caption text-ink-subtle">Disimpan terpisah dari versi publik.</dd>
      </div>

      <div class="card grid content-between gap-3 p-5">
        <dt class="text-caption font-semibold uppercase tracking-[0.1em] text-ink-subtle">Publikasi</dt>
        <dd class="m-0 font-display text-[2rem] leading-none font-semibold text-ink">
          {{ invitation.publishedAt ? 'Aktif' : 'Belum' }}
        </dd>
        <dd class="m-0 text-caption text-ink-subtle">
          {{ invitation.publishedAt ? formatLongDate(invitation.publishedAt) : 'Publikasikan saat sudah siap.' }}
        </dd>
      </div>

      <div class="card grid content-between gap-3 p-5">
        <dt class="text-caption font-semibold uppercase tracking-[0.1em] text-ink-subtle">Alamat</dt>
        <dd class="m-0 break-all font-display text-[1.5rem] leading-tight font-semibold text-ink">/i/{{ invitation.slug }}</dd>
        <dd class="m-0 text-caption text-ink-subtle">Tautan personal tamu ada di halaman Kelola tamu.</dd>
      </div>
    </dl>

    <div v-if="!isPublished" class="notice grid gap-3">
      <p class="m-0"><strong class="text-ink">Undangan belum tayang.</strong> Selesaikan pembayaran, lalu terbitkan saat kalian siap.</p>
      <UiButton v-if="auth.isOperator" id="dash-operator-activate" class="justify-self-start" :loading="actionPending" @click="activate">
        {{ actionPending ? 'Mengaktifkan…' : 'Aktifkan sebagai operator' }}
      </UiButton>
      <p v-else class="m-0 text-caption">Aktivasi operator hanya tersedia untuk role yang diizinkan.</p>
    </div>

    <UiButton id="dash-open-editor" as="NuxtLink" :to="`/dashboard/${invitation.id}/editor`" size="lg" class="justify-self-start">
      <PencilLine :size="17" aria-hidden="true" />
      Edit undangan
    </UiButton>
  </DashboardShell>

  <div v-else class="shell section grid gap-4">
    <p v-if="error" class="notice m-0" role="alert">
      {{ error }}
      <button id="dash-retry" class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
    </p>
    <p v-else class="m-0 text-ink-muted">Memuat undangan…</p>
  </div>
</template>
