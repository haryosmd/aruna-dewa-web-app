<script setup lang="ts">
import type { Invitation } from '~/types/aruna'
import { Check, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({ middleware: 'auth', layout: false })

type Rsvp = { id: string; guestName?: string; attendance: string; count?: number; message?: string; createdAt?: string }
type Wish = { id: string; name?: string; message: string; approved: boolean; createdAt?: string }

const route = useRoute()
const { request } = useApi()
const invitation = ref<Invitation | null>(null)
const rsvps = ref<Rsvp[]>([])
const wishes = ref<Wish[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [data, rsvpData, wishData] = await Promise.all([
      request<Invitation>(`/invitations/${route.params.id}`),
      request<Rsvp[]>(`/invitations/${route.params.id}/rsvps`),
      request<Wish[]>(`/invitations/${route.params.id}/wishes`),
    ])
    invitation.value = data
    rsvps.value = rsvpData
    wishes.value = wishData
  } catch (cause) {
    error.value = (cause as { message: string }).message
  } finally {
    loading.value = false
  }
}
await load()

async function approve(wish: Wish, approved: boolean) {
  try {
    await request(`/invitations/${route.params.id}/wishes/${wish.id}`, { method: 'PATCH', body: { approved } })
    wish.approved = approved
    toast.success(approved ? 'Ucapan ditampilkan di undangan.' : 'Ucapan disembunyikan.')
  } catch (cause) {
    toast.error((cause as { message: string }).message)
  }
}

const attending = computed(() => rsvps.value.filter(rsvp => rsvp.attendance === 'yes').reduce((sum, rsvp) => sum + (rsvp.count ?? 1), 0))
const declined = computed(() => rsvps.value.filter(rsvp => rsvp.attendance === 'no').length)
const pendingWishes = computed(() => wishes.value.filter(wish => !wish.approved).length)

/* Empat halaman dasbor sempat tidak punya `<title>` sama sekali — axe menandainya
   `document-title`, dan tab tamu berisi URL mentah. Reaktif karena undangannya
   dimuat setelah mount. */
useHead({ title: () => invitation.value?.title
  ? `RSVP & ucapan · ${invitation.value.title} — Aruna Dewa`
  : 'RSVP & ucapan — Aruna Dewa' })
</script>

<template>
  <DashboardShell
    v-if="invitation"
    :invitation-id="invitation.id"
    :title="invitation.title"
    eyebrow="RSVP & ucapan"
    heading="Siapa yang akan hadir?"
  >
    <dl class="m-0 grid gap-3 sm:grid-cols-3">
      <div v-for="stat in [['Hadir', attending, 'text-sage'], ['Berhalangan', declined, 'text-ink'], ['Ucapan menunggu', pendingWishes, 'text-gold']]" :key="String(stat[0])" class="card grid gap-2 p-5">
        <dt class="text-caption font-semibold uppercase tracking-[0.1em] text-ink-subtle">{{ stat[0] }}</dt>
        <dd :class="cn('m-0 font-display text-[2.5rem] leading-none font-semibold', stat[2] as string)">{{ stat[1] }}</dd>
      </div>
    </dl>

    <p v-if="loading" class="notice m-0">Memuat respons…</p>

    <p v-else-if="error" class="notice m-0" role="alert">
      {{ error }}
      <button class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
    </p>

    <template v-else>
      <section class="grid gap-4">
        <h2 class="m-0 font-display text-h2 font-semibold text-ink">Konfirmasi terbaru</h2>

        <p v-if="!rsvps.length" class="notice m-0">Belum ada konfirmasi kehadiran.</p>

        <ul v-else class="m-0 grid gap-2 p-0 list-none">
          <li v-for="rsvp in rsvps" :key="rsvp.id" class="card flex flex-wrap items-start justify-between gap-4 p-4">
            <div class="grid min-w-0 gap-1">
              <span class="font-semibold text-ink">{{ rsvp.guestName || 'Tamu undangan' }}</span>
              <span class="text-[0.9375rem] text-ink-muted">{{ rsvp.message || 'Tanpa pesan' }}</span>
            </div>
            <UiBadge :tone="rsvp.attendance === 'yes' ? 'sage' : 'neutral'">
              {{ rsvp.attendance === 'yes' ? `${rsvp.count ?? 1} hadir` : 'Berhalangan' }}
            </UiBadge>
          </li>
        </ul>
      </section>

      <section class="grid gap-4">
        <h2 class="m-0 font-display text-h2 font-semibold text-ink">Moderasi ucapan</h2>
        <p class="copy m-0 text-[0.9375rem]">Ucapan hanya tampil di undangan setelah kalian setujui.</p>

        <p v-if="!wishes.length" class="notice m-0">Belum ada ucapan untuk ditinjau.</p>

        <ul v-else class="m-0 grid gap-2 p-0 list-none">
          <li v-for="wish in wishes" :key="wish.id" class="card flex flex-wrap items-start justify-between gap-4 p-4">
            <div class="grid min-w-0 flex-1 gap-1">
              <span class="font-semibold text-ink">{{ wish.name || 'Tamu undangan' }}</span>
              <span class="text-[0.9375rem] text-ink-muted">{{ wish.message }}</span>
            </div>

            <div class="flex items-center gap-1.5">
              <UiBadge :tone="wish.approved ? 'sage' : 'gold'">{{ wish.approved ? 'Tampil' : 'Ditinjau' }}</UiBadge>
              <button
                type="button"
                class="grid h-11 w-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-sage-soft hover:text-sage"
                :aria-label="`Tampilkan ucapan dari ${wish.name || 'tamu'}`"
                @click="approve(wish, true)"
              >
                <Check :size="18" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="grid h-11 w-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                :aria-label="`Sembunyikan ucapan dari ${wish.name || 'tamu'}`"
                @click="approve(wish, false)"
              >
                <X :size="18" aria-hidden="true" />
              </button>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </DashboardShell>
</template>
