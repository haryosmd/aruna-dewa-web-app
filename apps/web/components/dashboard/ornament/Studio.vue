<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { Palette, RotateCcw, Search, Trash2, X } from 'lucide-vue-next'
import type { MediaUploadResult } from '@aruna/contracts/api'
import { ornamentAssetLimit } from '@aruna/contracts'
import type { LayerSlot, OrnamentCategory, OrnamentId, OrnamentRef, UploadedOrnament } from '~/utils/ornaments'
import { arahSudut, type ArahSudut } from '~/utils/kanvas'
import { isUnggahan, ornament } from '~/utils/ornaments'
import { fitOf } from '~/utils/ornament-fit'
import { cariOrnamen, disarankan, hitungPack, kategoriTambahan, labelKategori, packLabels, packIds, type PackId, type StudioTab } from '~/utils/ornament-search'
import { bolehUnggah, layerSlotLabels, slotLabels, tileWidthRasio, type OrnamentSlotKey } from '~/utils/ornament-slots'
import { ornamentRamp, rampStyle } from '~/utils/ornament-palette'

/**
 * Studio Ornamen — pemilih layar penuh untuk seluruh bank.
 *
 * **Kenapa dialog dan bukan panel.** Kolom pengaturan editor selebar 528px di 1440; empat grid
 * ubin sudah sesak di sana ketika yang ditawarkan baru 59 glyph. Yang dibuka fase 59 adalah
 * kesembilan slot skalar plus lima jangkar ladang dari bank 328 keping, dengan pencarian dan
 * penyaring — itu butuh ruangnya sendiri.
 *
 * **Dialog reka-ui, bukan buatan sendiri.** Focus trap, `aria-modal`, kunci scroll, dan
 * pengembalian fokus adalah bagian yang mahal kalau ditulis tangan dan gagalnya senyap; pola yang
 * sama sudah dipakai `atomic/Popup.vue` dan `layout/AppHeader.vue`.
 *
 * **Seluruh penyaringan hidup di `utils/ornament-search.ts`**, bukan di sini. Vitest repo ini
 * jalan di node tanpa DOM, jadi logika yang masuk ke `<script setup>` adalah logika yang tidak
 * akan pernah diuji.
 */
const props = defineProps<{
  open: boolean
  /**
   * Dinamai `slotKey`, bukan `slot`.
   *
   * `slot` adalah atribut Vue yang sudah usang: sebuah prop bernama itu dirender sebagai
   * `:slot="..."` di pemanggilnya dan ditolak `vue/no-deprecated-slot-attribute` — bukan
   * sekadar keluhan lint, melainkan nama yang memang tidak boleh dipakai lagi sebagai prop.
   */
  slotKey?: OrnamentSlotKey
  layer?: LayerSlot
  templateId: string
  /**
   * Id bank, atau unggahan pasangan (fase 69) yang sedang terpasang di slot ini. Kosong untuk slot
   * yang bawaannya garis, bukan keping (`segue`, `heroFrame` — fase 80), selama belum diganti.
   */
  aktif: OrnamentRef | null
  bawaan: OrnamentId | null
  tokens: { background: string, foreground: string, primary: string }
  accent: string
  /** Untuk mengunggah dan mendaftar ornamen unggahan; kosong = tab Unggahan tidak ditawarkan. */
  invitationId?: string
  /**
   * Fase 81. `slot` = nilai global slot (perilaku lama, kartu tab Ornamen). `keping` = hanya satu
   * tempat di kanvas (keputusan pemilik), dengan "Terapkan ke semua" untuk menulis ke slotnya.
   * `tambah` = ornamen baru untuk sebuah bagian — tidak terikat slot, disaring per kategori.
   */
  mode?: 'slot' | 'keping' | 'tambah'
  /** Arah keping sudut yang sedang disunting (mode `keping`, slot `corner`). */
  arah?: ArahSudut | null
  /** Label tempat keping untuk judul, mis. "Hero · Sudut kiri atas". */
  tempat?: string
  /** Mode keping tanpa slot (ladang, gedung, busana): saring menurut kategori glyph-nya sekarang. */
  kategori?: OrnamentCategory
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  pilih: [OrnamentId]
  pilihUnggahan: [UploadedOrnament]
  kembalikan: []
  batal: []
  /** Mode keping: tulis pilihan tempat ini ke slot globalnya, untuk semua tempat sejenis. */
  terapkanSemua: []
  /** Mode keping sudut: menghadap ke mana. */
  arah: [ArahSudut]
}>()

