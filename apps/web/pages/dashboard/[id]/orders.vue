<script setup lang="ts">
import type { Order } from '@aruna/contracts/api'
import type { Invitation } from '~/types/aruna'

definePageMeta({ middleware: 'auth', layout: false })

const route = useRoute()
const invitationsApi = useInvitations()
const ordersApi = useOrders()
const invitation = ref<Invitation | null>(null)
const orders = ref<Order[]>([])
const { pending: loading, error, run } = useLoader(true)

async function load() {
  const id = String(route.params.id)
  const loaded = await run(() => Promise.all([invitationsApi.get(id), ordersApi.list(id)]))
  if (!loaded) return
  const [data, orderData] = loaded
  invitation.value = data
  orders.value = orderData
}
await load()

type BadgeTone = 'sage' | 'gold' | 'neutral'
const tones: Record<string, BadgeTone> = { PAID: 'sage', PENDING: 'gold', FAILED: 'neutral', EXPIRED: 'neutral' }
const toneFor = (status: string): BadgeTone => tones[status] ?? 'neutral'

/* Empat halaman dasbor sempat tidak punya `<title>` sama sekali — axe menandainya
   `document-title`, dan tab tamu berisi URL mentah. Reaktif karena undangannya
   dimuat setelah mount. */
useHead({ title: () => invitation.value?.title
  ? `Pesanan · ${invitation.value.title} — Aruna Dewa`
  : 'Pesanan — Aruna Dewa' })
</script>

<template>
  <DashboardShell
    v-if="invitation"
    :invitation-id="invitation.id"
    :title="invitation.title"
    eyebrow="Pesanan"
    heading="Pembayaran dan fitur"
  >
    <template #subheading>
      <p class="copy m-0">
        Status ini berasal dari server. Kembali dari halaman pembayaran tidak dengan sendirinya mengaktifkan undangan.
      </p>
    </template>

    <p v-if="loading" class="notice m-0">Memuat pesanan…</p>

    <p v-else-if="error" class="notice m-0" role="alert">
      {{ error }}
      <button class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
    </p>

    <p v-else-if="!orders.length" class="notice m-0">Belum ada pesanan untuk undangan ini.</p>

    <ul v-else class="m-0 grid gap-3 p-0 list-none">
      <li
        v-for="order in orders"
        :key="order.id"
        class="card flex flex-wrap items-center justify-between gap-4 p-5"
      >
        <div class="grid gap-1">
          <span class="text-[1.0625rem] font-semibold text-ink">{{ order.packageName || 'Paket undangan' }}</span>
          <span class="text-caption text-ink-subtle">{{ order.id }}</span>
        </div>

        <div class="flex items-center gap-4">
          <span class="font-display text-[1.5rem] font-semibold text-ink">{{ formatRupiah(order.total) }}</span>
          <UiBadge :tone="toneFor(order.status)">{{ order.status }}</UiBadge>
        </div>
      </li>
    </ul>
  </DashboardShell>
</template>
