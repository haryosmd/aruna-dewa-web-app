<script setup lang="ts">
import { Check, Minus, Plus, RotateCcw, Send, X } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, coupleNames, initials, guest, guestError, hasToken, rsvpPending, submitRsvp } = useInvitation()

const root = ref<HTMLElement | null>(null)

const attendance = ref<'yes' | 'no' | ''>('')
const seats = ref(1)
const message = ref('')
/** Di demo tidak ada apa pun yang tersimpan, jadi keadaan "terkirim" hidup di sini saja. */
const submittedLocally = ref(false)

const quota = computed(() => guest.value?.quota ?? 4)
const guestName = computed(() => guest.value?.displayName || 'Tamu undangan')
/** Demo dan pratinjau editor: alur yang sama, tapi tidak memanggil API. */
const demo = computed(() => !guest.value)
const answered = computed(() => Boolean(guest.value?.rsvp) || submittedLocally.value)

const finalAttendance = computed<'yes' | 'no'>(() => guest.value?.rsvp?.attendance ?? (attendance.value === 'no' ? 'no' : 'yes'))
const finalSeats = computed(() => (finalAttendance.value === 'no' ? 0 : (guest.value?.rsvp?.count ?? seats.value)))

watch(
  () => guest.value,
  (profile) => {
    if (!profile) return
    attendance.value = profile.rsvp?.attendance ?? ''
    seats.value = Math.min(profile.quota, profile.rsvp?.count ?? 1)
    message.value = profile.rsvp?.message ?? ''
  },
  { immediate: true },
)

function choose(value: 'yes' | 'no') {
  attendance.value = value
  if (value === 'no') seats.value = 0
  else if (seats.value < 1) seats.value = 1
}

function step(delta: number) {
  seats.value = Math.min(quota.value, Math.max(1, seats.value + delta))
}

function send() {
  if (!attendance.value) return
  if (demo.value) { submittedLocally.value = true; return }
  submitRsvp({ attendance: attendance.value, count: attendance.value === 'yes' ? seats.value : 0, message: message.value.trim() })
}

function again() {
  submittedLocally.value = false
  attendance.value = ''
  seats.value = 1
}

useArunaMotion(root, ({ gsap, bloomIn }) => {
  // Kelopak "Hadir" mekar dari pangkal kartunya, bukan sekadar muncul.
  bloomIn('[data-rsvp-petal]', { origin: 'bottom center', stagger: 0.06 })

  gsap.utils.toArray<HTMLElement>('[data-rsvp-ticket]').forEach((node) => {
    gsap.from(node, { rotateX: -82, y: 26, opacity: 0, transformOrigin: 'top center', duration: 0.9, ease: 'power3.out' })
  })
})
</script>

<template>
  <div ref="root">
    <InvitationSection
      id="iv-rsvp"
      tone="tint"
      :compact="compact"
      kicker="Konfirmasi kehadiran"
      :title="answered ? 'Terima kasih sudah merespons.' : 'Apakah Anda dapat hadir?'"
      :ornaments="compact ? null : orn"
      :intensity="intensity"
      :seed="props.seed"
    >
      <!-- Tanpa token dan bukan demo, tidak ada yang bisa dikonfirmasi di sini. -->
      <template v-if="!guest && hasToken && guestError">
        <p class="iv-body m-0" role="status">{{ guestError }}</p>
      </template>

      <template v-else-if="answered">
        <!--
          Kartu kehadiran berbentuk tiket: tepi perforasi, monogram, nama tamu. Ini yang
          tamu tangkap layar dan kirim balik ke pasangan — bentuk yang pantas diperlihatkan,
          bukan sekadar kalimat "tersimpan".
        -->
        <div data-rsvp-ticket class="iv-ticket" :data-going="finalAttendance">
          <div class="iv-ticket-stub">
            <OrnamentGlyph :glyph="orn.seal" :initials="initials" class="iv-ticket-seal" aria-hidden="true" />
          </div>
          <div class="iv-ticket-body">
            <p class="iv-kicker m-0">{{ finalAttendance === 'yes' ? 'Kehadiran dikonfirmasi' : 'Berhalangan hadir' }}</p>
            <p class="iv-display m-0 text-[1.55rem] leading-tight">{{ guestName }}</p>
            <p v-if="finalAttendance === 'yes'" class="iv-body m-0 text-[0.9375rem]">
              {{ finalSeats }} kursi disiapkan
            </p>
            <p v-else class="iv-body m-0 text-[0.9375rem]">Doa Anda tetap kami terima dengan hangat.</p>
            <p class="iv-body m-0 text-caption opacity-75">Pernikahan {{ coupleNames }}</p>
          </div>
        </div>

        <p v-if="demo" class="iv-ribbon m-0">Ini pratinjau — jawaban tidak tersimpan.</p>

        <button type="button" class="iv-chip" @click="again">
          <RotateCcw :size="15" aria-hidden="true" /> Ubah jawaban
        </button>
      </template>

      <template v-else>
        <p class="iv-body m-0 text-center text-[0.9375rem]">
          Untuk <strong>{{ guestName }}</strong> · maksimal {{ quota }} orang
        </p>

        <fieldset class="iv-rsvp-choices m-0 w-full border-0 p-0">
          <legend class="sr-only">Kehadiran</legend>

          <button
            type="button"
            class="iv-rsvp-card"
            data-choice="yes"
            :aria-pressed="attendance === 'yes'"
            @click="choose('yes')"
          >
            <span class="iv-rsvp-petals" aria-hidden="true">
              <OrnamentGlyph v-for="n in 3" :key="n" data-rsvp-petal :glyph="orn.floral" class="iv-rsvp-petal" />
            </span>
            <Check :size="20" aria-hidden="true" />
            <span class="iv-display text-[1.3rem]">Hadir</span>
            <span class="iv-body text-caption">Saya akan datang</span>
          </button>

          <button
            type="button"
            class="iv-rsvp-card"
            data-choice="no"
            :aria-pressed="attendance === 'no'"
            @click="choose('no')"
          >
            <X :size="20" aria-hidden="true" />
            <span class="iv-display text-[1.3rem]">Berhalangan</span>
            <span class="iv-body text-caption">Saya kirim doa dari jauh</span>
          </button>
        </fieldset>

        <!-- Stepper kursi baru muncul setelah "Hadir" dipilih; sebelum itu tidak ada gunanya. -->
        <div v-if="attendance === 'yes'" class="grid justify-items-center gap-2">
          <span id="iv-seats-label" class="iv-kicker">Jumlah yang hadir</span>
          <div class="iv-stepper" role="group" aria-labelledby="iv-seats-label">
            <button type="button" class="iv-page-btn" :disabled="seats <= 1" aria-label="Kurangi jumlah kursi" @click="step(-1)">
              <Minus :size="16" aria-hidden="true" />
            </button>
            <output class="iv-display text-[1.8rem] tabular-nums" aria-live="polite">{{ seats }}</output>
            <button type="button" class="iv-page-btn" :disabled="seats >= quota" aria-label="Tambah jumlah kursi" @click="step(1)">
              <Plus :size="16" aria-hidden="true" />
            </button>
          </div>
        </div>

        <label v-if="attendance" class="grid w-full max-w-md gap-1.5 text-left">
          <span class="iv-kicker">Pesan untuk pasangan (opsional)</span>
          <textarea v-model="message" rows="3" maxlength="500" class="iv-control resize-y" />
        </label>

        <p v-if="demo" class="iv-ribbon m-0">Ini pratinjau — jawaban tidak tersimpan.</p>

        <button type="button" class="iv-submit" :disabled="!attendance || rsvpPending" @click="send">
          <Send :size="16" aria-hidden="true" />
          {{ rsvpPending ? 'Menyimpan…' : 'Kirim konfirmasi' }}
        </button>
      </template>
    </InvitationSection>
  </div>