const mode = computed(() => props.mode ?? 'slot')
/** Mode tambah: kategori bank yang sedang disaring. */
const kategoriPilihan = ref<OrnamentCategory | 'semua'>('semua')
const pakaiArah = computed(() => mode.value === 'keping' && props.slotKey === 'corner')
const putarPratinjau = computed(() => `${arahSudut.find(item => item.id === (props.arah ?? 'kiri-atas'))?.sudut ?? 0}deg`)

/** Id bank yang aktif, atau null bila slot ini sedang diisi unggahan. Ubin dan navigasi memakainya. */
const aktifId = computed<OrnamentId | null>(() => {
  const aktif: OrnamentRef | null = props.aktif
  return !aktif || isUnggahan(aktif) ? null : aktif
})

const tab = ref<StudioTab>('semua')
const query = ref('')
const pack = ref<PackId | 'semua'>('semua')

/** Nilai saat Studio dibuka, untuk Escape/Batal. Satu sesi memilih = satu langkah undo. */
const semula = ref<OrnamentId | null>(aktifId.value ?? props.bawaan)


/*
 * Tab Unggahan (fase 69): raster transparan milik pasangan. Hanya untuk slot skalar yang boleh
 * (`uploadableSlots`) dan hanya bila pemanggil memberi `invitationId`. Daftarnya diminta ke API
 * saat dialog dibuka, bukan saat halaman dimuat — kebanyakan sesi editor tidak pernah membukanya.
 */
const tabUnggahan = computed(() => Boolean(props.invitationId) && (
  (mode.value === 'tambah') || (Boolean(props.slotKey) && !props.layer && bolehUnggah(props.slotKey!))
))
const { listMedia } = useInvitations()
const unggah = useMediaUploads(() => props.invitationId ?? '')
const daftarUnggahan = ref<MediaUploadResult[]>([])
const memuatUnggahan = ref(false)
const galatUnggahan = ref('')

async function muatUnggahan() {
  if (!props.invitationId) return
  memuatUnggahan.value = true
  galatUnggahan.value = ''
  try { daftarUnggahan.value = await listMedia(props.invitationId, 'ornament') }
  catch (cause) { galatUnggahan.value = apiErrorMessage(cause) }
  finally { memuatUnggahan.value = false }
}

const sisaKuota = computed(() => Math.max(0, ornamentAssetLimit - daftarUnggahan.value.length))

function keUnggahan(item: MediaUploadResult): UploadedOrnament | null {
  if (!item.width || !item.height) return null
  return { url: item.publicUrl, width: item.width, height: item.height }
}

async function kirimUnggahan(files: File[]) {
  const hasil = await unggah.uploadDetailed(files, 'ornament')
  if (hasil.length) {
    daftarUnggahan.value = [...hasil, ...daftarUnggahan.value]
    // Yang baru diunggah langsung dipasang: pasangan mengunggah karena ingin memakainya.
    const pertama = keUnggahan(hasil[0]!)
    if (pertama) emit('pilihUnggahan', pertama)
  }
}

async function hapusUnggahan(item: MediaUploadResult) {
  const terpasang = isUnggahan(props.aktif) && props.aktif.url === item.publicUrl
  if (terpasang) emit('kembalikan')
  await unggah.release(item.publicUrl)
  await muatUnggahan()
}

const terpasang = (item: MediaUploadResult) => isUnggahan(props.aktif) && props.aktif.url === item.publicUrl

/**
 * Dipanggil tiap kali dialog terbuka — lewat watcher untuk buka berikutnya, dan lewat
 * `onMounted` untuk yang pertama: pemanggil memasang komponen ini dengan `v-if` saat `open`
 * sudah true, jadi watcher biasa tidak pernah melihat transisi tutup→buka yang pertama.
 */
