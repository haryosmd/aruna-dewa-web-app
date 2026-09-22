<script setup lang="ts">
import { Download, Share2 } from 'lucide-vue-next'
import type { ShareCardStyle } from '@aruna/contracts'
import type { InvitationDocument } from '~/types/aruna'
import { fontStack } from '~/utils/theme'

/**
 * Pratinjau kartu bagikan 1200×630 di panggung (fase 72.7), meniru referensi: lencana "PREVIEW
 * WHATSAPP / OPEN GRAPH", tombol Unduh, kartu maroon dengan "UNDANGAN PERNIKAHAN", nama script,
 * garis emas, "KEPADA YTH." dan nama tamu contoh, lalu catatan bahwa nama contoh tidak disimpan.
 *
 * Ini pratinjau HTML dari aturan yang sama dengan PNG server (`/public/share-card/:slug.png`);
 * yang dibagikan tamu adalah PNG-nya — tautan Unduh menunjuk ke sana.
 */
const props = defineProps<{ document: InvitationDocument; slug: string; pngUrl: string }>()

const kartu = computed<ShareCardStyle>(() => props.document.shareCard ?? {})
const at = (type: string) => props.document.sections.find(section => section.type === type)?.data as Record<string, unknown> | undefined

const pasangan = computed(() => {
  const couple = at('couple')
  if (couple?.brideName && couple?.groomName) return `${couple.brideName} & ${couple.groomName}`
  if (couple?.partner1 && couple?.partner2) return `${couple.partner1} & ${couple.partner2}`
  return String(at('opening-envelope')?.title ?? at('cover')?.title ?? 'Aruna & Dewa')
})
const tanggal = computed(() => {
  const event = at('event')
  return event ? [event.day, event.date, event.monthYear].filter(Boolean).join(', ').replace(', ', ' ') : ''
})
const lokasi = computed(() => String(at('map')?.title ?? ''))
const foto = computed(() => kartu.value.imageUrl || String(at('hero')?.imageUrl ?? at('cover')?.image ?? ''))

const gaya = computed(() => kartu.value.styleId ?? 'template')
const latar = computed(() => kartu.value.backgroundMode ?? 'template')
const aksen = computed(() => kartu.value.accent ?? '#D2A24B')
const teks = computed(() => kartu.value.text ?? '#FFF7E8')
const rata = computed(() => kartu.value.textAlign ?? 'center')
const warnaLatar = computed(() => latar.value === 'warna' ? (kartu.value.backgroundColor ?? props.document.tokens.primary) : gaya.value === 'minimal' ? '#0F172A' : `color-mix(in srgb, ${props.document.tokens.primary} 55%, #2a1410)`)
</script>

<template>
  <div class="grid gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="flex items-center gap-1.5 rounded-full border border-success/40 bg-success-soft px-3 py-1 text-ui-label font-bold uppercase tracking-[0.14em] text-success">
        <Share2 :size="13" aria-hidden="true" />
        Preview WhatsApp / Open Graph
      </span>
      <UiButton id="editor-kartu-unduh" as="a" :href="pngUrl" target="_blank" rel="noopener" tone="outline" size="sm">
        <Download :size="15" aria-hidden="true" />
        Unduh PNG
      </UiButton>
    </div>

    <div
      id="editor-kartu-preview"
      class="relative aspect-[1200/630] w-full overflow-hidden rounded-xl shadow-float"
      :style="{ background: warnaLatar, color: teks, fontFamily: fontStack('jakarta') }"
    >
      <img v-if="latar === 'foto' && foto" :src="foto" alt="" class="absolute inset-0 h-full w-full object-cover">
      <span v-if="latar === 'foto'" class="absolute inset-0 bg-black/55" aria-hidden="true" />
      <template v-if="gaya === 'template' && latar !== 'foto'">
        <span class="pointer-events-none absolute -left-[10%] top-[30%] h-[120%] w-[45%] rounded-full border" :style="{ borderColor: `color-mix(in srgb, ${aksen} 35%, transparent)` }" aria-hidden="true" />
        <span class="pointer-events-none absolute -right-[12%] -top-[50%] h-[120%] w-[45%] rounded-full border" :style="{ borderColor: `color-mix(in srgb, ${aksen} 35%, transparent)` }" aria-hidden="true" />
      </template>
      <span v-if="gaya === 'elegan'" class="pointer-events-none absolute inset-[4%] border" :style="{ borderColor: aksen }" aria-hidden="true" />
      <span v-if="gaya === 'elegan'" class="pointer-events-none absolute inset-[5.5%] border opacity-60" :style="{ borderColor: aksen }" aria-hidden="true" />

      <div :class="cn('relative grid h-full gap-[2%] px-[8%] py-[7%]', rata === 'center' ? 'place-content-center justify-items-center text-center' : 'content-center justify-items-start text-left')">
        <p class="m-0 text-[clamp(0.55rem,1.6cqw,1rem)] font-bold uppercase tracking-[0.32em]" :style="{ color: aksen }">Undangan Pernikahan</p>
        <p class="m-0 text-[clamp(1.6rem,6cqw,3.6rem)] leading-none" :style="{ fontFamily: fontStack('great-vibes') }">{{ pasangan }}</p>
        <span class="my-[1%] block h-px w-[14%]" :style="{ background: aksen }" aria-hidden="true" />
        <template v-if="kartu.showGuestName !== false">
          <p class="m-0 text-[clamp(0.55rem,1.5cqw,0.95rem)] font-bold uppercase tracking-[0.3em]" :style="{ color: aksen }">Kepada Yth.</p>
          <p class="m-0 text-[clamp(1.4rem,5cqw,3rem)] font-extrabold leading-tight">Bpk. Budi Santoso</p>
        </template>
        <p v-if="kartu.showDate && tanggal" class="m-0 text-[clamp(0.6rem,1.6cqw,1rem)] opacity-90">{{ tanggal }}</p>
        <p v-if="kartu.showVenue && lokasi" class="m-0 text-[clamp(0.6rem,1.6cqw,1rem)] opacity-90">{{ lokasi }}</p>
      </div>
    </div>

    <p class="m-0 rounded-md border border-success/30 bg-success-soft/50 p-3.5 text-caption leading-relaxed text-ink-muted">
      <strong class="block text-ink">Preview kartu saat dibagikan ke WhatsApp</strong>
      Kartu di atas tampil sebagai preview ketika tautan undangan dibagikan. Nama penerima mengikuti tamu yang dipilih pada Generator; nama Bpk. Budi Santoso di atas hanya contoh dan tidak disimpan.
    </p>
  </div>
</template>
