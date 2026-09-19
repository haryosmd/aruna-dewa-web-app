<script setup lang="ts">
/**
 * Flap bertakik — tepi bawah bergerigi tumpal tiga puncak, yang tengah paling panjang.
 *
 * Bentuk amplop (fase 69): dirender `CoverGate.vue` dengan `preserveAspectRatio="none"` supaya
 * mengikuti kotak amplop 3:2, jadi koordinatnya adalah proporsi, bukan ukuran. Tepi atas flap
 * wajib penuh di y=0 karena ia berputar pada `origin-top`; kantong wajib menutup sampai dasar
 * karena ia yang menyembunyikan surat sebelum naik. Garis tepinya membaca `--amplop-garis`
 * supaya gerbang bisa memberinya warna teks sementara badannya mengikuti campuran warna utama.
 */
</script>

<template>
  <svg viewBox="0 0 300 174" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">
    <path data-mass="" d="M0 0 H300 V36 L250 118 L200 74 L150 174 L100 74 L50 118 L0 36 Z" />
    <path data-draw="" d="M0 0 H300 V36 L250 118 L200 74 L150 174 L100 74 L50 118 L0 36 Z" stroke="var(--amplop-garis, currentColor)" stroke-opacity="0.22" stroke-width="2.5" stroke-linejoin="round" fill="none" />
  </svg>
</template>
