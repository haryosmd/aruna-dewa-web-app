<script setup lang="ts">
import type { Component } from 'vue'
import { isUnggahan, ornamentBank, type OrnamentEntry, type OrnamentRef } from '~/utils/ornaments'

/**
 * Merender satu ornamen dari bank berdasarkan id-nya.
 *
 * Ornamen dipilih saat runtime lewat set milik tema, jadi tidak ada satupun yang disebut
 * sebagai tag di template. Auto-import Nuxt bekerja saat compile dan melewatkan komponen
 * semacam itu, dan `resolveComponent` pun gagal karena komponennya tidak pernah ikut bundle.
 * `import.meta.glob` menyelesaikan keduanya.
 *
 * **Glob-nya MALAS, bukan eager (2026-09-18).** Versi eager memasukkan seluruh isi bank ke
 * bundle setiap tamu — 132 ornamen untuk melihat sebelas. Itu sudah mahal sebelum ornamennya
 * digubah; setelah tiap ornamen membawa isen tembus, ia jadi tidak bisa dipertahankan.
 *
 * Kekhawatiran versi eager — "ikut ter-render di server" — diuji dan tidak terbukti: Nuxt
 * membungkus halaman dengan `<Suspense>`, jadi komponen async tetap diselesaikan saat SSR.
 * Diukur pada build produksi, halaman undangan yang sama merender 168 path ornamen di kedua
 * mode, tanpa satu pun peringatan hidrasi:
 *
 *   eager : 43 chunk · 956 KB JS
 *   malas : 61 chunk · 758 KB JS   (−21%)
 *
 * Selisihnya akan melebar tiap kali satu ornamen digubah jadi lebih padat, karena yang eager
 * membengkak untuk semua orang sementara yang malas hanya untuk yang benar-benar memakainya.
 * Tambahan 18 permintaan itu murah di HTTP/2 dan semuanya paralel.
 *
 * `cache` mencegah `defineAsyncComponent` dibuat ulang tiap kali `computed` dihitung ulang —
 * tanpa itu tiap perubahan prop akan melahirkan komponen baru dan me-remount ornamennya.
 */
const modules = import.meta.glob<{ default: Component }>('./*.vue')

const props = defineProps<{ glyph: OrnamentRef | null | undefined; initials?: string; ubin?: boolean }>()

/*
 * Aset referensi: SVG berpalet tetap dan raster asli dari koleksi pemilik.
 *
 * `ubin` memilih salinan mana yang dipakai. Pemilih di dasbor meminta ubin 240px karena ia bisa
 * menampilkan 44 aset sekaligus; undangan memakai salinan `web` 960px. **Tidak ada jalur yang
 * merender berkas penuh** — 66 aset itu 24 MB, dan yang terberat 1,8 MB sendirian.
 *
 * Dimensinya ikut diteruskan supaya `<img>` punya rasio intrinsik dan tata letak tidak melompat.
 */
const aset = computed(() => {
  // Unggahan pasangan (fase 69): satu URL untuk ubin dan undangan — berkasnya sudah dibatasi
  // 300 KB saat masuk, jadi tidak perlu salinan ringan seperti aset referensi.
  if (isUnggahan(props.glyph)) return { src: props.glyph.url, width: props.glyph.width, height: props.glyph.height }
  const entry = props.glyph ? (ornamentBank[props.glyph] as OrnamentEntry) : null
  if (!entry?.asset) return null
  const src = props.ubin ? (entry.thumb ?? entry.webAsset ?? entry.asset) : (entry.webAsset ?? entry.asset)
  return { src, width: entry.width, height: entry.height }
})

const cache = new Map<string, Component>()
const resolved = computed(() => {
  if (!props.glyph) return null
  const file = isUnggahan(props.glyph) ? 'ReferenceAsset' : ornamentBank[props.glyph].component.replace(/^Ornament/, '')
  const muat = modules[`./${file}.vue`]
  if (!muat) return null
  let comp = cache.get(file)
  if (!comp) { comp = defineAsyncComponent(muat as () => Promise<Component>); cache.set(file, comp) }
  return comp
})

/*
 * Hanya prop yang benar-benar dideklarasikan komponen tujuannya yang diteruskan.
 *
 * Pernah ada `flip` di sini, dan ia tidak melakukan apa pun: tidak satu pun dari 150
 * komponen ornamen mendeklarasikannya, jadi ia jatuh sebagai atribut DOM mentah
 * `flip="true"` pada `<svg>` dan berhenti di situ. Pembalikan yang benar-benar dipakai
 * dikerjakan CSS oleh pemanggilnya — `OrnamentField` memancarkan `transform: scaleX(-1)`
 * pada kepingnya sendiri.
 */
const extra = computed(() => ({
  ...(props.initials === undefined ? {} : { initials: props.initials }),
  ...(aset.value ? { src: aset.value.src, width: aset.value.width, height: aset.value.height } : {}),
}))
</script>

<template>
  <component :is="resolved" v-if="resolved" v-bind="extra" />
</template>
