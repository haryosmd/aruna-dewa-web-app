<script setup lang="ts">
/**
 * Lima orang bersiluet, dipilih dari id akun lewat `avatarIndex`.
 *
 * Bentuknya kepala bulat plus bahu, dan yang membedakan kelimanya cuma warna baju dan garis
 * kerahnya. Sengaja siluet satu warna: foto profil berarti unggahan, penyimpanan, pemangkasan,
 * dan moderasi — empat hal yang tidak diminta siapa pun untuk sebuah gambar selebar 40px yang
 * gunanya hanya menjawab "ini akun saya".
 *
 * Kerahnya digambar dengan warna latar, bukan warna ketiga: dengan begitu ia selalu terbaca
 * pada pasangan warna mana pun, tanpa satu pun kombinasi yang perlu dicek kontrasnya sendiri.
 */
const props = withDefaults(defineProps<{ id?: string | null; size?: number }>(), { id: null, size: 40 })

/** Pasangan warna diambil dari token; tidak ada satu pun heksadesimal baru yang lahir di sini. */
const skins = [
  { bg: 'var(--color-primary-soft)', ink: 'var(--color-primary-strong)' },
  { bg: 'var(--color-sage-soft)', ink: 'var(--color-sage)' },
  { bg: 'var(--color-gold-soft)', ink: 'var(--color-warning)' },
  { bg: 'var(--color-surface-3)', ink: 'var(--color-ink-muted)' },
  { bg: 'var(--color-sage-soft)', ink: 'var(--color-primary)' },
] as const

const index = computed(() => avatarIndex(props.id))
const skin = computed(() => skins[index.value]!)
/** Bahu meluber keluar lingkaran di dua sudut bawah; tanpa klip ini avatarnya berbentuk jamur. */
const clipId = useId()
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 48 48"
    role="presentation"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  >
    <defs>
      <clipPath :id="clipId">
        <circle cx="24" cy="24" r="24" />
      </clipPath>
    </defs>

    <g :clip-path="`url(#${clipId})`">
      <circle cx="24" cy="24" r="24" :fill="skin.bg" />
      <circle cx="24" cy="17.5" r="8" :fill="skin.ink" />
      <rect x="21" y="23" width="6" height="10" rx="3" :fill="skin.ink" />
      <path d="M8 48a16 16 0 0 1 32 0Z" :fill="skin.ink" />

      <!-- 0 — kaos oblong: garis leher bulat, tanpa kerah -->
      <path v-if="index === 0" d="M17 32.5a7 7 0 0 0 14 0Z" :fill="skin.bg" />

      <!-- 1 — kemeja: kerah V -->
      <path v-else-if="index === 1" d="M18.5 32.2 24 41l5.5-8.8-2.4-1.1L24 36.4l-3.1-5.3Z" :fill="skin.bg" />

      <!-- 2 — jas: dua kelepak dan segitiga kemeja dalam -->
      <template v-else-if="index === 2">
        <path d="M19 31.6 24 40l5-8.4-1.8-1L24 36l-3.2-5.4Z" :fill="skin.bg" />
        <path d="M22.4 33.4h3.2L24 36.2Z" :fill="skin.ink" />
      </template>

      <!-- 3 — kebaya: garis leher bulat rendah dengan bros -->
      <template v-else-if="index === 3">
        <path d="M16.6 32.4a7.4 7.4 0 0 0 14.8 0Z" :fill="skin.bg" />
        <circle cx="24" cy="42" r="1.7" :fill="skin.bg" />
      </template>

      <!-- 4 — batik: kerah bulat dengan tiga titik motif -->
      <template v-else>
        <path d="M17.4 32.4a6.6 6.6 0 0 0 13.2 0Z" :fill="skin.bg" />
        <circle cx="16.5" cy="42" r="1.5" :fill="skin.bg" />
        <circle cx="24" cy="45.5" r="1.5" :fill="skin.bg" />
        <circle cx="31.5" cy="42" r="1.5" :fill="skin.bg" />
      </template>
    </g>
  </svg>
</template>
