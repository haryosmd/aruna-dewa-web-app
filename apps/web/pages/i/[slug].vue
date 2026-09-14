<script setup lang="ts">
import { normalizeDisplayName, templateIds, type TemplateId } from '@aruna/contracts'
import { galleryMotions, type GalleryMotion } from '~/utils/invitation-options'
import { toast } from 'vue-sonner'
import type { InvitationDocument } from '@aruna/contracts'
import type { GuestProfile, PublicInvitation, Wish } from '@aruna/contracts/api'
import { fallbackDocument } from '~/composables/useDocument'

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

/** `?tema=` only affects the local demo, so the landing carousel can preview each theme. */
const demoTemplate = computed<TemplateId>(() => {
  const requested = typeof route.query.tema === 'string' ? route.query.tema : ''
  return (templateIds as readonly string[]).includes(requested) ? (requested as TemplateId) : 'aruna-bloom'
})

/** `?galeri=` juga hanya berlaku di demo, supaya tiap gaya galeri bisa dilihat langsung. */
const demoGallery = computed<GalleryMotion | ''>(() => {
  const requested = typeof route.query.galeri === 'string' ? route.query.galeri : ''
  return (galleryMotions as readonly string[]).includes(requested) ? (requested as GalleryMotion) : ''
})

function demoDocument(): InvitationDocument {
  const template = invitationThemes.find(item => item.id === demoTemplate.value)!
  const document: InvitationDocument = {
    ...fallbackDocument,
    templateId: template.id,
    tokens: { ...template.tokens },
  }
  if (!demoGallery.value) return document

  // Disalin, bukan diubah di tempat: `fallbackDocument` dipakai bersama seluruh halaman.
  document.sections = document.sections.map(section =>
    section.type === 'gallery'
      ? { ...section, data: { ...section.data, motion: demoGallery.value } }
      : section)
  return document
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
watch([demoTemplate, demoGallery], () => {
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

async function recordOpened() {
  if (!token.value || isDemo.value || openedRecorded.value) return
  openedRecorded.value = true
  try {
    await publicApi.markOpened(slug, token.value)
  } catch {
    openedRecorded.value = false
  }
}

useHead({
  title: () => publicData.value?.title ?? 'Undangan pernikahan',
  link: [{ rel: 'canonical', href: `${config.public.webBase}/i/${slug}` }],
  meta: [{ name: 'referrer', content: 'no-referrer' }],
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
      <NuxtLink to="/order" class="font-semibold text-gold underline-offset-4 hover:underline">
        Buat undangan seperti ini
      </NuxtLink>
    </div>

    <div v-if="pageError" class="mx-auto grid max-w-md gap-4 px-5 py-24 text-center" role="alert">
      <h1 class="m-0 font-display text-h2 text-ink">Undangan belum dapat dibuka</h1>
      <p class="m-0 text-ink-muted">{{ pageError }}</p>
      <UiButton class="justify-self-center" @click="loadPublic">Coba lagi</UiButton>
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
    />

    <p v-else class="px-5 py-24 text-center text-ink-muted">Memuat undangan…</p>
  </main>
</template>
