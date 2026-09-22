<script setup lang="ts">
import { Check, Clock, Link, Pencil, Trash2 } from 'lucide-vue-next'
import { guestFromLabel, invitationKindLabel } from '@aruna/contracts'
import type { Guest } from '~/types/aruna'
import { formatPhone } from './templates'

/**
 * Tabel blok (3) halaman Generator: ☐ | Nama | Nomor WhatsApp | Kategori | Status | Aksi.
 *
 * Tabel ini hanya menampilkan dan memancarkan niat; halaman yang memegang data, filter, dan
 * panggilan API. Kotak centang memilih baris untuk aksi massal ("Kirim WA" berurutan), dan
 * pilihan disimpan sebagai `Set` id supaya bertahan saat halaman tabel berganti.
 */
const props = defineProps<{
  guests: Guest[]
  loading: boolean
  /** Ada kata kunci/filter aktif — mengubah bunyi keadaan kosong. */
  filtered: boolean
}>()
const emit = defineEmits<{ send: [Guest]; copy: [Guest]; edit: [Guest]; remove: [Guest] }>()
const selected = defineModel<Set<string>>('selected', { default: () => new Set<string>() })

const allChecked = computed(() => props.guests.length > 0 && props.guests.every(guest => selected.value.has(guest.id)))
const someChecked = computed(() => !allChecked.value && props.guests.some(guest => selected.value.has(guest.id)))

function toggleAll(event: Event) {
  const next = new Set(selected.value)
  const checked = (event.target as HTMLInputElement).checked
  for (const guest of props.guests) { if (checked) next.add(guest.id); else next.delete(guest.id) }
  selected.value = next
}

function toggle(guest: Guest) {
  const next = new Set(selected.value)
  if (next.has(guest.id)) next.delete(guest.id); else next.add(guest.id)
  selected.value = next
}

