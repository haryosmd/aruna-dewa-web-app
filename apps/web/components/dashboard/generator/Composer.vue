<script setup lang="ts">
import type { SharePreset } from '@aruna/contracts/api'
import { CheckCheck, ExternalLink, RotateCcw } from 'lucide-vue-next'
import { guestPlaceholder, linkPlaceholder, presetMeta } from './templates'

/**
 * Blok (2) halaman Generator: penyunting pesan WhatsApp untuk satu gaya.
 *
 * Komponen ini tidak tahu apa-apa soal penyimpanan: `modelValue` naik ke halaman, dan halaman
 * yang men-debounce PATCH-nya. Yang dijaga di sini hanya gelembung pratinjau, sisip placeholder
 * di posisi kursor, hitung karakter, dan tombol reset yang mengembalikan teks bawaan.
 */
const props = defineProps<{
  preset: SharePreset
  /** Teks bawaan gaya ini, dirakit halaman dari dokumen. */
  defaultText: string
  /** `menyimpan` saat PATCH berjalan; `tersimpan` sesudahnya; `bawaan` bila belum pernah disunting. */
  saveState: 'bawaan' | 'menyimpan' | 'tersimpan' | 'gagal'
  /** URL publik undangan bila sudah terbit; kosong = banner tidak tampil. */
  publicUrl?: string
}>()
const emit = defineEmits<{ reset: [] }>()
const model = defineModel<string>({ default: '' })

const textarea = ref<HTMLTextAreaElement | null>(null)
const count = computed(() => model.value.length)
const isDefault = computed(() => model.value === props.defaultText)

/** Menyisipkan placeholder di posisi kursor, bukan di ujung: pasangan biasanya menaruhnya di tengah kalimat. */
function insert(token: string) {
  const el = textarea.value
  if (!el) { model.value += token; return }
  const start = el.selectionStart ?? model.value.length
  const end = el.selectionEnd ?? start
  model.value = `${model.value.slice(0, start)}${token}${model.value.slice(end)}`
  nextTick(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length) })
}

const stateLabel = computed(() => ({
  bawaan: 'Teks bawaan',
  menyimpan: 'Menyimpan…',
  tersimpan: 'Tersimpan otomatis',
  gagal: 'Gagal menyimpan — coba ubah lagi',
}[props.saveState]))
</script>

<template>
  <!--
    `grid-cols-[minmax(0,1fr)]`, bukan kolom `auto` bawaan (fase 75): `#share-live-banner` di bawah
    memuat URL publik yang `truncate`, dan `truncate` hanya bisa memotong kalau wadahnya BOLEH
    menyusut. Sebagai item grid ber-`min-width:auto`, banner itu justru memaksa kartunya selebar
    URL utuh — 305px terhadap jatah 278px di 360px, jadi isinya terpotong 7px di dalam kartu
    sendiri. `minmax(0,1fr)` di sini mengembalikan pekerjaan itu ke `truncate`.
  -->
  <section class="card grid grid-cols-[minmax(0,1fr)] gap-4 p-5 sm:p-6" aria-labelledby="share-composer-title">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="grid gap-1">
        <h2 id="share-composer-title" class="m-0 font-display text-h3 font-semibold text-ink">
          Edit Pesan WhatsApp <span class="uppercase tracking-[0.08em] text-sage">({{ presetMeta[preset].label }})</span>
        </h2>
        <p class="m-0 text-[0.9375rem] text-ink-muted">
          Pesan ini dikirim ke tiap tamu lewat tombol <strong class="font-semibold text-ink">Kirim WA</strong> di tabel bawah.
        </p>
      </div>
      <p
        id="share-composer-state"
        :class="cn('m-0 inline-flex items-center gap-1.5 text-caption font-medium', saveState === 'gagal' ? 'text-danger' : 'text-ink-muted')"
        role="status"
        aria-live="polite"
      >
        <CheckCheck v-if="saveState === 'tersimpan'" :size="15" class="text-success" aria-hidden="true" />
        {{ stateLabel }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-caption font-semibold uppercase tracking-[0.08em] text-ink-subtle">Sisipkan:</span>
      <button id="share-insert-guest" type="button" class="inline-flex min-h-9 items-center rounded-full border border-border-strong bg-surface px-3 font-mono text-[0.8125rem] text-ink transition-[border-color,background-color] hover:border-ink hover:bg-surface-2" @click="insert(guestPlaceholder)">{{ guestPlaceholder }}</button>
      <button id="share-insert-link" type="button" class="inline-flex min-h-9 items-center rounded-full border border-border-strong bg-surface px-3 font-mono text-[0.8125rem] text-ink transition-[border-color,background-color] hover:border-ink hover:bg-surface-2" @click="insert(linkPlaceholder)">{{ linkPlaceholder }}</button>
      <UiButton id="share-reset" tone="ghost" size="sm" class="ml-auto" :disabled="isDefault" @click="emit('reset')">
        <RotateCcw :size="15" aria-hidden="true" />
        Reset bawaan
      </UiButton>
    </div>

    <!-- Latar krem + gelembung: pasangan melihat persis bentuk pesan di layar tamunya. -->
    <div class="rounded-lg bg-[#ece5dd] p-4 sm:p-6">
      <div class="relative ml-auto max-w-[36rem] rounded-lg rounded-tr-none bg-[#dcf8c6] p-3 pb-7 shadow-[var(--shadow-lift)]">
        <label class="sr-only" for="share-template">Isi pesan WhatsApp</label>
        <textarea
          id="share-template"
          ref="textarea"
          v-model="model"
          rows="16"
          maxlength="4000"
          spellcheck="false"
          class="block min-h-[22rem] w-full resize-y rounded-md border-0 bg-transparent p-1 font-sans text-[0.9375rem] leading-relaxed text-ink outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[var(--color-ring)]"
          aria-describedby="share-composer-state share-composer-count"
        />
        <span id="share-composer-count" class="absolute bottom-2 right-3 inline-flex items-center gap-1 text-[0.6875rem] text-ink-muted">
          {{ count }} karakter
          <CheckCheck :size="14" class="text-[#4fc3f7]" aria-hidden="true" />
        </span>
      </div>
    </div>

    <p
      v-if="publicUrl"
      id="share-live-banner"
      class="m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-[0.9375rem] text-ink"
    >
      <CheckCheck :size="17" class="text-success" aria-hidden="true" />
      <strong class="font-semibold">Undangan Aktif & Siap Dibagikan</strong>
      <span class="min-w-0 truncate text-ink-muted">{{ publicUrl }}</span>
      <a :href="publicUrl" target="_blank" rel="noopener" class="ml-auto inline-flex min-h-11 items-center gap-1 font-semibold text-success underline-offset-4 hover:underline">
        Buka Link
        <ExternalLink :size="15" aria-hidden="true" />
      </a>
    </p>
    <p v-else class="notice m-0">Undangan belum terbit. Terbitkan dari editor supaya tautan di pesan bisa dibuka tamu.</p>
  </section>
</template>
