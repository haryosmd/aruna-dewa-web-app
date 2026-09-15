<script setup lang="ts">
import { Disc3, Pause } from 'lucide-vue-next'
import { nextMusicState, silentMusic, type MusicEvent } from '~/utils/music-state'

const props = withDefaults(defineProps<{ url: string; title?: string; credit?: string }>(), { title: '', credit: '' })

const audio = ref<HTMLAudioElement | null>(null)

/**
 * Keputusannya di `utils/music-state.ts`, pelaksanaannya di sini.
 *
 * Komponen ini hanya menerjemahkan keadaan jadi `play()`/`pause()` dan menyimpan penolakan
 * tamu. Lima pemicunya — gerbang, tombol, siaran dibuka, tab tersembunyi, tab kembali — punya
 * aturan yang saling menimpa, dan aturan itu diuji tanpa browser di `test/music-state.spec.ts`.
 */
const state = ref(silentMusic())
const playing = computed(() => state.value.playing)

/** Volume puncak. Musik latar di balik teks; penuh terdengar seperti iklan, bukan undangan. */
const peak = 0.6
let fade: ReturnType<typeof setInterval> | undefined

/**
 * Tamu yang menekan jeda sudah menjawab pertanyaannya.
 *
 * Tanpa ini, memuat ulang halaman atau membuka tautan yang sama dari WhatsApp memutar musiknya
 * lagi — dan orang yang sedang di ruang rapat harus menolaknya berulang kali. Disimpan per tab
 * (`sessionStorage`), bukan selamanya: undangan yang dibuka besok pagi boleh mulai dari awal.
 */
const muteKey = 'aruna:musik-ditolak'

function refused(): boolean {
  try { return sessionStorage.getItem(muteKey) === '1' } catch { return false }
}
function remember(value: boolean) {
  try {
    if (value) sessionStorage.setItem(muteKey, '1')
    else sessionStorage.removeItem(muteKey)
  } catch { /* Mode privat; cukup untuk sesi ini saja. */ }
}

function fadeIn() {
  const element = audio.value
  if (!element) return
  clearInterval(fade)
  element.volume = 0
  const step = peak / 24
  fade = setInterval(() => {
    if (!audio.value) { clearInterval(fade); return }
    const next = Math.min(peak, audio.value.volume + step)
    audio.value.volume = next
    if (next >= peak) clearInterval(fade)
  }, 50)
}

/**
 * Satu-satunya jalan masuk. Dipanggil **sinkron** dari handler yang melahirkan pemicunya,
 * bukan lewat `watch` — untuk `gate` itu bukan pilihan gaya, melainkan syarat: kebijakan
 * autoplay memberi izin pada gestur pengguna, dan izin itu paling aman dipakai di dalam
 * tumpukan panggilan gestur itu sendiri. Jangan menyelipkan `await` sebelum `play()`.
 */
function apply(event: MusicEvent) {
  // `sessionStorage` yang memegang `refused`, bukan ref ini — ia bertahan melewati muat ulang.
  const before = { ...state.value, refused: refused() }
  const next = nextMusicState(before, event)
  if (next.refused !== before.refused) remember(next.refused)
  state.value = next

  const element = audio.value
  if (!element || next.playing === before.playing) return

  if (next.playing) {
    fadeIn()
    void element.play().catch(() => {
      // Ditolak juga. Tamu masih punya tombolnya; tidak ada yang perlu diberitahukan.
      clearInterval(fade)
      state.value = { ...state.value, playing: false }
    })
    return
  }

  clearInterval(fade)
  element.pause()
}

/**
 * Tab yang tersembunyi tetap berbunyi — browser tidak menjedanya sendiri. Tanpa penjaga ini,
 * tamu yang pergi menonton siaran akad mendengar Gymnopédie menimpa ijab kabulnya.
 */
function onVisibility() {
  apply(document.visibilityState === 'hidden' ? 'hide' : 'show')
}

onMounted(() => document.addEventListener('visibilitychange', onVisibility))
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  clearInterval(fade)
})

defineExpose({
  arm: () => apply('gate'),
  /** Dipakai section Video saat tamu menekan "Buka siaran". */
  pause: () => apply('leave'),
})
</script>

<template>
  <!--
    Kiri bawah, melayang di atas dock — bukan sebaris dengannya. Dock adalah pil di tengah yang
    menyisakan sekitar 40px di tiap sisi pada layar 360px; tombol 48px tidak muat di situ. Sisi
    kiri dipilih karena ibu jari kanan menyapu di sisi kanan selagi menggulir, dan tombol yang
    tersenggol di sana membuat musik mati tanpa tamu tahu kenapa.
  -->
  <div v-if="props.url" class="fixed bottom-[5.5rem] left-4 z-30 flex items-center gap-2">
    <audio ref="audio" :src="props.url" loop preload="none" />
    <button
      type="button"
      :aria-label="playing ? 'Jeda musik' : 'Putar musik'"
      :aria-pressed="playing"
      class="grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-[0_10px_28px_-10px_rgb(0_0_0/0.5)] transition-transform duration-300 hover:scale-105"
      style="background: var(--iv-primary); color: #fffdf7"
      @click="apply('toggle')"
    >
      <Pause v-if="playing" :size="19" aria-hidden="true" />
      <Disc3 v-else :size="20" aria-hidden="true" />
    </button>

    <!--
      Keterangan lagu, membuka ke kanan dari tombolnya, dan muncul di **setiap** lebar.
      Sebelumnya `@sm:block` menyembunyikannya di bawah 384px — artinya di iPhone SE dan
      Android 360px atribusinya tidak pernah terbaca sama sekali. Untuk lagu domain publik itu
      sekadar sayang; untuk lisensi yang menuntut atribusi, kredit yang tak pernah tampil di
      perangkat utama pembacanya bukan atribusi.
    -->
    <p
      v-if="playing && props.title"
      class="m-0 max-w-[13rem] truncate rounded-full px-3 py-1.5 text-[0.75rem] backdrop-blur-xl"
      style="background: color-mix(in srgb, var(--iv-bg) 88%, transparent); border: 1px solid color-mix(in srgb, var(--iv-fg) 12%, transparent); color: var(--iv-fg); font-family: var(--iv-body)"
    >
      {{ props.title }}<template v-if="props.credit"> · {{ props.credit }}</template>
    </p>
  </div>
</template>
