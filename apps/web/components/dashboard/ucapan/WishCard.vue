<script setup lang="ts">
import { Check, EyeOff } from 'lucide-vue-next'
import { wishAttendanceLabel } from '@aruna/contracts/api'
import type { Wish } from '~/types/aruna'

/**
 * Satu kartu ucapan di halaman Ucapan (fase 72.6): nama, kehadiran, pesan, waktu, dan dua
 * tombol moderasi. Id tombolnya dipertahankan dari halaman lama (`dash-wish-approve-*`,
 * `dash-wish-hide-*`) supaya e2e dan pengujian manual tidak perlu mencari ulang.
 */
const props = defineProps<{ wish: Wish }>()
const emit = defineEmits<{ moderate: [Wish, boolean] }>()

/** Nilai tak dikenal tidak dapat lencana sama sekali — lihat `wishAttendanceLabel` (fase 75). */
const attendance = computed(() => wishAttendanceLabel(props.wish.attendance))

const time = computed(() => {
  if (!props.wish.createdAt) return ''
  const date = new Date(props.wish.createdAt)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <li class="card grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start sm:p-5">
    <div class="grid min-w-0 gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-semibold text-ink">{{ wish.authorName || 'Tamu undangan' }}</span>
        <UiBadge v-if="attendance" :tone="attendance.tone">{{ attendance.label }}</UiBadge>
        <UiBadge :tone="wish.approved ? 'sage' : 'gold'" size="sm">{{ wish.approved ? 'Tampil' : 'Ditinjau' }}</UiBadge>
      </div>
      <p class="m-0 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink">{{ wish.message }}</p>
      <time v-if="time" :datetime="wish.createdAt" class="text-caption text-ink-subtle">{{ time }}</time>
    </div>

    <div class="flex items-center gap-1 sm:justify-end">
      <UiTooltip content="Tampilkan di undangan">
        <button
          :id="`dash-wish-approve-${wish.id}`"
          type="button"
          :class="cn('grid h-11 w-11 place-items-center rounded-md transition-colors hover:bg-sage-soft hover:text-sage', wish.approved ? 'text-sage' : 'text-ink-muted')"
          :aria-pressed="wish.approved === true"
          :aria-label="`Tampilkan ucapan dari ${wish.authorName || 'tamu'}`"
          @click="emit('moderate', wish, true)"
        >
          <Check :size="18" aria-hidden="true" />
        </button>
      </UiTooltip>
      <UiTooltip content="Sembunyikan">
        <button
          :id="`dash-wish-hide-${wish.id}`"
          type="button"
          :class="cn('grid h-11 w-11 place-items-center rounded-md transition-colors hover:bg-danger-soft hover:text-danger', wish.approved ? 'text-ink-muted' : 'text-danger')"
          :aria-pressed="wish.approved === false"
          :aria-label="`Sembunyikan ucapan dari ${wish.authorName || 'tamu'}`"
          @click="emit('moderate', wish, false)"
        >
          <EyeOff :size="18" aria-hidden="true" />
        </button>
      </UiTooltip>
    </div>
  </li>
</template>
