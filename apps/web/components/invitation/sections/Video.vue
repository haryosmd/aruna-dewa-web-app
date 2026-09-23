<script setup lang="ts">
import { ExternalLink, PlayCircle } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'
import { youtubeEmbed, youtubeId, youtubeThumb } from '~/utils/youtube'

/**
 * Video atau siaran langsung.
 *
 * Fase 79 memberinya YouTube, dan sampulnya sendiri. Menyematkan iframe langsung akan
 * membalikkan satu hal yang sudah dibereskan fase 17: tombol play ada di dalam dokumen
 * lintas-origin, jadi klik tamu tidak menghasilkan event apa pun di halaman kita, `pauseMusic`
 * tidak pernah terpanggil, dan musik latar berbunyi menimpa ijab kabul. Penjaga
 * `visibilitychange` juga tidak menolong — video yang diputar di halaman ini tidak pernah
 * menyembunyikan tabnya.
 *
 * Jadi sampulnya kita yang gambar: **kliknya milik kita**, musik dijeda lebih dulu, iframe baru
 * dipasang sesudahnya. Efek sampingnya kebetulan yang paling diinginkan — halaman tamu tidak
 * memuat skrip YouTube sama sekali sampai ada yang benar-benar menonton.
 *
 * Kontrak musiknya tidak diubah. `pauseMusic` → `MusicPlayer.pause()` → `apply('leave')` berarti
 * "berhenti, dan jangan menyalakan dirinya sendiri lagi" — semantik yang benar di sini, karena
 * siarannya berjalan di halaman yang sama dan tamu yang mau musiknya kembali menekan tombolnya.
 */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, mode, pauseMusic, t } = useInvitation()

/**
 * Video tanpa tautan: di panggung ia tetap berdiri, di halaman tamu ia tetap hilang.
 *
 * Pola yang sama dengan galeri kosong (fase 78) dan rundown kosong. Tanpa ini pasangan yang
 * menyalakan Video dari rail menemukan bidang yang tidak ada — dan membacanya sebagai kerusakan,
 * bukan sebagai undangan untuk menempelkan tautannya.
 */
const panggung = computed(() => mode.value === 'stage')

const url = computed(() => text(props.section, 'url'))
const id = computed(() => youtubeId(url.value))

const dimainkan = ref(false)
/** Pasangan mengganti tautan di panggung: sampulnya harus kembali, bukan iframe video lama. */
watch(id, () => { dimainkan.value = false })

function mainkan() {
  // Urutannya bukan gaya penulisan. Iframe berbunyi begitu ia ada di DOM.
  pauseMusic()
  dimainkan.value = true
}
</script>

<template>
  <InvitationSection
    v-if="url || panggung"
    :id="sectionDomId('video')"
    tone="ink"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="kicker" tag="p" data-iv-lead class="iv-kicker m-0" :fallback="t('video.kicker')" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" fallback="Live streaming" />

    <InvitationOrnamen v-if="!dimainkan" data-iv-ornament slot-id="symbol" posisi="utama" class="h-16 w-20 opacity-75" />

    <!--
      YouTube, belum ditekan. Di panggung editor dan di kartu pratinjau landing (`compact`) hanya
      sampulnya yang dirender: pemutar musik tidak ada di sana, jadi `pauseMusic` tidak bisa
      menepati janjinya — dan satu iframe YouTube di kartu landing adalah biaya yang tidak diminta
      siapa pun.
    -->
    <template v-if="id">
      <div v-if="compact" class="iv-video-bingkai" data-iv-reveal>
        <img :src="youtubeThumb(id)" alt="" width="480" height="360" loading="lazy" decoding="async" class="iv-video-sampul">
        <span class="iv-video-main" aria-hidden="true"><PlayCircle :size="34" /></span>
      </div>

      <button v-else-if="!dimainkan" type="button" class="iv-video-bingkai iv-video-tombol" data-iv-reveal @click="mainkan">
        <img :src="youtubeThumb(id)" alt="" width="480" height="360" loading="lazy" decoding="async" class="iv-video-sampul">
        <span class="iv-video-main" aria-hidden="true"><PlayCircle :size="34" /></span>
        <InvitationText :section="props.section" field="open" tag="span" class="iv-video-label" :fallback="t('video.open')" />
      </button>

      <iframe
        v-else
        :src="youtubeEmbed(id)"
        class="iv-video-bingkai iv-video-frame"
        title="Siaran pernikahan"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      />
    </template>

    <InvitationSlotKosong
      v-else-if="!url"
      label="Siaran menunggu tautan"
      hint="Tempel tautan YouTube di tab Bagian › Video. Tamu tidak melihat kotak ini."
      tinggi="10rem"
    />

    <!--
      Bukan YouTube: tautan keluar yang sudah ada sejak fase 17, tidak berubah satu atribut pun.
      Gereja dan gedung yang menyiarkan lewat platformnya sendiri lewat pintu ini.
    -->
    <a v-else :href="url" target="_blank" rel="noreferrer" class="iv-chip" @click="pauseMusic">
      <PlayCircle :size="16" aria-hidden="true" />
      <InvitationText :section="props.section" field="open" tag="span" :fallback="t('video.open')" />
      <ExternalLink :size="13" aria-hidden="true" />
    </a>
  </InvitationSection>
</template>

<style>
.iv-video-bingkai {
  position: relative;
  display: block;
  width: min(100%, 34rem);
  /*
   * 16:9 di atas sampul `hqdefault` yang 4:3. `object-fit: cover` memotong pita hitam atas-bawah
   * yang dibawa berkas itu — lihat alasan memakai `hqdefault` di `utils/youtube.ts`.
   */
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 0;
  border-radius: 0.9rem;
  background: rgb(0 0 0 / 0.35);
  box-shadow: var(--iv-shadow-lift);
}
.iv-video-sampul { width: 100%; height: 100%; object-fit: cover; }

.iv-video-tombol { cursor: pointer; padding: 0; }

/* Cakram putar. Warna tema, bukan merah YouTube: ini undangan, bukan kanal. */
.iv-video-main {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 4.5rem;
  height: 4.5rem;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: color-mix(in srgb, var(--iv-primary) 88%, transparent);
  color: var(--iv-on-primary, #fffdf7);
  box-shadow: 0 8px 28px rgb(0 0 0 / 0.35);
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.iv-video-tombol:hover .iv-video-main,
.iv-video-tombol:focus-visible .iv-video-main { transform: translate(-50%, -50%) scale(1.06); }

.iv-video-label {
  position: absolute;
  inset: auto 0 0 0;
  padding: 2.5rem 0.9rem 0.8rem;
  font-family: var(--iv-body);
  font-size: 0.8125rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #fffdf7;
  background: linear-gradient(to top, rgb(0 0 0 / 0.6), transparent);
}
</style>
