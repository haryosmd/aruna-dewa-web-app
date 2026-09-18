<script setup lang="ts">
const ready = ref(false)
onMounted(() => { ready.value = true })
</script>

<template>
  <NuxtLoadingIndicator color="#b4472a" :height="2" />

  <div :data-ready="ready ? 'true' : 'false'">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>

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