</template>

<style>
.iv-rsvp-choices {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: 1fr;
  max-width: 30rem;
  margin-inline: auto;
}
@media (min-width: 30rem) { .iv-rsvp-choices { grid-template-columns: 1fr 1fr; } }

.iv-rsvp-card {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  overflow: hidden;
  min-height: 8.5rem;
  padding: 1.5rem 1rem;
  border-radius: 0.85rem;
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
  background: color-mix(in srgb, #ffffff 62%, transparent);
  color: inherit;
  cursor: pointer;
  transition: border-color 220ms, background-color 220ms, transform 320ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}
.iv-rsvp-card:hover { transform: translateY(-2px); }
.iv-rsvp-card[aria-pressed='true'] {
  border-color: var(--iv-primary);
  background: color-mix(in srgb, var(--iv-primary) 12%, #ffffff 60%);
  color: var(--iv-primary);
}
.iv-rsvp-card:focus-visible { outline: 3px solid var(--iv-primary); outline-offset: 3px; }

/* "Berhalangan" melipat dirinya sedikit saat dipilih — hangat, bukan menghukum. */
.iv-rsvp-card[data-choice='no'][aria-pressed='true'] { transform: perspective(600px) rotateX(7deg) scale(0.985); }

/*
 * Kelopak di kartu "Hadir". Keadaan diamnya sudah terlihat, jadi tanpa JS kartunya tetap
 * utuh; `bloomIn` hanya menumbuhkannya dari pangkal.
 */
.iv-rsvp-petals {
  position: absolute;
  inset: auto 0 -12% 0;
  display: flex;
  justify-content: center;
  gap: 1.75rem;
  pointer-events: none;
}
.iv-rsvp-petal {
  width: 3.25rem;
  height: auto;
  aspect-ratio: 140 / 176;
  color: var(--iv-primary);
  opacity: 0.2;
  transition: opacity 320ms;
}
.iv-rsvp-card[aria-pressed='true'] .iv-rsvp-petal { opacity: 0.5; }

.iv-stepper { display: flex; align-items: center; gap: 1.1rem; }

/* ── Kartu kehadiran ───────────────────────────────────────────────────────── */
.iv-ticket {
  display: grid;
  grid-template-columns: auto 1fr;
  width: min(100%, 26rem);
  overflow: hidden;
  border-radius: 0.85rem;
  background: color-mix(in srgb, #ffffff 82%, transparent);
  box-shadow: var(--iv-shadow-lift);
  text-align: left;
}
.iv-ticket-stub {
  display: grid;
  place-items: center;
  padding: 1.25rem 1rem;
  background: color-mix(in srgb, var(--iv-primary) 14%, transparent);
  /*
   * Tepi perforasi. Titik-titik transparan digambar dengan radial-gradient, bukan gambar —
   * warnanya jadi ikut latar kartu apa pun paletnya.
   */
  border-right: 2px dashed color-mix(in srgb, var(--iv-primary) 45%, transparent);
}
.iv-ticket-seal { width: 3.25rem; height: auto; aspect-ratio: 120 / 160; color: var(--iv-primary); }
.iv-ticket-body { display: grid; align-content: center; gap: 0.35rem; padding: 1.25rem 1.35rem; }
.iv-ticket[data-going='no'] .iv-ticket-stub { background: color-mix(in srgb, currentColor 8%, transparent); }

.iv-ribbon {
  font-family: var(--iv-body);
  font-size: 0.75rem;
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 10%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
}
</style>
