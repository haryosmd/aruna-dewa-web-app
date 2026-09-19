<script setup lang="ts">
import { FlaskConical } from 'lucide-vue-next'

/**
 * Tanda mode demo lokal (fase 63). Nilainya ditulis `plugins/auth.server.ts` hanya saat login
 * demo benar-benar terjadi, jadi di produksi komponen ini tidak pernah merender apa pun.
 *
 * `compact` (fase 67) untuk rail yang diciutkan: chip 44px dengan ikon saja, teks penuhnya
 * tetap ada untuk pembaca layar dan muncul sebagai tooltip untuk mouse. Bukan kontrol, jadi
 * tanpa `tabindex` — tooltip di sini bonus, bukan satu-satunya jalan ke informasinya.
 */
const demoMode = useState('demoMode', () => false)
withDefaults(defineProps<{ note?: string; compact?: boolean }>(), { note: undefined, compact: false })
</script>

<template>
  <UiTooltip v-if="demoMode && compact" content="Mode demo lokal — masuk otomatis sebagai demo@aruna.local" side="right" :side-offset="10">
    <p id="demo-mode-badge" class="m-0 grid h-11 w-11 place-items-center rounded-md border border-gold/40 bg-gold-soft">
      <FlaskConical :size="16" class="text-warning" aria-hidden="true" />
      <span class="sr-only">Mode demo lokal. Masuk otomatis sebagai demo@aruna.local. <span v-if="note">{{ note }}</span></span>
    </p>
  </UiTooltip>
  <p
    v-else-if="demoMode"
    id="demo-mode-badge"
    class="m-0 flex items-start gap-2 rounded-md border border-gold/40 bg-gold-soft px-3 py-2 text-caption text-ink"
  >
    <FlaskConical :size="14" class="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
    <span>
      <span class="font-semibold">Mode demo lokal.</span>
      Masuk otomatis sebagai demo@aruna.local.
      <span v-if="note">{{ note }}</span>
    </span>
  </p>
</template>
