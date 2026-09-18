<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { ToastTone } from '~/stores/toast'

/**
 * Pemapar tunggal untuk `useToastStore`.
 *
 * Dipasang **sekali** di `app.vue`, bukan di layout, dengan alasan yang sama seperti
 * `AtomicPopup`: editor undangan memakai `definePageMeta({ layout: false })`, dan justru di
 * sanalah toast paling sering terbit.
 *
 * Menggantikan `<Toaster>` milik `vue-sonner` di fase 60. Yang dikejar bukan tampilan melainkan
 * bentuk markup-nya, jadi dua hal di bawah ini yang tidak boleh berubah tanpa mengukur ulang:
 *
 * 1. **Wadahnya `<div>`, bukan `<ol>`/`<ul>`.** Aturan `list` axe menuntut anak langsung sebuah
 *    daftar berperan `listitem`; toast berperan `status` di dalam `<ol>` adalah persis kegagalan
 *    yang membuat fase ini ada. Tanpa daftar, aturannya tidak berlaku sama sekali.
 * 2. **Hanya SATU daerah live, di wadahnya.** `role="status"` per-toast sengaja tidak dipasang:
 *    daerah live bersarang adalah cara paling mudah membuat pembaca layar mengumumkan kalimat
 *    yang sama dua kali, dan `aria-live` di wadah sudah mengumumkan anak yang baru datang.
 *
 * `aria-label` juga sengaja tidak ada. Sebuah `<div>` tanpa `role` berperan `generic`, dan
 * penamaan dilarang di sana — memasangnya menukar satu pelanggaran axe dengan pelanggaran lain
 * (`aria-prohibited-attr`). Daerah live memang tidak perlu nama.
 */
const store = useToastStore()
const { entries } = storeToRefs(store)

const ikon: Record<ToastTone, Component> = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  message: Info,
}
</script>

<template>
  <!--
    `pointer-events-none` di wadah supaya kolom tak terlihat setinggi layar ini tidak pernah
    mencegat klik; dikembalikan per-toast supaya teksnya tetap bisa DISOROT. Yang terakhir bukan
    kerapian: cabang gagal `LandingDemo` menampilkan URL lengkap dengan kalimat "salin tautan ini
    secara manual", dan tanpa itu satu-satunya jalan keluarnya tidak bisa dipakai.
  -->
  <div
    data-aruna-toaster
    class="pointer-events-none fixed inset-x-0 top-0 z-[60] grid justify-items-center gap-2 p-4"
    aria-live="polite"
    aria-relevant="additions"
    aria-atomic="false"
  >
    <TransitionGroup name="aruna-toast">
      <div
        v-for="entry in entries"
        :key="entry.key"
        data-aruna-toast
        :data-tone="entry.tone"
        class="pointer-events-auto grid w-[min(24rem,calc(100vw-2rem))] grid-cols-[auto_1fr] items-start gap-3 rounded-md border border-border-strong bg-surface p-4 text-left shadow-float"
      >
        <component :is="ikon[entry.tone]" :size="18" class="mt-0.5 text-primary" aria-hidden="true" />
        <div class="grid gap-1">
          <p class="m-0 text-[0.9375rem] font-semibold leading-snug text-ink">{{ entry.title }}</p>
          <p v-if="entry.description" class="m-0 text-caption text-ink-muted">{{ entry.description }}</p>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.aruna-toast-enter-active,
.aruna-toast-leave-active { transition: opacity 220ms var(--ease-out-quart), transform 220ms var(--ease-out-quart); }

.aruna-toast-enter-from,
.aruna-toast-leave-to { opacity: 0; transform: translateY(-0.5rem); }

/*
 * Toast terbit dari tindakan yang baru saja dilakukan pasangan, jadi yang dilepas hanya
 * geraknya — kemunculannya tetap dipudarkan supaya ia tidak muncul seketika tanpa peringatan.
 */
@media (prefers-reduced-motion: reduce) {
  .aruna-toast-enter-active,
  .aruna-toast-leave-active { transition: opacity 120ms linear; }

  .aruna-toast-enter-from,
  .aruna-toast-leave-to { transform: none; }
}
</style>
