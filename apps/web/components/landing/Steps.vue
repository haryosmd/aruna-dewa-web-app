<script setup lang="ts">
import { CreditCard, Palette, Send } from 'lucide-vue-next'

const root = ref<HTMLElement | null>(null)

const steps = [
  {
    icon: Palette,
    title: 'Pilih tema dan isi detail acara',
    body: 'Nama kalian, tanggal, dan lokasi acara. Tersimpan otomatis, jadi bisa dilanjutkan kapan saja.',
    meta: '± 4 menit',
  },
  {
    icon: CreditCard,
    title: 'Bayar sekali, undangan langsung aktif',
    body: 'Transfer bank, e-wallet, atau kartu — mana pun yang paling gampang buat kalian. Begitu lunas, undangan siap diterbitkan.',
    meta: 'Sekali bayar, aktif 12 bulan',
  },
  {
    icon: Send,
    title: 'Bagikan tautan personal ke setiap tamu',
    body: 'Masukkan daftar tamu, lalu kirim undangan masing-masing lewat WhatsApp. Jawaban mereka langsung masuk ke daftar kalian.',
    meta: 'Siap dibagikan hari itu juga',
  },
]

useArunaMotion(root, ({ revealText, revealUp, gsap }) => {
  revealText('[data-steps-title]', { trigger: root.value })
  revealUp('[data-steps-intro]')

  // Cards stack: each one shrinks slightly as the next slides over it.
  gsap.utils.toArray<HTMLElement>('[data-step-card]').forEach((card, index, all) => {
    if (index === all.length - 1) return
    gsap.to(card, {
      scale: 0.94,
      opacity: 0.55,
      ease: 'none',
      scrollTrigger: { trigger: all[index + 1], start: 'top 78%', end: 'top 34%', scrub: true },
    })
  })
})
</script>

<template>
  <section id="cara-kerja" ref="root" class="section bg-surface-2">
    <div class="shell grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
      <header class="grid content-start gap-5 lg:sticky lg:top-28 lg:self-start">
        <p class="eyebrow" data-steps-intro>Cara kerja</p>
        <h2 data-steps-title class="font-display text-display-2 font-semibold text-ink">
          Tiga langkah, lalu tinggal bagikan.
        </h2>
        <p data-steps-intro class="text-body-lg text-ink-muted">
          Tidak ada yang perlu dibeli atau dipasang — baik oleh kalian maupun tamu.
        </p>
        <OrnamentDivider data-steps-intro class="h-6 w-52 text-primary/50" />
      </header>

      <ol class="m-0 grid list-none gap-5 p-0">
        <li
          v-for="(step, index) in steps"
          :key="step.title"
          data-step-card
          class="lg:sticky"
          :style="{ top: `calc(7rem + ${index * 1.25}rem)` }"
        >
          <div class="grid gap-5 rounded-xl border border-border bg-surface p-7 shadow-lift sm:p-9">
            <div class="flex items-center justify-between gap-4">
              <span class="grid h-12 w-12 place-items-center rounded-full bg-ink text-ink-inverse">
                <component :is="step.icon" :size="20" aria-hidden="true" />
              </span>
              <span class="font-display text-[3.5rem] leading-none text-ink-subtle/85" aria-hidden="true">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
            </div>

            <div class="grid gap-2.5">
              <h3 class="m-0 font-display text-h2 font-semibold text-ink">{{ step.title }}</h3>
              <p class="m-0 max-w-lg text-[0.9375rem] text-ink-muted">{{ step.body }}</p>
            </div>

            <UiBadge tone="primary">{{ step.meta }}</UiBadge>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
