<script setup lang="ts">
import { Maximize2, Monitor, RotateCw, Smartphone, ZoomIn, ZoomOut } from 'lucide-vue-next'
import type { InvitationDocument } from '~/types/aruna'
import { zoomMax, zoomMin, zoomStep, type PreviewDevice } from '~/composables/useEditorPrefs'
import { sectionDomId, stageScrollTop } from '~/utils/editor-sections'

/*
 * Panggung pratinjau (fase 72.2), meniru referensi: pil kiri ↻ | ZOOM ⊖ 100% ⊕, pil kanan
 * Desktop | iPhone | Android | Clean. Undangannya dirender **hidup** (`mode="stage"`): amplop
 * pembuka tampil dan bisa diklik, partitur GSAP berjalan, dock dan pemutar musik ada — persis
 * yang dilihat tamu di ponselnya, hanya diperkecil.
 *
 * Lebarnya dirender sungguhan lalu diperkecil, bukan diperkecil lalu dirender: undangan memakai
 * container query di seluruh badannya (`.iv-root`), jadi render 390px berperilaku persis seperti
 * ponsel 390px. Skala tidak pernah melebihi 1 — memperbesar render hanya mengaburkan gambar dan
 * berbohong soal ukuran huruf. Zoom karena itu 50–100 %: ia memperkecil dari "pas", bukan
 * memperbesar melampaui aslinya.
 */
const previewDevices = [
  { id: 'laptop', label: 'Desktop', width: 1280, icon: Monitor, aria: 'Tampilan Desktop Viewport' },
  { id: 'iphone', label: 'iPhone', width: 390, icon: Smartphone, aria: 'Tampilan Frame iPhone' },
  { id: 'android', label: 'Android', width: 412, icon: Smartphone, aria: 'Frame Android (Camera Punchhole)' },
  { id: 'bersih', label: 'Clean', width: 390, icon: Maximize2, aria: 'Tampilan Minimalis Tanpa Frame' },
] as const satisfies readonly { id: PreviewDevice; label: string; width: number; icon: unknown; aria: string }[]

const props = defineProps<{
  document: InvitationDocument
  focusSection?: { type: string, nonce: number } | null
}>()
const device = defineModel<PreviewDevice>('device', { default: 'iphone' })
const zoom = defineModel<number>('zoom', { default: 100 })

const viewport = ref<HTMLElement | null>(null)
let percobaan = 0

/** Kunci gulir viewport selagi amplop tertutup — di halaman publik `CoverGate` mengunci `body`. */
const terkunci = ref(false)

/** Muat ulang pratinjau: amplop tertutup lagi dan partitur diputar dari awal. */
const ulang = ref(0)
function muatUlang() { ulang.value++; terkunci.value = false }

function gulirKe(type: string, sisa = 30) {
  const host = viewport.value
  if (!host || host.offsetParent === null) return
  const target = host.querySelector<HTMLElement>(`#${sectionDomId(type as never)}`)
  if (!target) return
  if (host.scrollHeight <= host.clientHeight && sisa > 0) {
    const tiket = ++percobaan
    requestAnimationFrame(() => { if (tiket === percobaan) gulirKe(type, sisa - 1) })
    return
  }
  const halus = typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches
  const tujuan = () => stageScrollTop({ top: host.getBoundingClientRect().top, scrollTop: host.scrollTop }, { top: target.getBoundingClientRect().top })
  host.scrollTo({ top: tujuan(), behavior: halus ? 'smooth' : 'instant' })
  const tiket = ++percobaan
  setTimeout(() => {
    if (tiket !== percobaan || host.offsetParent === null) return
    const selisih = tujuan() - host.scrollTop
    if (Math.abs(selisih) > 8) host.scrollTo({ top: tujuan(), behavior: 'instant' })
  }, halus ? 900 : 300)
}

watch(() => props.focusSection, async (fokus) => {
  if (!fokus) return
  percobaan++
  await nextTick()
  // Amplop yang masih tertutup menutupi bagian yang diminta; menggulir di baliknya tidak berguna.
  if (!terkunci.value) gulirKe(fokus.type)
}, { flush: 'post' })

