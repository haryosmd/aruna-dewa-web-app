<script setup lang="ts">
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { onKeyStroke } from '@vueuse/core'
import { X } from 'lucide-vue-next'

/**
 * Pemapar tunggal untuk `usePopupStore`.
 *
 * Dipasang **sekali** di `app.vue`, bukan di layout: editor undangan memakai
 * `definePageMeta({ layout: false })`, dan justru di sanalah popup ini paling dibutuhkan.
 *
 * Fondasinya primitif `Dialog*` reka-ui, sama seperti dua dialog yang sudah ada di repo
 * (`layout/AppHeader.vue`, `invitation/Gallery.vue`). Yang didapat dari sana bukan tampilan
 * melainkan hal-hal yang mahal kalau ditulis sendiri dan sunyi kalau salah: fokus terjebak di
 * dalam dialog, `aria-modal` beserta penautan judul/deskripsinya, gulir badan terkunci, dan
 * fokus kembali ke elemen pemicunya saat ditutup. Sapuan axe menyapu halaman dasbor, dan
 * dialog buatan sendiri di atas `<div>` adalah cara paling umum untuk membuatnya merah.
 */
const popup = usePopupStore()
const { current } = storeToRefs(popup)

/*
 * Escape ditangani dua kali dengan sengaja: `DialogContent` menutup dirinya sendiri (dan itu
 * sampai ke `update:open` di bawah), sementara baris ini menangkap penekanan yang terjadi
 * saat fokus belum berada di dalam dialog — jendela sempit tepat setelah popup muncul.
 * Keduanya aman berbarengan karena `dismiss()` dikunci `key`: panggilan kedua tidak lagi
 * cocok dengan kepala antrean dan tidak melakukan apa pun.
 */
onKeyStroke('Escape', () => {
  const entry = current.value
  if (entry) popup.dismiss(entry.key)
})

function setOpen(next: boolean) {
  const entry = current.value
  if (!next && entry) popup.dismiss(entry.key)
}

/*
 * Fokus awal jatuh ke aksi pertama, bukan ke tombol tutup.
 *
 * Bawaan reka-ui memfokuskan elemen fokusabel pertama di dalam dialog, dan itu tombol silang
 * di pojok — jadi pasangan yang menekan Enter karena terbiasa justru membatalkan pertanyaannya.
 * Kalau tombolnya entah kenapa tidak ada, `preventDefault()` tidak dipanggil dan reka-ui
 * mengerjakan bawaannya; fokus tidak pernah tertinggal di luar dialog.
 */
function focusPrimaryAction(event: Event) {
  const first = current.value?.request.actions[0]
  const target = first ? document.getElementById(`aruna-popup-${first.id}`) : null
  if (!target) return
  event.preventDefault()
  target.focus()
}
</script>

<template>
  <DialogRoot :open="Boolean(current)" @update:open="setOpen">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-ink/45 backdrop-blur-sm" />
      <DialogContent
        v-if="current"
        id="aruna-popup"
        class="aruna-popup fixed left-1/2 top-1/2 z-50 grid w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-surface p-6 shadow-veil focus:outline-none"
        @open-auto-focus="focusPrimaryAction"
      >
        <div class="flex items-start justify-between gap-4">
          <DialogTitle
            id="aruna-popup-title"
            :class="cn('m-0 font-display text-h3 font-semibold', current.request.tone === 'danger' ? 'text-danger' : 'text-ink')"
          >
            {{ current.request.title }}
          </DialogTitle>
          <button
            id="aruna-popup-close"
            type="button"
            class="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-subtle hover:bg-surface-3 hover:text-ink"
            aria-label="Tutup"
            @click="popup.dismiss(current.key)"
          >
            <X :size="18" aria-hidden="true" />
          </button>
        </div>

        <!--
          `DialogDescription` wajib ada walau kosong isinya: reka-ui menautkannya lewat
          `aria-describedby`, dan tanpa elemen itu pembaca layar hanya mengumumkan judulnya
          lalu diam — persis pada popup yang seluruh taruhannya ada di kalimat penjelas.
        -->
        <DialogDescription
          id="aruna-popup-description"
          :class="cn('m-0 text-[0.9375rem] leading-relaxed text-ink-muted', !current.request.description && 'sr-only')"
        >
          {{ current.request.description ?? current.request.title }}
        </DialogDescription>

        <!--
          Tombolnya menumpuk di ponsel dan berjajar di layar lebar. Tiga pilihan berjajar di
          390px memaksa labelnya jadi satu kata, dan "Tinggalkan" yang dipendekkan jadi
          "Buang" adalah cara yang bagus untuk kehilangan pekerjaan orang.
        -->
        <div class="grid gap-2 sm:flex sm:flex-row-reverse sm:flex-wrap sm:justify-start">
          <UiButton
            v-for="(action, index) in current.request.actions"
            :id="`aruna-popup-${action.id}`"
            :key="action.id"
            :tone="action.tone ?? (index === 0 ? 'primary' : 'outline')"
            size="sm"
            @click="popup.answer(current!.key, action.id)"
          >
            {{ action.label }}
          </UiButton>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.aruna-popup[data-state='open'] { animation: aruna-popup-in 180ms var(--ease-out-quart) both; }

@keyframes aruna-popup-in {
  from { opacity: 0; transform: translate(-50%, calc(-50% + 0.5rem)) scale(0.98); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .aruna-popup[data-state='open'] { animation: none; }
}
</style>
