<script setup lang="ts">
import { ArrowRight, ShieldCheck } from 'lucide-vue-next'
import { catalog as catalogFallback } from '@aruna/contracts'
import type { Catalog } from '~/types/aruna'

const root = ref<HTMLElement | null>(null)
const { request } = useApi()
const { label: featureLabel, icon: featureIcon } = useFeatureLabels()

const { data: catalog, error } = await useAsyncData('catalog', () => request<Catalog>('/catalog'))

// Harga berasal dari sumber yang sama dengan API, jadi blok harga tidak pernah kosong
// hanya karena permintaan katalog gagal.
const packages = computed(() => catalog.value?.packages ?? catalogFallback.packages)
const addons = computed(() => catalog.value?.addons ?? catalogFallback.addons)
/**
 * Tiap kartu hanya menampilkan fitur yang benar-benar termasuk. Sebelumnya semua kartu
 * merender gabungan seluruh fitur dengan baris tercoret, sehingga paket termurah terbaca
 * sebagai daftar kekurangan alih-alih daftar isi.
 */
const inheritedFrom = (index: number) => (index > 0 ? packages.value[index - 1]!.name : '')
function ownFeatures(index: number) {
  const pack = packages.value[index]!
  const previous = new Set(index > 0 ? packages.value[index - 1]!.features : [])
  return pack.features.filter(feature => !previous.has(feature))
}

/** Paket tengah yang direkomendasikan — bukan yang termahal. */
const recommended = computed(() => packages.value[Math.min(1, packages.value.length - 1)]?.id)

const blurbs: Record<string, string> = {
  mula: 'Semua yang dibutuhkan untuk undangan yang rapi dan lengkap.',
  mekar: 'Cerita, hadiah, rundown, dan dresscode — pilihan sebagian besar pasangan.',
  purnama: 'Semuanya terbuka, termasuk video dan kebebasan mengatur warna, font, dan urutan.',
}

useArunaMotion(root, ({ revealText, revealUp }) => {
  revealText('[data-pricing-title]', { trigger: root.value })
  revealUp('[data-pricing-reveal]', { y: 32, stagger: 0.1 })
})
</script>

<template>
  <section id="harga" ref="root" class="section bg-surface">
    <div class="shell grid gap-12">
      <header class="grid max-w-2xl gap-5">
        <p class="eyebrow" data-pricing-reveal>Harga</p>
        <h2 data-pricing-title class="font-display text-display-2 font-semibold text-ink">
          Sekali bayar. Aktif setahun penuh.
        </h2>
        <p data-pricing-reveal class="text-body-lg text-ink-muted">
          Tidak ada langganan bulanan dan tidak ada biaya per tamu. Butuh satu fitur saja dari paket atas?
          Ambil sebagai add-on tanpa naik paket.
        </p>
      </header>

      <div v-if="!catalog && !error" class="grid gap-5 lg:grid-cols-3">
        <UiSkeleton v-for="index in 3" :key="index" class="h-[30rem]" />
      </div>

      <div v-else class="grid items-start gap-5 lg:grid-cols-3">
        <article
          v-for="(pack, packIndex) in packages"
          :key="pack.id"
          data-pricing-reveal
          :class="cn(
            'relative grid min-w-0 content-start gap-6 rounded-xl border p-6 sm:p-8',
            pack.id === recommended
              ? 'border-ink bg-ink text-ink-inverse shadow-veil'
              : 'border-border bg-surface shadow-lift',
          )"
        >
          <UiBadge v-if="pack.id === recommended" tone="gold" class="absolute -top-3 left-7">
            Paling dipilih
          </UiBadge>

          <div class="grid justify-items-start gap-2">
            <!-- Penanda kecil supaya tiap paket punya wajah, bukan hanya nama. -->
            <OrnamentGlyph
              :glyph="packIndex === 0 ? 'sprig' : packIndex === 1 ? 'bloom' : 'monogram-laurel'"
              :class="cn('h-8 w-7', pack.id === recommended ? 'text-gold' : 'text-primary')"
              aria-hidden="true"
            />
            <!--
              Nama paket dulu `text-h3` (maks 1,6rem) sementara harganya 3,25rem, jadi
              identitas paket kalah oleh angkanya. Sekarang namanya yang memimpin.
            -->
            <h3 :class="cn('m-0 font-display text-[2rem] sm:text-[2.25rem] leading-tight font-semibold', pack.id === recommended ? 'text-ink-inverse' : 'text-ink')">
              {{ pack.name }}
            </h3>
            <p :class="cn('m-0 text-[0.9375rem]', pack.id === recommended ? 'text-ink-inverse/65' : 'text-ink-muted')">
              {{ blurbs[pack.id] ?? 'Undangan digital lengkap, sekali bayar.' }}
            </p>
          </div>

          <p class="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span :class="cn('font-display text-[2rem] sm:text-[2.5rem] leading-none font-semibold', pack.id === recommended ? 'text-gold' : 'text-ink')">
              {{ formatRupiah(pack.price) }}
            </span>
            <span :class="cn('text-caption', pack.id === recommended ? 'text-ink-inverse/60' : 'text-ink-subtle')">/ 12 bulan</span>
          </p>

          <UiButton
            as="NuxtLink"
            :to="`/order?package=${pack.id}`"
            :tone="pack.id === recommended ? 'gold' : 'primary'"
            size="lg"
            block
          >
            Pilih {{ pack.name }}
            <ArrowRight :size="17" aria-hidden="true" />
          </UiButton>

          <div class="grid gap-2.5">
            <p
              v-if="packIndex > 0"
              :class="cn('m-0 text-caption font-semibold', pack.id === recommended ? 'text-ink-inverse/70' : 'text-ink-muted')"
            >
              Semua isi {{ inheritedFrom(packIndex) }}, plus:
            </p>

            <ul class="m-0 grid gap-2.5 p-0 list-none">
              <li
                v-for="feature in ownFeatures(packIndex)"
                :key="feature"
                :class="cn('flex items-start gap-2.5 text-[0.9375rem]', pack.id === recommended ? 'text-ink-inverse/90' : 'text-ink')"
              >
                <component
                  :is="featureIcon(feature)"
                  :size="17"
                  :class="cn('mt-0.5 shrink-0', pack.id === recommended ? 'text-gold' : 'text-primary')"
                  aria-hidden="true"
                />
                <span>{{ featureLabel(feature) }}</span>
              </li>
            </ul>
          </div>
        </article>
      </div>

      <div v-if="addons.length" data-pricing-reveal class="grid gap-4 rounded-xl border border-border bg-surface-2 p-7">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="m-0 text-[1.0625rem] font-semibold text-ink">Add-on satuan</h3>
          <p class="m-0 text-caption text-ink-subtle">Bisa ditambahkan ke paket mana pun yang belum memuatnya</p>
        </div>
        <ul class="m-0 flex flex-wrap gap-2 p-0 list-none">
          <li
            v-for="addon in addons"
            :key="addon.id"
            class="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3.5 py-2 text-[0.875rem] text-ink"
          >
            {{ addon.name }}
            <span class="font-semibold text-primary">{{ formatRupiah(addon.price) }}</span>
          </li>
        </ul>
      </div>

      <p data-pricing-reveal class="flex items-start gap-2.5 text-[0.9375rem] text-ink-muted">
        <ShieldCheck :size="19" class="mt-0.5 shrink-0 text-sage" aria-hidden="true" />
        Pembayaran diproses lewat Midtrans. Undangan aktif begitu pembayaran lunas, dan isinya tetap
        bisa kalian ubah setelah terbit.
      </p>
    </div>
  </section>
</template>
