<script setup lang="ts">
/**
 * Tooltip pertama di `ui/` — sampai fase 67, ikon tanpa teks hanya punya `aria-label`, yang
 * pembaca layar dengar tapi mouse tidak pernah lihat.
 *
 * `as-child` bukan pilihan gaya: `TooltipTrigger` menerbitkan id-nya sendiri dan menimpa id
 * pemicu (alasan yang sama dengan `AccountMenu`), padahal e2e mengandalkan `#dash-nav-guests`.
 * Dengan `as-child` elemen di slot tetap milik pemanggil, id dan kelasnya bertahan.
 *
 * `disabled` merender slot polos tanpa reka sama sekali. Dipakai saat labelnya sudah terbaca di
 * layar — tooltip yang mengulang teks di sebelahnya hanya mengganggu, dan `aria-describedby`
 * yang mengulang nama tautan membuat pembaca layar membacanya dua kali.
 *
 * Konten memakai `data-tooltip` sebagai kait tes: reka juga merender salinan tersembunyi
 * ber-`role="tooltip"`, jadi `getByRole('tooltip')` mengembalikan dua elemen.
 */
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'

withDefaults(defineProps<{
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  disabled?: boolean
}>(), { side: 'top', sideOffset: 8, disabled: false })
</script>

<template>
  <slot v-if="disabled" />
  <TooltipRoot v-else>
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>
    <TooltipPortal>
      <TooltipContent
        data-tooltip
        :side="side"
        :side-offset="sideOffset"
        :collision-padding="8"
        class="z-[var(--z-tooltip)] max-w-[16rem] rounded-md bg-ink px-2.5 py-1.5 text-caption font-medium text-ink-inverse shadow-[var(--shadow-veil)] data-[state=delayed-open]:animate-[ui-tooltip-in_var(--duration-fast)_var(--ease-out-quart)] data-[state=instant-open]:animate-[ui-tooltip-in_var(--duration-fast)_var(--ease-out-quart)]"
      >
        {{ content }}
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>

<style>
@keyframes ui-tooltip-in {
  from { opacity: 0; transform: translateY(2px) }
  to { opacity: 1; transform: translateY(0) }
}
</style>
