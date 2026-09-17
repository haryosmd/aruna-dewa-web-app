<script setup lang="ts">
import { ArrowRight, Eye, EyeOff } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'auth' })

const authApi = useAuthApi()
const route = useRoute()
const auth = useAuthStore()
/** Pendaftar baru yang datang dari tombol paket dikembalikan ke wizard, bukan ke dashboard. */
const nextPath = computed(() => safeNextPath(route.query.next, '/order'))
const loginLink = computed(() => (typeof route.query.next === 'string' ? `/login?next=${encodeURIComponent(nextPath.value)}` : '/login'))

const name = ref('')
const email = ref('')
const password = ref('')
const revealed = ref(false)
const pending = ref(false)
const error = ref('')
const ready = useInteractiveReady()
const apiBase = useRuntimeConfig().public.apiBase
/** Sama di render server dan di browser, jadi tautannya tidak berubah saat hidrasi. */
const pageHost = useRequestURL().hostname
/** Jalur Google membawa tujuan yang sama; API menitipkannya di cookie sampai callback kembali. */
const googleHref = computed(() => googleStartHref(apiBase, pageHost, nextPath.value))

/** Four cheap signals; enough to steer people away from a 10-character password of one word. */
const strength = computed(() => {
  const value = password.value
  if (!value) return { score: 0, label: 'Minimal 10 karakter' }
  const score = [value.length >= 10, value.length >= 14, /[a-z]/.test(value) && /[A-Z]/.test(value), /\d|[^\w\s]/.test(value)].filter(Boolean).length
  return { score, label: ['Terlalu pendek', 'Masih lemah', 'Cukup', 'Bagus', 'Kuat'][score]! }
})

async function submit() {
  error.value = ''
  pending.value = true
  try {
    await authApi.register({ name: name.value, email: email.value, password: password.value })
  } catch (cause) {
    error.value = apiErrorMessage(cause)
    pending.value = false
    return
  }
  try {
    // Mendaftar tidak membuat sesi. Tanpa langkah masuk ini, tujuan yang sudah dipilih
    // pendaftar langsung dipantulkan kembali ke /login oleh middleware auth.
    await authApi.login({ email: email.value, password: password.value })
    // Sama seperti di /login: sesi dipastikan hidup dulu, supaya cookie yang ditolak browser
    // jatuh ke cabang di bawah — bukan ke middleware yang memantulkan tanpa penjelasan.
    await auth.load()
    if (!auth.me) throw new Error('Sesi tidak tersimpan di browser ini.')
    toast.success(`Akun siap. Email verifikasi dikirim ke ${email.value}.`)
    await navigateTo(nextPath.value)
  } catch {
    // Akunnya sudah jadi; yang gagal hanya langkah masuk otomatis. Jangan tampilkan ini
    // sebagai kegagalan pendaftaran — antar saja ke halaman masuk dengan tujuan yang sama.
    toast.success('Akun dibuat. Masuk untuk melanjutkan.')
    await navigateTo(`/login?next=${encodeURIComponent(nextPath.value)}`)
  } finally {
    pending.value = false
  }
}

useHead({ title: 'Buat akun — Aruna Dewa' })
</script>

<template>
  <div class="grid w-full max-w-[26rem] gap-7">
    <header class="grid gap-3">
      <p class="eyebrow">Mulai dari sini</p>
      <h1 class="m-0 font-display text-h1 font-semibold text-ink">Buat akun</h1>
      <p class="m-0 text-ink-muted">Gratis. Draft undangan tersimpan sampai kalian siap membayar.</p>
    </header>

    <UiGoogleButton id="auth-register-google" :href="googleHref" label="Daftar dengan Google" />

    <div class="flex items-center gap-4" aria-hidden="true">
      <span class="h-px flex-1 bg-border" />
      <span class="text-caption text-ink-subtle">atau dengan email</span>
      <span class="h-px flex-1 bg-border" />
    </div>

    <form class="grid gap-5" @submit.prevent="submit">
      <fieldset :disabled="!ready || pending" class="grid gap-4">
        <UiField id="auth-register-name" v-slot="{ id }" label="Nama" required>
          <UiInput :id="id" v-model="name" autocomplete="name" placeholder="Nama lengkap kamu" required />
        </UiField>

        <UiField id="auth-register-email" v-slot="{ id }" label="Email" required>
          <UiInput :id="id" v-model="email" type="email" autocomplete="email" placeholder="nama@email.com" required />
        </UiField>

        <UiField id="auth-register-password" v-slot="{ id }" label="Kata sandi" required>
          <div class="grid gap-2">
            <div class="relative">
              <UiInput
                :id="id"
                v-model="password"
                :type="revealed ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="10"
                class="pr-12"
                required
              />
              <button
                id="auth-register-reveal"
                type="button"
                class="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:text-ink"
                :aria-label="revealed ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="revealed = !revealed"
              >
                <component :is="revealed ? EyeOff : Eye" :size="18" aria-hidden="true" />
              </button>
            </div>

            <div class="flex items-center gap-3">
              <span class="flex flex-1 gap-1" aria-hidden="true">
                <span
                  v-for="step in 4"
                  :key="step"
                  :class="cn(
                    'h-1 flex-1 rounded-full transition-colors duration-300',
                    strength.score >= step ? (strength.score >= 3 ? 'bg-success' : 'bg-gold') : 'bg-border',
                  )"
                />
              </span>
              <span class="text-caption text-ink-subtle">{{ strength.label }}</span>
            </div>
          </div>
        </UiField>

        <p v-if="error" role="alert" class="m-0 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.875rem] text-danger">
          {{ error }}
        </p>

        <UiButton id="auth-register-submit" type="submit" size="lg" block :loading="pending">
          {{ pending ? 'Membuat akun…' : 'Buat akun' }}
          <ArrowRight v-if="!pending" :size="17" aria-hidden="true" />
        </UiButton>
      </fieldset>
    </form>

    <p class="m-0 text-center text-[0.9375rem] text-ink-muted">
      Sudah punya akun?
      <NuxtLink id="auth-register-to-login" :to="loginLink" class="font-semibold text-primary underline-offset-4 hover:underline">Masuk</NuxtLink>
    </p>
  </div>
</template>
