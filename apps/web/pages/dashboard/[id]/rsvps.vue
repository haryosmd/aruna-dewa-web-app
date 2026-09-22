<script setup lang="ts">
import type { Invitation, RsvpEntry, Wish } from '~/types/aruna'
import { ArrowLeft } from 'lucide-vue-next'

/*
 * Halaman Ucapan (fase 72.6). Di Elegance, form ucapan membawa pilihan kehadiran, jadi satu
 * daftar kartu sudah bercerita siapa hadir dan apa doanya. RSVP dari tautan bertoken (model
 * `RSVP` lama) tetap ada di segmen kedua — pasangan yang membagikan tautan personal masih
 * mengandalkannya untuk menghitung kursi.
 */

definePageMeta({ middleware: 'auth', layout: false })

const toast = useToast()
const route = useRoute()
const invitationsApi = useInvitations()
const rsvpApi = useRsvp()
const invitation = ref<Invitation | null>(null)
const rsvps = ref<RsvpEntry[]>([])
const wishes = ref<Wish[]>([])
const segment = ref<'ucapan' | 'rsvp'>('ucapan')
const { pending: loading, error, run } = useLoader(true)

async function load() {
  const id = String(route.params.id)
  const loaded = await run(() => Promise.all([invitationsApi.get(id), rsvpApi.listRsvps(id), rsvpApi.listWishes(id)]))
  if (!loaded) return
  const [data, rsvpData, wishData] = loaded
  invitation.value = data
  rsvps.value = rsvpData
  wishes.value = wishData
}
await load()

async function moderate(wish: Wish, approved: boolean) {
  try {
    await rsvpApi.moderateWish(String(route.params.id), wish.id, approved)
    wish.approved = approved
    toast.success(approved ? 'Ucapan ditampilkan di undangan.' : 'Ucapan disembunyikan.')
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  }
}

const attending = computed(() => rsvps.value.filter(rsvp => rsvp.attendance === 'yes').reduce((sum, rsvp) => sum + (rsvp.count ?? 1), 0))
const declined = computed(() => rsvps.value.filter(rsvp => rsvp.attendance === 'no').length)
const pendingWishes = computed(() => wishes.value.filter(wish => !wish.approved).length)
const wishAttending = computed(() => wishes.value.filter(wish => wish.attendance === 'hadir').length)

/* Empat halaman dasbor sempat tidak punya `<title>` sama sekali — axe menandainya
   `document-title`. Reaktif karena undangannya dimuat setelah mount. */
useHead({ title: () => invitation.value?.title
  ? `Ucapan & kehadiran · ${invitation.value.title} — Aruna Dewa`
  : 'Ucapan & kehadiran — Aruna Dewa' })
</script>

<template>
  <DashboardShell
    v-if="invitation"
    :invitation-id="invitation.id"
    :title="invitation.title"
    eyebrow="Buku tamu"
    heading="Ucapan & Kehadiran"
  >
    <template #subheading>
      <p class="copy m-0">
        <span id="dash-wish-count">{{ wishes.length }} ucapan</span> masuk dari undangan. Ucapan hanya tampil di undangan setelah kalian setujui.
      </p>
      <NuxtLink id="ucapan-back-editor" :to="`/dashboard/${invitation.id}/editor`" class="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline">
        <ArrowLeft :size="16" aria-hidden="true" />
        Kembali ke editor
      </NuxtLink>
    </template>

    <dl class="m-0 grid gap-3 sm:grid-cols-3">
      <div v-for="stat in [['Hadir (ucapan + RSVP)', wishAttending + attending, 'text-sage'], ['Berhalangan', declined, 'text-ink'], ['Ucapan menunggu', pendingWishes, 'text-gold']]" :key="String(stat[0])" class="card grid gap-2 p-5">
        <dt class="text-caption font-semibold uppercase tracking-[0.1em] text-ink-subtle">{{ stat[0] }}</dt>
        <dd :class="cn('m-0 font-display text-[2.5rem] leading-none font-semibold', stat[2] as string)">{{ stat[1] }}</dd>
      </div>
    </dl>

    <div class="inline-flex self-start rounded-full border border-border-strong bg-surface p-1" role="group" aria-label="Pilih daftar">
      <button
        v-for="[value, label] in ([['ucapan', `Ucapan (${wishes.length})`], ['rsvp', `RSVP tautan personal (${rsvps.length})`]] as const)"
        :id="`dash-segment-${value}`"
        :key="value"
        type="button"
        :class="cn('min-h-10 rounded-full px-4 text-[0.875rem] font-semibold transition-colors', segment === value ? 'bg-success-soft text-success' : 'text-ink-muted hover:bg-surface-2 hover:text-ink')"
        :aria-pressed="segment === value"
        @click="segment = value"
      >
        {{ label }}
      </button>
    </div>

    <p v-if="loading" class="notice m-0">Memuat ucapan…</p>

    <p v-else-if="error" class="notice m-0" role="alert">
      {{ error }}
      <button id="dash-rsvps-retry" class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
    </p>

    <section v-else-if="segment === 'ucapan'" class="grid gap-4" aria-labelledby="dash-wishes-title">
      <h2 id="dash-wishes-title" class="m-0 font-display text-h2 font-semibold text-ink">Ucapan &amp; doa</h2>

      <p v-if="!wishes.length" id="dash-wishes-empty" class="notice m-0">Belum ada ucapan pada undangan ini.</p>

      <ul v-else class="m-0 grid gap-2 p-0 list-none">
        <DashboardUcapanWishCard v-for="wish in wishes" :key="wish.id" :wish="wish" @moderate="moderate" />
      </ul>
    </section>

    <section v-else class="grid gap-4" aria-labelledby="dash-rsvps-title">
      <h2 id="dash-rsvps-title" class="m-0 font-display text-h2 font-semibold text-ink">Konfirmasi dari tautan personal</h2>

      <p v-if="!rsvps.length" class="notice m-0">Belum ada konfirmasi kehadiran dari tautan personal.</p>

      <ul v-else class="m-0 grid gap-2 p-0 list-none">
        <li v-for="rsvp in rsvps" :key="rsvp.id" class="card flex flex-wrap items-start justify-between gap-4 p-4">
          <div class="grid min-w-0 gap-1">
            <span class="font-semibold text-ink">{{ rsvp.guest?.displayName || 'Tamu undangan' }}</span>
            <span class="text-[0.9375rem] text-ink-muted">{{ rsvp.message || 'Tanpa pesan' }}</span>
          </div>
          <UiBadge :tone="rsvp.attendance === 'yes' ? 'sage' : 'neutral'">
            {{ rsvp.attendance === 'yes' ? `${rsvp.count ?? 1} hadir` : 'Berhalangan' }}
          </UiBadge>
        </li>
      </ul>
    </section>
  </DashboardShell>
</template>
