<script setup lang="ts">
/**
 * Halaman akun. Sampai fase ini tidak ada satu pun endpoint untuk mengubah data akun sendiri,
 * jadi nama yang salah ketik saat mendaftar tidak bisa diperbaiki dari mana pun dan kata sandi
 * hanya bisa diganti dengan berpura-pura lupa lalu menunggu email.
 *
 * Email sengaja tidak bisa diubah di sini: memindahkannya butuh verifikasi ganda ke alamat baru
 * dan penanganan tabrakan dengan akun Google. Menyediakan field yang tampak bisa diedit padahal
 * separuh alurnya belum ada lebih buruk daripada tidak menyediakannya sama sekali.
 */
import type { ApiError, SessionHistoryEntry } from '@aruna/contracts/api'
import { BadgeCheck, Eye, EyeOff, KeyRound, MailCheck, Save, ShieldAlert } from 'lucide-vue-next'

const toast = useToast()

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const authApi = useAuthApi()
const ready = useInteractiveReady()
const user = computed(() => auth.me?.user ?? null)

// — Nama ————————————————————————————————————————————————————————————————————
const name = ref(user.value?.name ?? '')
const namePending = ref(false)
const nameError = ref('')
const nameChanged = computed(() => name.value.trim() !== (user.value?.name ?? '') && name.value.trim().length > 0)

async function saveName() {
  nameError.value = ''
  namePending.value = true
  try {
    await auth.updateProfile(name.value.trim())
    toast.success('Nama tersimpan.')
  } catch (cause) {
    nameError.value = apiErrorMessage(cause)
  } finally {
    namePending.value = false
  }
}

// — Kata sandi ——————————————————————————————————————————————————————————————
const currentPassword = ref('')
const newPassword = ref('')
const repeatPassword = ref('')
const revealed = ref(false)
const passwordPending = ref(false)
const passwordError = ref('')
const currentPasswordError = ref('')
/** Diperiksa di klien karena API tidak pernah melihat ulangannya — dan memang tidak perlu. */
const repeatError = computed(() => (repeatPassword.value && repeatPassword.value !== newPassword.value ? 'Ulangannya belum sama dengan kata sandi baru.' : ''))

async function changePassword() {
  passwordError.value = ''
  currentPasswordError.value = ''
  if (newPassword.value !== repeatPassword.value) return
  passwordPending.value = true
  try {
    await authApi.changePassword({ currentPassword: currentPassword.value, newPassword: newPassword.value })
    currentPassword.value = ''
    newPassword.value = ''
    repeatPassword.value = ''
    toast.success('Kata sandi diganti. Perangkat lain dikeluarkan.')
    await loadSessions()
  } catch (cause) {
    // Kata sandi lama yang salah menempel di fieldnya; sisanya baru jadi pesan di atas tombol.
    const field = (cause as Partial<ApiError>).fieldErrors?.currentPassword?.[0]
    if (field) currentPasswordError.value = field
    else passwordError.value = apiErrorMessage(cause)
  } finally {
    passwordPending.value = false
  }
}

// — Akun Google: kirim tautan, bukan form ————————————————————————————————————
const linkPending = ref(false)
const linkSent = ref(false)
const linkError = ref('')

async function sendPasswordLink() {
  linkError.value = ''
  linkPending.value = true
  try {
    await authApi.forgotPassword(user.value!.email)
    linkSent.value = true
  } catch (cause) {
    linkError.value = apiErrorMessage(cause)
  } finally {
    linkPending.value = false
  }
}

// — Verifikasi email ————————————————————————————————————————————————————————
const verifyPending = ref(false)
const verifySent = ref(false)
const verifyError = ref('')

async function resendVerification() {
  verifyError.value = ''
  verifyPending.value = true
  try {
    await authApi.resendVerification()
    verifySent.value = true
  } catch (cause) {
    verifyError.value = apiErrorMessage(cause)
  } finally {
    verifyPending.value = false
  }
}

// — Riwayat sesi ————————————————————————————————————————————————————————————
const { pending: sessionsPending, error: sessionsError, run } = useLoader(true)
const sessions = ref<SessionHistoryEntry[]>([])

async function loadSessions() {
  sessions.value = (await run(() => authApi.sessions())) ?? []
}
await loadSessions()

useHead({ title: 'Profil & akun — Aruna Dewa' })
</script>

