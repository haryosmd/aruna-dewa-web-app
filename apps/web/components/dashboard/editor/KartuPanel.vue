<script setup lang="ts">
import { FolderOpen, RotateCcw } from 'lucide-vue-next'
import type { ShareCardStyle } from '@aruna/contracts'
import type { InvitationDocument } from '~/types/aruna'

/**
 * Tab Kartu (fase 72.7), persis "Card Style" referensi: Gaya kartu (Template/Elegan/Minimal),
 * Latar belakang (Template/Foto/Warna), Informasi dan warna (Aksen, Teks, Kiri|Tengah, sakelar
 * Nama tamu / Tanggal & jam / Lokasi), "Reset gaya kartu". Pratinjaunya di panggung
 * (`ShareCardPreview`). Nilainya `document.shareCard` — di luar `tokens`, jadi gratis.
 */
const props = defineProps<{ document: InvitationDocument }>()
const emit = defineEmits<{ tulis: [patch: Partial<ShareCardStyle> | null] }>()

const kartu = computed<ShareCardStyle>(() => props.document.shareCard ?? {})
const { pilih } = useMediaLibrary()

const gaya = [
  { id: 'template', label: 'Template', hint: 'Motif mengikuti karakter template.', swatch: 'linear-gradient(135deg, #6b3d2a, #c9a85f)' },
  { id: 'elegan', label: 'Elegan', hint: 'Bingkai klasik untuk kartu formal.', swatch: '#2a1f16', ring: '#c9a85f' },
  { id: 'minimal', label: 'Minimal', hint: 'Tampilan ringkas dan modern.', swatch: '#1e293b' },
] as const

async function pilihFoto() {
  const hasil = await pilih({ judul: 'Latar kartu bagikan' })
  const url = hasil?.[0]
  if (url) emit('tulis', { backgroundMode: 'foto', imageUrl: url })
}
</script>

