<script setup lang="ts">
import { AlertCircle, ArrowLeft, Check, Eye, Redo2, RotateCcw, Save, Send, Undo2 } from 'lucide-vue-next'

/**
 * Bar tipis di atas studio. Satu-satunya pemegang `<h1>` halaman editor sejak fase 62 —
 * `DashboardShell variant="studio"` tidak merender judul, jadi kalau bar ini kehilangan `h1`-nya,
 * tes axe "dashboard screens are accessible and titled" yang menagihnya.
 *
 * Status simpan tetap **tertulis**, bukan disiratkan lewat tombol yang aktif atau tidak: tanpa
 * autosave (fase 18), "sudah tersimpan atau belum" tidak boleh ditebak-tebak.
 */
defineProps<{
  title: string
  slug: string
  invitationId: string
  revision: number
  dirty: boolean
  saving: boolean
  publishing: boolean
  canUndo: boolean
  canRedo: boolean
  error: string
  conflict: boolean
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  reset: []
  save: []
  publish: []
  reload: []
}>()
</script>

<template>
  <!--
    `sticky top-16` di bawah `lg` menempel tepat di bawah header ponsel `DashboardNav` (h-16).
    Di `lg` ke atas ia baris pertama grid setinggi layar dan tidak perlu sticky — halamannya
    tidak menggulung, panel-panelnya yang menggulung.
  -->
  <header
    class="sticky top-16 z-[var(--z-sticky)] grid gap-3 border-b border-border bg-surface/92 px-4 py-3 backdrop-blur-xl lg:static lg:px-6"
  >
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div class="flex min-w-0 items-center gap-2">
        <UiButton
          id="editor-back"
          as="NuxtLink"
          :to="`/dashboard/${invitationId}`"
          tone="ghost"
          size="sm"
          class="-ml-2 px-2"
          aria-label="Kembali ke ringkasan"
        >
          <ArrowLeft :size="18" aria-hidden="true" />
        </UiButton>

        <div class="grid min-w-0 gap-0.5">
          <p class="m-0 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">Editor undangan</p>
          <h1 class="m-0 truncate font-display text-[1.125rem] font-semibold leading-tight text-ink" :title="title">
            {{ title }}
          </h1>
        </div>
      </div>

      <!--
        Tiga klaster, bukan tujuh tombol sebaris (fase 67). Di bawah 1280 status tersimpan turun
        ke barisnya sendiri rata kanan: yang membungkus adalah teks, bukan tombol di tengah kalimat.
        Teks `#editor-save-state` tetap dua kalimat yang sama — tes membacanya kata demi kata.
      -->
      <div class="flex flex-wrap items-center justify-end gap-2">
        <p
          id="editor-save-state"
          class="m-0 flex basis-full items-center justify-end gap-1.5 text-caption xl:mr-1 xl:basis-auto"
          :class="dirty ? 'text-primary-strong' : 'text-ink-subtle'"
        >
          <AlertCircle v-if="dirty" :size="14" aria-hidden="true" />
          <Check v-else :size="14" aria-hidden="true" />
          {{ dirty ? 'Ada perubahan yang belum tersimpan' : 'Semua perubahan tersimpan' }}
        </p>
        <!-- Di luar `#editor-save-state`: tes membaca teks elemen itu apa adanya, kata demi kata. -->
        <p class="sr-only">Draft revisi {{ revision }}. Versi publik hanya berubah saat kalian menerbitkan.</p>

        <div role="group" aria-label="Riwayat" class="flex items-center gap-0.5 rounded-md bg-surface-2 p-0.5">
          <UiButton id="editor-undo" tone="ghost" size="sm" class="px-2.5" :disabled="!canUndo" aria-label="Undo" @click="emit('undo')">
            <Undo2 :size="16" aria-hidden="true" />
          </UiButton>
          <UiButton id="editor-redo" tone="ghost" size="sm" class="px-2.5" :disabled="!canRedo" aria-label="Redo" @click="emit('redo')">
            <Redo2 :size="16" aria-hidden="true" />
          </UiButton>
          <span class="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
          <UiButton id="editor-reset" tone="ghost" size="sm" @click="emit('reset')">
            <RotateCcw :size="16" aria-hidden="true" />
            Reset
          </UiButton>
        </div>

        <!-- `flex-wrap`: di 360px ketiga tombol (±385px) melebihi lebar toolbar dan meluberkan
             halaman ke samping; Publikasikan turun ke barisnya sendiri, bukan keluar layar. -->
        <div class="flex flex-wrap items-center justify-end gap-2">
          <UiButton id="editor-view-public" as="NuxtLink" :to="`/i/${slug}`" target="_blank" tone="outline" size="sm">
            <Eye :size="16" aria-hidden="true" />
            Lihat publik
          </UiButton>
          <UiButton id="editor-save" size="sm" :loading="saving" :disabled="!dirty" @click="emit('save')">
            <Save v-if="!saving" :size="16" aria-hidden="true" />
            {{ saving ? 'Menyimpan…' : 'Simpan draft' }}
          </UiButton>
          <UiButton id="editor-publish" tone="ink" size="sm" :loading="publishing" @click="emit('publish')">
            <Send v-if="!publishing" :size="16" aria-hidden="true" />
            {{ publishing ? 'Menerbitkan…' : 'Publikasikan' }}
          </UiButton>
        </div>
      </div>
    </div>

    <!--
      Galat tinggal di baris toolbar, bukan di panel yang menggulung: `<main>` studio
      `overflow-hidden` di `lg`, dan pesan yang mendarat di bawah lipatan inspektor sama saja
      dengan tidak ada.
    -->
    <p v-if="error" class="notice m-0" role="alert">
      {{ error }}
      <button v-if="conflict" id="editor-reload-server" class="button button-secondary ml-2" type="button" @click="emit('reload')">
        Muat ulang versi server
      </button>
    </p>
  </header>
</template>
