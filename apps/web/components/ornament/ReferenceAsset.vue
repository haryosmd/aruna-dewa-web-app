<script setup lang="ts">
/**
 * Aset referensi kiriman pemilik, dirender sebagai `<img>`.
 *
 * Sengaja bukan SVG inline: berkasnya membawa palet yang sudah terpanggang dan ratusan id
 * `clipPath`/`mask` sendiri, yang akan bertabrakan antar instans begitu ditempel ke dokumen.
 * Konsekuensinya ia **tidak mengikuti** `--iv-orn-*` — Studio Ornamen menandainya "warna tetap",
 * karena pasangan berhak tahu sebelum memilih, bukan sesudah menerbitkan.
 *
 * `width`/`height` wajib ada. Tanpanya tiap aset adalah sumber CLS: gambarnya tiba belakangan
 * dan mendorong isi di bawahnya. Itu tidak pernah terlihat sampai fase 59 hanya karena sebelum
 * itu tidak ada satu pun aset referensi yang bisa dicapai pasangan.
 */
defineProps<{ src: string; width?: number; height?: number }>()
</script>

<template>
  <img
    :src="src"
    :width="width"
    :height="height"
    alt=""
    aria-hidden="true"
    decoding="async"
    loading="lazy"
    class="object-contain"
  >
</template>
