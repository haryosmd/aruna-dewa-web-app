<script setup lang="ts">
import type { BackofficeInvitationRow } from '@aruna/contracts/api'
import { Search } from 'lucide-vue-next'

/*
 * Backoffice — daftar seluruh undangan (fase 78).
 *
 * Satu-satunya tempat undangan `ARCHIVED` bisa dilihat: `GET /invitations` mengecualikannya di
 * kedua cabangnya, jadi tanpa halaman ini arsip pasangan tidak punya siapa pun yang bisa
 * memulihkannya sebelum penyapu retensi memusnahkannya tiga puluh hari kemudian.
 *
 * Aksinya memakai endpoint undangan yang sama dengan dasbor pasangan — tidak ada jalur tulis
 * kedua yang bisa melenceng dari yang pertama.
 */
definePageMeta({ middleware: ['auth', 'operator'], layout: false })

const toast = useToast()
const { confirm } = usePopup()
const boApi = useBackoffice()
const invitationsApi = useInvitations()
const { pending: loading, error, run } = useLoader(true)

const q = ref('')
const status = ref<'semua' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('semua')
const page = ref(1)
const result = ref<{ items: BackofficeInvitationRow[]; total: number; page: number; pageSize: number }>({ items: [], total: 0, page: 1, pageSize: 25 })
const sibuk = ref('')

async function load() {
  const halaman = await run(() => boApi.invitations({ q: q.value, status: status.value, page: page.value }))
  if (halaman) result.value = halaman
}
await load()

// Pencarian ber-debounce, pola yang sama dengan halaman Generator — diketik, bukan ditekan.
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; load() }, 300)
})
watch(status, () => { page.value = 1; load() })
watch(page, load)
onBeforeUnmount(() => clearTimeout(timer))

const halamanTerakhir = computed(() => Math.max(1, Math.ceil(result.value.total / result.value.pageSize)))

const statusTone = (nilai: string) => (nilai === 'PUBLISHED' ? 'sage' : nilai === 'ARCHIVED' ? 'neutral' : 'gold')
const statusLabel = (nilai: string) => (nilai === 'PUBLISHED' ? 'Tayang' : nilai === 'ARCHIVED' ? 'Arsip' : 'Draf')

const tanggal = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** Satu pembungkus untuk keempat aksi: sibuk, panggil, muat ulang, atau laporkan galatnya. */
async function aksi(row: BackofficeInvitationRow, jalankan: () => Promise<unknown>, pesan: string) {
  sibuk.value = row.id
  try {
    await jalankan()
    await load()
    toast.success(pesan)
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  } finally {
    sibuk.value = ''
  }
}

async function jadikanDraf(row: BackofficeInvitationRow) {
  const jawaban = await confirm({
    title: `Jadikan "${row.title}" draf?`,
    description: 'Undangan keluar dari daftar publik dan tautannya berhenti bekerja. Seluruh suntingannya tetap ada, dan menerbitkannya lagi cukup satu klik.',
    actions: [{ id: 'draf', label: 'Jadikan draf', tone: 'ink' }, { id: 'batal', label: 'Batal', tone: 'outline' }],
    dismissId: 'batal',
  })
  if (jawaban !== 'draf') return
  await aksi(row, () => invitationsApi.unpublish(row.id), 'Undangan dikeluarkan dari daftar publik.')
}

async function arsipkan(row: BackofficeInvitationRow) {
  const jawaban = await confirm({
    title: `Arsipkan "${row.title}"?`,
    description: 'Undangan hilang dari daftar pemiliknya. Riwayat terbit dan foto yang tidak terpakai dibuang sekarang, dan setelah 30 hari undangannya dihapus permanen.',
    tone: 'danger',
    actions: [{ id: 'arsip', label: 'Arsipkan', tone: 'ink' }, { id: 'batal', label: 'Batal', tone: 'outline' }],
    dismissId: 'batal',
  })
  if (jawaban !== 'arsip') return
  await aksi(row, () => invitationsApi.archive(row.id), 'Undangan diarsipkan.')
}