const aktif = computed(() => previewDevices.find(d => d.id === device.value) ?? previewDevices[1])
const previewWidth = computed(() => aktif.value.width)
const bezel = computed<'iphone' | 'android' | 'none'>(() => device.value === 'iphone' ? 'iphone' : device.value === 'android' ? 'android' : 'none')

const previewScale = ref(1)
const previewScalePct = computed(() => Math.round(previewScale.value * 100))
/** Lebar wadah yang ditawarkan ke bingkai: lebar viewport × zoom. Bingkai yang menghitung skala pasnya. */
const zoomFactor = computed(() => Math.min(zoomMax, Math.max(zoomMin, zoom.value)) / 100)

function ubahZoom(delta: number) {
  zoom.value = Math.min(zoomMax, Math.max(zoomMin, zoom.value + delta))
}
</script>

<template>
  <section
    class="relative flex min-h-0 min-w-0 flex-col bg-surface-3 [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] lg:overflow-hidden"
    aria-label="Pratinjau draft"
  >
    <div class="pointer-events-none absolute inset-x-0 top-3 z-[var(--z-raised)] flex flex-wrap justify-center gap-2 px-4">
      <div class="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-lift" role="group" aria-label="Zoom pratinjau">
        <button id="editor-preview-reload" type="button" class="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label="Refresh preview" @click="muatUlang">
          <RotateCw :size="15" aria-hidden="true" />
        </button>
        <span class="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
        <span class="px-1 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-ink-subtle">Zoom</span>
        <button id="editor-zoom-out" type="button" class="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink disabled:opacity-40" aria-label="Perkecil Kanvas" :disabled="zoom <= zoomMin" @click="ubahZoom(-zoomStep)">
          <ZoomOut :size="15" aria-hidden="true" />
        </button>
        <button id="editor-zoom-reset" type="button" class="min-w-[3.25rem] rounded-full px-1 text-[0.875rem] font-semibold tabular-nums text-ink hover:bg-surface-3" aria-label="Reset zoom ke 100%" @click="zoom = zoomMax">
          {{ zoom }}%
        </button>
        <button id="editor-zoom-in" type="button" class="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink disabled:opacity-40" aria-label="Perbesar Kanvas" :disabled="zoom >= zoomMax" @click="ubahZoom(zoomStep)">
          <ZoomIn :size="15" aria-hidden="true" />
        </button>
      </div>

      <div class="pointer-events-auto flex gap-1 rounded-full border border-border bg-surface p-1 shadow-lift" role="group" aria-label="Lebar pratinjau">
        <button
          v-for="option in previewDevices"
          :id="`editor-preview-${option.id}`"
          :key="option.id"
          type="button"
          :aria-pressed="device === option.id"
          :aria-label="option.aria"
          :class="cn(
            'flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors duration-200',
            device === option.id ? 'bg-success text-ink-inverse' : 'text-ink-muted hover:bg-surface-3 hover:text-ink',
          )"
          @click="device = option.id"
        >
          <component :is="option.icon" :size="15" aria-hidden="true" />
          {{ option.label }}
        </button>
      </div>
    </div>

    <p class="pointer-events-none absolute bottom-3 left-1/2 z-[var(--z-raised)] m-0 -translate-x-1/2 rounded-full bg-surface/85 px-3 py-1 text-caption text-ink-muted backdrop-blur">
      <span>Selebar {{ previewWidth }}px</span>
      <span v-if="previewScalePct < 100" class="tabular-nums"> · diperkecil {{ previewScalePct }}%</span>
    </p>

    <div
      ref="viewport"
      :class="cn('max-h-[36rem] min-h-0 flex-1 overflow-x-hidden px-4 pb-12 pt-28 [scrollbar-gutter:stable] sm:px-6 lg:max-h-none', terkunci ? 'overflow-y-hidden' : 'overflow-y-auto')"
    >
      <div class="mx-auto" :style="{ width: `${Math.round(zoomFactor * 100)}%` }">
        <InvitationDeviceBezel :device="bezel">
          <InvitationPhoneFrame
            v-model:scale="previewScale"
            :width="previewWidth"
          >
            <InvitationRenderer :key="ulang" :document="props.document" mode="stage" @gate-lock="value => terkunci = value" />
          </InvitationPhoneFrame>
        </InvitationDeviceBezel>
      </div>
    </div>
  </section>
</template>