function saatDibuka() {
  semula.value = aktifId.value ?? props.bawaan
  // Slot yang sedang diisi unggahan dibuka di tab Unggahan — itulah yang sedang dilihat pasangan.
  tab.value = isUnggahan(props.aktif) && tabUnggahan.value ? 'unggahan' : 'semua'
  query.value = ''
  pack.value = 'semua'
  kategoriPilihan.value = 'semua'
  if (tabUnggahan.value) void muatUnggahan()
}
watch(() => props.open, terbuka => { if (terbuka) saatDibuka() })
onMounted(() => { if (props.open) saatDibuka() })

const keterangan = computed(() => (props.layer ? layerSlotLabels[props.layer] : props.slotKey ? slotLabels[props.slotKey] : null))
const judul = computed(() => (mode.value === 'tambah' ? 'Tambah ornamen' : props.tempat ?? keterangan.value?.label ?? 'Ornamen'))
const kategoriCari = computed(() => (mode.value === 'tambah' ? kategoriPilihan.value : !props.slotKey && !props.layer ? props.kategori : undefined))

const hasil = computed(() => cariOrnamen({
  slot: props.slotKey, layer: props.layer, kategori: kategoriCari.value, templateId: props.templateId,
  tab: tab.value, query: query.value, pack: pack.value === 'semua' ? undefined : pack.value,
}))

const jumlahPack = computed(() => hitungPack({ slot: props.slotKey, layer: props.layer, kategori: kategoriCari.value }))
const packTersedia = computed(() => packIds.filter(id => jumlahPack.value[id] > 0))
const totalSemua = computed(() => cariOrnamen({
  slot: props.slotKey, layer: props.layer, kategori: kategoriCari.value, templateId: props.templateId, tab: 'semua',
}).length)
/** Yang serasi dengan tema: diurutkan di depan dan diberi lencana, tidak pernah menyaring. */
const serasi = computed(() => new Set(disarankan({ slot: props.slotKey, layer: props.layer, templateId: props.templateId })))

const ramp = computed(() => rampStyle(ornamentRamp(props.tokens, props.accent)))
const fitAktif = computed(() => (aktifId.value ? fitOf(aktifId.value, props.templateId) : { ok: true, flags: [], ringkas: '' }))

/**
 * Panah menggerakkan sekaligus memilih — itulah yang dimaksud `radiogroup`.
 *
 * Jumlah kolom tidak diukur dari DOM: ubin punya lebar berbeda-beda (rasio glyph yang
 * menentukannya), jadi aritmetika berbasis `getBoundingClientRect` akan salah pada baris yang
 * isinya campur. Naik/turun karena itu melompat sejauh perkiraan tetap, dan Home/End yang
 * memberi jalan pasti ke ujung.
 */
function navigasi(event: KeyboardEvent) {
  const daftar = hasil.value
  const posisi = aktifId.value ? daftar.indexOf(aktifId.value) : -1
  const lompat = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[event.key]
  let tujuan = -1

  if (lompat !== undefined) tujuan = Math.min(daftar.length - 1, Math.max(0, (posisi === -1 ? 0 : posisi) + lompat))
  else if (event.key === 'Home') tujuan = 0
  else if (event.key === 'End') tujuan = daftar.length - 1
  else return

  event.preventDefault()
  const berikut = daftar[tujuan]
  if (berikut) {
    emit('pilih', berikut)
    nextTick(() => document.getElementById(`studio-ubin-${berikut}`)?.focus())
  }
}

function tutup(simpan: boolean) {
  if (!simpan) emit('batal')
  emit('update:open', false)
}
</script>

