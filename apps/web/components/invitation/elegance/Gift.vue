<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'
import { matchBankAlias } from '@aruna/contracts'
import type { Section } from '~/types/aruna'

/**
 * Hadiah Elegance (fase 72): satu kartu rekening, dua bila `hasSecondAccount`. Nama bank
 * ditulis bebas oleh pasangan; logonya dipasang hanya bila namanya cocok dengan bank yang
 * dikenal `utils/banks.ts` — nama yang tidak dikenal cukup ditulis apa adanya.
 */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact } = useInvitation()

const accounts = computed(() => {
  const rows = [
    { id: 'rek-1', bank: text(props.section, 'bank1'), number: text(props.section, 'account1'), holder: text(props.section, 'holder1') },
    ...(props.section.data.hasSecondAccount === true
      ? [{ id: 'rek-2', bank: text(props.section, 'bank2'), number: text(props.section, 'account2'), holder: text(props.section, 'holder2') }]
      : []),
  ]
  return rows.filter(row => row.number.trim()).map(row => ({ ...row, bankId: matchBankAlias(row.bank) }))
})

/** Tombol yang baru saja menyalin; labelnya berganti ke `copiedLabel` selama dua detik. */
const copied = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
function copyAccount(id: string, value: string) {
  navigator.clipboard.writeText(value.replace(/\s+/g, ''))
    .then(() => {
      copied.value = id
      clearTimeout(timer)
      timer = setTimeout(() => { copied.value = '' }, 2000)
    })
    .catch(() => { useToast().error('Nomor rekening tidak dapat disalin.') })
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <InvitationSection
    :id="sectionDomId('gift')"
    tone="primary"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="eyebrow" tag="p" data-iv-lead class="iv-kicker m-0" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" />
    <InvitationText :section="props.section" field="subtitle" tag="p" data-iv-reveal class="iv-body m-0 max-w-[30rem]" multiline />

    <ul v-if="accounts.length" class="iv-gift-grid m-0 w-full p-0 list-none">
      <li v-for="account in accounts" :key="account.id" data-iv-reveal class="iv-card iv-gift-card grid gap-0 overflow-hidden rounded-md text-left">
        <div
          class="iv-gift-band flex items-center gap-3 px-5 py-3"
          :style="account.bankId === 'other' ? undefined : { background: bank(account.bankId).brand, color: bank(account.bankId).on }"
        >
          <span v-if="account.bankId !== 'other'" class="iv-gift-logo grid place-items-center rounded-sm bg-white px-2 py-1">
            <img :src="bank(account.bankId).logo" alt="" aria-hidden="true" width="120" height="40" class="h-5 w-auto">
          </span>
          <span class="min-w-0 flex-1 text-[0.9375rem] font-semibold">{{ account.bank || bankName(account.bankId, account.bank) }}</span>
        </div>

        <div class="grid gap-2 px-5 py-5">
          <p class="iv-display m-0 text-[1.5rem] tracking-[0.06em] tabular-nums">{{ account.number }}</p>
          <p v-if="account.holder" class="iv-body m-0 text-caption">{{ account.holder }}</p>
          <button type="button" class="iv-chip mt-1 justify-self-start" :data-copied="copied === account.id ? 'true' : undefined" @click="copyAccount(account.id, account.number)">
            <Check v-if="copied === account.id" :size="15" aria-hidden="true" />
            <Copy v-else :size="15" aria-hidden="true" />
            {{ copied === account.id ? text(props.section, 'copiedLabel', 'Tersalin') : text(props.section, 'buttonLabel', 'Salin nomor') }}
          </button>
        </div>
      </li>
    </ul>
  </InvitationSection>
</template>
