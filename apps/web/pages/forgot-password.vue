<script setup lang="ts">
/**
 * Jawabannya sengaja sama untuk email yang terdaftar maupun tidak — persis seperti API,
 * yang selalu membalas `accepted`. Halaman yang membalas berbeda akan mengubah form ini
 * menjadi alat untuk memeriksa siapa saja yang punya akun di sini.
 */
import { ArrowLeft, MailOpen, Send } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })

const authApi = useAuthApi()
const email = ref('')
const pending = ref(false)
const sent = ref(false)
const error = ref('')
const ready = useInteractiveReady()

async function submit() {
  error.value = ''
  pending.value = true
  try {
    await authApi.forgotPassword(email.value)
    sent.value = true
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    pending.value = false
  }
}

useHead({ title: 'Lupa kata sandi — Aruna Dewa' })
</script>

<template>
  <div class="grid w-full max-w-[26rem] gap-7">
    <header class="grid gap-3">
      <p class="eyebrow">Pemulihan akun</p>
      <h1 class="m-0 font-display text-h1 font-semibold text-ink">
        {{ sent ? 'Cek kotak masuk kamu' : 'Lupa kata sandi' }}
      </h1>
      <p class="m-0 text-ink-muted">
        {{ sent
          ? `Kalau ${email} terdaftar di sini, tautan untuk mengatur ulang kata sandi sudah dalam perjalanan. Tautannya berlaku satu jam.`
          : 'Masukkan email akunmu. Kami kirim tautan untuk mengatur ulang kata sandi.' }}
      </p>
    </header>

    <div v-if="sent" class="grid gap-3">
      <p class="notice m-0 flex items-start gap-2">
        <MailOpen :size="17" class="mt-0.5 shrink-0" aria-hidden="true" />
        Belum sampai juga setelah beberapa menit? Periksa folder spam, lalu coba kirim ulang.
      </p>
      <UiButton id="auth-forgot-resend" tone="outline" size="lg" block @click="sent = false">Kirim ulang</UiButton>
      <UiButton id="auth-forgot-to-login" as="NuxtLink" to="/login" tone="ghost" size="lg" block>
        <ArrowLeft :size="17" aria-hidden="true" />
        Kembali ke halaman masuk
      </UiButton>
    </div>

    <form v-else class="grid gap-5" @submit.prevent="submit">
      <fieldset :disabled="!ready || pending" class="grid gap-4">
        <UiField id="auth-forgot-email" v-slot="{ id }" label="Email" required>
          <UiInput :id="id" v-model="email" type="email" autocomplete="email" placeholder="nama@email.com" required />
        </UiField>

        <p v-if="error" role="alert" class="m-0 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.875rem] text-danger">
          {{ error }}
        </p>

        <UiButton id="auth-forgot-submit" type="submit" size="lg" block :loading="pending">
          {{ pending ? 'Mengirim…' : 'Kirim tautan' }}
          <Send v-if="!pending" :size="17" aria-hidden="true" />
        </UiButton>
      </fieldset>
    </form>

    <p v-if="!sent" class="m-0 text-center text-[0.9375rem] text-ink-muted">
      Ingat kata sandinya?
      <NuxtLink id="auth-forgot-login-link" to="/login" class="font-semibold text-primary underline-offset-4 hover:underline">Masuk</NuxtLink>
    </p>
  </div>
</template>