<template>
  <DialogRoot :open="open" @update:open="terbuka => { if (!terbuka) tutup(false) }">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-ink/45 backdrop-blur-sm motion-safe:data-[state=open]:animate-[fade-in_200ms_ease-out]" />
      <DialogContent
        class="@container fixed inset-3 z-50 flex flex-col overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-veil)] sm:inset-6"
        @keydown="navigasi"
      >
        <header class="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div class="grid gap-1">
            <p class="eyebrow">Studio ornamen</p>
            <DialogTitle class="m-0 font-display text-h3 font-semibold text-ink">{{ judul }}</DialogTitle>
            <DialogDescription class="m-0 text-caption text-ink-muted">
              <span v-if="mode === 'keping'" class="block font-semibold text-ink">Hanya mengganti keping di tempat ini. Tempat lain tetap.</span>
              <span v-else-if="mode === 'tambah'" class="block font-semibold text-ink">Ornamen baru diletakkan di tengah bagian, lalu bisa digeser, diukur, dan diputar di kanvas.</span>
              {{ mode === 'tambah' ? '' : keterangan?.hint }}
              <span v-if="keterangan?.syarat" class="block text-ink-subtle">{{ keterangan.syarat }}</span>
              <span class="block">Tekan Escape untuk membatalkan dan kembali ke pilihan semula.</span>
            </DialogDescription>
          </div>
          <DialogClose
            id="studio-tutup"
            class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border-strong text-ink"
            aria-label="Tutup studio ornamen"
          >
            <X :size="19" aria-hidden="true" />
          </DialogClose>
        </header>

        <div class="grid gap-3 border-b border-border p-4 sm:p-5">
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex gap-1 rounded-full bg-surface-3 p-1" role="tablist" aria-label="Cakupan pilihan">
              <button
                v-for="pilihan in [
                  { id: 'semua', label: `Semua (${totalSemua})` },
                  ...(tabUnggahan ? [{ id: 'unggahan', label: `Unggahan (${daftarUnggahan.length})` }] : []),
                ]"
                :id="`studio-tab-${pilihan.id}`"
                :key="pilihan.id"
                type="button"
                role="tab"
                :aria-selected="tab === pilihan.id"
                aria-controls="studio-grid"
                :class="cn(
                  'min-h-11 rounded-full px-4 text-ui font-semibold transition-colors duration-200',
                  tab === pilihan.id ? 'bg-surface text-ink shadow-hairline' : 'text-ink-muted',
                )"
                @click="tab = pilihan.id as StudioTab"
              >
                {{ pilihan.label }}
              </button>
            </div>

            <label class="relative min-w-52 flex-1">
              <span class="sr-only">Cari ornamen</span>
              <Search :size="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
              <UiInput id="studio-cari" v-model="query" type="search" placeholder="Cari nama ornamen" class="pl-9" />
            </label>

            <UiButton v-if="mode !== 'tambah'" id="studio-kembalikan" tone="outline" size="sm" @click="emit('kembalikan')">
              <RotateCcw :size="15" aria-hidden="true" />
              {{ mode === 'keping' ? 'Ikut slot' : 'Bawaan tema' }}
            </UiButton>
            <UiButton v-if="mode === 'keping' && aktifId" id="studio-terapkan-semua" tone="outline" size="sm" @click="emit('terapkanSemua')">
              Terapkan ke semua {{ keterangan?.label?.toLowerCase() ?? 'tempat' }}
            </UiButton>
          </div>

          <!-- Mode tambah (fase 81): kategori bank, karena ornamen baru tidak terikat slot. -->
          <div v-if="mode === 'tambah' && tab === 'semua'" class="flex flex-wrap gap-1.5" role="group" aria-label="Saring menurut jenis ornamen">
            <button
              v-for="id in ['semua', ...kategoriTambahan]"
              :id="`studio-kategori-${id}`"
              :key="id"
              type="button"
              :aria-pressed="kategoriPilihan === id"
              :class="cn(
                'min-h-9 rounded-full border px-3 text-caption font-medium transition-colors duration-200',
                kategoriPilihan === id ? 'border-primary bg-primary-soft text-ink' : 'border-border text-ink-muted hover:border-border-strong',
              )"
              @click="kategoriPilihan = id as OrnamentCategory | 'semua'"
            >
              {{ id === 'semua' ? 'Semua jenis' : labelKategori[id as OrnamentCategory] }}
            </button>
          </div>

          <!--
            Empat arah sudut (fase 81, permintaan pemilik): satu keping dipakai di keempat pojok.
            Ubin di bawah ikut diputar ke arah yang dipilih, jadi yang dipilih adalah yang terlihat.
          -->
          <div v-if="pakaiArah" class="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Arah sudut">
            <span class="text-caption font-semibold text-ink">Arah</span>
            <button
              v-for="item in arahSudut"
              :id="`studio-arah-${item.id}`"
              :key="item.id"
              type="button"
              role="radio"
              :aria-checked="arah === item.id"
              :aria-label="`Menghadap ${item.label.toLowerCase()}`"
              :class="cn(
                'grid min-h-10 min-w-10 place-items-center rounded-md border px-2 text-ui-lg transition-colors duration-200',
                arah === item.id ? 'border-primary bg-primary-soft text-ink' : 'border-border text-ink-muted hover:border-border-strong',
              )"
              @click="emit('arah', item.id)"
            >
              {{ item.simbol }}
            </button>
          </div>

          <div v-if="tab === 'semua'" class="flex flex-wrap gap-1.5" role="group" aria-label="Saring menurut koleksi">
            <button
              v-for="id in ['semua', ...packTersedia]"
              :id="`studio-pack-${id}`"
              :key="id"
              type="button"
              :aria-pressed="pack === id"
              :class="cn(
                'min-h-9 rounded-full border px-3 text-caption font-medium transition-colors duration-200',
                pack === id ? 'border-primary bg-primary-soft text-ink' : 'border-border text-ink-muted hover:border-border-strong',
              )"
              @click="pack = id as PackId | 'semua'"
            >
              {{ id === 'semua' ? 'Semua koleksi' : `${packLabels[id as PackId]} (${jumlahPack[id as PackId]})` }}
            </button>
          </div>
        </div>

        <div class="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 @3xl:grid-cols-[minmax(0,1fr)_16rem] sm:p-5">
          <!-- Tab Unggahan (fase 69): dropzone + ubin raster pasangan, menggantikan grid bank. -->
          <div v-if="tab === 'unggahan'" class="grid content-start gap-4">
            <UiDropzone
              id="studio-unggah"
              kind="ornament"
              multiple
              :pending="unggah.pending.value"
              :remaining="sisaKuota"
              label="PNG atau WebP transparan, maksimal 300 KB. Warna tetap — tidak ikut palet tema."
              @files="kirimUnggahan"
            />
            <ul v-if="unggah.failures.value.length" class="notice m-0 grid list-none gap-1 p-3" role="alert">
              <li v-for="pesan in unggah.failures.value" :key="pesan">{{ pesan }}</li>
            </ul>
            <p v-if="galatUnggahan" class="notice m-0" role="alert">{{ galatUnggahan }}</p>
            <p v-else-if="memuatUnggahan" class="m-0 text-caption text-ink-muted">Memuat unggahan…</p>
            <p v-else-if="!daftarUnggahan.length" class="m-0 text-caption text-ink-muted">
              Belum ada ornamen unggahan. Unggah keping berlatar transparan — ia dipasang persis seperti ornamen bank, hanya warnanya tetap.
            </p>
            <div v-else class="flex flex-wrap gap-2" role="radiogroup" :aria-label="`Unggahan untuk ${judul.toLowerCase()}`">
              <div v-for="item in daftarUnggahan" :key="item.id" class="relative">
                <button
                  :id="`studio-unggahan-${item.id}`"
                  type="button"
                  role="radio"
                  :aria-checked="terpasang(item)"
                  :aria-label="`${judul}: ${item.originalName ?? 'unggahan'} — warna tetap, tidak ikut palet kalian`"
                  :class="cn(
                    'grid h-20 grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden rounded-md border p-2 transition-[border-color,box-shadow] duration-200',
                    terpasang(item) ? 'border-primary shadow-lift' : 'border-border hover:border-border-strong',
                  )"
                  :style="{ width: tileWidthRasio((item.width ?? 1) / (item.height ?? 1), 64) }"
                  @click="() => { const u = keUnggahan(item); if (u) emit('pilihUnggahan', u) }"
                >
                  <img :src="item.publicUrl" :width="item.width ?? undefined" :height="item.height ?? undefined" alt="" class="min-h-0 max-h-full max-w-full object-contain" loading="lazy" decoding="async">
                  <Palette :size="13" class="absolute top-1 right-1 text-gold" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="absolute -top-2 -left-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-surface text-ink-muted shadow-hairline hover:text-danger"
                  :aria-label="`Hapus ${item.originalName ?? 'unggahan'}`"
                  @click="hapusUnggahan(item)"
                >
                  <Trash2 :size="13" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div v-else>
            <p class="sr-only" aria-live="polite">{{ hasil.length }} ornamen ditampilkan</p>
            <div
              v-if="hasil.length"
              id="studio-grid"
              class="flex flex-wrap gap-2"
              role="radiogroup"
              :aria-label="`Pilihan ${judul.toLowerCase()}`"
              :style="{ ...ramp, '--studio-putar': pakaiArah ? putarPratinjau : '0deg' }"
            >
              <DashboardOrnamentStudioTile
                v-for="glyph in hasil"
                :key="glyph"
                :glyph="glyph"
                :template-id="templateId"
                :dipilih="glyph === aktifId"
                :bawaan="glyph === bawaan"
                :serasi="serasi.has(glyph)"
                :slot-label="judul"
                @click="emit('pilih', glyph)"
              />
            </div>
            <p v-else class="notice m-0">
              Tidak ada ornamen yang cocok dengan pencarian itu. Coba kata lain, atau pilih “Semua koleksi”.
            </p>
          </div>

          <!--
            Pratinjau keping tunggal, BUKAN `<InvitationRenderer>` kedua.

            Renderer kedua berarti set ScrollTrigger kedua dan siklus musik/gerbang kedua di dalam
            portal. Pratinjau undangan penuh tetap ada — ia hidup di belakang dialog dan ikut
            berubah begitu pilihan ditulis ke dokumen.
          -->
          <aside class="grid h-fit content-start gap-3 rounded-md border border-border bg-surface-2 p-4 @3xl:sticky @3xl:top-0">
            <p class="eyebrow">Pilihan sekarang</p>
            <div
              class="grid h-32 grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden rounded-md p-3"
              :style="{ ...ramp, background: tokens.background }"
            >
              <OrnamentGlyph v-if="aktif" :glyph="aktif" ubin class="min-h-0 max-h-full max-w-full object-contain text-[color:var(--iv-orn-body)]" :style="pakaiArah ? { rotate: putarPratinjau } : undefined" aria-hidden="true" />
              <span v-else class="block h-px w-3/4 bg-[color:var(--iv-orn-body)]" aria-hidden="true" />
            </div>
            <p class="m-0 text-ui font-semibold text-ink">{{ aktifId ? ornament(aktifId).name : aktif ? 'Unggahan kalian' : 'Garis bawaan tema' }}</p>
            <p v-if="!aktif" class="m-0 text-caption text-ink-subtle">Belum diganti keping. Pilih satu dari daftar untuk menggantinya.</p>
            <p v-else-if="!aktifId" class="m-0 text-caption text-ink-subtle">Raster transparan milik kalian. Warnanya tetap, tidak ikut palet.</p>
            <p v-else-if="aktifId === bawaan" class="m-0 text-caption text-ink-subtle">Bawaan tema.</p>
            <p v-else-if="fitAktif.ok" class="m-0 text-caption text-ink-subtle">Seresep dengan tema kalian.</p>
            <p v-else class="m-0 text-caption text-warning">{{ fitAktif.ringkas }}.</p>
          </aside>
        </div>

        <footer class="flex flex-wrap justify-end gap-2 border-t border-border p-4 sm:p-5">
          <UiButton id="studio-batal" tone="outline" @click="tutup(false)">Batal</UiButton>
          <UiButton id="studio-selesai" :disabled="mode === 'tambah' && !aktifId && !aktif" @click="tutup(true)">{{ mode === 'tambah' ? 'Tambahkan' : 'Pakai ornamen ini' }}</UiButton>
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
