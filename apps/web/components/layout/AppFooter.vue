<script setup lang="ts">
import { ArrowUpRight, Instagram, Mail, MessageCircle } from 'lucide-vue-next'

const year = new Date().getFullYear()
const contact = useRuntimeConfig().public
const auth = useAuthStore()

/** `href: null` berarti tindakan, bukan tujuan — dirender sebagai tombol. */
type FooterLink = [label: string, href: string | null]

/**
 * Peta situs tetap peta situs, tapi tidak boleh menawarkan "Masuk" kepada orang yang jelas
 * sudah masuk. Plugin `auth.server` sudah mengisi store sebelum render, jadi sisi server dan
 * sisi browser menyepakati isi yang sama dan tidak ada kedipan saat hidrasi.
 */
const columns = computed<{ title: string; links: FooterLink[] }[]>(() => [
  { title: 'Produk', links: [['Tema undangan', '/#tema'], ['Fitur', '/#fitur'], ['Harga', '/#harga'], ['Lihat demo', '/i/demo']] },
  {
    title: 'Bantuan',
    links: [
      ['Cara kerja', '/#cara-kerja'],
      ['Pertanyaan umum', '/#faq'],
      ...(auth.me
        ? ([['Dashboard', '/dashboard'], ['Keluar', null]] satisfies FooterLink[])
        : ([['Masuk', '/login'], ['Daftar', '/register']] satisfies FooterLink[])),
    ],
  },
])
</script>

<template>
  <footer class="bg-surface-inverse text-ink-inverse">
    <div class="shell grid gap-14 py-16 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:py-20">
      <div class="grid gap-5 content-start">
        <BrandLogo tone="inverse" />
        <p class="max-w-xs text-[0.9375rem] leading-relaxed text-ink-inverse/70">
          Undangan pernikahan digital yang digarap seperti undangan cetak — lengkap dengan ucapan, daftar tamu, dan konfirmasi kehadiran di satu tempat.
        </p>
      </div>

      <div v-for="column in columns" :key="column.title" class="grid content-start gap-4">
        <p class="text-caption font-semibold uppercase tracking-[0.14em] text-ink-inverse/50">{{ column.title }}</p>
        <ul class="grid gap-2.5 p-0 m-0 list-none">
          <li v-for="[label, href] in column.links" :key="label">
            <NuxtLink v-if="href" :to="href" class="text-[0.9375rem] text-ink-inverse/80 no-underline transition-colors duration-200 hover:text-ink-inverse">
              {{ label }}
            </NuxtLink>
            <button v-else type="button" class="cursor-pointer border-0 bg-transparent p-0 text-left font-inherit text-[0.9375rem] text-ink-inverse/80 no-underline transition-colors duration-200 hover:text-ink-inverse" @click="auth.logout()">
              {{ label }}
            </button>
          </li>
        </ul>
      </div>

      <div class="grid content-start gap-4">
        <p class="text-caption font-semibold uppercase tracking-[0.14em] text-ink-inverse/50">Hubungi kami</p>
        <a v-if="contact.whatsapp" :href="`https://wa.me/${contact.whatsapp}`" class="inline-flex items-center gap-2 text-[0.9375rem] text-ink-inverse/80 no-underline transition-colors hover:text-ink-inverse">
          <MessageCircle :size="17" aria-hidden="true" /> WhatsApp
          <ArrowUpRight :size="14" aria-hidden="true" />
        </a>
        <a :href="`mailto:${contact.email}`" class="inline-flex items-center gap-2 text-[0.9375rem] text-ink-inverse/80 no-underline transition-colors hover:text-ink-inverse">
          <Mail :size="17" aria-hidden="true" /> {{ contact.email }}
        </a>
        <a v-if="contact.instagram" :href="`https://instagram.com/${contact.instagram}`" class="inline-flex items-center gap-2 text-[0.9375rem] text-ink-inverse/80 no-underline transition-colors hover:text-ink-inverse">
          <Instagram :size="17" aria-hidden="true" /> @{{ contact.instagram }}
          <ArrowUpRight :size="14" aria-hidden="true" />
        </a>
      </div>
    </div>

    <div class="border-t border-ink-inverse/12">
      <div class="shell flex flex-col gap-2 py-6 text-caption text-ink-inverse/55 sm:flex-row sm:items-center sm:justify-between">
        <p class="m-0">© {{ year }} Aruna Dewa</p>
        <p class="m-0">Dibuat di Yogyakarta.</p>
      </div>
    </div>
  </footer>
</template>
