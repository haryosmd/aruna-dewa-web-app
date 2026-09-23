<script setup lang="ts">
import { ImagePlus } from 'lucide-vue-next'

/**
 * Tempat foto yang masih menunggu diisi — **hanya di panggung editor**.
 *
 * Undangan baru lahir dengan seluruh kata-katanya terisi tapi tanpa satu foto pun, dan bagian
 * yang isinya semata media karena itu tidak merender apa-apa: `Gallery.vue` ber-`v-if` pada
 * jumlah fotonya, dan lima bagian lain menyembunyikan lapisan latarnya saat `imageUrl` kosong.
 * Di halaman tamu itu benar — undangan yang terbit tidak boleh memperlihatkan kerangka. Di
 * panggung ia berbohong dengan cara yang paling mahal: pasangan membaca ruang kosong sebagai
 * "bagian ini rusak", bukan sebagai "bagian ini menunggu fotoku".
 *
 * Karena itu komponen ini tidak pernah dirender di luar `mode: 'stage'`, dan pemanggilnya yang
 * menjaga syarat itu — bukan komponen ini, supaya satu-satunya cara ia muncul di halaman tamu
 * adalah seseorang menuliskannya di sana dengan sengaja.
 */
withDefaults(defineProps<{ label: string; hint?: string; tinggi?: string }>(), { hint: '', tinggi: '9rem' })
</script>

<template>
  <div
    class="iv-slot-kosong grid place-items-center gap-1.5 rounded-[1.25rem] px-5 py-6 text-center"
    :style="{ minHeight: tinggi }"
    data-iv-slot-kosong
  >
    <ImagePlus :size="20" aria-hidden="true" class="opacity-70" />
    <p class="iv-kicker m-0">{{ label }}</p>
    <p v-if="hint" class="m-0 text-[0.75rem] leading-snug opacity-70">{{ hint }}</p>
  </div>
</template>

<style scoped>
/*
 * Garis putus-putus dari tinta bagiannya sendiri, bukan warna tetap: bagian bertone `ink`
 * (hitung mundur, penutup) akan menelan bingkai gelap tanpa sisa, dan yang tersisa di panggung
 * adalah kotak hitam di atas kotak hitam — persis keluhan yang melahirkan fase ini.
 */
.iv-slot-kosong {
  border: 1px dashed color-mix(in oklab, currentColor 38%, transparent);
  background: color-mix(in oklab, currentColor 5%, transparent);
}
</style>
