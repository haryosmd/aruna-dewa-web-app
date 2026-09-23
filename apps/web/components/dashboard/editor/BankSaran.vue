<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { bankIds, matchBankAlias, type BankId } from '@aruna/contracts'

/**
 * Saran bank berlogo di bawah kolom "Bank pertama/kedua" (fase 82). Nama bank tetap teks bebas —
 * kartu hadiah memasang logo hanya bila `matchBankAlias` mengenali namanya — jadi yang ditunjukkan
 * di sini adalah hal yang sebelumnya tak terlihat: nama mana yang dapat logo.
 *
 * Sudah dikenali → satu baris konfirmasi dengan tile-nya. Belum → deret tile yang tersaring oleh
 * ketikan; klik menulis nama bank ke kolom. Tidak ada yang cocok → kalimat bahwa nama ditulis apa
 * adanya, tanpa logo.
 */
const props = defineProps<{ id: string; nilai: string }>()
const emit = defineEmits<{ pilih: [nama: string] }>()

const pilihan = bankIds.filter((id): id is Exclude<BankId, 'other'> => id !== 'other')

const cocok = computed(() => {
  const nilai = props.nilai.trim()
  if (!nilai) return null
  const id = matchBankAlias(nilai)
  return id === 'other' ? null : id
})

const tersaring = computed(() => {
  const kata = props.nilai.trim().toLowerCase().replace(/^bank\s+/, '')
  if (!kata) return pilihan
  return pilihan.filter(id => id.includes(kata) || bank(id).name.toLowerCase().includes(kata))
})
</script>

<template>
  <div :id="id" class="grid gap-2" aria-live="polite">
    <p v-if="cocok" class="m-0 flex items-center gap-2 text-caption text-ink-muted">
      <img :src="bank(cocok).logo" alt="" width="99" height="71" class="h-6 w-auto rounded-[4px] shadow-[0_0_0_1px_var(--color-border)]">
      <Check :size="14" class="shrink-0 text-success" aria-hidden="true" />
      Logo {{ bank(cocok).name }} tampil di kartu.
    </p>

    <template v-else>
      <p class="m-0 text-caption text-ink-muted">
        {{ tersaring.length ? 'Pilih bank agar logonya tampil:' : 'Nama ini ditulis apa adanya, tanpa logo.' }}
      </p>
      <ul v-if="tersaring.length" class="m-0 flex list-none flex-wrap gap-1.5 p-0">
        <li v-for="bankId in tersaring" :key="bankId">
          <button
            type="button"
            class="grid rounded-[5px] outline-offset-2 transition-transform duration-200 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            :title="bank(bankId).name"
            :aria-label="`Pakai ${bank(bankId).name}`"
            :data-bank-saran="bankId"
            @click="emit('pilih', bank(bankId).name)"
          >
            <img :src="bank(bankId).logo" alt="" width="99" height="71" loading="lazy" class="h-8 w-auto rounded-[4px] shadow-[0_0_0_1px_var(--color-border)]">
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>
