<script setup lang="ts">
import type { OrnamentSlotKey } from '~/utils/ornament-slots'
import type { OrnamentRef } from '~/utils/ornaments'
import { gayaKeping, sumberKeping } from '~/utils/kanvas'

/**
 * Satu keping ornamen undangan yang bisa dipegang di kanvas (fase 81).
 *
 * Satu-satunya jalan merender glyph ber-slot di `components/invitation/**` — dijaga
 * `test/ornament-slots.spec.ts`. Sebelum ini tiap situs memanggil `OrnamentGlyph` langsung,
 * dan akibatnya terukur di fase 81: lima sudut, flap, kantong, segel, dan kelopak RSVP tidak bisa
 * diklik karena `pointer-events: none` atau `<button>` di atasnya, dan satu nilai `corner` global
 * mengisi sepuluh glyph sekaligus.
 *
 * **Dua lapis, dan pembagiannya bukan selera.** Pembungkus luar membawa kunci keping
 * (`data-iv-el`), kelas tata letak pemanggil, dan transform kanvas (`translate`/`rotate`/`scale`).
 * Glyph di dalam membawa atribut gerak (`data-iv-lead`, `data-iv-ornament`, …) yang dianimasikan
 * GSAP. GSAP menggabungkan transform individual ke `transform` lalu menulisnya `none`, jadi kalau
 * keduanya di satu elemen, geseran pasangan hilang begitu gerak masuk diputar.
 *
 * Sumber glyph: pilihan untuk TEMPAT INI (`kanvas.keping[kunci].glyph`, keputusan pemilik fase
 * 81) → `glyph` dari pemanggil → slot global `orn[slot]`.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /**
   * Slot ornamennya. Bukan `slot` — atribut itu dicadangkan sintaks slot lama Vue. Tiga nilai di
   * luar slot skalar (`layer`, `venue`, `attire`) untuk keping yang dipilih lewat jalurnya sendiri
   * (kartu ladang, kolom form) tapi tetap bisa digeser, diukur, diputar, dan dikunci di kanvas.
   */
  slotId: OrnamentSlotKey | 'layer' | 'venue' | 'attire'
  /** Posisi keping di bagiannya — kunci jadi `o:<slot>:<posisi>`. Ditulis tangan, jadi stabil. */
  posisi: string
  /**
   * Glyph dari pemanggil bila bukan `orn[slot]` (mis. gerbang yang menerima set lewat prop).
   * Ditulis melebar dari `OrnamentRef` — union 300-an id bank membuat `withDefaults` menyerah
   * ("union type that is too complex"); nilainya tetap berasal dari set yang sudah tervalidasi.
   */
  glyph?: string | { url: string; width: number; height: number } | null
  initials?: string
  /** Keping yang lahir tersembunyi (dua sudut baru fase 81) — bisa dimunculkan dari panel Lapisan. */
  tampilBawaan?: boolean
  tag?: 'span' | 'div'
  /**
   * Kelas untuk glyph di dalam, bukan pembungkus — untuk keping yang kelasnya sendiri dianimasikan
   * GSAP (pita babak: `.iv-segue-shape`). Tanpa ini glyph mengisi penuh pembungkusnya.
   */
  kelasIsi?: string
}>(), { glyph: undefined, initials: undefined, tampilBawaan: true, tag: 'span', kelasIsi: undefined })

const attrs = useAttrs()
const invitation = inject(invitationKey, null)
const { kanvas, section } = useLingkupBagian()

const kunci = computed(() => `o:${props.slotId}:${props.posisi}`)
const keping = computed(() => kanvas.value.keping[kunci.value])
const sumber = computed<OrnamentRef | null | undefined>(() => (
  sumberKeping(keping.value)
  ?? (props.glyph !== undefined ? props.glyph as OrnamentRef | null : (invitation?.orn.value as Record<string, OrnamentRef | undefined> | undefined)?.[props.slotId])
))

/*
 * Semua `data-*` pemanggil milik glyph di dalam: `data-iv-lead`, `data-iv-layer`,
 * `data-layer-slot`, `data-rsvp-petal`, `data-story-finale` … dibaca partitur dan GSAP, yang
 * menganimasikan elemen pemiliknya. Pembungkus hanya membawa kunci keping, kelas, dan gaya.
 */
const milikDalam = (key: string) => key.startsWith('data-')
const luar = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => !milikDalam(key) && key !== 'class' && key !== 'style')))
const dalam = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => milikDalam(key))))
const gaya = computed(() => gayaKeping(keping.value, props.tampilBawaan))
const gerak = computed(() => (keping.value?.gerak && keping.value.gerak !== 'bagian' ? keping.value.gerak : undefined))
</script>

<template>
  <component
    :is="tag"
    v-bind="luar"
    :data-iv-slot="slotId"
    :data-iv-el="kunci"
    :data-iv-bagian="section?.id"
    :data-iv-glyph="typeof sumber === 'string' ? sumber : undefined"
    :data-iv-terkunci="keping?.terkunci ? '' : undefined"
    :data-iv-tersembunyi="gaya.display === 'none' ? '' : undefined"
    :class="['iv-keping iv-keping--ornamen', attrs.class]"
    :style="[attrs.style as never, gaya]"
  >
    <OrnamentGlyph
      v-if="sumber"
      v-bind="dalam"
      :glyph="sumber"
      :initials="initials"
      :data-iv-gerak="gerak"
      :data-iv-tunda="keping?.tunda || undefined"
      :class="['iv-keping-isi', kelasIsi ?? 'iv-keping-isi--penuh']"
    />
    <slot v-else />
  </component>
</template>
