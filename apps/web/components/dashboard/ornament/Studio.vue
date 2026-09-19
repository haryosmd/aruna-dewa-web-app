<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { RotateCcw, Search, X } from 'lucide-vue-next'
import type { LayerSlot, OrnamentId } from '~/utils/ornaments'
import { ornament } from '~/utils/ornaments'
import { fitOf } from '~/utils/ornament-fit'
import { cariOrnamen, hitungPack, packLabels, packIds, type PackId, type StudioTab } from '~/utils/ornament-search'
import { layerSlotLabels, slotLabels, type OrnamentSlotKey } from '~/utils/ornament-slots'
import { ornamentRamp, rampStyle } from '~/utils/ornament-palette'

/**
 * Studio Ornamen — pemilih layar penuh untuk seluruh bank.
 *
 * **Kenapa dialog dan bukan panel.** Kolom pengaturan editor selebar 528px di 1440; empat grid
 * ubin sudah sesak di sana ketika yang ditawarkan baru 59 glyph. Yang dibuka fase 59 adalah
 * kesembilan slot skalar plus lima jangkar ladang dari bank 328 keping, dengan pencarian dan
 * penyaring — itu butuh ruangnya sendiri.
 *
 * **Dialog reka-ui, bukan buatan sendiri.** Focus trap, `aria-modal`, kunci scroll, dan
 * pengembalian fokus adalah bagian yang mahal kalau ditulis tangan dan gagalnya senyap; pola yang
 * sama sudah dipakai `atomic/Popup.vue` dan `layout/AppHeader.vue`.
 *
 * **Seluruh penyaringan hidup di `utils/ornament-search.ts`**, bukan di sini. Vitest repo ini
 * jalan di node tanpa DOM, jadi logika yang masuk ke `<script setup>` adalah logika yang tidak
 * akan pernah diuji.
 */
const props = defineProps<{
  open: boolean
  /**
   * Dinamai `slotKey`, bukan `slot`.
   *
   * `slot` adalah atribut Vue yang sudah usang: sebuah prop bernama itu dirender sebagai
   * `:slot="..."` di pemanggilnya dan ditolak `vue/no-deprecated-slot-attribute` — bukan
   * sekadar keluhan lint, melainkan nama yang memang tidak boleh dipakai lagi sebagai prop.
   */
  slotKey?: OrnamentSlotKey
  layer?: LayerSlot
  templateId: string
  aktif: OrnamentId
  bawaan: OrnamentId
  tokens: { background: string, foreground: string, primary: string }
  accent: string
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  pilih: [OrnamentId]
  kembalikan: []
  batal: []
}>()

const tab = ref<StudioTab>('disarankan')
const query = ref('')
const pack = ref<PackId | 'semua'>('semua')

/** Nilai saat Studio dibuka, untuk Escape/Batal. Satu sesi memilih = satu langkah undo. */
const semula = ref<OrnamentId>(props.aktif)

watch(() => props.open, terbuka => {
  if (!terbuka) return
  semula.value = props.aktif
  tab.value = 'disarankan'
  query.value = ''
  pack.value = 'semua'
})

const keterangan = computed(() => (props.layer ? layerSlotLabels[props.layer] : props.slotKey ? slotLabels[props.slotKey] : null))
const judul = computed(() => keterangan.value?.label ?? 'Ornamen')

const hasil = computed(() => cariOrnamen({
  slot: props.slotKey, layer: props.layer, templateId: props.templateId,
  tab: tab.value, query: query.value, pack: pack.value === 'semua' ? undefined : pack.value,
}))

const jumlahPack = computed(() => hitungPack({ slot: props.slotKey, layer: props.layer }))
const packTersedia = computed(() => packIds.filter(id => jumlahPack.value[id] > 0))
const totalSemua = computed(() => cariOrnamen({
  slot: props.slotKey, layer: props.layer, templateId: props.templateId, tab: 'semua',
}).length)
const totalDisarankan = computed(() => cariOrnamen({
  slot: props.slotKey, layer: props.layer, templateId: props.templateId, tab: 'disarankan',
}).length)

