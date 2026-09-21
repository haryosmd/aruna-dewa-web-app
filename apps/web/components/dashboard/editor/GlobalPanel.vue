<script setup lang="ts">
import { AlertCircle, Check, FolderOpen, Lock, Monitor, Music, Pause, Play, Smartphone, Volume2, Wand2 } from 'lucide-vue-next'
import type { BackdropChoice, BackdropWeight, EntranceStyle, EnvelopeSpeed, FontChoice, LayoutFocus, LiveTemplateId } from '@aruna/contracts'
import { designFeatureId, selectableBodyFonts, selectableFonts } from '@aruna/contracts'
import type { InvitationDocument } from '~/types/aruna'
import { invitationThemes } from '~/utils/theme'
import { paletteOf, themePalettes, type ThemePalette } from '~/utils/theme-palettes'
import { musicLibrarySorted, trackByUrl, trackDuration } from '~/utils/music-library'
import { checkPalette, formatRatio } from '~/utils/contrast'
import { toBackdrop, toBackdropWeight } from '~/utils/backdrops'

/**
 * Tab Global (fase 72.3), urutan kartu persis referensi: Musik undangan · Fokuskan untuk Layar ·
 * Preset Theme · Kustom Warna Tema — lalu kartu kita: tema, huruf, latar ubin, gerak.
 *
 * Komponen ini tidak memutasi dokumen: tiap kontrol emit satu peristiwa dan halaman menulisnya
 * lewat `checkpoint()`. Pratinjau lagu memakai satu `<audio>` di sini, bukan di halaman.
 */
const props = defineProps<{
  document: InvitationDocument
  canEditDesign: boolean
  lockedBy?: string
  templatePensiun: { name: string } | null
  accent: string
}>()

const emit = defineEmits<{
  musik: [patch: { url?: string; title?: string; volume?: number }]
  layout: [LayoutFocus]
  palet: [ThemePalette]
  warna: [key: 'background' | 'foreground' | 'primary', value: string]
  perbaikiWarna: []
  tema: [LiveTemplateId]
  font: [key: 'font' | 'bodyFont', value: FontChoice | '']
  backdrop: [BackdropChoice]
  backdropWeight: [BackdropWeight]
  motion: [patch: { amplop?: EnvelopeSpeed; masuk?: EntranceStyle | 'tema' }]
}>()

const { label: featureLabel } = useFeatureLabels()
const { pilih } = useMediaLibrary()

/* ── Musik ──────────────────────────────────────────────────────────────────── */
const musicUrl = computed(() => props.document.settings?.musicUrl ?? '')
const musicVolume = computed(() => Math.round((props.document.settings?.musicVolume ?? 0.6) * 100))
const track = computed(() => trackByUrl(musicUrl.value))
const musicLabel = computed(() => track.value ? `${track.value.unggulan ? '⭐ ' : ''}${track.value.title} — ${track.value.credit}` : props.document.settings?.musicTitle || (musicUrl.value ? 'Lagu unggahan kalian' : 'Tanpa musik'))

const preview = ref<HTMLAudioElement | null>(null)
const previewing = ref(false)
function togglePreview() {
  const audio = preview.value
  if (!audio || !musicUrl.value) return
  if (previewing.value) { audio.pause(); previewing.value = false; return }
  audio.src = musicUrl.value
  audio.volume = musicVolume.value / 100
  audio.play().then(() => { previewing.value = true }).catch(() => { previewing.value = false })
}
watch(musicUrl, () => { preview.value?.pause(); previewing.value = false })
onBeforeUnmount(() => preview.value?.pause())

function pilihLagu(value: string) {
  if (value === '') { emit('musik', { url: '', title: '' }); return }
  const t = trackByUrl(value)
  emit('musik', { url: value, title: t ? t.title : '' })
}

async function unggahLagu() {
  const hasil = await pilih({ kind: 'audio', judul: 'Musik undangan' })
  const url = hasil?.[0]
  if (url) emit('musik', { url, title: url.split('/').pop() ?? 'Lagu unggahan' })
}

