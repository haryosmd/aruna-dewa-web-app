<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight, HelpCircle, Send, X } from 'lucide-vue-next'
import type { Section, Wish, WishAttendance } from '~/types/aruna'
import { sampleWishes } from '~/content/sample-wishes'

/**
 * Ucapan Elegance (fase 72) = RSVP + buku tamu dalam satu form: nama, pilihan kehadiran
 * (hadir / belum pasti / berhalangan), pesan maksimal 240 huruf, lalu dinding ucapan.
 *
 * Hanya `mode === 'live'` yang memanggil API lewat `submitWishEntry`; panggung dan pratinjau
 * menyimpan kirimannya di memori supaya alurnya tetap bisa dicoba tanpa meninggalkan jejak.
 */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, mode, wishes, wishPending, guest, submitWishEntry } = useInvitation()

const kolom = (key: string, fallback = '') => text(props.section, key, fallback)

const PER_PAGE = 5
const MAX_MESSAGE = 240
const page = ref(0)
const name = ref('')
const attendance = ref<WishAttendance | ''>('')
const message = ref('')
const submitted = ref(false)
const lokal = ref<Wish[]>([])
const ready = useInteractiveReady()

/** Tamu bertautan personal sudah punya nama; ia boleh menimpanya tapi tidak perlu mengetik ulang. */
watch(() => guest.value, (profile) => { if (profile && !name.value) name.value = profile.displayName }, { immediate: true })

const pilihan = computed(() => [
  { value: 'hadir' as const, label: kolom('presentLabel', 'Hadir'), icon: Check },
  { value: 'belum-pasti' as const, label: kolom('unsureLabel', 'Belum pasti'), icon: HelpCircle },
  { value: 'berhalangan' as const, label: kolom('absentLabel', 'Berhalangan'), icon: X },
])
const labelPilihan = (value: string | null | undefined) => pilihan.value.find(item => item.value === value)?.label ?? ''

/**
 * Dinding kosong tidak menjual apa pun: tanpa ucapan sungguhan, contoh ucapan dipakai dan
 * ditandai sebagai contoh — pola yang sama dengan `sections/Wishes.vue` v1. `emptyLabel`
 * milik pasangan tampil di atasnya sebagai ajakan, bukan menggantikan dindingnya.
 */
const sungguhan = computed<Wish[]>(() => [...lokal.value, ...wishes.value])
const usingSamples = computed(() => sungguhan.value.length === 0)
const entries = computed<Wish[]>(() => (usingSamples.value ? sampleWishes : sungguhan.value))
const pageCount = computed(() => Math.max(1, Math.ceil(entries.value.length / PER_PAGE)))
const shown = computed(() => entries.value.slice(page.value * PER_PAGE, page.value * PER_PAGE + PER_PAGE))
watch(() => sungguhan.value.length, () => { page.value = 0 })
watch(pageCount, (count) => { if (page.value >= count) page.value = count - 1 })

const sisa = computed(() => MAX_MESSAGE - message.value.length)
const bisaKirim = computed(() => Boolean(name.value.trim() && attendance.value && message.value.trim()) && !wishPending.value)

function send() {
  if (!bisaKirim.value || !attendance.value) return
  const payload = { name: name.value.trim(), attendance: attendance.value, message: message.value.trim() }
  if (mode.value === 'live') submitWishEntry(payload)
  else lokal.value = [{ id: `lokal-${Date.now()}`, authorName: payload.name, message: payload.message, attendance: payload.attendance, approved: true }, ...lokal.value]
  submitted.value = true
  message.value = ''
  attendance.value = ''
}
</script>

