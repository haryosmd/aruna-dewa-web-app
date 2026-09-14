<script setup lang="ts">
import { ArrowRight, Eye, EyeOff } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const authApi = useAuthApi()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const revealed = ref(false)
const pending = ref(false)
const error = ref('')
const ready = useInteractiveReady()
const apiOrigin = useRuntimeConfig().public.apiBase.replace(/\/v1$/, '')
const nextPath = computed(() => safeNextPath(route.query.next))
/** Kalau kedatangan ke sini adalah tendangan, katakan sebabnya — bukan biarkan orang menebak. */
const endedNotice = computed(() => sessionEndedMessage(route.query.reason))
/** Tautan daftar meneruskan tujuan, jadi niat pengunjung selamat lewat dua halaman. */
const registerLink = computed(() => (nextPath.value === '/dashboard' ? '/register' : `/register?next=${encodeURIComponent(nextPath.value)}`))
/** Jalur Google membawa tujuan yang sama; API menitipkannya di cookie sampai callback kembali. */
const googleHref = computed(() => `${apiOrigin}/auth/google/start?next=${encodeURIComponent(nextPath.value)}`)

async function submit() {
  error.value = ''
  pending.value = true
  try {
    await authApi.login({ email: email.value, password: password.value })
    // Sesi dipastikan hidup sebelum pindah halaman. Tanpa langkah ini, cookie yang ditolak
    // browser berakhir sebagai pantulan senyap: middleware `/dashboard` mengembalikan orang
    // ke sini dengan toast sukses masih terpampang, tanpa satu pun kalimat yang menjelaskan.
    await auth.load()
    if (!auth.me) throw { message: 'Login berhasil, tapi sesi tidak tersimpan di browser ini. Pastikan cookie tidak diblokir, lalu coba lagi.' }
    toast.success('Kamu sudah masuk.')
    await navigateTo(nextPath.value)
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    pending.value = false
  }
}

useHead({ title: 'Masuk — Aruna Dewa' })
</script>

<template>
  <div class="grid w-full max-w-[26rem] gap-7">
    <header class="grid gap-3">
      <p class="eyebrow">Kembali ke ruang persiapan</p>
      <h1 class="m-0 font-display text-h1 font-semibold text-ink">Masuk</h1>
      <p class="m-0 text-ink-muted">Lanjutkan menyusun undangan dan memantau RSVP tamu.</p>
      <p v-if="endedNotice" role="status" class="m-0 rounded-md border border-border bg-surface-2 px-3.5 py-2.5 text-[0.875rem] text-ink-muted">
        {{ endedNotice }}
      </p>
    </header>

    <UiGoogleButton :href="googleHref" />

    <div class="flex items-center gap-4" aria-hidden="true">
      <span class="h-px flex-1 bg-border" />
      <span class="text-caption text-ink-subtle">atau dengan email</span>
      <span class="h-px flex-1 bg-border" />
    </div>

    <form class="grid gap-5" @submit.prevent="submit">
      <fieldset :disabled="!ready || pending" class="grid gap-4">
        <UiField v-slot="{ id }" label="Email" required>
          <UiInput :id="id" v-model="email" type="email" autocomplete="email" placeholder="nama@email.com" required />
        </UiField>

        <UiField v-slot="{ id }" label="Kata sandi" required>
          <div class="relative">
            <UiInput
              :id="id"
              v-model="password"
              :type="revealed ? 'text' : 'password'"
              autocomplete="current-password"
              minlength="10"
              class="pr-12"
              required
            />
            <button
              type="button"
              class="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:text-ink"
              :aria-label="revealed ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
              @click="revealed = !revealed"
            >
              <component :is="revealed ? EyeOff : Eye" :size="18" aria-hidden="true" />
            </button>
          </div>
        </UiField>

        <NuxtLink
          to="/forgot-password"
          class="justify-self-end text-[0.875rem] font-medium text-ink-muted no-underline underline-offset-4 hover:text-ink hover:underline"
        >
          Lupa kata sandi?
        </NuxtLink>

        <p v-if="error" role="alert" class="m-0 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.875rem] text-danger">
          {{ error }}
        </p>

        <UiButton type="submit" size="lg" block :loading="pending">
          {{ pending ? 'Memeriksa…' : 'Masuk' }}
          <ArrowRight v-if="!pending" :size="17" aria-hidden="true" />
        </UiButton>
      </fieldset>
    </form>

    <p class="m-0 text-center text-[0.9375rem] text-ink-muted">
      Belum punya akun?
      <NuxtLink :to="registerLink" class="font-semibold text-primary underline-offset-4 hover:underline">Daftar di sini</NuxtLink>
    </p>
  </div>
</template>