async function pulihkan(row: BackofficeInvitationRow) {
  await aksi(row, () => invitationsApi.restore(row.id), 'Undangan dikembalikan ke daftar pemiliknya.')
}

async function hapus(row: BackofficeInvitationRow) {
  const jawaban = await confirm({
    title: `Hapus "${row.title}" permanen?`,
    description: 'Undangan, tamu, RSVP, ucapan, pesanan, dan seluruh fotonya dihapus untuk selamanya. Ini tidak bisa dibatalkan, dan pemiliknya tidak akan bisa memulihkannya.',
    tone: 'danger',
    confirmText: { value: row.slug, label: `Ketik "${row.slug}" untuk memastikan` },
    actions: [{ id: 'hapus', label: 'Hapus permanen', tone: 'ink' }, { id: 'batal', label: 'Batal', tone: 'outline' }],
    dismissId: 'batal',
  })
  if (jawaban !== 'hapus') return
  await aksi(row, () => invitationsApi.remove(row.id), 'Undangan dihapus permanen.')
}

useHead({ title: 'Undangan — Backoffice Aruna Dewa', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>

<template>
  <div class="min-h-svh bg-surface">
    <header class="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-xl">
      <div class="shell flex h-[4.5rem] items-center justify-between gap-4">
        <NuxtLink id="bo-home" to="/dashboard" class="no-underline" aria-label="Aruna Dewa, ke dasbor">
          <BrandLogo />
        </NuxtLink>
        <div class="flex items-center gap-3">
          <UiBadge tone="outline" size="md">Backoffice</UiBadge>
          <AccountMenu />
        </div>
      </div>
    </header>

    <main class="shell grid content-start gap-6 py-10">
      <header class="grid gap-2.5">
        <p class="eyebrow">Operator</p>
        <h1 class="m-0 font-display text-h1 font-semibold text-ink">Semua undangan</h1>
        <p class="copy m-0">Termasuk yang diarsipkan — ini satu-satunya tempat arsip bisa dipulihkan sebelum dihapus otomatis.</p>
      </header>

      <div class="flex flex-wrap items-end gap-3">
        <UiField id="bo-search" label="Cari" class="min-w-[16rem] flex-1">
          <template #default="{ id }">
            <div class="relative">
              <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
              <UiInput :id="id" v-model="q" class="pl-9" placeholder="Judul, slug, atau email pemilik" />
            </div>
          </template>
        </UiField>
        <UiField id="bo-status" label="Status" class="min-w-[10rem]">
          <template #default="{ id }">
            <UiSelect :id="id" v-model="status">
              <option value="semua">Semua</option>
              <option value="DRAFT">Draf</option>
              <option value="PUBLISHED">Tayang</option>
              <option value="ARCHIVED">Arsip</option>
            </UiSelect>
          </template>
        </UiField>
      </div>

      <div v-if="loading" class="grid gap-2">
        <UiSkeleton v-for="index in 4" :key="index" class="h-16" />
      </div>

      <p v-else-if="error" class="notice m-0" role="alert">
        {{ error }}
        <button id="bo-retry" class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
      </p>

      <p v-else-if="!result.items.length" class="card m-0 p-8 text-center text-ink-muted">Tidak ada undangan yang cocok.</p>

      <!--
        Tabel di layar lebar, daftar kartu di ponsel. Tabel tujuh kolom yang dipaksa muat di
        375px hanya menghasilkan gulir horizontal seluruh halaman — dan aturan repo melarangnya.
      -->
      <template v-else>
        <div class="card hidden overflow-hidden p-0 lg:block">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="border-b border-border bg-surface-3">
                <th scope="col" class="px-4 py-3 text-ui-label font-semibold uppercase tracking-[0.08em] text-ink-muted">Undangan</th>
                <th scope="col" class="px-4 py-3 text-ui-label font-semibold uppercase tracking-[0.08em] text-ink-muted">Pemilik</th>
                <th scope="col" class="px-4 py-3 text-ui-label font-semibold uppercase tracking-[0.08em] text-ink-muted">Status</th>
                <th scope="col" class="px-4 py-3 text-right text-ui-label font-semibold uppercase tracking-[0.08em] text-ink-muted">Tamu</th>
                <th scope="col" class="px-4 py-3 text-ui-label font-semibold uppercase tracking-[0.08em] text-ink-muted">Diubah</th>
                <th scope="col" class="px-4 py-3 text-right text-ui-label font-semibold uppercase tracking-[0.08em] text-ink-muted">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in result.items" :id="`bo-row-${row.id}`" :key="row.id" class="border-b border-border last:border-0">
                <td class="px-4 py-3">
                  <p class="m-0 font-semibold text-ink">{{ row.title }}</p>
                  <p class="m-0 text-caption text-ink-subtle">/i/{{ row.slug }}</p>
                </td>
                <td class="px-4 py-3 text-ui text-ink-muted">{{ row.ownerEmail }}</td>
                <td class="px-4 py-3"><UiBadge :tone="statusTone(row.status)">{{ statusLabel(row.status) }}</UiBadge></td>
                <td class="px-4 py-3 text-right tabular-nums text-ui text-ink-muted">{{ row.guestCount }}</td>
                <td class="px-4 py-3 text-ui text-ink-muted">{{ tanggal(row.updatedAt) }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <BoAksi :row="row" :sibuk="sibuk === row.id" @draf="jadikanDraf" @arsip="arsipkan" @pulih="pulihkan" @hapus="hapus" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul class="m-0 grid gap-3 p-0 list-none lg:hidden">
          <li v-for="row in result.items" :key="row.id" class="card grid gap-3 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="grid gap-0.5">
                <p class="m-0 font-semibold text-ink">{{ row.title }}</p>
                <p class="m-0 text-caption text-ink-subtle">/i/{{ row.slug }}</p>
              </div>
              <UiBadge :tone="statusTone(row.status)">{{ statusLabel(row.status) }}</UiBadge>
            </div>
            <dl class="m-0 grid grid-cols-2 gap-2 text-caption">
              <div><dt class="m-0 text-ink-subtle">Pemilik</dt><dd class="m-0 text-ink">{{ row.ownerEmail }}</dd></div>
              <div><dt class="m-0 text-ink-subtle">Tamu</dt><dd class="m-0 tabular-nums text-ink">{{ row.guestCount }}</dd></div>
              <div><dt class="m-0 text-ink-subtle">Diubah</dt><dd class="m-0 text-ink">{{ tanggal(row.updatedAt) }}</dd></div>
              <div><dt class="m-0 text-ink-subtle">Terbit</dt><dd class="m-0 text-ink">{{ tanggal(row.publishedAt) }}</dd></div>
            </dl>
            <div class="flex flex-wrap items-center gap-1">
              <BoAksi :row="row" :sibuk="sibuk === row.id" @draf="jadikanDraf" @arsip="arsipkan" @pulih="pulihkan" @hapus="hapus" />
            </div>
          </li>
        </ul>

        <div v-if="halamanTerakhir > 1" class="flex items-center justify-between gap-3">
          <UiButton id="bo-prev" tone="outline" size="sm" :disabled="page <= 1" @click="page -= 1">Sebelumnya</UiButton>
          <p class="m-0 text-caption text-ink-muted">Halaman {{ result.page }} dari {{ halamanTerakhir }} · {{ result.total }} undangan</p>
          <UiButton id="bo-next" tone="outline" size="sm" :disabled="page >= halamanTerakhir" @click="page += 1">Berikutnya</UiButton>
        </div>
      </template>
    </main>
  </div>
</template>