<template>
  <InvitationSection
    :id="sectionDomId('wishes')"
    tone="paper"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="eyebrow" tag="p" data-iv-lead class="iv-kicker m-0" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" />

    <form data-iv-reveal class="iv-card grid w-full max-w-[28rem] gap-4 rounded-md px-5 py-6 text-left" @submit.prevent="send">
      <div class="grid gap-1 text-center">
        <InvitationText :section="props.section" field="formTitle" tag="p" class="iv-display m-0 text-[1.35rem]" />
        <InvitationText :section="props.section" field="subtitle" tag="p" class="iv-body m-0 text-caption" />
      </div>

      <label class="grid gap-1.5">
        <InvitationText :section="props.section" field="nameLabel" tag="span" fallback="Nama" class="iv-kicker" />
        <input id="iv-wish-name" v-model="name" type="text" maxlength="80" required class="iv-control" :placeholder="kolom('namePlaceholder')">
      </label>

      <fieldset class="m-0 grid gap-1.5 border-0 p-0">
        <legend class="iv-kicker mb-1.5 p-0"><InvitationText :section="props.section" field="attendanceLabel" tag="span" fallback="Kehadiran" /></legend>
        <div class="iv-wish-choices">
          <label v-for="item in pilihan" :key="item.value" class="iv-choice" :data-selected="attendance === item.value ? 'true' : 'false'">
            <input :id="`iv-wish-${item.value}`" v-model="attendance" type="radio" name="kehadiran" :value="item.value" class="sr-only">
            <component :is="item.icon" :size="16" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </label>
        </div>
      </fieldset>

      <label class="grid gap-1.5">
        <span class="flex items-baseline justify-between gap-3">
          <InvitationText :section="props.section" field="messageLabel" tag="span" fallback="Ucapan" class="iv-kicker" />
          <span class="iv-body text-caption tabular-nums" aria-live="polite">{{ sisa }}/{{ MAX_MESSAGE }}</span>
        </span>
        <textarea id="iv-wish-message" v-model="message" rows="3" :maxlength="MAX_MESSAGE" required class="iv-control resize-y" :placeholder="kolom('messagePlaceholder')" />
      </label>

      <p v-if="submitted && !wishPending" class="iv-body m-0 text-center text-caption" role="status">
        {{ kolom('celebrationLabel') || kolom('successLabel') }}
        <span v-if="mode !== 'live'" class="block opacity-75">Ini pratinjau — ucapan tidak tersimpan.</span>
      </p>

      <button id="iv-wish-submit" type="submit" class="iv-submit" :disabled="!ready || !bisaKirim">
        <Send :size="16" aria-hidden="true" />
        {{ wishPending ? kolom('savingLabel', 'Menyimpan…') : kolom('submitLabel', 'Kirim') }}
      </button>
    </form>

    <div v-if="usingSamples" class="grid gap-1 text-center">
      <InvitationText :section="props.section" field="emptyLabel" tag="p" class="iv-body m-0 text-[0.9375rem]" />
      <p class="iv-body m-0 text-caption opacity-75">Contoh tampilan — ucapan sungguhan dari tamu akan menggantikannya.</p>
    </div>

    <!--
      Fase 79. Kolom ini punya form sejak fase 72 dan tidak pernah punya pembaca: pasangan
      mengisinya, nilainya tersimpan dan ikut terbit, dan tidak ada satu keadaan pun yang
      menampilkannya — cacat yang sama persis dengan sembilan kolom bagian ekstra, hanya lebih
      sepi. Ditambal dengan MERENDERNYA, bukan dengan menghapus kolomnya: menghapusnya
      menyempitkan `styledFieldKeys('wishes')`, dan `textStyles` diskemakan `.strict()`, jadi
      tiap dokumen terbit yang pernah memberi gaya di kolom itu akan ditolak skema dan berhenti
      bisa disimpan maupun diterbitkan.

      Keadaannya nyata dan satu-satunya: sesudah tamu mengirim, `submitWishEntry` menyimpan lalu
      MENGAMBIL ULANG seluruh dinding. Di jendela itu daftar di bawah masih menampilkan keadaan
      lama, dan baris ini yang menjelaskan kenapa ucapan yang baru ditulis belum kelihatan.
    -->
    <InvitationText
      v-if="wishPending && mode === 'live'"
      :section="props.section"
      field="loadingLabel"
      tag="p"
      class="iv-body m-0 text-center text-caption opacity-75"
      role="status"
    />

    <ul class="iv-wish-list m-0 w-full max-w-[28rem] p-0 list-none text-left" aria-live="polite">
      <li v-for="wish in shown" :key="wish.id" data-iv-reveal class="iv-wish-entry iv-card grid gap-1.5 rounded-md px-4 py-3.5">
        <p class="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="iv-display text-[1rem]">{{ wish.authorName || 'Tamu undangan' }}</span>
          <span v-if="labelPilihan(wish.attendance)" class="iv-wish-badge" :data-attendance="wish.attendance">{{ labelPilihan(wish.attendance) }}</span>
          <span v-if="wish.approved === false" class="iv-pending text-caption">Menunggu ditinjau pasangan</span>
        </p>
        <p class="iv-body m-0 text-[0.9375rem]">{{ wish.message }}</p>
      </li>
    </ul>

    <nav v-if="pageCount > 1" class="flex items-center gap-3" aria-label="Halaman ucapan">
      <button id="iv-wish-page-prev" type="button" class="iv-page-btn" :disabled="!ready || page === 0" aria-label="Halaman ucapan sebelumnya" @click="page -= 1">
        <ChevronLeft :size="18" aria-hidden="true" />
      </button>
      <p class="iv-body m-0 text-caption tabular-nums">Halaman {{ page + 1 }} dari {{ pageCount }}</p>
      <button id="iv-wish-page-next" type="button" class="iv-page-btn" :disabled="!ready || page >= pageCount - 1" aria-label="Halaman ucapan berikutnya" @click="page += 1">
        <ChevronRight :size="18" aria-hidden="true" />
      </button>
    </nav>
  </InvitationSection>
</template>

<style>
.iv-wish-choices {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1fr;
}
@container (min-width: 26rem) { .iv-wish-choices { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.iv-wish-list { display: grid; gap: 0.75rem; }
.iv-wish-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  font-family: var(--iv-body);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: color-mix(in srgb, currentColor 8%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
}
.iv-wish-badge[data-attendance='hadir'] {
  color: var(--iv-primary);
  border-color: color-mix(in srgb, var(--iv-primary) 45%, transparent);
  background: color-mix(in srgb, var(--iv-primary) 12%, transparent);
}
</style>
