<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { X } from 'lucide-vue-next'
import type { Guest } from '~/types/aruna'

/**
 * Dialog tambah/sunting tamu (fase 72.6): nama, nomor WhatsApp, kategori, kuota — dan sejak
 * fase 75 empat kolom lembar tamu pemilik (dari, anak, bentuk undangan, catatan).
 *
 * Fondasinya `Dialog*` reka-ui seperti Studio Ornamen — jebakan fokus, `aria-modal`, dan
 * pengembalian fokus ke tombol pemicu datang gratis, dan itulah yang membuat sapuan axe
 * halaman ini tetap nol pelanggaran.
 */
export interface GuestForm {
  displayName: string; phone: string; category: string; quota: number
  /** Fase 75. Semuanya boleh kosong — kolom anak khususnya murni pendataan. */
  guestFrom: string; childCount: number | null; invitationKind: string; notes: string
}

const props = defineProps<{
  open: boolean
  /** Tamu yang disunting; `null` = tambah baru. */
  guest: Guest | null
  /** Kategori yang sudah dipakai tamu lain, untuk saran `<datalist>`. */
  categories: string[]
  saving: boolean
  error?: string
}>()
const emit = defineEmits<{ 'update:open': [boolean]; submit: [GuestForm] }>()

const form = reactive<GuestForm>({ displayName: '', phone: '', category: '', quota: 1, guestFrom: '', childCount: null, invitationKind: '', notes: '' })

watch(() => [props.open, props.guest] as const, ([open, guest]) => {
  if (!open) return
  form.displayName = guest?.displayName ?? ''
  form.phone = guest?.phone ?? ''
  form.category = guest?.category ?? guest?.group ?? ''
  form.quota = guest?.quota ?? 1
  form.guestFrom = guest?.guestFrom ?? ''
  form.childCount = guest?.childCount ?? null
  form.invitationKind = guest?.invitationKind ?? ''
  form.notes = guest?.notes ?? ''
}, { immediate: true })

/** Ejaan tersimpan, bukan label — yang dikirim ke API harus sama dengan yang dikenali impor. */
const asalPilihan = [['', '—'], ['pria', 'Mempelai pria'], ['wanita', 'Mempelai wanita'], ['keduanya', 'Keduanya']] as const
const bentukPilihan = [['', '—'], ['digital', 'Digital'], ['cetak', 'Cetak'], ['belum', 'Belum dikirim']] as const

const title = computed(() => (props.guest ? 'Sunting tamu' : 'Tambah tamu'))
</script>

<template>
  <DialogRoot :open="open" @update:open="value => emit('update:open', value)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[var(--z-overlay)] bg-ink/45 backdrop-blur-sm" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-[var(--z-modal)] grid w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-xl bg-surface p-6 shadow-[var(--shadow-veil)] focus:outline-none"
        @escape-key-down="emit('update:open', false)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="grid gap-1">
            <DialogTitle class="m-0 font-display text-h3 font-semibold text-ink">{{ title }}</DialogTitle>
            <DialogDescription class="m-0 text-caption text-ink-muted">
              Nomor dipakai tombol Kirim WA; kategori memudahkan filter saat broadcast.
            </DialogDescription>
          </div>
          <DialogClose
            id="guest-dialog-close"
            class="grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
            aria-label="Tutup"
          >
            <X :size="18" aria-hidden="true" />
          </DialogClose>
        </div>

        <form class="grid gap-4" @submit.prevent="emit('submit', { ...form, quota: Math.min(20, Math.max(1, Number(form.quota) || 1)), childCount: form.childCount === null || Number(form.childCount) < 1 ? null : Math.min(20, Number(form.childCount)) })">
          <UiField id="guest-form-name" v-slot="{ id }" label="Nama tamu undangan" hint="Tulis lengkap dengan gelar bila ada." required>
            <UiInput :id="id" v-model="form.displayName" maxlength="200" required autofocus />
          </UiField>
          <UiField id="guest-form-phone" v-slot="{ id }" label="Nomor WhatsApp" hint="Contoh: 0812 3456 7890 atau +62 812…">
            <UiInput :id="id" v-model="form.phone" type="tel" inputmode="tel" maxlength="40" autocomplete="off" />
          </UiField>
          <div class="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <UiField id="guest-form-category" v-slot="{ id }" label="Kategori" hint="Mis. Keluarga, Teman CPP, Rekan kerja.">
              <UiInput :id="id" v-model="form.category" maxlength="80" list="guest-category-options" />
              <datalist id="guest-category-options">
                <option v-for="item in categories" :key="item" :value="item" />
              </datalist>
            </UiField>
            <UiField id="guest-form-quota" v-slot="{ id }" label="Kuota">
              <!-- Input asli: `UiInput` mengetik modelnya string, dan `.number` tidak ikut diteruskan ke komponen. -->
              <input :id="id" v-model.number="form.quota" class="control" type="number" min="1" max="20" inputmode="numeric" required>
            </UiField>
          </div>

          <div class="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <UiField id="guest-form-from" v-slot="{ id }" label="Undangan dari" hint="Pihak mempelai yang mengundang.">
              <UiSelect :id="id" v-model="form.guestFrom">
                <option v-for="[nilai, label] in asalPilihan" :key="nilai" :value="nilai">{{ label }}</option>
              </UiSelect>
            </UiField>
            <!-- Tanpa `required` dan tanpa minimum: kolom anak murni pendataan, kosong tetap sah. -->
            <UiField id="guest-form-child" v-slot="{ id }" label="Anak" hint="Opsional.">
              <input :id="id" v-model.number="form.childCount" class="control" type="number" min="1" max="20" inputmode="numeric" placeholder="—">
            </UiField>
          </div>
          <UiField id="guest-form-kind" v-slot="{ id }" label="Bentuk undangan" hint="Catatan pribadi; tidak mengubah apa pun di undangan.">
            <UiSelect :id="id" v-model="form.invitationKind">
              <option v-for="[nilai, label] in bentukPilihan" :key="nilai" :value="nilai">{{ label }}</option>
            </UiSelect>
          </UiField>
          <UiField id="guest-form-notes" v-slot="{ id }" label="Catatan" hint="Mis. vegetarian, kursi roda, teman satu meja.">
            <UiInput :id="id" v-model="form.notes" maxlength="500" />
          </UiField>

          <p v-if="error" class="error m-0" role="alert">{{ error }}</p>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose as-child>
              <UiButton id="guest-form-cancel" tone="outline">Batal</UiButton>
            </DialogClose>
            <UiButton id="guest-form-submit" type="submit" :loading="saving" :disabled="!form.displayName.trim()">
              {{ saving ? 'Menyimpan…' : guest ? 'Simpan perubahan' : 'Simpan tamu' }}
            </UiButton>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
