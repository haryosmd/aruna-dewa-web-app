<script setup lang="ts">
/**
 * Kantong lengkung — lipatan samping yang melandai seperti amplop undangan cetak, bukan V tajam.
 *
 * Bentuk amplop (fase 69): dirender `CoverGate.vue` dengan `preserveAspectRatio="none"` supaya
 * mengikuti kotak amplop 3:2, jadi koordinatnya adalah proporsi, bukan ukuran. Tepi atas flap
 * wajib penuh di y=0 karena ia berputar pada `origin-top`; kantong wajib menutup sampai dasar
 * karena ia yang menyembunyikan surat sebelum naik. Garis tepinya membaca `--amplop-garis`
 * supaya gerbang bisa memberinya warna teks sementara badannya mengikuti campuran warna utama.
 */
</script>

<template>
  <svg viewBox="0 0 300 200" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">
    <path data-mass="" d="M0 62 C30 74 58 92 84 112 C106 128 128 146 150 152 C172 146 194 128 216 112 C242 92 270 74 300 62 V200 H0 Z" />
    <path data-draw="" d="M0 62 C30 74 58 92 84 112 C106 128 128 146 150 152 C172 146 194 128 216 112 C242 92 270 74 300 62" stroke="var(--amplop-garis, currentColor)" stroke-opacity="0.22" stroke-width="2.5" stroke-linejoin="round" fill="none" />
  </svg>
</template>