const ramp = computed(() => rampStyle(ornamentRamp(props.tokens, props.accent)))
const fitAktif = computed(() => fitOf(props.aktif, props.templateId))

/**
 * Panah menggerakkan sekaligus memilih — itulah yang dimaksud `radiogroup`.
 *
 * Jumlah kolom tidak diukur dari DOM: ubin punya lebar berbeda-beda (rasio glyph yang
 * menentukannya), jadi aritmetika berbasis `getBoundingClientRect` akan salah pada baris yang
 * isinya campur. Naik/turun karena itu melompat sejauh perkiraan tetap, dan Home/End yang
 * memberi jalan pasti ke ujung.
 */
function navigasi(event: KeyboardEvent) {
  const daftar = hasil.value
  const posisi = daftar.indexOf(props.aktif)
  const lompat = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[event.key]
  let tujuan = -1

  if (lompat !== undefined) tujuan = Math.min(daftar.length - 1, Math.max(0, (posisi === -1 ? 0 : posisi) + lompat))
  else if (event.key === 'Home') tujuan = 0
  else if (event.key === 'End') tujuan = daftar.length - 1
  else return

  event.preventDefault()
  const berikut = daftar[tujuan]
  if (berikut) {
    emit('pilih', berikut)
    nextTick(() => document.getElementById(`studio-ubin-${berikut}`)?.focus())
  }
}

function tutup(simpan: boolean) {
  if (!simpan) emit('batal')
  emit('update:open', false)
}
</script>

