<script setup lang="ts">
/*
 * Bingkai selebar ponsel: dirender sungguhan selebar `width`, lalu diperkecil supaya muat
 * di wadahnya. Diperkecil sesudah dirender, bukan sebaliknya — undangan memakai container
 * query di seluruh badannya (`.iv-root`), jadi render 390px berperilaku persis seperti ponsel
 * 390px. Skala tidak pernah melebihi 1: memperbesar hanya mengaburkan foto dan berbohong soal
 * ukuran huruf.
 *
 * Dulu hidup di `DashboardEditorStage`; ditarik ke sini saat wizard `/order` (fase 65) butuh
 * bingkai yang sama. Ukurannya dibaca dari **induk** elemen ini (content-box, jadi padding
 * induk sudah dikurangkan), karena elemen ini sendiri lebarnya hasil hitungan.
 *
 * `transform` tidak mengubah tata letak, jadi pembungkus luar yang memegang ukuran hasil
 * perkecilan — tanpa itu wadah menyisakan ruang kosong setinggi render yang belum diperkecil.
 * `data-preview-stage` tetap di elemen yang di-transform: tes e2e editor memakainya sebagai
 * kaitan, dan sejak fase 76 elemen itu **juga** wadah gulirnya.
 */
const props = withDefaults(defineProps<{
  width?: number
  /**
   * Tinggi maksimum hasil perkecilan, dalam piksel. Dipakai wizard `/order` supaya section
   * yang sedang difokuskan selalu muat di viewport tanpa menggulung — di laptop 768px, cover
   * selebar 390px saja sudah 680px tinggi dan nama pasangan jatuh di bawah lipatan.
   *
   * Sejak fase 76 panggung editor mengopernya juga, dan di sana artinya lebih tajam: dipasangkan
   * dengan `scrollable`, `stageHeight` sama dengan `screenHeight`, jadi baris `fit` di bawah
   * berubah makna jadi "muat berdasarkan tinggi ruang panggung" tanpa rumus baru.
   */
  maxHeight?: number
  /**
   * Tinggi VIEWPORT perangkat yang sedang ditiru, dalam koordinat render (sebelum diperkecil).
   *
   * Diterbitkan sebagai `--iv-layar-h` ke dalam undangan. Bagian yang setinggi "satu layar" —
   * cover, hero, gerbang amplop — dulu memakai `100svh`, yang di dalam editor berarti tinggi
   * JENDELA EDITOR: mengecilkan jendela memendekkan cover di dalam bingkai iPhone, sesuatu yang
   * tidak pernah terjadi di ponsel sungguhan.
   *
   * Nilainya tidak dibagi `fit`: ia hidup DI DALAM elemen yang di-`scale()`, jadi ia sudah berada
   * di koordinat render yang sama dengan lebar 390/412 di sebelahnya.
   *
   * Dibiarkan `undefined` di halaman publik `/i/[slug]`, dan di sana `100svh` memang jawaban yang
   * benar — pembacanya menulis `var(--iv-layar-h, 100svh)`, jadi absennya var ini adalah
   * perilaku lama, cuma-cuma.
   */
  screenHeight?: number
  /**
   * Layar ponsel jadi wadah gulirnya sendiri (fase 76). Butuh `screenHeight`.
   *
   * Sebelum ini yang menggulung adalah viewport panggung di luar bingkai — ia menggeser
   * *bingkainya*, bukan isinya, dan bezel perangkat yang memotong di `screenHeight` membuat
   * segala isi di bawah lipatan tidak bisa dicapai sama sekali. Dengan ini, layarnya menggulung
   * persis seperti ponsel sungguhan dan bingkainya diam.
   */
  scrollable?: boolean
  /**
   * Lebar yang tersedia, diberikan pemanggil (fase 81). Tanpa ini lebarnya dibaca dari induk.
   *
   * Panggung editor wajib mengopernya. Induknya di sana pembungkus `w-fit` bersudut membulat, yang
   * lebarnya ditentukan bingkai ini sendiri — jadi `lebarInduk / width` selalu sama dengan `fit` yang
   * sedang berlaku dan tidak pernah bisa tumbuh. Terukur sebelum fase 81: sesudah Ponsel (±330px)
   * tablet tersangkut di 330/768 = 0,43 dan desktop di 330/1280 = 0,26, dan ZOOM tak berefek.
   */
  hostWidth?: number
  /**
   * Cara muat (fase 81). `utuh` = seluruh layar harus terlihat (lebar DAN `maxHeight`) — ponsel.
   * `lebar` = pas lebar saja; layarnya lalu dipanjangkan sampai mengisi `maxHeight`, jadi tablet dan
   * desktop tidak lagi jadi kartu pos di tengah panggung kosong. Isinya tetap digulir di dalam.
   */
  muat?: 'utuh' | 'lebar'
  /** Pengali di atas skala pas (ZOOM panggung, 0,5–2). Skala akhir tetap tidak melebihi 1. */
  zoom?: number
}>(), { width: 390, maxHeight: undefined, screenHeight: undefined, scrollable: false, hostWidth: undefined, muat: 'utuh', zoom: 1 })

