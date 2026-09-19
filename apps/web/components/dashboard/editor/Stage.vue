<script setup lang="ts">
import { Laptop, Smartphone, Tablet } from 'lucide-vue-next'
import type { InvitationDocument } from '~/types/aruna'
import type { PreviewDevice } from '~/composables/useEditorPrefs'
import { sectionDomId, stageScrollTop } from '~/utils/editor-sections'

/*
 * Panggung pratinjau.
 *
 * Pertanyaan yang sebenarnya dipegang pasangan saat menyunting bukan "apa yang saya lihat",
 * melainkan "apa yang dilihat tamu saya". Tamu hampir selalu membuka dari ponsel, jadi
 * bawaannya ponsel — bukan lebar panggung yang kebetulan tersedia.
 *
 * Lebarnya dirender sungguhan lalu diperkecil, bukan diperkecil lalu dirender: undangannya
 * memakai container query di seluruh badannya (`.iv-root`), jadi render selebar 390px
 * berperilaku persis seperti ponsel selebar 390px. Skalanya tidak pernah melebihi 1 —
 * memperbesar render hanya akan mengaburkan gambar dan berbohong soal ukuran huruf.
 */
const previewDevices = [
  { id: 'ponsel', label: 'Ponsel', width: 390, icon: Smartphone },
  { id: 'tablet', label: 'Tablet', width: 834, icon: Tablet },
  { id: 'laptop', label: 'Laptop', width: 1280, icon: Laptop },
] as const satisfies readonly { id: PreviewDevice; label: string; width: number; icon: unknown }[]

const props = defineProps<{
  document: InvitationDocument
  /**
   * Bagian yang baru dipilih di rail. `nonce` naik tiap klik supaya memilih ulang bagian yang
   * sama tetap menggulir — pasangan yang sudah menggulir jauh lalu mengklik "Galeri" lagi
   * mengharapkan panggung kembali ke galeri, bukan diam karena nilainya "tidak berubah".
   */
  focusSection?: { type: string, nonce: number } | null
}>()
const device = defineModel<PreviewDevice>('device', { default: 'ponsel' })

/*
 * Rail → panggung (fase 70). Klik di "Struktur undangan" menggulir viewport ke bagian itu.
 *
 * Yang digulir adalah viewport `overflow-y-auto` di bawah, bukan `window`: `scroll-behavior:
 * smooth` di `html` tidak diwarisi ke sana, jadi perilakunya ditulis eksplisit dan
 * `prefers-reduced-motion` dihormati sendiri. Saat viewport sedang disembunyikan (ponsel
 * dengan tab Pengaturan aktif) gulirnya tidak bisa dihitung, jadi permintaannya dilewatkan;
 * pemanggil menaikkan `nonce` lagi ketika tab Pratinjau dibuka, dan saat itulah ia dijalankan.
 */
const viewport = ref<HTMLElement | null>(null)
let percobaan = 0

/*
 * `sisa` adalah jumlah frame yang masih boleh ditunggu. Saat panggung baru saja ditampilkan
 * (tab Pratinjau di bawah `xl`), `InvitationPhoneFrame` masih memegang tinggi 0 dari pengukuran
 * ketika ia `display:none`; ResizeObserver-nya menyusul satu-dua frame kemudian. Menggulir
 * sebelum itu tidak melakukan apa pun — viewport belum punya apa-apa untuk digulir — jadi
 * percobaannya diulang per frame sampai viewport benar-benar bisa menggulir.
 */
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
  const tujuan = () => stageScrollTop(
    { top: host.getBoundingClientRect().top, scrollTop: host.scrollTop },
    { top: target.getBoundingClientRect().top },
  )
  host.scrollTo({ top: tujuan(), behavior: halus ? 'smooth' : 'instant' })

  /*
   * Satu koreksi setelah gulirnya mengendap. Font undangan dan foto galeri masih bisa tiba
   * sesudah gulir dimulai dan menggeser semua yang ada di atas target (terukur 63px di WebKit);
   * kalau targetnya melenceng lebih dari beberapa piksel, ia dirapikan sekali — `instant`,
   * karena selisihnya kecil dan gulir halus kedua akan terbaca sebagai sentakan.
   */
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
  gulirKe(fokus.type)
}, { flush: 'post' })