<template>
  <DialogRoot :open="open" @update:open="terbuka => { if (!terbuka) tutup(false) }">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-ink/45 backdrop-blur-sm motion-safe:data-[state=open]:animate-[fade-in_200ms_ease-out]" />
      <DialogContent
        class="@container fixed inset-3 z-50 flex flex-col overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-veil)] sm:inset-6"
        @keydown="navigasi"
      >
        <header class="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div class="grid gap-1">
            <p class="eyebrow">Studio ornamen</p>
            <DialogTitle class="m-0 font-display text-h3 font-semibold text-ink">{{ judul }}</DialogTitle>
            <DialogDescription class="m-0 text-caption text-ink-muted">
              {{ keterangan?.hint }}
              <span v-if="keterangan?.syarat" class="block text-ink-subtle">{{ keterangan.syarat }}</span>
              <span class="block">Tekan Escape untuk membatalkan dan kembali ke pilihan semula.</span>
            </DialogDescription>
          </div>
          <DialogClose
            id="studio-tutup"
            class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border-strong text-ink"
            aria-label="Tutup studio ornamen"
          >
            <X :size="19" aria-hidden="true" />
          </DialogClose>
        </header>

        <div class="grid gap-3 border-b border-border p-4 sm:p-5">
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex gap-1 rounded-full bg-surface-3 p-1" role="tablist" aria-label="Cakupan pilihan">
              <button
                v-for="pilihan in [
                  { id: 'disarankan', label: `Disarankan (${totalDisarankan})` },
                  { id: 'semua', label: `Semua (${totalSemua})` },
                ]"
                :id="`studio-tab-${pilihan.id}`"
                :key="pilihan.id"
                type="button"
                role="tab"
                :aria-selected="tab === pilihan.id"
                aria-controls="studio-grid"
                :class="cn(
                  'min-h-11 rounded-full px-4 text-[0.875rem] font-semibold transition-colors duration-200',
                  tab === pilihan.id ? 'bg-surface text-ink shadow-hairline' : 'text-ink-muted',
                )"
                @click="tab = pilihan.id as StudioTab"
              >
                {{ pilihan.label }}
              </button>
            </div>

            <label class="relative min-w-52 flex-1">
              <span class="sr-only">Cari ornamen</span>
              <Search :size="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
              <UiInput id="studio-cari" v-model="query" type="search" placeholder="Cari nama ornamen" class="pl-9" />
            </label>

            <UiButton id="studio-kembalikan" tone="outline" size="sm" @click="emit('kembalikan')">
              <RotateCcw :size="15" aria-hidden="true" />
              Bawaan tema
            </UiButton>
          </div>

          <div v-if="tab === 'semua'" class="flex flex-wrap gap-1.5" role="group" aria-label="Saring menurut koleksi">
            <button
              v-for="id in ['semua', ...packTersedia]"
              :id="`studio-pack-${id}`"
              :key="id"
              type="button"
              :aria-pressed="pack === id"
              :class="cn(
                'min-h-9 rounded-full border px-3 text-caption font-medium transition-colors duration-200',
                pack === id ? 'border-primary bg-primary-soft text-ink' : 'border-border text-ink-muted hover:border-border-strong',
              )"
              @click="pack = id as PackId | 'semua'"
            >
              {{ id === 'semua' ? 'Semua koleksi' : `${packLabels[id as PackId]} (${jumlahPack[id as PackId]})` }}
            </button>
          </div>
        </div>

        <div class="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 @3xl:grid-cols-[minmax(0,1fr)_16rem] sm:p-5">
          <div>
            <p class="sr-only" aria-live="polite">{{ hasil.length }} ornamen ditampilkan</p>
            <div
              v-if="hasil.length"
              id="studio-grid"
              class="flex flex-wrap gap-2"
              role="radiogroup"
              :aria-label="`Pilihan ${judul.toLowerCase()}`"
              :style="ramp"
            >
              <DashboardOrnamentStudioTile
                v-for="glyph in hasil"
                :key="glyph"
                :glyph="glyph"
                :template-id="templateId"
                :dipilih="glyph === aktif"
                :bawaan="glyph === bawaan"
                :slot-label="judul"
                @click="emit('pilih', glyph)"
              />
            </div>
            <p v-else class="notice m-0">
              Tidak ada ornamen yang cocok dengan pencarian itu. Coba kata lain, atau buka tab “Semua”.
            </p>
          </div>

          <!--
            Pratinjau keping tunggal, BUKAN `<InvitationRenderer>` kedua.

            Renderer kedua berarti set ScrollTrigger kedua dan siklus musik/gerbang kedua di dalam
            portal. Pratinjau undangan penuh tetap ada — ia hidup di belakang dialog dan ikut
            berubah begitu pilihan ditulis ke dokumen.
          -->
          <aside class="grid h-fit content-start gap-3 rounded-md border border-border bg-surface-2 p-4 @3xl:sticky @3xl:top-0">
            <p class="eyebrow">Pilihan sekarang</p>
            <div
              class="grid h-32 grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden rounded-md p-3"
              :style="{ ...ramp, background: tokens.background }"
            >
              <OrnamentGlyph :glyph="aktif" ubin class="min-h-0 max-h-full max-w-full object-contain text-[color:var(--iv-orn-body)]" aria-hidden="true" />
            </div>
            <p class="m-0 text-[0.875rem] font-semibold text-ink">{{ ornament(aktif).name }}</p>
            <p v-if="aktif === bawaan" class="m-0 text-caption text-ink-subtle">Bawaan tema.</p>
            <p v-else-if="fitAktif.ok" class="m-0 text-caption text-ink-subtle">Seresep dengan tema kalian.</p>
            <p v-else class="m-0 text-caption text-warning">{{ fitAktif.ringkas }}.</p>
          </aside>
        </div>

        <footer class="flex flex-wrap justify-end gap-2 border-t border-border p-4 sm:p-5">
          <UiButton id="studio-batal" tone="outline" @click="tutup(false)">Batal</UiButton>
          <UiButton id="studio-selesai" @click="tutup(true)">Pakai ornamen ini</UiButton>
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
