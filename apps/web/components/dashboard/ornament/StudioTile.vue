<script setup lang="ts">
import { AlertTriangle, Check, Palette } from 'lucide-vue-next'
import { fitOf } from '~/utils/ornament-fit'
import { tileWidth } from '~/utils/ornament-slots'
import { ornament, type OrnamentId } from '~/utils/ornaments'

/**
 * Satu ubin di grid Studio Ornamen.
 *
 * Dua hal yang membuatnya bukan sekadar tombol bergambar:
 *
 * **Ia menunda merender glyph-nya sampai terlihat.** `OrnamentGlyph` memuat komponennya lewat
 * glob malas, jadi satu grid berisi 44 ubin akan menarik 44 chunk sekaligus saat dibuka. Dengan
 * `IntersectionObserver` — pola mentah yang sudah dipakai `invitation/Dock.vue` — yang ditarik
 * hanya yang benar-benar digulir ke layar. Placeholder-nya berasio sama dengan glyph-nya supaya
 * tata letak tidak melompat saat ia tiba.
 *
 * **Ia mengatakan ketidakcocokan dengan kalimat, bukan dengan warna.** Sejak fase 59 pasangan
 * boleh memilih keping yang tidak seresep dengan temanya; yang menggantikan larangan lama adalah
 * keterangan. Lencananya karena itu punya ikon DAN teks di `aria-label`, tidak pernah warna saja.
 *
 * **Baris grid-nya `minmax(0,1fr)`, bukan `auto` (fase 70).** Aset referensi adalah `<img>`
 * ber-atribut `width`/`height`; track `auto` mengambil kontribusi min-content gambar itu (aset
 * setinggi 3096px pada lebar 64px minta ±124px), melampaui `h-20`, dan `max-h-full` lalu
 * resolve ke track yang kebesaran — ubinnya meluber ke baris di bawahnya. Vektor tidak kena
 * karena `<svg>` tidak punya kontribusi setinggi itu, jadi cacatnya baru terlihat pada aset
 * `lengkung-latar` yang rasionya 0,5.
 */
const props = defineProps<{
  glyph: OrnamentId
  templateId: string
  dipilih: boolean
  bawaan: boolean
  /** Serasi dengan tema (fase 80): kurasi lama kini jadi lencana, bukan tab yang menyaring. */
  serasi?: boolean
  slotLabel: string
}>()

const root = ref<HTMLElement | null>(null)
const terlihat = ref(false)

onMounted(() => {
  if (!root.value || typeof IntersectionObserver === 'undefined') { terlihat.value = true; return }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      terlihat.value = true
      observer.disconnect()
    }
  }, { rootMargin: '240px' })
  observer.observe(root.value)
  onBeforeUnmount(() => observer.disconnect())
})

const entri = computed(() => ornament(props.glyph))
const fit = computed(() => fitOf(props.glyph, props.templateId))

/** Ikon lencana. `warna` dan sisanya dibedakan karena artinya berbeda, bukan derajatnya. */
const lencana = computed(() => {
  if (props.bawaan || fit.value.ok) return null
  return fit.value.flags.includes('warna')
    ? { icon: Palette, kelas: 'text-gold' }
    : { icon: AlertTriangle, kelas: 'text-warning' }
})

const label = computed(() => [
  `${props.slotLabel}: ${entri.value.name}`,
  props.bawaan ? '(bawaan tema)' : props.serasi ? '(serasi dengan tema)' : '',
  fit.value.ringkas,
].filter(Boolean).join(' — '))
</script>

<template>
  <button
    :id="`studio-ubin-${glyph}`"
    ref="root"
    type="button"
    role="radio"
    :aria-checked="dipilih"
    :aria-label="label"
    :tabindex="dipilih ? 0 : -1"
    :class="cn(
      'group relative grid h-20 shrink-0 grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden rounded-md border p-2 transition-[border-color,box-shadow] duration-200',
      dipilih ? 'border-primary shadow-lift' : 'border-border hover:border-border-strong',
    )"
    :style="{ width: tileWidth(glyph, 64) }"
  >
    <OrnamentGlyph
      v-if="terlihat"
      :glyph="glyph"
      ubin
      class="min-h-0 max-h-full max-w-full object-contain text-[color:var(--iv-orn-body)] [rotate:var(--studio-putar,0deg)]"
      aria-hidden="true"
    />
    <UiSkeleton v-else class="h-full w-full" :style="{ aspectRatio: String(entri.ratio) }" />

    <Check
      v-if="dipilih"
      :size="13"
      class="absolute top-1 right-1 text-primary"
      aria-hidden="true"
    />
    <component
      :is="lencana.icon"
      v-else-if="lencana"
      :size="13"
      :class="cn('absolute top-1 right-1', lencana.kelas)"
      aria-hidden="true"
    />
    <span
      v-if="bawaan || serasi"
      class="absolute bottom-1 left-1 rounded-full bg-success-soft px-1.5 text-ui-label font-semibold text-success"
      aria-hidden="true"
    >{{ bawaan ? 'Bawaan' : 'Serasi' }}</span>
  </button>
</template>
