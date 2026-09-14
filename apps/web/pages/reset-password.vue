<script setup lang="ts">
/**
 * Tujuan tautan di email pemulihan. `AuthService.resetPassword` mencabut seluruh sesi lama
 * begitu kata sandi berganti, jadi setelah berhasil pemilik akun memang harus masuk lagi.
 */
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const authApi = useAuthApi()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const password = ref('')
const revealed = ref(false)
const pending = ref(false)
const done = ref(false)
const error = ref('')
const ready = useInteractiveReady()

/** Ambang yang sama dengan halaman daftar, supaya rasa "cukup kuat" tidak berpindah-pindah. */
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
    await authApi.resetPassword(token.value, password.value)
    done.value = true
    toast.success('Kata sandi diperbarui.')
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    pending.value = false
  }
}

useHead({ title: 'Atur ulang kata sandi — Aruna Dewa' })
</script>

<template>
  <div class="grid w-full max-w-[26rem] gap-7">
    <header class="grid gap-3">
      <p class="eyebrow">Pemulihan akun</p>
      <h1 class="m-0 font-display text-h1 font-semibold text-ink">
        {{ done ? 'Kata sandi diperbarui' : 'Atur kata sandi baru' }}
      </h1>
      <p class="m-0 text-ink-muted">
        {{ done
          ? 'Demi keamanan, semua perangkat yang tadinya masuk sudah dikeluarkan. Masuk lagi dengan kata sandi barumu.'
          : 'Pilih kata sandi baru untuk akunmu. Tautan ini hanya bisa dipakai satu kali.' }}
      </p>
    </header>

    <UiButton v-if="done" id="auth-reset-to-login" as="NuxtLink" to="/login" size="lg" block>
      Masuk sekarang
      <ArrowRight :size="17" aria-hidden="true" />
    </UiButton>

    <template v-else-if="!token">
      <p class="notice m-0" role="alert">
        Tautan pemulihan tidak lengkap. Buka kembali tautan dari email, atau minta tautan baru.
      </p>
      <UiButton id="auth-reset-request-new" as="NuxtLink" to="/forgot-password" tone="outline" size="lg" block>Minta tautan baru</UiButton>
    </template>

    <form v-else class="grid gap-5" @submit.prevent="submit">
      <fieldset :disabled="!ready || pending" class="grid gap-4">
        <UiField id="auth-reset-password" v-slot="{ id }" label="Kata sandi baru" required>
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
                id="auth-reset-reveal"
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

        <UiButton id="auth-reset-submit" type="submit" size="lg" block :loading="pending">
          {{ pending ? 'Menyimpan…' : 'Simpan kata sandi' }}
          <ShieldCheck v-if="!pending" :size="17" aria-hidden="true" />
        </UiButton>
      </fieldset>
    </form>
  </div>
</template>
