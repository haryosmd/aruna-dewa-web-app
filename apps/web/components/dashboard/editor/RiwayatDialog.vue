<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { History, RotateCcw, X } from 'lucide-vue-next'
import type { RevisionSummary } from '@aruna/contracts/api'

/**
 * Riwayat versi (fase 75). Sampai fase ini tombolnya cuma membuka `alert()` yang menjelaskan
 * bahwa fiturnya menyusul — padahal substratnya sudah ada seluruhnya: `PublishedRevision`
 * menyimpan satu snapshot dokumen tiap terbit dan tidak pernah dihapus.
 *
 * Dua hal yang wajib terbaca jelas oleh pasangan, karena keduanya mudah disalahpahami:
 *
 * 1. **Yang disimpan hanya yang TERBIT.** Menyimpan draft sepuluh kali lalu terbit sekali
 *    menghasilkan satu entri, bukan sepuluh. Karena itu undangan yang belum pernah terbit
 *    memang tidak punya riwayat sama sekali, dan itu dikatakan apa adanya alih-alih
 *    menampilkan daftar kosong yang terlihat seperti kegagalan memuat.
 * 2. **Memulihkan menulis ke DRAFT, bukan ke yang dilihat tamu.** Tamu baru melihatnya sesudah
 *    Publikasikan ditekan lagi.
 */
defineProps<{
  open: boolean
  revisions: RevisionSummary[]
  loading: boolean
  error: string
  /** Revisi draft sekarang; dipakai judul supaya "kembali ke 3" punya pembanding. */
  draftRevision: number
  restoring: number | null
}>()
const emit = defineEmits<{ 'update:open': [boolean]; restore: [number] }>()

const waktu = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <DialogRoot :open="open" @update:open="value => emit('update:open', value)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[var(--z-overlay)] bg-ink/45 backdrop-blur-sm" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-[var(--z-modal)] grid max-h-[calc(100svh-2rem)] w-[min(34rem,calc(100vw-2rem))] grid-cols-[minmax(0,1fr)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl bg-surface p-6 shadow-[var(--shadow-veil)] focus:outline-none"
        @escape-key-down="emit('update:open', false)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="grid min-w-0 gap-1">
            <DialogTitle class="m-0 font-display text-h3 font-semibold text-ink">Riwayat versi</DialogTitle>
            <DialogDescription class="m-0 text-caption text-ink-muted">
              Yang tersimpan hanya versi yang pernah <strong>diterbitkan</strong>; menyimpan draft tidak membuat entri baru.
              Memulihkan menulis ke draft — tamu baru melihatnya setelah kalian menekan Publikasikan lagi.
            </DialogDescription>
          </div>
          <DialogClose id="editor-riwayat-close" class="grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink" aria-label="Tutup">
            <X :size="18" aria-hidden="true" />
          </DialogClose>
        </div>

        <p v-if="error" id="editor-riwayat-error" class="error m-0" role="alert">{{ error }}</p>
        <p v-else-if="loading" class="m-0 text-ink-muted">Memuat riwayat…</p>

        <div v-else-if="!revisions.length" id="editor-riwayat-kosong" class="grid gap-1.5 rounded-md border border-border bg-surface-2 p-4">
          <strong class="text-ink">Belum ada versi tersimpan.</strong>
          <span class="text-ui-lg text-ink-muted">Undangan ini belum pernah diterbitkan. Versi pertama tersimpan begitu kalian menekan Publikasikan.</span>
        </div>

        <ul v-else id="editor-riwayat-daftar" class="m-0 grid list-none gap-2 p-0">
          <li
            v-for="item in revisions"
            :key="item.revision"
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-3"
          >
            <div class="grid min-w-0 gap-0.5">
              <span class="font-semibold text-ink">
                Versi {{ item.revision }}
                <UiBadge v-if="item.isActive" tone="sage" size="md">Sedang tayang</UiBadge>
              </span>
              <span class="text-caption text-ink-muted">Terbit {{ waktu(item.publishedAt) }}</span>
            </div>
            <UiButton
              :id="`editor-riwayat-pulihkan-${item.revision}`"
              tone="outline"
              size="sm"
              :loading="restoring === item.revision"
              :disabled="restoring !== null"
              @click="emit('restore', item.revision)"
            >
              <RotateCcw :size="15" aria-hidden="true" />
              Pulihkan
            </UiButton>
          </li>
        </ul>

        <p class="m-0 flex items-center gap-1.5 text-caption text-ink-subtle">
          <History :size="14" aria-hidden="true" />
          Draft sekarang di revisi {{ draftRevision }}. Undo/redo memegang 30 langkah terakhir sesi ini.
        </p>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
