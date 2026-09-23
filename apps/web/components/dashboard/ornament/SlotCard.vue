<script setup lang="ts">
import type { OrnamentRef } from '~/utils/ornaments'
import { isUnggahan, ornament } from '~/utils/ornaments'

/**
 * Satu ubin slot di ringkasan ornamen inspektor (fase 70).
 *
 * Bentuk lamanya baris tiga teks — label, "nama glyph · hint", syarat — di samping pratinjau
 * 40px. Pemilik menilai detail di samping itu bising, dan ia benar: hint dan syarat menjelaskan
 * *slotnya*, bukan pilihan pasangan, jadi tempatnya di header Studio saat slot itu dibuka
 * (`Studio.vue`), bukan diulang empat belas kali di panel yang selalu terlihat. Yang tersisa
 * di sini adalah yang benar-benar milik pilihan: pratinjau, nama slot, nama glyph, dan tombol.
 *
 * Kotak pratinjaunya memakai `grid-rows-[minmax(0,1fr)]` dengan alasan yang sama dengan
 * `StudioTile.vue`: aset referensi adalah `<img>` berdimensi, dan track `auto` akan
 * mengikutinya melampaui kotak.
 */
const props = withDefaults(defineProps<{
  kunci: string
  label: string
  /** Kosong: slot yang bawaannya garis, bukan keping (fase 80). */
  glyph: OrnamentRef | null
  bawaan: boolean
  ramp: Record<string, string>
  terkunci: boolean
  /**
   * Nonce sorot dari klik ornamen di kanvas (fase 76); 0 berarti kartu ini bukan yang dituju.
   * Angka, bukan boolean: pasangan yang menyentuh ornamen yang sama dua kali tetap berhak
   * melihat kartunya berkedip lagi, dan boolean yang sudah `true` tidak akan memicu apa pun.
   */
  sorot?: number
}>(), { sorot: 0 })

const emit = defineEmits<{ buka: [] }>()

/*
 * Sorot sementara, bukan keadaan yang menetap: ia menjawab "yang barusan kamu sentuh yang ini",
 * dan sesudah terjawab ia tidak punya arti lagi. Cincin yang tinggal akan terbaca sebagai
 * seleksi — dan di panel ini tidak ada yang namanya slot terpilih.
 */
const kartu = ref<HTMLElement | null>(null)
const menyala = ref(false)
let padam: ReturnType<typeof setTimeout> | undefined

watch(() => props.sorot, (nonce) => {
  if (!nonce) return
  const halus = typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches
  kartu.value?.scrollIntoView({ block: 'nearest', behavior: halus ? 'smooth' : 'instant' })
  menyala.value = true
  clearTimeout(padam)
  padam = setTimeout(() => { menyala.value = false }, 1200)
})
onBeforeUnmount(() => clearTimeout(padam))
</script>

<template>
  <div
    ref="kartu"
    :class="cn(
      'grid gap-2 rounded-md border border-border bg-surface p-2 transition-shadow duration-200',
      menyala && 'border-primary ring-2 ring-primary',
    )"
  >
    <span
      class="grid h-16 grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden rounded-sm bg-surface-2 p-1.5"
      :style="ramp"
    >
      <OrnamentGlyph v-if="glyph" :glyph="glyph" ubin class="min-h-0 max-h-full max-w-full object-contain text-[color:var(--iv-orn-body)]" aria-hidden="true" />
      <span v-else class="block h-px w-3/4 bg-[color:var(--iv-orn-body)]" aria-hidden="true" />
    </span>
    <span class="grid gap-0.5">
      <span class="flex flex-wrap items-center gap-x-1.5 text-caption font-medium text-ink">
        {{ label }}
        <span v-if="!bawaan" class="rounded-full bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">Diganti</span>
      </span>
      <span class="truncate text-caption text-ink-subtle">{{ !glyph ? 'Garis bawaan tema' : isUnggahan(glyph) ? 'Unggahan kalian' : ornament(glyph).name }}</span>
    </span>
    <UiButton
      :id="`ornament-ganti-${kunci}`"
      tone="outline"
      size="sm"
      class="justify-self-start"
      :disabled="terkunci"
      :aria-describedby="terkunci ? 'ornament-locked' : undefined"
      @click="emit('buka')"
    >
      Ganti<span class="sr-only"> {{ label.toLowerCase() }}</span>
    </UiButton>
  </div>
</template>
