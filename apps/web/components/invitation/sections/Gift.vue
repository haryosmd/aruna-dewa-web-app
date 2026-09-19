<script setup lang="ts">
import { Copy } from 'lucide-vue-next'
import { normalizeGift } from '@aruna/contracts'
import type { Section } from '~/types/aruna'

const toast = useToast()

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, t } = useInvitation()

/**
 * Satu-satunya pembaca data hadiah. `normalizeGift` yang menangani dokumen lama berbentuk
 * satu rekening datar, jadi section ini tidak perlu tahu dua bentuk data.
 */
const gift = computed(() => normalizeGift(props.section.data))

function copyAccount(value: string) {
  navigator.clipboard.writeText(value)
    .then(() => toast.success('Nomor rekening disalin.'))
    .catch(() => toast.error('Nomor rekening tidak dapat disalin.'))
}
</script>

<template>
  <InvitationSection
    id="iv-gift"
    tone="primary"
    :compact="compact"
    :kicker="t('gift.kicker')"
    :title="gift.title"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
  >
    <p data-iv-reveal class="iv-body m-0">
      {{ gift.note || t('gift.fallbackNote') }}
    </p>

    <ul v-if="gift.accounts.length" class="iv-gift-grid m-0 w-full p-0 list-none">
      <li
        v-for="account in gift.accounts"
        :key="account.id"
        data-iv-reveal
        class="iv-card iv-gift-card grid gap-0 overflow-hidden rounded-md text-left"
      >
        <!--
          Pita merek hanya setinggi kepala kartu; isi kartu tetap memakai token tema.
          Label MEMPELAI PRIA/WANITA tidak dirender lagi — kartunya sudah membawa nama
          pemilik rekening, dan pada delapan kartu label itu berubah jadi kebisingan.
          Field `owner` tetap ada di dokumen supaya undangan lama tidak rusak.
        -->
        <div
          class="iv-gift-band flex items-center gap-3 px-5 py-3"
          :style="{ background: bank(account.bankId).brand, color: bank(account.bankId).on }"
        >
          <span class="iv-gift-logo grid place-items-center rounded-sm bg-white px-2 py-1">
            <img :src="bank(account.bankId).logo" alt="" aria-hidden="true" width="120" height="40" class="h-5 w-auto">
          </span>
          <span class="min-w-0 flex-1 text-[0.9375rem] font-semibold">{{ bankName(account.bankId, account.bankLabel) }}</span>
        </div>

        <div class="grid gap-2 px-5 py-5">
          <p class="iv-display m-0 text-[1.5rem] tracking-[0.06em] tabular-nums">{{ account.number }}</p>
          <p v-if="account.holder" class="iv-body m-0 text-caption">a.n. {{ account.holder }}</p>
          <button type="button" class="iv-chip mt-1 justify-self-start" @click="copyAccount(account.number)">
            <Copy :size="15" aria-hidden="true" /> Salin nomor rekening
          </button>
        </div>
      </li>
    </ul>

    <p v-if="gift.address" data-iv-reveal class="iv-body m-0 text-caption">
      Kirim hadiah ke: {{ gift.address }}
    </p>
  </InvitationSection>
</template>
