<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

const root = ref<HTMLElement | null>(null)

/**
 * Native <details> on purpose: it opens without JavaScript, it is searchable by the
 * browser's find-in-page, and the accessibility tree needs no ARIA of our own.
 */
const items: [string, string][] = [
  ['Bisakah undangan diedit setelah dibuat?', 'Bisa. Isi, foto, warna, dan susunannya tetap dapat diubah setelah undangan terbit — dan kalian yang menentukan kapan tamu mulai melihat perubahannya.'],
  ['Apakah tamu perlu memasang aplikasi?', 'Tidak. Tamu cukup mengetuk tautannya di HP. Undangan tetap ringan dibuka meski sinyalnya pas-pasan.'],
  ['Bagaimana cara tamu melakukan RSVP?', 'Setiap tamu menerima undangannya sendiri. Di sana mereka mengabari hadir atau tidak, menyebut jumlah orang sesuai jatah yang kalian tetapkan, dan boleh menitipkan doa.'],
  ['Berapa lama undangan aktif?', 'Dua belas bulan sejak pembayaran lunas. Selama itu undangan, daftar kehadiran, dan semua doa yang masuk tetap bisa kalian buka.'],
  ['Alamat undangannya seperti apa?', 'Alamatnya memakai nama kalian, jadi mudah diingat dan enak dilihat saat dikirim ke tamu.'],
  ['Bagaimana kalau saya butuh bantuan saat menyusun?', 'Hubungi kami lewat kontak di bagian bawah halaman ini. Kami bantu sampai undangan siap dibagikan.'],
]

useArunaMotion(root, ({ revealText, revealUp }) => {
  revealText('[data-faq-title]', { trigger: root.value })
  revealUp('[data-faq-item]', { y: 18, stagger: 0.05 })
})
</script>

<template>
  <section id="faq" ref="root" class="section bg-surface">
    <div class="shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
      <header class="grid content-start gap-5">
        <p class="eyebrow">Pertanyaan umum</p>
        <h2 data-faq-title class="font-display text-display-2 font-semibold text-ink">
          Hal yang biasanya ditanyakan duluan.
        </h2>
        <OrnamentSprig class="h-28 w-20 text-sage/45" />
      </header>

      <div class="grid">
        <details
          v-for="([question, answer], index) in items"
          :key="question"
          data-faq-item
          :class="cn('group border-b border-border', index === 0 && 'border-t')"
        >
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-5 py-6 font-display text-h3 font-semibold text-ink transition-colors duration-200 hover:text-primary [&::-webkit-details-marker]:hidden"
          >
            {{ question }}
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border-strong text-ink-muted transition-transform duration-300 ease-out-quart group-open:rotate-45 group-open:border-primary group-open:text-primary">
              <Plus :size="17" aria-hidden="true" />
            </span>
          </summary>
          <p class="mb-6 max-w-2xl text-[0.9375rem] text-ink-muted">{{ answer }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