/** Skala yang sedang berlaku, untuk induk yang ingin menuliskannya ("diperkecil 62%"). */
const scale = defineModel<number>('scale', { default: 1 })

const frame = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const host = computed(() => frame.value?.parentElement ?? null)
const { width: lebarInduk } = useElementSize(host)
const { height: stageHeight } = useElementSize(stage)
const hostWidth = computed(() => props.hostWidth ?? lebarInduk.value)

/*
 * Skala pas SEBELUM zoom. Mode `lebar` tidak membaca tinggi sama sekali: tinggi layarnya justru
 * turunan skala ini (lihat `layar`), jadi membacanya di sini akan membuat lingkaran.
 */
const pas = computed(() => {
  let next = hostWidth.value ? hostWidth.value / props.width : 1
  if (props.muat === 'utuh' && props.maxHeight && stageHeight.value) next = Math.min(next, props.maxHeight / stageHeight.value)
  return next
})
const fit = computed(() => Math.min(1, pas.value * props.zoom))

/**
 * Layar bergulir hanya sah kalau tingginya diketahui — tanpa itu tidak ada yang bisa dipotong.
 * Mode `lebar`: layar dipanjangkan sampai bingkai hasil perkecilan mengisi `maxHeight`, tapi tidak
 * pernah lebih pendek dari viewport perangkat aslinya.
 */
const layar = computed(() => {
  if (!props.scrollable || !props.screenHeight) return null
  if (props.muat === 'lebar' && props.maxHeight && fit.value > 0) return Math.max(props.screenHeight, Math.round(props.maxHeight / fit.value))
  return props.screenHeight
})
watch(fit, next => { scale.value = next }, { immediate: true })

defineExpose({ scroller: stage })
</script>

<template>
  <div
    ref="frame"
    class="overflow-hidden"
    :style="{
      width: `${Math.round(width * fit)}px`,
      height: `${Math.round(stageHeight * fit)}px`,
      marginInline: 'auto',
    }"
  >
    <div
      ref="stage"
      data-preview-stage
      :class="layar ? 'iv-phone-scroller' : undefined"
      :style="{
        width: `${width}px`,
        transform: `scale(${fit})`,
        transformOrigin: 'top left',
        ...(layar ? { height: `${layar}px`, overflowY: 'auto' } : {}),
        ...(screenHeight ? { '--iv-layar-h': `${screenHeight}px` } : {}),
      }"
    >
      <slot />
    </div>
  </div>
</template>

<style>
/*
 * Batang gulir disembunyikan, bukan dibiarkan: ia akan memakan 15 dari 390px yang justru sedang
 * ditiru, dan ponsel sungguhan tidak menampilkannya. `overscroll-behavior: contain` menahan
 * gulirnya supaya tidak merembet ke panggung begitu isi undangan habis.
 */
.iv-phone-scroller {
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.iv-phone-scroller::-webkit-scrollbar { display: none; }
</style>
