<script setup lang="ts">
import { isLiveTemplateId, normalizeDisplayName, type LiveTemplateId } from '@aruna/contracts'
import type { InvitationDocument } from '@aruna/contracts'
import type { GuestProfile, PublicInvitation, Wish } from '@aruna/contracts/api'
import type { WishPayload } from '~/types/aruna'
import { fallbackDocument } from '~/composables/useDocument'

const toast = useToast()

definePageMeta({ layout: false })

const route = useRoute()
const config = useRuntimeConfig()
const publicApi = usePublicInvitation()
const slug = String(route.params.slug)
const isDemo = computed(() => slug === 'demo')

const publicData = ref<PublicInvitation | null>(null)
const pageError = ref('')
const guest = ref<GuestProfile | null>(null)
const guestError = ref('')
const wishes = ref<Wish[]>([])
const rsvpPending = ref(false)
const wishPending = ref(false)
const openedRecorded = ref(false)

const guestGreeting = computed(() => {
  const raw = typeof route.query.to === 'string' ? route.query.to : ''
  try { return raw ? normalizeDisplayName(raw) : '' } catch { return '' }
})
const token = computed(() => (typeof route.query.g === 'string' ? route.query.g : ''))

/**
 * `?tema=` only affects the local demo, so the landing carousel can preview each theme.
 *
 * Diukur terhadap tema yang HIDUP, bukan terhadap `templateIds`. Yang kedua ikut memuat id
 * pensiun, dan `demoDocument()` di bawah mencarinya di `invitationThemes` yang hanya berisi
 * tema hidup — `?tema=aruna-sogan` karena itu menjawab 500 selama beberapa menit di fase 48.
 * Non-null assertion di sana yang berbohong; ini sumbernya.
 */
const demoTemplate = computed<LiveTemplateId>(() => {
  const requested = typeof route.query.tema === 'string' ? route.query.tema : ''
  return isLiveTemplateId(requested) ? requested : 'aruna-bloom'
})

/**
 * `?galeri=` (gaya galeri v1) sudah tidak berlaku: dokumen demo v2 (fase 72) memakai galeri
 * grid Elegance, dan `data.motion` pada bagian v2 berarti gerak masuk, bukan tata letak galeri.
 */
function demoDocument(): InvitationDocument {
  const template = invitationThemes.find(item => item.id === demoTemplate.value)!
  return {
    ...fallbackDocument,
    templateId: template.id,
    tokens: { ...template.tokens },
  }
}

async function loadPublic() {
  pageError.value = ''
  if (isDemo.value) {
    publicData.value = { document: demoDocument(), title: 'Contoh undangan Aruna Dewa', slug: 'demo', publishedAt: '' }
    return
  }
  try {
    publicData.value = await publicApi.invitation(slug)
  } catch (cause) {
    pageError.value = apiErrorMessage(cause)
  }
}

async function loadGuest() {
  if (!token.value || isDemo.value) return
  guestError.value = ''
  try {
    // Dulu `$fetch` mentah di sini: ia melewati `apiBaseForPage()` (ejaan host loopback),
    // melewati penerusan cookie saat render server, dan melewati jalur 401 → refresh → ulang.
    const found = await publicApi.guest(slug, token.value)
    // Token yang tidak dikenal dijawab `{ personal: false }`, bukan galat. Menyempitkan dulu
    // di sini menghentikan `quota` yang undefined merembes ke `Math.min()` di panel RSVP.
    if (found.personal) guest.value = found
    else { guest.value = null; guestError.value = 'RSVP personal tidak tersedia untuk tautan ini.' }
  } catch {
    guestError.value = 'RSVP personal tidak tersedia untuk tautan ini.'
  }
}

async function loadWishes() {
  // Demo tidak punya baris di database; menembaknya hanya menghasilkan 404 di console
  // tamu. Daftar yang kosong sudah membuat bagian Ucapan memakai contoh bawaannya.
  if (isDemo.value) return
  try { wishes.value = await publicApi.wishes(slug) } catch { wishes.value = [] }
}

await loadPublic()
await loadGuest()
await loadWishes()

watch(token, loadGuest)
watch(demoTemplate, () => {
  if (isDemo.value) publicData.value = { document: demoDocument(), title: 'Contoh undangan Aruna Dewa', slug: 'demo', publishedAt: '' }
})

async function sendRsvp(payload: { attendance: 'yes' | 'no'; count: number; message: string }) {
  if (!token.value) return
  rsvpPending.value = true
  try {
    await publicApi.rsvp(slug, {
      token: token.value,
      attendance: payload.attendance,
      count: payload.attendance === 'yes' ? payload.count : undefined,
      message: payload.message || undefined,
    })
    toast.success('Konfirmasi kehadiran tersimpan.')
    await loadGuest()
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  } finally {
    rsvpPending.value = false
  }
}

/**
 * Ucapan punya endpointnya sendiri. Sebelumnya fungsi ini menembak `/rsvp`, yang berarti
 * setiap ucapan menimpa konfirmasi kehadiran tamu dengan tebakan — dan tidak pernah
 * membuat baris ucapan sama sekali.
 */
async function sendWish(message: string) {
  if (!token.value) return
  wishPending.value = true
  try {
    const created = await publicApi.createWish(slug, { token: token.value, message })
    toast.success('Ucapan dikirim untuk ditinjau pasangan.')
    // Muat ulang yang sudah disetujui, lalu sisipkan milik penulisnya di paling atas.
    await loadWishes()
    if (created?.id && !wishes.value.some(wish => wish.id === created.id)) wishes.value = [created, ...wishes.value]
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  } finally {
    wishPending.value = false
  }
}

