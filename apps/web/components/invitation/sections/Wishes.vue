<script setup lang="ts">
import { ChevronLeft, ChevronRight, Heart } from 'lucide-vue-next'
import type { Section, Wish } from '~/types/aruna'
import { sampleWishes } from '~/content/sample-wishes'

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, wishes, wishPending, guest, hasToken, submitWish } = useInvitation()

const PER_PAGE = 5
const page = ref(0)
const message = ref('')

/**
 * Paginasi ini murni klien: SSR memberi halaman pertama, dan tombolnya baru punya pendengar
 * setelah hidrasi. Tanpa penjaga ini, ketukan sebelum hidrasi tidak melakukan apa pun dan
 * tidak meninggalkan jejak apa pun — tamu mengira tombolnya rusak. Pola yang sama sudah
 * dipakai `components/landing/Demo.vue` untuk alasan yang persis sama.
 */
const ready = useInteractiveReady()

/**
 * Dinding yang kosong tidak menjual apa pun. Saat belum ada ucapan sungguhan — demo, dan
 * undangan yang baru terbit — contoh ucapan dipakai supaya tamu melihat bentuk yang
 * diharapkan darinya. Ditandai jelas, jadi tidak ada yang mengira itu ucapan sungguhan.
 */
const usingSamples = computed(() => wishes.value.length === 0)
const entries = computed<Wish[]>(() => (usingSamples.value ? sampleWishes : wishes.value))

const pageCount = computed(() => Math.max(1, Math.ceil(entries.value.length / PER_PAGE)))
const shown = computed(() => entries.value.slice(page.value * PER_PAGE, page.value * PER_PAGE + PER_PAGE))

/** Ucapan baru selalu masuk di halaman pertama, jadi penulisnya langsung melihat miliknya. */
watch(() => wishes.value.length, () => { page.value = 0 })
watch(pageCount, (count) => { if (page.value >= count) page.value = count - 1 })

function send() {
  if (!message.value.trim()) return
  submitWish(message.value.trim())
  message.value = ''
}

/** Reaksi bersifat lokal — tidak ada endpointnya, dan berpura-pura ada akan menyesatkan. */
const reactions = ref<Record<string, string>>({})
const emojis = ['🤍', '🎉', '🙏', '🥹']
function react(id: string, emoji: string) {
  reactions.value = { ...reactions.value, [id]: reactions.value[id] === emoji ? '' : emoji }
}
</script>

