<script setup lang="ts">
import { Lock, RotateCcw } from 'lucide-vue-next'
import type { LayerSlot, OrnamentId, OrnamentSet } from '~/utils/ornaments'
import { ornament } from '~/utils/ornaments'
import {
  jumlahDiganti, layerSlotLabels, layerSlots, ornamentSlots, slotLabels, terapkanOverrides, tileWidth,
  type OrnamentOverrides, type OrnamentSlotKey,
} from '~/utils/ornament-slots'
import { ornamentRamp, rampStyle } from '~/utils/ornament-palette'

/**
 * Ringkasan ornamen di panel pengaturan editor.
 *
 * Menggantikan empat grid ubin yang dulu dijejalkan ke kolom selebar 528px. Empat belas baris
 * ternyata **lebih ringkas** daripada empat grid: tiap baris satu pratinjau kecil, namanya, dan
 * satu tombol yang membuka Studio pada slot itu. Ruang untuk memilih pindah ke dialognya sendiri.
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
}>()

const emit = defineEmits<{
  buka: [{ slot?: OrnamentSlotKey, layer?: LayerSlot }]
  kembalikanSemua: []
}>()

const berlaku = computed(() => terapkanOverrides(props.set, props.overrides))
const diganti = computed(() => jumlahDiganti(props.overrides))
const ramp = computed(() => rampStyle(ornamentRamp(props.tokens, props.accent)))

const baris = computed(() => ornamentSlots.map(slot => ({
  kunci: slot as string,
  slot,
  layer: undefined as LayerSlot | undefined,
  glyph: berlaku.value[slot],
  bawaan: !props.overrides[slot],
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
        <h3 class="m-0 text-[0.9375rem] font-semibold text-ink">Ornamen</h3>
        <span v-if="diganti" class="text-caption text-ink-muted">{{ diganti }} diganti dari bawaan tema</span>
      </div>
      <p class="m-0 text-caption text-ink-subtle">
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

    <ul class="m-0 grid list-none gap-1.5 p-0">
      <li v-for="row in baris" :key="row.kunci">
        <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-surface p-2">
          <span class="grid h-11 place-items-center" :style="{ ...ramp, width: tileWidth(row.glyph, 40, 96) }">
            <OrnamentGlyph :glyph="row.glyph" ubin class="max-h-10 max-w-full text-[color:var(--iv-orn-body)]" aria-hidden="true" />
          </span>
          <span class="grid gap-0.5">
            <span class="text-[0.8125rem] font-medium text-ink">
              {{ row.label }}
              <span v-if="!row.bawaan" class="ml-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">Diganti</span>
            </span>
            <span class="text-caption text-ink-subtle">{{ ornament(row.glyph).name }} · {{ row.hint }}</span>
            <span v-if="row.syarat" class="text-caption text-ink-muted">{{ row.syarat }}</span>
          </span>
          <UiButton
            :id="`ornament-ganti-${row.kunci}`"
            tone="outline"
            size="sm"
            :disabled="terkunci"
            :aria-describedby="terkunci ? 'ornament-locked' : undefined"
            @click="emit('buka', { slot: row.slot, layer: row.layer })"
          >
            Ganti<span class="sr-only"> {{ row.label.toLowerCase() }}</span>
          </UiButton>
        </div>
      </li>
    </ul>

    <details class="rounded-md border border-border bg-surface">
      <summary class="cursor-pointer list-none px-3 py-2.5 text-[0.8125rem] font-medium text-ink">
        Keping latar bagian
        <span class="ml-1 text-caption font-normal text-ink-subtle">lima jangkar ladang ornamen</span>
      </summary>
      <ul class="m-0 grid list-none gap-1.5 p-2 pt-0">
        <li v-for="row in barisLayer" :key="row.kunci">
          <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-surface-2 p-2">
            <span class="grid h-11 place-items-center" :style="{ ...ramp, width: tileWidth(row.glyph, 40, 96) }">
              <OrnamentGlyph :glyph="row.glyph" ubin class="max-h-10 max-w-full text-[color:var(--iv-orn-body)]" aria-hidden="true" />
            </span>
            <span class="grid gap-0.5">
              <span class="text-[0.8125rem] font-medium text-ink">
                {{ row.label }}
                <span v-if="!row.bawaan" class="ml-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">Diganti</span>
              </span>
              <span class="text-caption text-ink-subtle">{{ ornament(row.glyph).name }} · {{ row.hint }}</span>
            </span>
            <UiButton
              :id="`ornament-ganti-${row.kunci}`"
              tone="outline"
              size="sm"
              :disabled="terkunci"
              :aria-describedby="terkunci ? 'ornament-locked' : undefined"
              @click="emit('buka', { slot: row.slot, layer: row.layer })"
            >
              Ganti<span class="sr-only"> {{ row.label.toLowerCase() }}</span>
            </UiButton>
          </div>
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
      v-if="diganti"
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