<template>
  <div class="grid gap-4">
    <section class="card grid gap-3 p-4">
      <div class="grid gap-0.5">
        <h3 class="m-0 text-[0.9375rem] font-semibold text-ink">Gaya kartu</h3>
        <p class="m-0 text-caption text-ink-muted">Dipakai pada preview WhatsApp dan Open Graph.</p>
      </div>
      <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gaya kartu">
        <button
          v-for="option in gaya"
          :id="`editor-kartu-gaya-${option.id}`"
          :key="option.id"
          type="button"
          role="radio"
          :aria-checked="(kartu.styleId ?? 'template') === option.id"
          :class="cn('grid gap-2 rounded-md border p-2.5 text-left transition-colors duration-200', (kartu.styleId ?? 'template') === option.id ? 'border-success bg-success-soft/60' : 'border-border hover:border-border-strong')"
          @click="emit('tulis', { styleId: option.id })"
        >
          <span class="h-10 rounded-sm" :style="{ background: option.swatch, boxShadow: 'ring' in option ? `inset 0 0 0 2px ${option.ring}` : undefined }" aria-hidden="true" />
          <span class="text-[0.8125rem] font-semibold text-ink">{{ option.label }}</span>
          <span class="text-caption leading-snug text-ink-muted">{{ option.hint }}</span>
        </button>
      </div>
    </section>

    <section class="card grid gap-3 p-4">
      <h3 class="m-0 text-[0.9375rem] font-semibold text-ink">Latar belakang</h3>
      <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Latar belakang kartu">
        <button
          v-for="option in [{ id: 'template', label: 'Template' }, { id: 'foto', label: 'Foto' }, { id: 'warna', label: 'Warna' }] as const"
          :id="`editor-kartu-latar-${option.id}`"
          :key="option.id"
          type="button"
          role="radio"
          :aria-checked="(kartu.backgroundMode ?? 'template') === option.id"
          :class="cn('min-h-12 rounded-md border text-[0.9375rem] font-semibold transition-colors duration-200', (kartu.backgroundMode ?? 'template') === option.id ? 'border-success bg-success-soft/60 text-success' : 'border-border text-ink hover:border-border-strong')"
          @click="option.id === 'foto' && !kartu.imageUrl ? pilihFoto() : emit('tulis', { backgroundMode: option.id })"
        >
          {{ option.label }}
        </button>
      </div>
      <div v-if="(kartu.backgroundMode ?? 'template') === 'foto'" class="grid gap-2">
        <img v-if="kartu.imageUrl" :src="kartu.imageUrl" alt="" class="aspect-video w-full rounded-md object-cover">
        <UiButton id="editor-kartu-foto" tone="outline" class="border-primary/40 bg-primary-soft/40 text-primary hover:bg-primary-soft" @click="pilihFoto">
          <FolderOpen :size="16" aria-hidden="true" />
          {{ kartu.imageUrl ? 'Ganti dari Asset Saya' : 'Pilih dari Asset Saya' }}
        </UiButton>
      </div>
      <div v-if="(kartu.backgroundMode ?? 'template') === 'warna'" class="flex items-center justify-between gap-3 rounded-md border border-border px-3.5 py-2.5">
        <label for="editor-kartu-warna-latar" class="text-[0.875rem] font-semibold text-ink">Warna latar</label>
        <input id="editor-kartu-warna-latar" type="color" class="h-8 w-8 cursor-pointer rounded-full border border-border bg-transparent p-0" :value="kartu.backgroundColor ?? document.tokens.primary" @input="emit('tulis', { backgroundColor: ($event.target as HTMLInputElement).value })">
      </div>
    </section>

    <section class="card grid gap-3 p-4">
      <h3 class="m-0 text-[0.9375rem] font-semibold text-ink">Informasi dan warna</h3>
      <div class="grid grid-cols-2 gap-2">
        <label class="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-[0.875rem] text-ink-muted">
          Aksen
          <input id="editor-kartu-aksen" type="color" class="h-7 w-7 cursor-pointer rounded-full border border-border bg-transparent p-0" :value="kartu.accent ?? '#D2A24B'" @input="emit('tulis', { accent: ($event.target as HTMLInputElement).value })">
        </label>
        <label class="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-[0.875rem] text-ink-muted">
          Teks
          <input id="editor-kartu-teks" type="color" class="h-7 w-7 cursor-pointer rounded-full border border-border bg-transparent p-0" :value="kartu.text ?? '#FFF7E8'" @input="emit('tulis', { text: ($event.target as HTMLInputElement).value })">
        </label>
      </div>
      <div class="grid grid-cols-2 gap-1 rounded-md bg-surface-3 p-1" role="radiogroup" aria-label="Perataan teks kartu">
        <button
          v-for="option in [{ id: 'left', label: 'Kiri' }, { id: 'center', label: 'Tengah' }] as const"
          :id="`editor-kartu-rata-${option.id}`"
          :key="option.id"
          type="button"
          role="radio"
          :aria-checked="(kartu.textAlign ?? 'center') === option.id"
          :class="cn('min-h-11 rounded-md text-[0.9375rem] font-semibold transition-colors duration-200', (kartu.textAlign ?? 'center') === option.id ? 'bg-ink text-ink-inverse' : 'text-ink-muted hover:text-ink')"
          @click="emit('tulis', { textAlign: option.id })"
        >
          {{ option.label }}
        </button>
      </div>
      <label
        v-for="row in [{ key: 'showGuestName', label: 'Nama tamu', bawaan: true }, { key: 'showDate', label: 'Tanggal & jam', bawaan: false }, { key: 'showVenue', label: 'Lokasi', bawaan: false }] as const"
        :key="row.key"
        class="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border border-border px-3.5"
      >
        <span class="text-[0.9375rem] text-ink">{{ row.label }}</span>
        <span class="relative inline-flex h-6 w-11 shrink-0 items-center">
          <input :id="`editor-kartu-${row.key}`" type="checkbox" class="peer sr-only" :checked="kartu[row.key] ?? row.bawaan" @change="emit('tulis', { [row.key]: ($event.target as HTMLInputElement).checked })">
          <span class="absolute inset-0 rounded-full bg-border-strong transition-colors duration-200 peer-checked:bg-success peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" aria-hidden="true" />
          <span class="absolute left-0.5 h-5 w-5 rounded-full bg-surface shadow-hairline transition-transform duration-200 peer-checked:translate-x-5" aria-hidden="true" />
        </span>
      </label>
    </section>

    <UiButton id="editor-kartu-reset" tone="quiet" size="sm" class="justify-self-start" :disabled="!document.shareCard" @click="emit('tulis', null)">
      <RotateCcw :size="15" aria-hidden="true" />
      Reset gaya kartu
    </UiButton>
  </div>
</template>
