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
}>(), { width: 390, maxHeight: undefined, screenHeight: undefined, scrollable: false })

/** Skala yang sedang berlaku, untuk induk yang ingin menuliskannya ("diperkecil 62%"). */
const scale = defineModel<number>('scale', { default: 1 })

const frame = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const host = computed(() => frame.value?.parentElement ?? null)
const { width: hostWidth } = useElementSize(host)
const { height: stageHeight } = useElementSize(stage)

/** Layar bergulir hanya sah kalau tingginya diketahui — tanpa itu tidak ada yang bisa dipotong. */
const layar = computed(() => (props.scrollable && props.screenHeight ? props.screenHeight : null))

const fit = computed(() => {
  let next = hostWidth.value ? Math.min(1, hostWidth.value / props.width) : 1
  if (props.maxHeight && stageHeight.value) next = Math.min(next, props.maxHeight / stageHeight.value)
  return next
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
