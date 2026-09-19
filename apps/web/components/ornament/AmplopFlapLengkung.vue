<script setup lang="ts">
/**
 * Flap lengkung — sisi yang menggembung lalu mengecil ke ujung bulat, seperti flap amplop kartu.
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
    <path data-mass="" d="M0 0 H300 C288 34 268 68 244 98 C220 128 192 152 168 166 C160 172 150 174 150 174 C150 174 140 172 132 166 C108 152 80 128 56 98 C32 68 12 34 0 0 Z" />
    <path data-draw="" d="M0 0 H300 C288 34 268 68 244 98 C220 128 192 152 168 166 C160 172 150 174 150 174 C150 174 140 172 132 166 C108 152 80 128 56 98 C32 68 12 34 0 0 Z" stroke="var(--amplop-garis, currentColor)" stroke-opacity="0.22" stroke-width="2.5" stroke-linejoin="round" fill="none" />
  </svg>
</template>