const previewWidth = computed(() => previewDevices.find(d => d.id === device.value)?.width ?? 390)

/*
 * Skalanya dihitung oleh `InvitationPhoneFrame` dari induk terdekatnya — viewport yang
 * menggulung di bawah, bukan panggung di luarnya. Selisihnya selebar scrollbar, dan itu cukup:
 * skala yang dihitung dari lebar panggung membuat render Tablet dan Laptop persis selebar
 * panggung, lalu tergunting belasan piksel di kanan oleh scrollbar-nya sendiri.
 * `scrollbar-gutter: stable` memastikan lebar itu tidak lagi berubah saat isinya cukup pendek
 * untuk tidak menggulung — tanpa itu, tinggi mengubah lebar, lebar mengubah skala, dan skala
 * mengubah tinggi lagi.
 *
 * Padding horizontal ada di viewport itu, bukan di pembungkus di antaranya: bingkai membaca
 * content-box induknya, jadi padding sudah dikurangkan dari lebar yang dipakai menghitung
 * skala, dan tes e2e yang menaiki dua induk dari `[data-preview-stage]` tetap mendarat di
 * elemen yang benar.
 */
const previewScale = ref(1)
const previewScalePct = computed(() => Math.round(previewScale.value * 100))
</script>

<template>
  <section
    class="relative flex min-h-0 min-w-0 flex-col bg-surface-3 [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] lg:overflow-hidden"
    aria-label="Pratinjau draft"
  >
    <!--
      Pemilih perangkat mengambang di atas panggung, bukan sakelar zoom. Labelnya nama benda
      yang dipegang tamu, dan lebar sungguhannya ikut ditulis — tanpa angka itu, pratinjau yang
      diperkecil jadi misteri: pasangan tidak tahu apakah hurufnya memang sekecil itu di ponsel
      atau hanya kelihatan kecil di sini.
    -->
    <div class="pointer-events-none absolute inset-x-0 top-3 z-[var(--z-raised)] flex justify-center px-4">
      <div class="pointer-events-auto grid justify-items-center gap-1.5">
        <div class="flex gap-1 rounded-full border border-border bg-surface p-1 shadow-lift" role="group" aria-label="Lebar pratinjau">
          <button
            v-for="option in previewDevices"
            :id="`editor-preview-${option.id}`"
            :key="option.id"
            type="button"
            :aria-pressed="device === option.id"
            :class="cn(
              'flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors duration-200',
              device === option.id ? 'bg-ink text-ink-inverse' : 'text-ink-muted hover:bg-surface-3 hover:text-ink',
            )"
            @click="device = option.id"
          >
            <component :is="option.icon" :size="15" aria-hidden="true" />
            {{ option.label }}
          </button>
        </div>

        <!-- `ink-muted`, bukan `ink-subtle`: pasangan ink-subtle di atas surface-3 belum diaudit kontrasnya. -->
        <p class="m-0 flex items-center gap-2 rounded-full bg-surface/85 px-3 py-1 text-caption text-ink-muted backdrop-blur">
          <span>Selebar {{ previewWidth }}px</span>
          <span v-if="previewScalePct < 100" class="tabular-nums">· diperkecil {{ previewScalePct }}%</span>
        </p>
      </div>
    </div>

    <!--
      Tingginya mengikuti layar di `lg` (panel ini yang menggulung), dan dibatasi `36rem` di
      bawahnya supaya tab Pratinjau di ponsel tidak jadi halaman sepanjang undangan.
    -->
    <div
      ref="viewport"
      class="max-h-[36rem] min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-28 [scrollbar-gutter:stable] sm:px-6 lg:max-h-none"
    >
      <InvitationPhoneFrame
        v-model:scale="previewScale"
        :width="previewWidth"
        class="rounded-xl bg-surface shadow-float ring-1 ring-border"
      >
        <InvitationRenderer :document="props.document" compact />
      </InvitationPhoneFrame>
    </div>
  </section>
</template>
