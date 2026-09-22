<script setup lang="ts">
/**
 * Panel foto di kiri undangan saat layarnya lebar (fase 77).
 *
 * Sampai fase ini undangan tidak punya wajah desktop sama sekali: `tokens.layout` bawaannya
 * `kartu`, yang di container ≥48rem mengunci undangan jadi kartu 480px di tengah. Jadi tamu yang
 * membukanya di laptop melihat kolom ponsel dengan dua bidang kosong di kanan-kirinya, dan ketiga
 * lebar pratinjau di editor terlihat sama-sama mobile — bukan karena editornya salah, melainkan
 * karena itu satu-satunya tata letak yang pernah dibuat.
 *
 * Isinya foto **Galeri** kalau ada — cover sudah berdiri sendiri sebagai layar pertama di kolom
 * kanan, jadi mengulangnya di kiri berarti dua salinan foto yang sama bersebelahan. Kalau galerinya
 * kosong, foto utama tetap dipakai: dua salinan lebih baik daripada kehilangan seluruh tata letak
 * desktop, dan undangan yang baru dibuat selalu ada di keadaan itu.
 *
 * `aria-hidden` dan bukan `<img alt>`: tiap foto di sini sudah punya padanannya di bagian Galeri
 * yang bisa dibaca dan dibuka pembaca layar. Panel ini pengulangan visual, dan pengulangan yang
 * ikut dibacakan adalah kebisingan.
 */
const { fotoSisi, coupleNames } = useInvitation()

/** Jeda antar foto. Lambat dengan sengaja: ia latar, bukan pertunjukan. */
const JEDA = 6000

const indeks = ref(0)
/** Foto yang baru saja turun — ia yang berada di bawah foto yang sedang memudar masuk. */
const sebelumnya = ref(-1)
let jam: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  if (fotoSisi.value.length < 2) return
  // Satu foto yang diam adalah keadaan akhir yang benar bagi yang meminta gerak minimal.
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
  jam = setInterval(() => {
    sebelumnya.value = indeks.value
    indeks.value = (indeks.value + 1) % fotoSisi.value.length
  }, JEDA)
})
onBeforeUnmount(() => clearInterval(jam))

const keadaan = (i: number) => (i === indeks.value ? 'masuk' : i === sebelumnya.value ? 'keluar' : 'diam')
</script>

<template>
  <aside v-if="fotoSisi.length" class="iv-aside" aria-hidden="true">
    <img
      v-for="(url, i) in fotoSisi"
      :key="url"
      :src="url"
      alt=""
      :loading="i === 0 ? 'eager' : 'lazy'"
      class="iv-aside-foto"
      :data-foto="keadaan(i)"
    >
    <!-- Tabir dari bawah: nama pasangan tetap terbaca di atas foto seterang apa pun. -->
    <div class="iv-aside-tabir" />
    <p class="iv-aside-nama iv-display">{{ coupleNames }}</p>
  </aside>
</template>

<style>
/*
 * Tersembunyi secara bawaan dan dinyalakan oleh aturan desktop di `Renderer.vue`. Arah ini
 * disengaja: kalau kelak ada container yang lupa dicakup aturannya, cacatnya adalah panel yang
 * tidak muncul — bukan panel foto setinggi layar yang menindih undangan di ponsel.
 */
.iv-aside {
  display: none;
  position: relative;
  overflow: hidden;
  background: color-mix(in srgb, var(--iv-fg) 12%, var(--iv-bg));
}
/*
 * Silang-pudar lewat tumpukan + `@keyframes`, bukan `opacity: 0` di keadaan istirahat.
 *
 * Versi pertama memberi tiap foto `opacity: 0` lalu menaikkan yang aktif, dan `motion-rules.spec.ts`
 * memerahkannya — dengan benar: aturan DESIGN.md melarang elemen yang diam-diam bening sampai
 * JavaScript datang menyelamatkannya. Di sini tidak ada yang disembunyikan; ketiga foto buram
 * penuh dan yang aktif sekadar berdiri paling atas. Tanpa JS, foto pertama terlihat karena ia
 * memang foto pertama dalam tumpukan, bukan karena ada yang menyalakannya.
 *
 * Yang memudar hanya foto yang BARU naik, dan `@keyframes` adalah keadaan awal animasi — persis
 * pengecualian yang sudah tertulis di penjaga itu.
 */
.iv-aside-foto {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* Yang baru turun tetap di atas sisa tumpukan, supaya pudarnya benar-benar dari foto sebelumnya. */
.iv-aside-foto[data-foto='keluar'] { z-index: 1; }
.iv-aside-foto[data-foto='masuk'] {
  z-index: 2;
  animation: iv-aside-masuk 1.6s ease-in-out both;
}
@keyframes iv-aside-masuk {
  from { opacity: 0; }
  to { opacity: 1; }
}
.iv-aside-tabir {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: linear-gradient(180deg, transparent 45%, rgb(0 0 0 / 0.55) 100%);
}
.iv-aside-nama {
  position: absolute;
  z-index: 4;
  inset-inline: 0;
  bottom: 2.5rem;
  margin: 0;
  padding-inline: 2rem;
  text-align: center;
  color: #fffdf7;
  font-size: clamp(1.75rem, 1.2rem + 1.6cqw, 3rem);
  line-height: 1.1;
  text-shadow: 0 2px 18px rgb(0 0 0 / 0.45);
}
@media (prefers-reduced-motion: reduce) {
  .iv-aside-foto[data-foto='masuk'] { animation: none; }
}
</style>
