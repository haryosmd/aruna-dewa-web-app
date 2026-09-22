<script setup lang="ts">
import type { Component } from 'vue'
import { NuxtLink } from '#components'
import { Primitive } from 'reka-ui'
import { Loader2 } from 'lucide-vue-next'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ClassValue } from 'clsx'

const button = cva(
  /*
   * Warna hanya bertransisi saat MASUK hover. Meninggalkan hover dan berganti nonaktif ↔ aktif
   * langsung melompat: tombol di dalam `<fieldset :disabled="!ready">` berganti dari abu nonaktif
   * ke terakota tepat sesudah hidrasi, dan pudaran 200ms di antara dua pasangan warna berlawanan
   * kutub melewati titik tengah yang kontrasnya 1,6:1 — axe di e2e menangkapnya di /account.
   */
  'relative inline-flex select-none items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap no-underline transition-[transform,box-shadow] duration-200 ease-[var(--ease-out-quart)] hover:transition-[transform,background-color,color,border-color,box-shadow] active:translate-y-px disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      tone: {
        /*
         * Nonaktif tanpa `aria-busy` (fase 67): abu netral, bukan terakota 55% — pink pudar itu
         * terbaca sebagai tombol aktif yang sedang lelah. `loading` memasang `aria-busy`, jadi
         * "Menyimpan…" tetap terakota dengan spinnernya.
         */
        primary: 'bg-primary text-white shadow-[var(--shadow-lift)] hover:bg-primary-strong hover:shadow-[var(--shadow-glow-primary)] disabled:not-aria-busy:bg-surface-3 disabled:not-aria-busy:text-ink-subtle disabled:not-aria-busy:opacity-100 disabled:not-aria-busy:shadow-none',
        ink: 'bg-ink text-ink-inverse hover:bg-ink/90',
        outline: 'border border-ink/25 bg-surface text-ink hover:border-ink hover:bg-surface-2',
        ghost: 'text-ink hover:bg-surface-3',
        quiet: 'text-primary underline-offset-4 hover:underline',
        gold: 'bg-gold text-ink hover:bg-gold/90',
      },
      size: {
        sm: 'min-h-11 px-3.5 text-ui',
        md: 'min-h-12 px-5 text-ui-lg',
        lg: 'min-h-[3.5rem] px-7 text-body',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { tone: 'primary', size: 'md', block: false },
  },
)

type ButtonVariants = VariantProps<typeof button>

const props = withDefaults(
  defineProps<{
    as?: string | Component
    type?: 'button' | 'submit' | 'reset'
    tone?: ButtonVariants['tone']
    size?: ButtonVariants['size']
    block?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  { as: 'button', type: 'button', tone: 'primary', size: 'md', block: false, loading: false, disabled: false },
)

/**
 * `reka-ui` merender lewat `h(props.as, …)`, dan `h()` memperlakukan string sebagai nama tag
 * HTML — bukan komponen. Tanpa pemetaan ini `as="NuxtLink"` menghasilkan elemen `<nuxtlink>`
 * yang tidak bisa diklik, dan itulah yang membuat semua CTA utama mati.
 *
 * `resolveComponent('NuxtLink')` tidak menolong: auto-import Nuxt terjadi saat kompilasi,
 * jadi NuxtLink tidak pernah terdaftar sebagai komponen global runtime. Impor eksplisit
 * dari `#components` adalah satu-satunya cara yang benar.
 */
const asComponents: Record<string, Component> = { NuxtLink }
const resolvedAs = computed(() => (typeof props.as === 'string' ? asComponents[props.as] ?? props.as : props.as))

const isNativeButton = computed(() => props.as === 'button')

/**
 * Kelas dari pemanggil digabung lewat `cn`, bukan dibiarkan jatuh sendiri.
 *
 * Fallthrough bawaan Vue **merangkai** dua daftar kelas, dan yang menang setelah itu ditentukan
 * urutan di stylesheet — bukan urutan di atribut. Akibatnya `class="hidden sm:inline-flex"` pada
 * tombol kalah oleh `inline-flex` milik `cva` dan tidak pernah bekerja sekali pun: CTA "Buat
 * undangan" yang dirancang bersembunyi di ponsel selalu tampil di sana. `cn` memakai
 * `tailwind-merge`, yang memutuskan konflik dengan sadar dan memenangkan pemanggilnya.
 */
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
</script>

<template>
  <Primitive
    v-bind="attrs"
    :as="resolvedAs"
    :type="isNativeButton ? type : undefined"
    :disabled="isNativeButton ? (disabled || loading) : undefined"
    :aria-busy="loading || undefined"
    :class="cn(button({ tone: props.tone, size: props.size, block: props.block }), attrs.class as ClassValue)"
  >
    <Loader2 v-if="loading" :size="17" class="animate-spin" aria-hidden="true" />
    <slot />
  </Primitive>
</template>
