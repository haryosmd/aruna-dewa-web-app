<script setup lang="ts">
import type { BackofficeInvitationRow } from '@aruna/contracts/api'
import { Archive, ExternalLink, Pencil, Trash2, Undo2 } from 'lucide-vue-next'

/**
 * Deret aksi satu baris backoffice.
 *
 * Komponen sendiri karena tabel layar-lebar dan daftar kartu ponsel memakai deret yang sama
 * persis; dua salinannya akan melenceng pada aksi kelima, bukan pada yang pertama.
 */
defineProps<{ row: BackofficeInvitationRow; sibuk: boolean }>()
defineEmits<{ draf: [row: BackofficeInvitationRow]; arsip: [row: BackofficeInvitationRow]; pulih: [row: BackofficeInvitationRow]; hapus: [row: BackofficeInvitationRow] }>()
</script>

<template>
  <NuxtLink
    :id="`bo-edit-${row.id}`"
    :to="`/dashboard/${row.id}/editor`"
    class="grid h-10 w-10 place-items-center rounded-full text-ink-subtle no-underline hover:bg-surface-3 hover:text-ink"
    :aria-label="`Sunting ${row.title}`"
  >
    <Pencil :size="16" aria-hidden="true" />
  </NuxtLink>
  <NuxtLink
    :id="`bo-preview-${row.id}`"
    :to="`/dashboard/${row.id}/preview`"
    target="_blank"
    rel="noopener"
    class="grid h-10 w-10 place-items-center rounded-full text-ink-subtle no-underline hover:bg-surface-3 hover:text-ink"
    :aria-label="`Pratinjau ${row.title}`"
  >
    <ExternalLink :size="16" aria-hidden="true" />
  </NuxtLink>

  <UiButton
    v-if="row.status === 'PUBLISHED'"
    :id="`bo-draft-${row.id}`"
    tone="outline"
    size="sm"
    :disabled="sibuk"
    @click="$emit('draf', row)"
  >
    Jadikan draf
  </UiButton>

  <UiButton
    v-if="row.status === 'ARCHIVED'"
    :id="`bo-restore-${row.id}`"
    tone="outline"
    size="sm"
    :disabled="sibuk"
    @click="$emit('pulih', row)"
  >
    <Undo2 :size="15" aria-hidden="true" />
    Pulihkan
  </UiButton>
  <button
    v-else
    :id="`bo-archive-${row.id}`"
    type="button"
    :disabled="sibuk"
    :aria-label="`Arsipkan ${row.title}`"
    class="grid h-10 w-10 place-items-center rounded-full text-ink-subtle hover:bg-surface-3 hover:text-ink disabled:opacity-50"
    @click="$emit('arsip', row)"
  >
    <Archive :size="16" aria-hidden="true" />
  </button>

  <button
    :id="`bo-delete-${row.id}`"
    type="button"
    :disabled="sibuk"
    :aria-label="`Hapus ${row.title} permanen`"
    class="grid h-10 w-10 place-items-center rounded-full text-ink-subtle hover:bg-danger-soft hover:text-danger disabled:opacity-50"
    @click="$emit('hapus', row)"
  >
    <Trash2 :size="16" aria-hidden="true" />
  </button>
</template>
