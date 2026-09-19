<script setup lang="ts">
import { Lock, RotateCcw } from 'lucide-vue-next'
import type { LayerSlot, OrnamentId, OrnamentSet } from '~/utils/ornaments'
import { ornament } from '~/utils/ornaments'
import {
  jumlahDiganti, layerSlotLabels, layerSlots, ornamentSlots, slotLabels, terapkanOverrides,
  type OrnamentOverrides, type OrnamentSlotKey,
} from '~/utils/ornament-slots'
import { ornamentRamp, rampStyle } from '~/utils/ornament-palette'
import DashboardOrnamentSlotCard from './SlotCard.vue'

/**
 * Ringkasan ornamen di panel pengaturan editor.
 *
 * Menggantikan empat grid ubin yang dulu dijejalkan ke kolom selebar 528px. Sejak fase 70
 * bentuknya empat belas **ubin berlabel** dalam dua kolom (`SlotCard.vue`): pratinjau, nama
 * slot, nama glyph, satu tombol yang membuka Studio pada slot itu. Hint dan syarat slot tidak
 * lagi ditulis di sini — mereka menjelaskan slotnya, bukan pilihannya, dan sudah ada di header
 * Studio saat slot itu dibuka. Ruang untuk memilih tetap di dialognya sendiri.
 *
 * Kelima jangkar ladang dilipat di balik `<details>`, karena mereka keping latar yang jarang
 * disentuh dan membuka semuanya sekaligus akan mengubur sembilan slot yang justru dilihat tamu
 * secara langsung.
 */
const props = defineProps<{
  set: OrnamentSet
  overrides: OrnamentOverrides
  tokens: { background: string, foreground: string, primary: string }
  accent: string
  terkunci: boolean
  lockedBy?: string
  /**
   * Fase 71: hanya slot yang dirender bagian yang sedang disunting (`sectionOrnamentSlots`).
   * Bila diberi, kartu ini jadi "Ornamen di bagian ini": tanpa keping latar, tanpa tombol
   * kembalikan-semua (keduanya milik ringkasan penuh di cover), dan kalimatnya mengatakan
   * bahwa nilainya tetap berlaku di setiap bagian yang memakai keping yang sama.
   */
  slots?: readonly OrnamentSlotKey[]
}>()

const emit = defineEmits<{
  buka: [{ slot?: OrnamentSlotKey, layer?: LayerSlot }]
  kembalikanSemua: []
}>()

const berlaku = computed(() => terapkanOverrides(props.set, props.overrides))
const diganti = computed(() => jumlahDiganti(props.overrides))
const ramp = computed(() => rampStyle(ornamentRamp(props.tokens, props.accent)))

const tersaring = computed(() => props.slots !== undefined)
const baris = computed(() => (props.slots ?? ornamentSlots).map(slot => ({
  kunci: slot as string,
  slot,
  layer: undefined as LayerSlot | undefined,
  glyph: berlaku.value[slot],
  // Unggahan (fase 69) juga penukaran — kartu harus menandainya "Diganti".
  bawaan: !props.overrides[slot] && !(props.overrides.unggahan && slot in props.overrides.unggahan),
  ...slotLabels[slot],
})))

const barisLayer = computed(() => layerSlots.map(jangkar => {
  const glyph = berlaku.value.layers.find(id => ornament(id).slot === jangkar) as OrnamentId
  return {
    kunci: `layer-${jangkar}`,
    slot: undefined as OrnamentSlotKey | undefined,
    layer: jangkar,
    glyph,
    bawaan: !props.overrides.layers?.[jangkar],
    ...layerSlotLabels[jangkar],
  }
}))
</script>

<template>
  <div class="grid gap-3 rounded-md border border-border bg-surface-2 p-3.5">
    <div class="grid gap-1">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="m-0 text-[0.9375rem] font-semibold text-ink">{{ tersaring ? 'Ornamen di bagian ini' : 'Ornamen' }}</h3>
        <span v-if="diganti && !tersaring" class="text-caption text-ink-muted">{{ diganti }} diganti dari bawaan tema</span>
      </div>
      <p v-if="tersaring" class="m-0 text-caption text-ink-subtle">
        Keping yang dipakai bagian ini. Satu keping dipakai beberapa bagian sekaligus, jadi
        mengganti di sini mengubah semuanya; ringkasan lengkapnya ada di Cover pembuka.
      </p>
      <p v-else class="m-0 text-caption text-ink-subtle">
        Seluruh bank terbuka. Yang disarankan tampil lebih dulu; yang tidak seresep dengan tema
        tetap bisa dipilih dan diberi tanda.
      </p>
    </div>

    <p v-if="terkunci" id="ornament-locked" class="m-0 flex items-start gap-2 rounded-md border border-border bg-surface p-3 text-[0.8125rem] text-ink-muted">
      <Lock :size="15" class="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
      <span>
        Mengganti ornamen terkunci pada preset undangan ini.
        <span v-if="lockedBy" class="text-ink">{{ lockedBy }}</span>
      </span>
    </p>

    <ul class="m-0 grid list-none grid-cols-2 gap-2 p-0">
      <li v-for="row in baris" :key="row.kunci">
        <DashboardOrnamentSlotCard
          :kunci="row.kunci"
          :label="row.label"
          :glyph="row.glyph"
          :bawaan="row.bawaan"
          :ramp="ramp"
          :terkunci="terkunci"
          @buka="emit('buka', { slot: row.slot, layer: row.layer })"
        />
      </li>
    </ul>

    <details v-if="!tersaring" class="rounded-md border border-border bg-surface">
      <summary class="cursor-pointer list-none px-3 py-2.5 text-[0.8125rem] font-medium text-ink">
        Keping latar bagian
        <span class="ml-1 text-caption font-normal text-ink-subtle">lima jangkar ladang ornamen</span>
      </summary>
      <ul class="m-0 grid list-none grid-cols-2 gap-2 p-2 pt-0">
        <li v-for="row in barisLayer" :key="row.kunci">
          <DashboardOrnamentSlotCard
            :kunci="row.kunci"
            :label="row.label"
            :glyph="row.glyph"
            :bawaan="row.bawaan"
            :ramp="ramp"
            :terkunci="terkunci"
            @buka="emit('buka', { slot: row.slot, layer: row.layer })"
          />
        </li>
      </ul>
    </details>

    <!--
      Jalan keluar dari wajah campuran.

      Sejak fase 59 penukaran BERTAHAN saat tema diganti — penyaringnya berbasis kategori, bukan
      lagi kolam per tema, jadi tidak ada lagi pelepasan otomatis. Itu perilaku yang benar untuk
      pemilih bebas, tapi tanpa tombol ini pasangan yang sudah menukar enam slot lalu mencoba tema
      lain tidak punya cara kembali selain menukarnya satu per satu.
    -->
    <UiButton
      v-if="diganti && !tersaring"
      id="ornament-kembalikan-semua"
      tone="quiet"
      size="sm"
      class="justify-self-start"
      :disabled="terkunci"
      @click="emit('kembalikanSemua')"
    >
      <RotateCcw :size="15" aria-hidden="true" />
      Kembalikan seluruh ornamen ke bawaan tema
    </UiButton>
  </div>
</template>
