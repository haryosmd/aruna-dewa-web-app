<script setup lang="ts">
import { createDefaultDocument, migrateLegacyDocument, type InvitationDocument } from '@aruna/contracts'
import { ArrowLeft } from 'lucide-vue-next'

/*
 * Pratinjau draf (fase 78).
 *
 * Sebelum ini tidak ada satu pun cara melihat undangan sendiri selain panggung editor:
 * `/i/:slug` dijaga server — `status: 'PUBLISHED'` DAN `activeRevision` wajib ada
 * (`public.service.ts`) — jadi draf yang dibuka di sana mendarat di layar galat. Halaman ini
 * mengisi lubang itu **tanpa menambah satu pun permukaan publik**: ia memakai
 * `GET /invitations/:id`, yang sudah dijaga sesi dan keanggotaan, lalu merender dengan
 * komponen yang sama persis yang dilihat tamu.
 *
 * Yang sengaja tidak dibawa: ucapan dan RSVP. Keduanya menulis baris sungguhan, dan pratinjau
 * yang diam-diam mengisi dinding ucapan undangan yang belum terbit adalah harga yang tidak
 * pernah diminta siapa pun.
 */
definePageMeta({ middleware: 'auth', layout: false })

const route = useRoute()
const toast = useToast()
const invitationsApi = useInvitations()

const invitation = ref<Awaited<ReturnType<typeof invitationsApi.get>> | null>(null)
const pageError = ref('')

async function load() {
  pageError.value = ''
  try {
    invitation.value = await invitationsApi.get(String(route.params.id))
  } catch (cause) {
    pageError.value = apiErrorMessage(cause)
  }
}
await load()

/** Dokumen v1 ikut dimigrasi di sini, seperti di editor — pratinjau tidak boleh berbeda dari panggungnya. */
const document = computed<InvitationDocument>(() =>
  migrateLegacyDocument((invitation.value?.document as InvitationDocument | undefined) ?? createDefaultDocument()))

const sudahTerbit = computed(() => invitation.value?.status === 'PUBLISHED')

function bukanUntukDikirim() {
  toast.message('Ini pratinjau — ucapan dan kehadiran tidak dikirim.')
}

useHead({
  title: () => (invitation.value ? `Pratinjau · ${invitation.value.title} — Aruna Dewa` : 'Pratinjau — Aruna Dewa'),
  // Halaman ini memuat nama pasangan, tanggal, dan alamat gedung; ia tidak pernah boleh terindeks.
  meta: [{ name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }],
})
</script>

<template>
  <main class="min-h-svh bg-surface">
    <!--
      Bilah tipis, bukan header penuh — bentuknya meniru bilah demo di `pages/i/[slug].vue`:
      kesan "beginilah nanti tamu melihatnya" harus tetap utuh.
    -->
    <div class="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 bg-ink px-4 py-2.5 text-center text-caption text-ink-inverse">
      <NuxtLink
        id="preview-back"
        :to="`/dashboard/${route.params.id}/editor`"
        class="inline-flex items-center gap-1.5 font-semibold text-gold no-underline underline-offset-4 hover:underline"
      >
        <ArrowLeft :size="14" aria-hidden="true" />
        Kembali ke editor
      </NuxtLink>
      <p class="m-0">
        {{ sudahTerbit ? 'Pratinjau draf — versi ini belum tentu sama dengan yang dilihat tamu.' : 'Pratinjau draf — undangan ini belum dipublikasikan.' }}
      </p>
    </div>

    <div v-if="pageError" class="mx-auto grid max-w-md gap-4 px-5 py-24 text-center" role="alert">
      <h1 class="m-0 font-display text-h2 text-ink">Pratinjau tidak dapat dibuka</h1>
      <p class="m-0 text-ink-muted">{{ pageError }}</p>
      <UiButton id="preview-retry" class="justify-self-center" @click="load">Coba lagi</UiButton>
    </div>

    <InvitationRenderer
      v-else-if="invitation"
      :document="document"
      :wishes="[]"
      :has-token="false"
      @rsvp="bukanUntukDikirim"
      @wish="bukanUntukDikirim"
      @wish-entry="bukanUntukDikirim"
    />

    <p v-else class="px-5 py-24 text-center text-ink-muted">Memuat pratinjau…</p>
  </main>
</template>
