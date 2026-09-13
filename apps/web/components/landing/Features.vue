<script setup lang="ts">
import { CalendarHeart, CheckCheck, Image, Music4, PencilRuler, Sparkles, TableProperties, UserRoundCheck } from 'lucide-vue-next'

const root = ref<HTMLElement | null>(null)

useArunaMotion(root, ({ revealText, revealUp, countUp }) => {
  revealText('[data-features-title]', { trigger: root.value })
  revealUp('[data-feature]', { y: 34, stagger: 0.07 })

  const hadir = root.value?.querySelector('[data-count-hadir]')
  if (hadir) countUp(hadir, 182)
})

const small = [
  { icon: TableProperties, title: 'Impor dari spreadsheet', body: 'Tempel daftar tamu dari spreadsheet, periksa dulu nama dan jumlahnya, baru disimpan.' },
  { icon: PencilRuler, title: 'Editor dengan pratinjau', body: 'Ubah warna, font, dan urutan section — hasilnya langsung terlihat di sebelahnya.' },
  { icon: CalendarHeart, title: 'Simpan ke kalender', body: 'Tamu menambahkan akad dan resepsi ke kalender mereka dalam satu ketukan.' },
  { icon: Image, title: 'Galeri & musik', body: 'Foto pilihan kalian dan lagu yang mengiringi, tanpa bikin undangan jadi berat.' },
]
</script>

<template>
  <section id="fitur" ref="root" class="section bg-surface">
    <div class="shell grid gap-12">
      <header class="grid max-w-2xl gap-5">
        <p class="eyebrow">Rapi di belakang layar</p>
        <h2 data-features-title class="font-display text-display-2 font-semibold text-ink">
          Kalian mengurus acara. Undangannya mengurus dirinya sendiri.
        </h2>
      </header>

      <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <!-- Anchor cell: the differentiator gets the most room. -->
        <article data-feature class="group relative overflow-hidden rounded-xl border border-border bg-surface-2 p-7 md:col-span-2 md:row-span-2">
          <OrnamentSprig class="pointer-events-none absolute -right-4 -top-6 h-44 w-28 text-primary/15" />

          <div class="relative grid h-full content-between gap-8">
            <div class="grid gap-3">
              <span class="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
                <UserRoundCheck :size="21" aria-hidden="true" />
              </span>
              <h3 class="m-0 font-display text-h2 font-semibold text-ink">Satu tautan per tamu</h3>
              <p class="m-0 max-w-md text-[0.9375rem] text-ink-muted">
                Setiap tamu punya undangannya sendiri, lengkap dengan namanya. Tidak ada lagi konfirmasi
                ganda atau nama yang tertukar saat kalian menghitung.
              </p>
            </div>

            <ul class="m-0 grid gap-2 p-0 list-none">
              <li
                v-for="(name, index) in ['dr. Yosi Susanti, Sp.OG', 'Keluarga Bapak Hartono', 'Nadia & Rendra']"
                :key="name"
                class="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3.5 py-2.5 text-[0.875rem]"
              >
                <span class="truncate text-ink">{{ name }}</span>
                <span
                  :class="cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold',
                    index === 2 ? 'bg-surface-3 text-ink-muted' : 'bg-sage-soft text-sage',
                  )"
                >{{ index === 2 ? 'Menunggu' : 'Hadir' }}</span>
              </li>
            </ul>
          </div>
        </article>

        <!-- RSVP counter cell -->
        <article data-feature class="grid content-between gap-6 rounded-xl border border-border bg-ink p-7 text-ink-inverse md:col-span-2">
          <div class="grid gap-3">
            <span class="grid h-11 w-11 place-items-center rounded-full bg-ink-inverse/10 text-gold">
              <CheckCheck :size="21" aria-hidden="true" />
            </span>
            <h3 class="m-0 font-display text-h3 font-semibold">RSVP masuk sendiri ke daftar kalian</h3>
            <p class="m-0 text-[0.9375rem] text-ink-inverse/65">
              Kehadiran, jumlah orang, dan doa mereka berkumpul di satu daftar rapi yang bisa kalian unduh.
            </p>
          </div>

          <div class="flex items-end gap-6">
            <p class="m-0 font-display text-[3.25rem] leading-none text-gold">
              <span data-count-hadir>182</span>
            </p>
            <p class="m-0 pb-2 text-caption text-ink-inverse/60">
              tamu sudah konfirmasi<br>dari 240 undangan terkirim
              <span class="mt-1 block text-ink-inverse/75">Contoh tampilan daftar kalian</span>
            </p>
          </div>
        </article>

        <article
          v-for="feature in small"
          :key="feature.title"
          data-feature
          class="grid content-start gap-3 rounded-xl border border-border bg-surface p-6 transition-[border-color,box-shadow,transform] duration-300 ease-out-quart hover:-translate-y-1 hover:border-border-strong hover:shadow-lift md:col-span-1"
        >
          <span class="grid h-10 w-10 place-items-center rounded-full bg-surface-3 text-ink">
            <component :is="feature.icon" :size="19" aria-hidden="true" />
          </span>
          <h3 class="m-0 text-[1.0625rem] font-semibold text-ink">{{ feature.title }}</h3>
          <p class="m-0 text-[0.9375rem] text-ink-muted">{{ feature.body }}</p>
        </article>

        <article data-feature class="flex items-center gap-4 rounded-xl border border-border bg-gold-soft p-6 md:col-span-2 lg:col-span-4">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold text-ink">
            <Sparkles :size="20" aria-hidden="true" />
          </span>
          <div class="grid gap-1">
            <h3 class="m-0 text-[1.0625rem] font-semibold text-ink">Ringan dibuka di HP mana pun</h3>
            <p class="m-0 text-[0.9375rem] text-ink-muted">
              Terbuka cepat meski sinyal pas-pasan, dan musiknya tidak pernah mengagetkan tamu.
            </p>
          </div>
          <Music4 :size="22" class="ml-auto hidden shrink-0 text-ink-subtle sm:block" aria-hidden="true" />
        </article>
      </div>
    </div>
  </section>
</template>
