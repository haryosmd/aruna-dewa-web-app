<script setup lang="ts">
/**
 * Tujuan tautan di email verifikasi. Sampai halaman ini ada, `/verify-email?token=…`
 * yang dikirim `AuthService.issueEmailVerification` mendarat di 404 dan tidak ada satu pun
 * akun yang pernah bisa terverifikasi.
 */
import { ArrowRight, MailCheck, MailOpen } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const { request } = useApi()
const auth = useAuthStore()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const state = ref<'pending' | 'verified' | 'failed'>(token.value ? 'pending' : 'failed')
const error = ref(token.value ? '' : 'Tautan verifikasi tidak lengkap. Buka kembali tautan dari email yang kami kirim.')

onMounted(async () => {
  if (!token.value) return
  try {
    await request('/auth/verify-email', { method: 'POST', body: { token: token.value } })
    state.value = 'verified'
    // Nama di header ikut menyegar kalau pemilik tautan memang sedang masuk.
    if (auth.me) await auth.load()
  } catch (cause) {
    state.value = 'failed'
    error.value = (cause as { message: string }).message
  }
})

useHead({ title: 'Verifikasi email — Aruna Dewa' })
</script>

<template>
  <div class="grid w-full max-w-[26rem] gap-7">
    <header class="grid gap-3">
      <span
        :class="cn(
          'grid h-12 w-12 place-items-center rounded-full',
          state === 'verified' ? 'bg-success/12 text-success' : 'bg-surface-3 text-ink-muted',
        )"
      >
        <component :is="state === 'verified' ? MailCheck : MailOpen" :size="22" aria-hidden="true" />
      </span>
      <p class="eyebrow">Verifikasi email</p>
      <h1 class="m-0 font-display text-h1 font-semibold text-ink">
        {{ state === 'verified' ? 'Email kamu terverifikasi' : state === 'pending' ? 'Sedang memeriksa tautan…' : 'Tautan ini tidak bisa dipakai' }}
      </h1>
      <p class="m-0 text-ink-muted" aria-live="polite">
        <template v-if="state === 'verified'">Pemberitahuan RSVP dan tagihan sekarang bisa kami kirim ke alamat ini.</template>
        <template v-else-if="state === 'pending'">Sebentar, kami sedang mencocokkan tautannya.</template>
        <template v-else>{{ error }}</template>
      </p>
    </header>

    <div class="grid gap-3">
      <UiButton v-if="state === 'verified'" as="NuxtLink" to="/dashboard" size="lg" block>
        Ke ruang persiapan
        <ArrowRight :size="17" aria-hidden="true" />
      </UiButton>
      <template v-else-if="state === 'failed'">
        <p class="notice m-0">
          Tautan verifikasi berlaku 24 jam dan hanya sekali pakai. Kalau sudah lewat, daftar ulang dengan email yang sama
          selama akunnya belum pernah terverifikasi — kami kirim tautan baru.
        </p>
        <UiButton as="NuxtLink" to="/login" tone="outline" size="lg" block>Masuk</UiButton>
      </template>
    </div>
  </div>
</template>