const sentLabel = (guest: Guest) => (guest.sentAt ? `Terkirim ${new Date(guest.sentAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : 'Belum')

/** Baris kedua sel nama: kuota, anak, dan pihak pengundang — hanya yang benar-benar terisi. */
function rincian(guest: Guest): string {
  const bagian: string[] = []
  if (guest.quota > 1) bagian.push(`Kuota ${guest.quota} orang`)
  if (guest.childCount) bagian.push(`${guest.childCount} anak`)
  if (guest.guestFrom) bagian.push(guestFromLabel(guest.guestFrom))
  return bagian.join(' · ')
}
</script>

<template>
  <div class="card table-wrap">
    <table class="min-w-[52rem]">
      <thead>
        <tr>
          <th scope="col" class="w-12">
            <label class="sr-only" for="guest-select-all">Pilih semua tamu di halaman ini</label>
            <input id="guest-select-all" type="checkbox" class="h-4 w-4 accent-[var(--color-sage)]" :checked="allChecked" :indeterminate="someChecked" :disabled="!guests.length" @change="toggleAll">
          </th>
          <th scope="col">Nama tamu undangan</th>
          <th scope="col">Nomor WhatsApp</th>
          <th scope="col">Kategori</th>
          <th scope="col">Status</th>
          <th scope="col">Aksi broadcast</th>
        </tr>
      </thead>

      <tbody v-if="loading">
        <tr><td colspan="6" class="text-ink-muted">Memuat tamu…</td></tr>
      </tbody>

      <tbody v-else-if="!guests.length">
        <tr>
          <td colspan="6">
            <div class="grid min-h-40 place-content-center gap-1.5 text-center">
              <strong class="text-ink">{{ filtered ? 'Tamu tidak ditemukan.' : 'Belum ada tamu.' }}</strong>
              <span class="text-ink-muted">{{ filtered ? 'Coba kata kunci atau filter lain.' : 'Tambahkan manual, tempel teks, atau impor dari spreadsheet.' }}</span>
            </div>
          </td>
        </tr>
      </tbody>

      <tbody v-else>
        <tr v-for="guest in guests" :key="guest.id" :class="cn('hover:bg-surface-2', selected.has(guest.id) && 'bg-sage-soft/50')">
          <td>
            <label class="sr-only" :for="`guest-select-${guest.id}`">Pilih {{ guest.displayName }}</label>
            <input :id="`guest-select-${guest.id}`" type="checkbox" class="h-4 w-4 accent-[var(--color-sage)]" :checked="selected.has(guest.id)" @change="toggle(guest)">
          </td>
          <td>
            <div class="grid gap-0.5">
              <span :id="`guest-name-${guest.id}`" class="font-semibold text-ink">{{ guest.displayName }}</span>
              <!--
                Keempat kolom lembar tamu (fase 75) menumpang di sel nama sebagai satu baris
                ringkas, BUKAN empat kolom sendiri: tabel ini sudah `min-w-[52rem]`, dan menambah
                empat kolom lagi akan mengembalikan persis limpahan yang baru diperbaiki 75.3.
              -->
              <span v-if="rincian(guest)" class="text-caption text-ink-subtle">{{ rincian(guest) }}</span>
              <span v-if="guest.notes" :id="`guest-notes-${guest.id}`" class="text-caption italic text-ink-subtle">{{ guest.notes }}</span>
            </div>
          </td>
          <td class="tabular-nums text-ink-muted">{{ formatPhone(guest.phone) }}</td>
          <td>
            <div class="flex flex-wrap items-center gap-1.5">
              <UiBadge v-if="guest.category || guest.group" tone="primary" size="md">{{ guest.category || guest.group }}</UiBadge>
              <UiBadge v-if="guest.invitationKind" tone="outline" size="md">{{ invitationKindLabel(guest.invitationKind) }}</UiBadge>
              <span v-if="!guest.category && !guest.group && !guest.invitationKind" class="text-ink-subtle">—</span>
            </div>
          </td>
          <td>
            <UiBadge :tone="guest.sentAt ? 'sage' : 'outline'" size="md">
              <Check v-if="guest.sentAt" :size="13" aria-hidden="true" />
              <Clock v-else :size="13" aria-hidden="true" />
              {{ sentLabel(guest) }}
            </UiBadge>
          </td>
          <td>
            <div class="flex items-center gap-0.5">
              <UiButton
                :id="`guest-row-send-${guest.id}`"
                size="sm"
                :class="cn('min-h-10 bg-[#25d366] text-ink hover:bg-[#1ebe5b] hover:shadow-none', !guest.phone && 'pointer-events-none opacity-45')"
                :aria-disabled="!guest.phone || undefined"
                :title="guest.phone ? undefined : 'Isi nomor WhatsApp dulu'"
                @click="guest.phone && emit('send', guest)"
              >
                <DashboardGeneratorWhatsAppGlyph :size="15" />
                Kirim WA
              </UiButton>
              <UiTooltip content="Salin tautan personal">
                <button
                  :id="`guest-row-copy-${guest.id}`"
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-muted transition-colors enabled:hover:bg-surface-3 enabled:hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="guest.tokenUnavailable"
                  :aria-label="guest.tokenUnavailable ? `Tautan personal untuk ${guest.displayName} tidak bisa dibuka lagi` : `Salin tautan personal untuk ${guest.displayName}`"
                  @click="emit('copy', guest)"
                >
                  <Link :size="17" aria-hidden="true" />
                </button>
              </UiTooltip>
              <UiTooltip content="Sunting">
                <button
                  :id="`guest-row-edit-${guest.id}`"
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
                  :aria-label="`Sunting ${guest.displayName}`"
                  @click="emit('edit', guest)"
                >
                  <Pencil :size="17" aria-hidden="true" />
                </button>
              </UiTooltip>
              <UiTooltip content="Hapus">
                <button
                  :id="`guest-row-delete-${guest.id}`"
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus ${guest.displayName}`"
                  @click="emit('remove', guest)"
                >
                  <Trash2 :size="17" aria-hidden="true" />
                </button>
              </UiTooltip>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
