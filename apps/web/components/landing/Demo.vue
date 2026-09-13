<script setup lang="ts">
import { ArrowRight, Copy } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { buildGuestUrl } from '@aruna/contracts'

const root = ref<HTMLElement | null>(null)
const demoName = ref('Yosi Susanti')
const guestName = computed(() => demoName.value.trim() || 'Yosi Susanti')
const ready = useInteractiveReady()

useArunaMotion(root, ({ revealText, revealUp, gsap }) => {
  revealText('[data-demo-title]', { trigger: root.value })
  revealUp('[data-demo-reveal]')

  gsap.from('[data-demo-card]', {
    opacity: 0,
    y: 42,
    rotate: -2.5,
    duration: 1,
    ease: 'expo.out',
    scrollTrigger: { trigger: '[data-demo-card]', start: 'top 88%', toggleActions: 'play none none none' },
  })
})

/**
 * Path relatif, bukan URL absolut: origin yang dipakai pengunjung tidak selalu sama dengan
 * `webBase`, dan navigateTo menolak URL yang terbaca sebagai tujuan eksternal.
 */
function demoPath() {
  const url = new URL(buildGuestUrl('http://demo.invalid', 'demo', guestName.value))
  return `${url.pathname}${url.search}`
}

function openDemo() {
  navigateTo(demoPath())
}

async function copyDemo() {
  const url = `${window.location.origin}${demoPath()}`
  try {
    // clipboard hanya ada di secure context; di http biasa properti ini undefined.
    if (!navigator.clipboard) throw new Error('clipboard tidak tersedia')
    await navigator.clipboard.writeText(url)
    toast.success(`Tautan untuk ${guestName.value} berhasil disalin`)
  } catch {
    toast.error(url, { description: 'Salin tautan ini secara manual.', duration: 10000 })
  }
}
</script>

<template>
  <section id="demo" ref="root" class="section relative overflow-hidden bg-surface-inverse text-ink-inverse">
    <div class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />

    <div class="shell relative grid items-center gap-14 lg:grid-cols-[1fr_0.95fr]">
      <div class="grid content-start gap-6">
        <p class="eyebrow text-gold" data-demo-reveal>Coba langsung, tanpa daftar</p>

        <h2 data-demo-title class="font-display text-display-2 font-semibold">
          Jangan percaya kata-kata kami. Buka undangannya.
        </h2>

        <p data-demo-reveal class="max-w-lg text-body-lg text-ink-inverse/70">
          Contoh ini undangan yang sesungguhnya — amplop yang terbuka pelan-pelan, galeri,
          hitung mundur, sampai formulir kehadiran. Semuanya bisa kalian coba sekarang juga.
        </p>

        <!-- Disabled until hydration so a pre-hydration click cannot silently do nothing. -->
        <form data-demo-reveal class="grid sm:max-w-md" @submit.prevent="openDemo">
          <fieldset :disabled="!ready" class="grid gap-3">
            <label for="demo-nama" class="text-[0.8125rem] font-semibold text-ink-inverse/85">Tulis nama tamu (opsional)</label>
            <input
              id="demo-nama"
              v-model="demoName"
              type="text"
              maxlength="200"
              placeholder="dr. Yosi Susanti, Sp.OG"
              class="min-h-12 w-full rounded-md border border-ink-inverse/25 bg-ink-inverse/5 px-3.5 text-ink-inverse placeholder:text-ink-inverse/50 transition-colors duration-200 focus:border-gold focus:outline-none"
            >

            <div class="flex flex-wrap gap-3">
              <UiButton type="submit" tone="gold">
                Buka demo
                <ArrowRight :size="17" aria-hidden="true" />
              </UiButton>
              <button
                type="button"
                class="inline-flex min-h-12 items-center gap-2 rounded-md border border-ink-inverse/25 px-5 text-[0.9375rem] font-semibold text-ink-inverse transition-colors duration-200 hover:bg-ink-inverse/10"
                @click="copyDemo"
              >
                <Copy :size="16" aria-hidden="true" />
                Salin contoh
              </button>
            </div>
          </fieldset>
        </form>
      </div>

      <!-- Paper card standing in for the opened invitation. -->
      <div data-demo-card class="relative mx-auto w-full max-w-sm">
        <div class="absolute inset-0 -rotate-3 rounded-lg bg-gold/25" aria-hidden="true" />
        <div class="absolute inset-0 rotate-2 rounded-lg bg-ink-inverse/10" aria-hidden="true" />

        <div class="relative grid justify-items-center gap-5 rounded-lg bg-[#fffdf7] px-8 py-12 text-ink shadow-veil">
          <span class="pointer-events-none absolute inset-3 rounded-[0.35rem] border border-gold/45" aria-hidden="true" />

          <OrnamentGarland class="h-10 w-40 text-primary/60" />
          <p class="m-0 text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-ink-subtle">Undangan pernikahan</p>

          <p class="m-0 text-center font-garamond text-[1.4rem] leading-snug">
            Kepada Yth.<br>
            <span class="font-semibold">{{ guestName }}</span>
          </p>

          <OrnamentDivider class="h-6 w-44 text-primary/55" />

          <p class="m-0 text-center font-garamond text-[2.6rem] leading-none">Aruna &amp; Dewa</p>
          <p class="m-0 text-caption text-ink-muted">Sabtu, 18 Oktober 2026 · Pendopo Aruna</p>

          <OrnamentBloom class="h-12 w-10 text-sage/70" />
        </div>
      </div>
    </div>
  </section>
</template>
