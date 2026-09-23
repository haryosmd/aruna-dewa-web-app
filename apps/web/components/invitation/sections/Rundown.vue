<script setup lang="ts">
import { Clock3 } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'

/**
 * Susunan acara: daftar berwaktu 0–30 baris, di rel yang tumbuh mengikuti gulir.
 *
 * Berdampingan dengan bagian `event` Elegance, dan itu keputusan fase 79, bukan sisa. `event`
 * memuat dua acara utama yang dipatok kode — akad dan resepsi — dengan kartu tanggal besar;
 * bagian ini memuat jalannya hari ("08.30 tamu datang, 09.00 akad, 14.00 selesai"). Melebur
 * keduanya berarti memilih salah satu bentuk untuk dua pekerjaan yang berbeda.
 *
 * Fase 79 menaikkannya ke kontrak Elegance: `kicker` dan `title` dibaca dari `section.data`
 * (bukan dari sistem copy, yang membuat kedua kolom formnya tidak berefek apa pun), gaya teks
 * berlaku lewat `InvitationText`, dan latar serta gerak per bagian akhirnya diteruskan. Fallback
 * `t(...)` menjaga dokumen warisan: `createLegacySections` melahirkan rundown tanpa kedua kolom
 * itu, jadi tanpa fallback undangan v1 yang sudah terbit kehilangan judulnya.
 */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, mode, t } = useInvitation()
const items = computed(() => rows(props.section, 'items'))

/**
 * Rundown kosong: di panggung ia tetap berdiri, di halaman tamu ia tetap hilang. Pola yang sama
 * dengan galeri kosong (fase 78) — pasangan yang menyalakan bagian ini dari rail lalu menemukan
 * bidang kosong membaca itu sebagai kerusakan, bukan sebagai undangan untuk mengisi.
 */
const panggung = computed(() => mode.value === 'stage')
</script>

<template>
  <InvitationSection
    v-if="items.length || panggung"
    :id="sectionDomId('rundown')"
    tone="base"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="kicker" tag="p" data-iv-lead class="iv-kicker m-0" :fallback="t('rundown.kicker')" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" :fallback="t('rundown.title')" />

    <InvitationSlotKosong
      v-if="!items.length"
      label="Susunan acara menunggu diisi"
      hint="Tambahkan baris di tab Bagian › Rundown. Tamu tidak melihat kotak ini."
      tinggi="10rem"
    />

    <ol v-else class="iv-timeline m-0 w-full p-0 list-none text-left">
      <!-- Rel digambar di posisi akhirnya; GSAP hanya menumbuhkannya dari nol. -->
      <span class="iv-timeline-rail" data-iv-rail aria-hidden="true" />
      <li
        v-for="(item, at) in items"
        :key="String(item.id ?? at)"
        data-iv-reveal
        class="iv-timeline-row"
      >
        <span class="iv-timeline-time iv-display">
          <Clock3 :size="13" aria-hidden="true" class="opacity-60" />
          {{ String(item.time ?? '') }}
        </span>
        <span class="iv-timeline-mark" aria-hidden="true">
          <InvitationOrnamen slot-id="symbol" posisi="utama" class="h-full w-full" />
        </span>
        <span class="iv-timeline-isi grid gap-1">
          <span class="iv-body text-[0.9375rem] font-semibold">{{ String(item.title ?? item.name ?? '') }}</span>
          <span v-if="item.description" class="iv-body text-caption opacity-75">{{ String(item.description) }}</span>
        </span>
      </li>
    </ol>
    <InvitationOrnamen data-iv-ornament slot-id="divider" posisi="utama" class="h-7 w-48 opacity-65" :style="{ color: 'var(--iv-primary)' }" />
  </InvitationSection>
</template>
