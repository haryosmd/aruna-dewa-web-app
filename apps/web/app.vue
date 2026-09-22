<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'

const ready = ref(false)
onMounted(() => { ready.value = true })
</script>

<template>
  <NuxtLoadingIndicator color="#b4472a" :height="2" />

  <!--
    Satu `TooltipProvider` untuk seluruh aplikasi: `TooltipRoot` milik reka melempar kalau tidak
    menemukannya, dan `skipDelayDuration` yang dibagi bersama membuat geser dari satu ikon rail ke
    ikon berikutnya langsung berganti tooltip, bukan menunggu 300ms lagi. Tanpa DOM, aman SSR.
  -->
  <TooltipProvider :delay-duration="300" :skip-delay-duration="250">
    <div :data-ready="ready ? 'true' : 'false'">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </TooltipProvider>

  <!--
    Dipasang di sini, bukan di layout: editor undangan memakai `layout: false`, dan halaman
    itulah yang paling butuh popup "perubahan belum tersimpan".
  -->
  <AtomicPopup />

  <!--
    Alasan penempatannya sama persis dengan popup di atas. Sejak fase 60 ini markup kita
    sendiri, bukan `<Toaster>` milik `vue-sonner` — lihat `stores/toast.ts` untuk sebabnya.
  -->
  <AtomicToaster />
</template>