<template>
  <div v-if="user" class="shell grid content-start gap-8 py-10 lg:py-14">
    <header class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:gap-5">
      <UiAvatar :id="user.id" :size="72" />
      <div class="grid gap-1.5">
        <p class="eyebrow">Profil &amp; akun</p>
        <h1 class="m-0 font-display text-h1 font-semibold text-ink">{{ user.name }}</h1>
        <p class="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
          <span class="break-all">{{ user.email }}</span>
          <UiBadge v-if="user.emailVerified" tone="sage">
            <BadgeCheck :size="13" aria-hidden="true" />
            Terverifikasi
          </UiBadge>
          <UiBadge v-else tone="gold">
            <ShieldAlert :size="13" aria-hidden="true" />
            Belum terverifikasi
          </UiBadge>
        </p>
      </div>
    </header>

    <!-- Verifikasi email: lencana tanpa jalan keluar cuma memberi tahu orang bahwa ada yang salah. -->
    <section v-if="!user.emailVerified" class="card grid gap-3 p-6">
      <h2 class="m-0 font-display text-h3 font-semibold text-ink">Email belum terverifikasi</h2>
      <p class="copy m-0">
        {{ verifySent
          ? `Tautan baru sudah dikirim ke ${user.email}. Tautannya berlaku 24 jam; kalau tidak sampai, periksa folder spam.`
          : 'Verifikasi memastikan tautan pemulihan kata sandi bisa sampai ke kamu saat dibutuhkan.' }}
      </p>
      <p v-if="verifyError" role="alert" class="m-0 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.875rem] text-danger">
        {{ verifyError }}
      </p>
      <UiButton
        v-if="!verifySent"
        id="account-verify-resend"
        tone="outline"
        class="justify-self-start"
        :loading="verifyPending"
        :disabled="!ready"
        @click="resendVerification"
      >
        <MailCheck v-if="!verifyPending" :size="17" aria-hidden="true" />
        Kirim ulang tautan verifikasi
      </UiButton>
    </section>

    <!-- Nama -->
    <section class="card grid gap-5 p-6">
      <div class="grid gap-1.5">
        <h2 class="m-0 font-display text-h3 font-semibold text-ink">Nama</h2>
        <p class="copy m-0 text-[0.9375rem]">Dipakai di sapaan dasbor dan di email yang kami kirim ke kamu.</p>
      </div>

      <form class="grid gap-4 sm:max-w-md" @submit.prevent="saveName">
        <fieldset :disabled="!ready || namePending" class="grid gap-4">
          <UiField id="account-name" v-slot="{ id, invalid }" label="Nama" :error="nameError" required>
            <UiInput :id="id" v-model="name" :invalid="invalid" autocomplete="name" maxlength="120" required />
          </UiField>

          <UiButton id="account-name-submit" type="submit" class="justify-self-start" :loading="namePending" :disabled="!nameChanged">
            <Save v-if="!namePending" :size="17" aria-hidden="true" />
            Simpan nama
          </UiButton>
        </fieldset>
      </form>
    </section>

    <!-- Email, sengaja tanpa field -->
    <section class="card grid gap-2 p-6">
      <h2 class="m-0 font-display text-h3 font-semibold text-ink">Email</h2>
      <p class="m-0 break-all text-[0.9375rem] font-medium text-ink">{{ user.email }}</p>
      <p class="copy m-0 text-[0.9375rem]">
        Email tidak bisa diganti sendiri untuk saat ini — ia yang menghubungkan akun ini dengan
        undangan dan pesanannya. Hubungi kami kalau alamatnya perlu dipindahkan.
      </p>
    </section>

    <!-- Kata sandi: form untuk akun yang punya, tautan untuk akun Google -->
    <section class="card grid gap-5 p-6">
      <div class="grid gap-1.5">
        <h2 class="m-0 font-display text-h3 font-semibold text-ink">Kata sandi</h2>
        <p class="copy m-0 text-[0.9375rem]">
          {{ user.hasPassword
            ? 'Mengganti kata sandi mengeluarkan perangkat lain. Perangkat ini tetap masuk.'
            : 'Akun ini masuk lewat Google, jadi belum punya kata sandi. Kamu bisa membuatnya lewat tautan yang kami kirim ke email — dan sesudahnya semua perangkat, termasuk yang ini, perlu masuk lagi.' }}
        </p>
      </div>

      <form v-if="user.hasPassword" class="grid gap-4 sm:max-w-md" @submit.prevent="changePassword">
        <fieldset :disabled="!ready || passwordPending" class="grid gap-4">
          <UiField id="account-password-current" v-slot="{ id, invalid }" label="Kata sandi sekarang" :error="currentPasswordError" required>
            <UiInput :id="id" v-model="currentPassword" :invalid="invalid" :type="revealed ? 'text' : 'password'" autocomplete="current-password" required />
          </UiField>

          <UiField id="account-password-new" v-slot="{ id }" label="Kata sandi baru" hint="Minimal 10 karakter." required>
            <div class="relative">
              <UiInput
                :id="id"
                v-model="newPassword"
                :type="revealed ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="10"
                class="pr-12"
                required
              />
              <button
                id="account-password-reveal"
                type="button"
                class="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:text-ink"
                :aria-label="revealed ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="revealed = !revealed"
              >
                <component :is="revealed ? EyeOff : Eye" :size="18" aria-hidden="true" />
              </button>
            </div>
          </UiField>

          <UiField id="account-password-repeat" v-slot="{ id, invalid }" label="Ulangi kata sandi baru" :error="repeatError" required>
            <UiInput :id="id" v-model="repeatPassword" :invalid="invalid" :type="revealed ? 'text' : 'password'" autocomplete="new-password" minlength="10" required />
          </UiField>

          <p v-if="passwordError" role="alert" class="m-0 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.875rem] text-danger">
            {{ passwordError }}
          </p>

          <UiButton id="account-password-submit" type="submit" class="justify-self-start" :loading="passwordPending" :disabled="Boolean(repeatError)">
            <KeyRound v-if="!passwordPending" :size="17" aria-hidden="true" />
            Ganti kata sandi
          </UiButton>
        </fieldset>
      </form>

      <div v-else class="grid gap-3">
        <p v-if="linkSent" class="notice m-0 flex items-start gap-2">
          <MailCheck :size="17" class="mt-0.5 shrink-0" aria-hidden="true" />
          Tautan sudah dikirim ke {{ user.email }}. Tautannya berlaku satu jam.
        </p>
        <p v-if="linkError" role="alert" class="m-0 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.875rem] text-danger">
          {{ linkError }}
        </p>
        <UiButton
          v-if="!linkSent"
          id="account-password-link"
          tone="outline"
          class="justify-self-start"
          :loading="linkPending"
          :disabled="!ready"
          @click="sendPasswordLink"
        >
          <KeyRound v-if="!linkPending" :size="17" aria-hidden="true" />
          Kirim tautan buat kata sandi
        </UiButton>
      </div>
    </section>

    <!-- Riwayat sesi -->
    <section id="account-sessions" class="card grid gap-5 p-6">
      <div class="grid gap-1.5">
        <h2 class="m-0 font-display text-h3 font-semibold text-ink">Perangkat &amp; riwayat sesi</h2>
        <p class="copy m-0 text-[0.9375rem]">
          Akun ini hanya bisa masuk di satu perangkat sekaligus: masuk di tempat baru otomatis
          mengakhiri sesi sebelumnya. Kalau ada baris "digantikan perangkat lain" yang bukan kamu,
          ganti kata sandi sekarang juga.
        </p>
      </div>

      <div v-if="sessionsPending" class="grid gap-2">
        <UiSkeleton v-for="index in 3" :key="index" class="h-16" />
      </div>

      <p v-else-if="sessionsError" class="notice m-0" role="alert">
        {{ sessionsError }}
        <button id="account-sessions-retry" class="button button-secondary ml-2" type="button" @click="loadSessions">Coba lagi</button>
      </p>

      <ul v-else class="m-0 grid list-none gap-2 p-0">
        <li
          v-for="session in sessions"
          :key="session.id"
          :class="cn(
            'grid gap-1.5 rounded-md border px-4 py-3.5',
            session.current && !session.endedAt ? 'border-sage/40 bg-sage-soft' : 'border-border bg-surface-2',
          )"
        >
          <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span class="text-[0.9375rem] font-semibold text-ink">{{ session.device }}</span>
            <UiBadge v-if="session.current && !session.endedAt" tone="sage">Perangkat ini</UiBadge>
            <UiBadge v-else-if="!session.endedAt" tone="primary">Aktif</UiBadge>
            <UiBadge v-else tone="outline">{{ sessionEndLabel(session.endedReason) }}</UiBadge>
          </div>
          <!--
            `text-ink-subtle` di atas `bg-sage-soft` berhenti di 4,36 — di bawah 4,5 yang
            diminta WCAG untuk teks 13px. Barisnya justru baris yang paling perlu dibaca:
            ia yang memberi tahu kapan dan dari mana akun ini terakhir dipakai.
          -->
          <p class="m-0 text-caption text-ink-muted">
            Masuk {{ formatDateTime(session.signedInAt) }}
            <template v-if="session.ip"> · {{ session.ip }}</template>
            <!--
              Sesi bertahan sampai 90 hari, jadi "masuk" saja bisa menunjuk ke bulan lalu
              sementara pemakaian terakhirnya lima menit lalu. Untuk membaca baris yang bukan
              kita, selisih itu justru yang menjawab pertanyaannya.
            -->
            <template v-if="session.lastActiveAt !== session.signedInAt"> · aktif terakhir {{ formatDateTime(session.lastActiveAt) }}</template>
            <template v-if="session.endedAt"> · berakhir {{ formatDateTime(session.endedAt) }}</template>
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>