/* ── Palet & warna ──────────────────────────────────────────────────────────── */
const palettes = computed(() => themePalettes[props.document.templateId as LiveTemplateId] ?? themePalettes['aruna-bloom'])
const paletAktif = computed(() => paletteOf(props.document.templateId as LiveTemplateId, props.document.tokens)?.id)
const paletteChecks = computed(() => checkPalette(props.document.tokens))
const paletteIssues = computed(() => paletteChecks.value.filter(check => !check.passes))

const layout = computed<LayoutFocus>(() => props.document.tokens.layout ?? 'kartu')
const backdrop = computed(() => toBackdrop(props.document.tokens.backdrop) ?? 'tema')
const backdropWeight = computed(() => toBackdropWeight(props.document.tokens.backdropWeight) ?? 'sedang')
const fontLabel = (id: string) => selectableFonts.find(font => font.id === id)?.label ?? id
</script>

<template>
  <div class="grid gap-4">
    <p v-if="!canEditDesign" id="design-locked" class="m-0 flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3.5 text-[0.8125rem] text-ink-muted">
      <Lock :size="15" class="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
      <span>
        Tema, warna, font, ornamen, gaya teks, gerak, dan urutan bagian terkunci pada preset undangan ini.
        <span v-if="lockedBy" class="text-ink">{{ lockedBy }}</span>
        <span v-else class="text-ink">Add-on {{ featureLabel(designFeatureId) }} membukanya.</span>
      </span>
    </p>

    <!-- Musik undangan -->
    <section class="card grid gap-3 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="m-0 flex items-center gap-2 text-[0.9375rem] font-semibold text-ink">
          <Music :size="16" class="text-success" aria-hidden="true" />
          Musik undangan
        </h3>
        <span class="flex gap-1.5">
          <span class="rounded-full bg-gold-soft px-2 py-0.5 text-caption font-semibold text-warning">✨ Pernikahan</span>
          <span :class="cn('rounded-full px-2 py-0.5 text-caption font-semibold', musicUrl ? 'bg-success-soft text-success' : 'bg-surface-3 text-ink-muted')">
            {{ musicUrl ? '🔊 Aktif' : 'Nonaktif' }}
          </span>
        </span>
      </div>

      <audio ref="preview" preload="none" @ended="previewing = false" />

      <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <UiField id="editor-music-select" v-slot="{ id }" label="Lagu" class="[&>span]:sr-only">
          <UiSelect :id="id" :model-value="track ? track.url : (musicUrl ? '__unggahan' : '')" class="font-semibold" @update:model-value="value => { if (value !== '__unggahan') pilihLagu(String(value)) }">
            <option v-for="item in musicLibrarySorted" :key="item.id" :value="item.url">{{ item.unggulan ? '⭐ ' : '' }}{{ item.title }} — {{ item.credit }}</option>
            <option v-if="musicUrl && !track" value="__unggahan">{{ musicLabel }}</option>
            <option value="">Tanpa musik — Undangan hening tanpa pengiring</option>
          </UiSelect>
        </UiField>
        <button
          id="editor-music-preview"
          type="button"
          class="grid h-12 w-12 place-items-center rounded-md border border-border-input text-ink hover:bg-surface-3 disabled:opacity-40"
          :aria-label="previewing ? 'Hentikan tes lagu' : 'Putar tes lagu'"
          :disabled="!musicUrl"
          @click="togglePreview"
        >
          <Pause v-if="previewing" :size="18" aria-hidden="true" />
          <Play v-else :size="18" aria-hidden="true" />
        </button>
      </div>

      <p v-if="track" class="m-0 flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-[0.875rem] text-ink-muted">
        <span>Genre: <strong class="text-ink">{{ track.genre }}</strong></span>
        <span class="tabular-nums">{{ trackDuration(track.seconds) }}</span>
      </p>

      <div class="grid gap-2 rounded-md border border-border px-3 py-2.5">
        <div class="flex items-center justify-between gap-2">
          <label for="editor-music-volume" class="flex items-center gap-2 text-[0.875rem] font-semibold text-ink">
            <Volume2 :size="15" class="text-success" aria-hidden="true" />
            Volume Musik
          </label>
          <span class="rounded-md bg-surface-2 px-2 py-0.5 text-caption font-bold tabular-nums text-ink">{{ musicVolume }}%</span>
        </div>
        <input
          id="editor-music-volume"
          type="range"
          min="0"
          max="100"
          step="5"
          class="w-full accent-[var(--color-success)]"
          :value="musicVolume"
          :disabled="!musicUrl"
          @change="emit('musik', { volume: Number(($event.target as HTMLInputElement).value) / 100 })"
        >
      </div>

      <UiButton id="editor-music-upload" tone="outline" class="border-primary/40 bg-primary-soft/40 text-primary hover:bg-primary-soft" @click="unggahLagu">
        <FolderOpen :size="16" aria-hidden="true" />
        Pilih dari Asset Saya
      </UiButton>
    </section>

    <!-- Fokuskan untuk Layar -->
    <section class="card grid gap-3 p-4">
      <div class="flex items-start justify-between gap-2">
        <div class="grid gap-0.5">
          <h3 class="m-0 text-[0.9375rem] font-semibold text-ink">Fokuskan untuk Layar</h3>
          <p class="m-0 text-caption text-ink-muted">Tata letak saat dibuka di layar komputer/desktop</p>
        </div>
        <span class="rounded-full bg-success-soft px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-success">Layout</span>
      </div>
      <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Fokus tata letak">
        <button
          v-for="option in [{ id: 'kartu', label: 'Mobile', hint: 'Card 480px', icon: Smartphone, aria: 'Tampilan Terpusat Card Mobile 480px di Layar Desktop' }, { id: 'penuh', label: 'Desktop', hint: 'Lebar Penuh', icon: Monitor, aria: 'Tampilan Lebar Penuh Responsif di Layar Desktop' }] as const"
          :id="`editor-layout-${option.id}`"
          :key="option.id"
          type="button"
          role="radio"
          :aria-checked="layout === option.id"
          :aria-label="option.aria"
          :disabled="!canEditDesign"
          :class="cn(
            'flex items-center gap-3 rounded-md border p-3 text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
            layout === option.id ? 'border-success bg-success-soft/60' : 'border-border hover:border-border-strong',
          )"
          @click="emit('layout', option.id)"
        >
          <span :class="cn('grid h-10 w-10 shrink-0 place-items-center rounded-md', layout === option.id ? 'bg-success text-ink-inverse' : 'bg-surface-2 text-ink-muted')" aria-hidden="true">
            <component :is="option.icon" :size="18" />
          </span>
          <span class="grid gap-px">
            <span class="text-[0.9375rem] font-semibold text-ink">{{ option.label }}</span>
            <span :class="cn('text-caption', layout === option.id ? 'text-success' : 'text-ink-muted')">{{ option.hint }}</span>
          </span>
        </button>
      </div>
    </section>

    <!-- Preset Theme -->
    <section class="card grid gap-3 p-4">
      <div class="flex items-center justify-between gap-2">
        <h3 class="m-0 text-[0.9375rem] font-semibold text-ink">Preset Theme</h3>
        <span class="rounded-full bg-success-soft px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-success">Global</span>
      </div>
      <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Preset warna">
        <button
          v-for="palette in palettes"
          :id="`editor-palette-${palette.id}`"
          :key="palette.id"
          type="button"
          role="radio"
          :aria-checked="paletAktif === palette.id"
          :disabled="!canEditDesign"
          :class="cn(
            'grid gap-2 rounded-md border p-3 text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
            paletAktif === palette.id ? 'border-success bg-success-soft/60' : 'border-border hover:border-border-strong',
          )"
          @click="emit('palet', palette)"
        >
          <span class="flex gap-1.5" aria-hidden="true">
            <span class="h-6 w-6 rounded-full border border-border" :style="{ background: palette.tokens.primary }" />
            <span class="h-6 w-6 rounded-full border border-border" :style="{ background: accent }" />
            <span class="h-6 w-6 rounded-full border border-border" :style="{ background: palette.tokens.background }" />
          </span>
          <span class="grid gap-px">
            <span class="text-[0.9375rem] font-semibold text-ink">{{ palette.label }}</span>
            <span class="text-caption text-ink-muted">{{ fontLabel(palette.tokens.font) }}</span>
          </span>
        </button>
      </div>
    </section>

    <!-- Kustom Warna Tema -->
    <section class="card grid gap-3 p-4">
      <div class="grid gap-0.5">
        <h3 class="m-0 text-[0.9375rem] font-semibold text-ink">Kustom Warna Tema</h3>
        <p class="m-0 text-caption text-ink-muted">Sesuaikan dengan tema busana/dekorasi</p>
      </div>
      <div class="grid gap-2">
        <div
          v-for="row in [{ key: 'primary', label: 'Warna Utama (Primary)' }, { key: 'foreground', label: 'Warna Teks (Foreground)' }, { key: 'background', label: 'Warna Latar (Background)' }] as const"
          :key="row.key"
          class="flex items-center justify-between gap-3 rounded-md border border-border px-3.5 py-2.5"
        >
          <label :for="`editor-color-${row.key}`" class="text-[0.875rem] font-semibold text-ink">{{ row.label }}</label>
          <span class="flex items-center gap-2 rounded-md bg-surface-2 px-2 py-1">
            <input
              :id="`editor-color-${row.key}`"
              type="color"
              class="h-7 w-7 cursor-pointer rounded-full border border-border bg-transparent p-0 disabled:cursor-not-allowed [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
              :value="document.tokens[row.key]"
              :disabled="!canEditDesign"
              :aria-describedby="canEditDesign ? undefined : 'design-locked'"
              @input="emit('warna', row.key, ($event.target as HTMLInputElement).value)"
            >
            <code class="text-[0.8125rem] font-semibold uppercase text-ink">{{ document.tokens[row.key] }}</code>
          </span>
        </div>
      </div>

      <div :class="cn('grid gap-3 rounded-md border p-3.5 transition-colors duration-300', paletteIssues.length ? 'border-warning/40 bg-gold-soft' : 'border-border bg-surface-2')">
        <div class="flex items-start gap-2">
          <component :is="paletteIssues.length ? AlertCircle : Check" :size="16" :class="cn('mt-0.5 shrink-0', paletteIssues.length ? 'text-warning' : 'text-success')" aria-hidden="true" />
          <p class="m-0 text-[0.8125rem] font-semibold text-ink" aria-live="polite">
            {{ paletteIssues.length ? `${paletteIssues.length} dari 4 pasangan warna sulit dibaca tamu` : 'Keempat pasangan warna terbaca jelas' }}
          </p>
        </div>
        <ul class="m-0 grid list-none gap-1.5 p-0">
          <li v-for="check in paletteChecks" :key="check.id" class="grid grid-cols-[1fr_auto] items-baseline gap-2">
            <span class="text-[0.8125rem] text-ink">{{ check.label }}<span class="block text-caption text-ink-muted">{{ check.where }}</span></span>
            <span :class="cn('rounded-full px-2 py-0.5 text-caption font-semibold tabular-nums', check.passes ? 'bg-surface text-ink-muted' : 'bg-danger-soft text-danger')">
              {{ formatRatio(check.ratio) }}:1<span class="sr-only">{{ check.passes ? 'memenuhi' : 'di bawah' }} ambang 4,5:1</span>
            </span>
          </li>
        </ul>
        <button v-if="paletteIssues.length && canEditDesign" id="editor-repair-palette" type="button" class="button button-secondary justify-self-start" @click="emit('perbaikiWarna')">
          <Wand2 :size="15" aria-hidden="true" />
          Perbaiki warna otomatis
        </button>
      </div>
    </section>

    <!-- Tema & huruf -->
    <section class="card grid gap-4 p-4">
      <div class="grid gap-0.5">
        <h3 class="m-0 text-[0.9375rem] font-semibold text-ink">Tema</h3>
        <p class="m-0 text-caption text-ink-muted">Ornamen, partitur gerak, dan palet kurasi mengikuti tema; struktur bagiannya sama.</p>
      </div>
      <p v-if="templatePensiun" id="template-pensiun" class="m-0 flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3.5 text-[0.8125rem] text-ink-muted">
        <Lock :size="15" class="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
        <span>Tema undangan ini sudah tidak tersedia lagi, dan sekarang ditampilkan memakai <span class="text-ink">{{ templatePensiun.name }}</span>. Pilih penggantinya kapan saja.</span>
      </p>
      <div class="grid grid-cols-2 gap-2 @md:grid-cols-3">
        <button
          v-for="theme in invitationThemes"
          :id="`editor-theme-${theme.id}`"
          :key="theme.id"
          type="button"
          :aria-pressed="document.templateId === theme.id"
          :disabled="!canEditDesign && !templatePensiun"
          :class="cn(
            'grid gap-2 rounded-md border p-2 text-left transition-[border-color,box-shadow] duration-200',
            document.templateId === theme.id ? 'border-success shadow-lift' : 'border-border',
            canEditDesign || templatePensiun ? 'hover:border-border-strong' : 'cursor-not-allowed opacity-60',
          )"
          @click="emit('tema', theme.id)"
        >
          <span class="flex h-8 overflow-hidden rounded-sm" aria-hidden="true">
            <span class="flex-1" :style="{ background: theme.tokens.background }" />
            <span class="flex-1" :style="{ background: theme.tokens.primary }" />
            <span class="flex-1" :style="{ background: theme.accent }" />
          </span>
          <span class="flex items-center gap-1 text-[0.8125rem] font-semibold text-ink">
            <Check v-if="document.templateId === theme.id" :size="13" class="text-success" aria-hidden="true" />
            {{ theme.name }}
          </span>
        </button>
      </div>

      <div class="grid gap-3 @xs:grid-cols-2">
        <UiField id="editor-font" v-slot="{ id }" label="Jenis huruf judul">
          <UiSelect :id="id" :model-value="document.tokens.font" :disabled="!canEditDesign" @update:model-value="value => emit('font', 'font', value as FontChoice)">
            <option v-for="font in selectableFonts" :key="font.id" :value="font.id">{{ font.label }}</option>
          </UiSelect>
        </UiField>
        <UiField id="editor-body-font" v-slot="{ id }" label="Jenis huruf paragraf" hint="Kosong berarti ikut tema.">
          <UiSelect :id="id" :model-value="document.tokens.bodyFont ?? ''" :disabled="!canEditDesign" @update:model-value="value => emit('font', 'bodyFont', value as FontChoice | '')">
            <option value="">Ikut tema</option>
            <option v-for="font in selectableBodyFonts" :key="font.id" :value="font.id">{{ font.label }}</option>
          </UiSelect>
        </UiField>
      </div>

      <DashboardOrnamentBackdropPicker
        :pilihan="backdrop"
        :bobot="backdropWeight"
        :accent="accent"
        :background="document.tokens.background"
        :terkunci="!canEditDesign"
        @update:pilihan="value => emit('backdrop', value)"
        @update:bobot="value => emit('backdropWeight', value)"
      />

      <DashboardEditorMotionPicker
        :motion="document.tokens.motion"
        :terkunci="!canEditDesign"
        @update:amplop="value => emit('motion', { amplop: value })"
        @update:masuk="value => emit('motion', { masuk: value })"
      />
    </section>
  </div>
</template>