/**
 * Form ucapan v2 (fase 72): nama + kehadiran + pesan, terbuka juga tanpa token — API yang
 * memutuskan apakah tamunya dikenal. Di demo tidak ada baris di database, jadi kirimannya
 * disisipkan ke dinding lokal supaya alurnya tetap bisa dicoba dari landing.
 */
async function sendWishEntry(payload: WishPayload) {
  if (!payload.attendance) return
  if (isDemo.value) {
    wishes.value = [{ id: `demo-${Date.now()}`, authorName: payload.name, message: payload.message, attendance: payload.attendance, approved: true }, ...wishes.value]
    return
  }
  wishPending.value = true
  try {
    const created = await publicApi.createWish(slug, { token: token.value || undefined, name: payload.name, attendance: payload.attendance, message: payload.message })
    toast.success('Ucapan dikirim untuk ditinjau pasangan.')
    await loadWishes()
    if (created?.id && !wishes.value.some(wish => wish.id === created.id)) wishes.value = [created, ...wishes.value]
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  } finally {
    wishPending.value = false
  }
}

async function recordOpened() {
  if (!token.value || isDemo.value || openedRecorded.value) return
  openedRecorded.value = true
  try {
    await publicApi.markOpened(slug, token.value)
  } catch {
    openedRecorded.value = false
  }
}

/**
 * Undangan sungguhan tidak pernah boleh terindeks: halamannya memuat nama pasangan, tanggal,
 * dan alamat gedung, dan tautan tamu membawa nama tamu di `?to=`. Undangan dibagikan ke daftar
 * tamu lewat WhatsApp, bukan dicari di Google.
 *
 * `/i/demo` adalah kekecualiannya — itu materi pemasaran, bukan hari pernikahan siapa pun.
 * `robots.txt` sengaja tidak mem-`Disallow` `/i/*`: yang di-`Disallow` tidak pernah dibaca
 * isinya, jadi `noindex` di bawah ini justru tidak akan pernah sampai ke perayapnya.
 */
/**
 * Kartu bagikan (fase 72.7): PNG 1200×630 yang dirender API dari revisi terbit. `v` = waktu terbit,
 * supaya WhatsApp/FB yang menyimpan pratinjau lama mengambil ulang begitu pasangan menerbitkan
 * ulang; `to` diteruskan supaya kartu menyapa tamu yang tautannya dibagikan. Demo tidak punya
 * revisi terbit, jadi tidak diberi kartu.
 */
const shareCardUrl = computed(() => {
  if (isDemo.value) return ''
  const params = new URLSearchParams()
  const publishedAt = publicData.value?.publishedAt ? Date.parse(publicData.value.publishedAt) : 0
  if (publishedAt) params.set('v', String(publishedAt))
  if (guestGreeting.value) params.set('to', guestGreeting.value)
  const query = params.toString()
  return `${config.public.apiBase}/public/share-card/${encodeURIComponent(slug)}.png${query ? `?${query}` : ''}`
})

useHead({
  title: () => publicData.value?.title ?? 'Undangan pernikahan',
  link: [{ rel: 'canonical', href: `${config.public.webBase}/i/${slug}` }],
  meta: () => [
    { name: 'referrer', content: 'no-referrer' },
    { name: 'robots', content: isDemo.value ? 'index, follow' : 'noindex, nofollow' },
    ...(shareCardUrl.value
      ? [
          { property: 'og:title', content: publicData.value?.title ?? 'Undangan pernikahan' },
          { property: 'og:type', content: 'website' },
          { property: 'og:image', content: shareCardUrl.value },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:image', content: shareCardUrl.value },
        ]
      : []),
  ],
})
</script>

<template>
  <main class="min-h-svh bg-surface">
    <!-- Bilah tipis, bukan header penuh: kesan "ini undangan sungguhan" harus tetap utuh. -->
    <div
      v-if="isDemo"
      class="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 bg-ink px-4 py-2.5 text-center text-caption text-ink-inverse"
    >
      <p class="m-0">Ini contoh undangan. Silakan coba semuanya — tidak ada yang tersimpan.</p>
      <NuxtLink id="iv-footer-order" to="/order" class="font-semibold text-gold underline-offset-4 hover:underline">
        Buat undangan seperti ini
      </NuxtLink>
    </div>

    <div v-if="pageError" class="mx-auto grid max-w-md gap-4 px-5 py-24 text-center" role="alert">
      <h1 class="m-0 font-display text-h2 text-ink">Undangan belum dapat dibuka</h1>
      <p class="m-0 text-ink-muted">{{ pageError }}</p>
      <UiButton id="iv-retry" class="justify-self-center" @click="loadPublic">Coba lagi</UiButton>
    </div>

    <InvitationRenderer
      v-else-if="publicData"
      :document="publicData.document"
      :greeting="guest?.displayName || guestGreeting"
      :guest="guest"
      :guest-error="guestError"
      :has-token="Boolean(token)"
      :wishes="wishes"
      :rsvp-pending="rsvpPending"
      :wish-pending="wishPending"
      @cover-open="recordOpened"
      @rsvp="sendRsvp"
      @wish="sendWish"
      @wish-entry="sendWishEntry"
    />

    <p v-else class="px-5 py-24 text-center text-ink-muted">Memuat undangan…</p>
  </main>
</template>