<template>
  <InvitationSection
    id="iv-wishes"
    tone="paper"
    :compact="compact"
    kicker="Ucapan dan doa"
    title="Doa baik dari orang tersayang"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
  >
    <p v-if="usingSamples" class="iv-body m-0 text-caption opacity-75">
      Contoh tampilan — ucapan sungguhan dari tamu akan menggantikannya.
    </p>

    <ul class="iv-wish-list m-0 w-full p-0 list-none text-left" aria-live="polite">
      <li
        v-for="(wish, at) in shown"
        :key="wish.id"
        data-iv-reveal
        class="iv-wish"
        :data-side="at % 2 === 0 ? 'kiri' : 'kanan'"
      >
        <div class="iv-wish-bubble">
          <p class="iv-body m-0 text-[0.9375rem]">{{ wish.message }}</p>
          <p class="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span v-if="wish.authorName" class="iv-body text-caption font-semibold">{{ wish.authorName }}</span>
            <span v-if="wish.approved === false" class="iv-pending text-caption">Menunggu ditinjau pasangan</span>
          </p>
        </div>

        <div class="iv-wish-reacts">
          <button
            v-for="emoji in emojis"
            :id="`iv-wish-react-${wish.id}-${emoji.codePointAt(0)}`"
            :key="emoji"
            type="button"
            class="iv-react"
            :data-on="reactions[wish.id] === emoji ? 'true' : 'false'"
            :aria-pressed="reactions[wish.id] === emoji"
            :aria-label="`Beri reaksi ${emoji} untuk ucapan dari ${wish.authorName || 'tamu'}`"
            @click="react(wish.id, emoji)"
          >
            <span aria-hidden="true">{{ emoji }}</span>
          </button>
        </div>
      </li>
    </ul>

    <nav v-if="pageCount > 1" class="flex items-center gap-3" aria-label="Halaman ucapan">
      <button
        id="iv-wish-page-prev"
        type="button"
        class="iv-page-btn"
        :disabled="!ready || page === 0"
        aria-label="Halaman ucapan sebelumnya"
        @click="page -= 1"
      >
        <ChevronLeft :size="18" aria-hidden="true" />
      </button>
      <p class="iv-body m-0 text-caption tabular-nums">Halaman {{ page + 1 }} dari {{ pageCount }}</p>
      <button
        id="iv-wish-page-next"
        type="button"
        class="iv-page-btn"
        :disabled="!ready || page >= pageCount - 1"
        aria-label="Halaman ucapan berikutnya"
        @click="page += 1"
      >
        <ChevronRight :size="18" aria-hidden="true" />
      </button>
    </nav>

    <form v-if="!compact && guest" class="grid w-full max-w-md gap-3 text-left" @submit.prevent="send">
      <label class="grid gap-1.5">
        <span class="iv-kicker">Tambahkan ucapan</span>
        <textarea id="iv-wish-message" v-model="message" rows="3" maxlength="500" class="iv-control resize-y" />
      </label>
      <button id="iv-wish-submit" type="submit" class="iv-submit" :disabled="wishPending || !message.trim()">
        <Heart :size="16" aria-hidden="true" />
        {{ wishPending ? 'Mengirim…' : 'Kirim ucapan' }}
      </button>
    </form>

    <!-- Tanpa token, sebelumnya tidak ada apa pun di sini: bukan form, bukan penjelasan. -->
    <p v-else-if="!compact && hasToken" class="iv-body m-0 text-caption">
      Tautan undangan ini belum bisa kami kenali, jadi ucapan belum dapat dikirim. Coba buka kembali tautan dari pasangan.
    </p>
    <p v-else-if="!compact" class="iv-body m-0 text-caption">
      Ucapan dikirim lewat undangan yang dikirim khusus untuk Anda oleh pasangan.
    </p>
  </InvitationSection>
</template>

<style>
.iv-wish-list { display: grid; gap: 1.1rem; }

.iv-wish {
  display: grid;
  gap: 0.4rem;
  max-width: min(100%, 26rem);
}
.iv-wish[data-side='kiri'] { justify-self: start; }
.iv-wish[data-side='kanan'] { justify-self: end; }

/*
 * Gelembung, bukan kartu. Ekornya yang membuat dinding ini terbaca sebagai percakapan —
 * digambar dengan border miring, jadi tidak ada aset tambahan.
 */
.iv-wish-bubble {
  position: relative;
  padding: 0.95rem 1.15rem;
  border-radius: 1.1rem;
  background: color-mix(in srgb, #ffffff 78%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  box-shadow: var(--iv-shadow-card);
}
.iv-wish[data-side='kiri'] .iv-wish-bubble { border-bottom-left-radius: 0.25rem; }
.iv-wish[data-side='kanan'] .iv-wish-bubble { border-bottom-right-radius: 0.25rem; }

.iv-wish-bubble::after {
  content: '';
  position: absolute;
  bottom: -0.5rem;
  width: 0;
  height: 0;
  border-top: 0.6rem solid color-mix(in srgb, #ffffff 78%, transparent);
}
.iv-wish[data-side='kiri'] .iv-wish-bubble::after { left: 0.9rem; border-right: 0.7rem solid transparent; }
.iv-wish[data-side='kanan'] .iv-wish-bubble::after { right: 0.9rem; border-left: 0.7rem solid transparent; }

.iv-wish-reacts { display: flex; gap: 0.3rem; }
.iv-wish[data-side='kanan'] .iv-wish-reacts { justify-content: flex-end; }

.iv-react {
  display: grid;
  place-items: center;
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.42;
  transition: opacity 180ms, background-color 180ms, transform 180ms;
}
.iv-react:hover { opacity: 0.8; }
.iv-react[data-on='true'] {
  opacity: 1;
  transform: scale(1.12);
  background: color-mix(in srgb, var(--iv-primary) 14%, transparent);
}

.iv-page-btn {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.iv-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
