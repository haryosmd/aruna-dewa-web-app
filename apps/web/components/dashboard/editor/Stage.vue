<script setup lang="ts">
import { Monitor, RotateCw, Smartphone, Tablet, ZoomIn, ZoomOut } from 'lucide-vue-next'
import type { InvitationDocument } from '~/types/aruna'
import { zoomMax, zoomMin, zoomStep, type PreviewDevice } from '~/composables/useEditorPrefs'
import { sectionDomId, stageScrollOffset, stageScrollTop } from '~/utils/editor-sections'
import { layerSlots, ornamentSlots, type OrnamentSlotKey } from '~/utils/ornament-slots'
import type { LayerSlot } from '~/utils/ornaments'

/*
 * Panggung pratinjau (fase 72.2): pil kiri ↻ | ZOOM ⊖ 100% ⊕, pil kanan pemilih lebar.
 * Undangannya dirender **hidup** (`mode="stage"`): amplop pembuka tampil dan bisa diklik,
 * partitur GSAP berjalan, dock dan pemutar musik ada — persis yang dilihat tamu di ponselnya,
 * hanya diperkecil.
 *
 * **Bezel ponsel dibuang di fase 76** atas keputusan pemilik, yang menyebutnya dua kali. Ia
 * memakan ~120px tinggi panggung berikut satu notch, dan yang dipratinjau pasangan adalah
 * undangannya, bukan merek ponselnya. Yang tersisa adalah layar bersudut membulat — dan tiga
 * lebar tetap ada, karena lebar yang berbeda memang menghasilkan tata letak yang berbeda.
 *
 * Lebarnya dirender sungguhan lalu diperkecil, bukan diperkecil lalu dirender: undangan memakai
 * container query di seluruh badannya (`.iv-root`), jadi render 390px berperilaku persis seperti
 * ponsel 390px. Skala tidak pernah melebihi 1 — memperbesar render hanya mengaburkan gambar dan
 * berbohong soal ukuran huruf. Zoom karena itu 50–100 %: ia memperkecil dari "pas", bukan
 * memperbesar melampaui aslinya.
 */
/*
 * `height` sepasang dengan `width`, dan itu bukan hiasan: bagian yang setinggi "satu layar"
 * (cover, hero, gerbang amplop) butuh tahu setinggi apa layar perangkat yang sedang dipratinjau.
 * Tanpa angka ini mereka membaca `100svh` — tinggi JENDELA EDITOR — jadi mengecilkan jendela
 * memendekkan cover di dalam bingkai iPhone, yang tidak pernah terjadi di ponsel sungguhan.
 *
 * Angkanya viewport perangkat aslinya (ponsel 390×844, tablet 768×1024, desktop 1280×800): yang
 * harus ditiru adalah ruang yang dilihat tamu.
 *
 * **Tiga lebar sejak fase 77, dan ketiganya sungguh berbeda.** Fase 76 menawarkan 390 dan 412
 * berdampingan; 412 tidak pernah mengubah tata letak apa pun, ia cuma menggeser angka. Tablet 768
 * dan desktop 1280 masing-masing menyalakan aturan yang berbeda di `Renderer.vue`.
 *
 * Sejak fase 76 angka itu punya tugas kedua: ia tinggi WADAH GULIR layarnya (`scrollable` di
 * `PhoneFrame`), jadi ponselnya menggulung isinya sendiri alih-alih digeser utuh oleh panggung.
 */
const previewDevices = [
  { id: 'ponsel', label: 'Ponsel', width: 390, height: 844, icon: Smartphone, aria: 'Pratinjau lebar ponsel 390px' },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024, icon: Tablet, aria: 'Pratinjau lebar tablet 768px' },
  { id: 'laptop', label: 'Desktop', width: 1280, height: 800, icon: Monitor, aria: 'Pratinjau lebar desktop 1280px' },
] as const satisfies readonly { id: PreviewDevice; label: string; width: number; height: number; icon: unknown; aria: string }[]

const props = defineProps<{
  document: InvitationDocument
  focusSection?: { type: string, nonce: number } | null
}>()
const emit = defineEmits<{
  /** Bagian yang sedang berdiri di tengah layar (fase 76), supaya rail ikut menyorot. */
  sectionInView: [type: string]
  /** Ornamen yang diklik di kanvas (fase 76), supaya inspektor membuka slotnya. */
  pilihSlot: [target: { slot?: OrnamentSlotKey, layer?: LayerSlot }]
}>()
const device = defineModel<PreviewDevice>('device', { default: 'ponsel' })
const zoom = defineModel<number>('zoom', { default: 100 })

const viewport = ref<HTMLElement | null>(null)
let percobaan = 0

/**
 * Gerbang amplop masih berdiri.
 *
 * **Tidak lagi mengunci gulir** (fase 76): gerbang kini ikut aliran setinggi satu layar, jadi
 * tidak ada yang perlu dikunci. Yang tersisa dari sinyal ini satu: begitu gerbangnya pergi,
 * daftar elemen yang diamati scroll-spy berubah dan pengamatnya harus dipasang ulang.
 */
const terkunci = ref(false)

/** Muat ulang pratinjau: amplop tertutup lagi dan partitur diputar dari awal. */
const ulang = ref(0)
function muatUlang() { ulang.value++; terkunci.value = false }

/*
 * Wadah gulirnya adalah layar ponsel, bukan panggung.
 *
 * Dibaca lewat `[data-preview-stage]` dan bukan lewat `defineExpose`: kaitan itu sudah jadi
 * kontrak yang dipakai e2e, jadi satu sumber kebenaran lebih sedikit daripada dua.
 */
const scroller = ref<HTMLElement | null>(null)
function bacaScroller() { scroller.value = viewport.value?.querySelector<HTMLElement>('[data-preview-stage]') ?? null }

function gulirKe(type: string, sisa = 30) {
  const host = scroller.value
  if (!host) return
  const target = host.querySelector<HTMLElement>(`#${sectionDomId(type as never)}`)
  if (!target) return
  if (host.scrollHeight <= host.clientHeight && sisa > 0) {
    const tiket = ++percobaan
    requestAnimationFrame(() => { if (tiket === percobaan) gulirKe(type, sisa - 1) })
    return
  }
  const halus = typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches
  const tujuan = () => stageScrollTop(
    { top: host.getBoundingClientRect().top, scrollTop: host.scrollTop },
    { top: target.getBoundingClientRect().top },
    stageScrollOffset,
    previewScale.value,
  )
  targetGulir = tujuan()
  host.scrollTo({ top: targetGulir, behavior: halus ? 'smooth' : 'instant' })
  const tiket = ++percobaan
  setTimeout(() => {
    if (tiket !== percobaan) return
    const selisih = tujuan() - host.scrollTop
    if (Math.abs(selisih) > 8) host.scrollTo({ top: tujuan(), behavior: 'instant' })
    /*
     * Perjalanan dianggap selesai di sini, dan sorotnya dilaporkan sekali dari keadaan yang
     * SEBENARNYA — bukan dari tujuan yang tadi diminta. Tanpa laporan penutup ini, pasangan yang
     * menggulir sendiri di tengah perjalanan akan berhenti di bagian lain tanpa satu pun kejadian
     * intersection tersisa untuk melaporkannya, dan rail menyorot bagian yang salah sampai ia
     * menggulir lagi.
     */
    targetGulir = null
    gulirTerakhir = host.scrollTop
    const id = bagianDiTengah()
    if (id && id !== terakhir) { terakhir = id; emit('sectionInView', id) }
  }, halus ? 900 : 300)
}

watch(() => props.focusSection, async (fokus) => {
  if (!fokus) return
  percobaan++
  await nextTick()
  bacaScroller()
  gulirKe(fokus.type)
}, { flush: 'post' })

/* ── Panggung → rail (fase 76) ──────────────────────────────────────────────────
 *
 * Arah baliknya `focusSection`, dan resepnya sudah hidup di repo: `Dock.vue` memakai pita
 * setinggi 10% di tengah layar (`rootMargin: '-45% 0px -45% 0px'`) untuk menandai item aktif.
 *
 * **Tidak ada penjaga anti-pantul, dan itu disengaja (fase 77).** Versi pertamanya membungkam
 * pengamat 1,1 detik tiap kali `gulirKe()` berjalan, untuk memutus lingkaran yang ternyata tidak
 * pernah ada: `sorotSection()` di halaman menolak id yang sama dan **tidak** memanggil
 * `fokuskanPanggung()`, jadi sorot balik tidak bisa melahirkan gulir baru. Yang benar-benar
 * dilakukan bungkaman itu adalah menelan gulir sungguhan yang datang di dalam jendelanya — di
 * lebar sempit, membuka tab "Pratinjau" memicu `gulirKe()`, dan gulir pasangan sesudahnya tidak
 * menyorot apa pun. Tiga tes merah di tiga project sempit sekaligus, hijau di desktop.
 */
let pengamat: IntersectionObserver | null = null
/** Bagian yang terakhir dilaporkan — garis dasar pengamat, lihat `pasangPengamat()`. */
let terakhir: string | null = null
/** Posisi gulir saat laporan terakhir. Sorot hanya berpindah kalau angka ini berubah. */
let gulirTerakhir = -1
/**
 * Tujuan gulir yang sedang dituju atas permintaan rail — `null` kalau tidak ada yang berjalan.
 *
 * Selama perjalanan itu scroll-spy diam, dan alasannya bukan kerapian: `selectedId` yang berpindah
 * me-REMOUNT `SectionForm` (ia ber-`:key="selected.id"`), jadi bagian-bagian yang cuma TERLEWATI
 * dalam perjalanan akan menghapus apa yang sedang diketik pasangan di form. Terukur — memilih
 * "Ucapan" di rail lalu langsung mengetik judulnya: judulnya kembali ke nilai lama, karena gulir
 * halus menuju Ucapan sempat melapor "Acara" di tengah jalan.
 */
let targetGulir: number | null = null

/**
 * Bagian yang memuat titik tengah layar — dibaca dari rect, bukan dari `entries`.
 *
 * `entries` cuma dipakai sebagai isyarat "ada yang berubah". Isinya hanya bagian yang MELINTASI
 * pita pada callback itu, dan satu lompatan gulir bisa melintaskan lima sekaligus: memilih dari
 * larik itu berarti memilih dari daftar yang urutannya kebetulan — diukur langsung, lompatan ke
 * "Ucapan" menyorot "Hadiah". Titik tengah hanya bisa berada di dalam satu bagian, jadi jawabannya
 * tunggal berapa pun banyaknya yang melintas.
 */
function bagianDiTengah(): string | null {
  const host = scroller.value
  /*
   * Panggung yang tidak sedang dirender tidak punya pendapat.
   *
   * Di bawah `xl`, membuka tab "Pengaturan" memberi panggung `display: none` — dan elemen
   * `display: none` menjawab SEMUA rect-nya nol. Tanpa penjaga ini, tiap rect jadi `top === bottom
   * === 0`, titik tengahnya 0, dan setiap bagian "memuat" titik itu: yang pertama dalam urutan DOM
   * menang, jadi pengamat melapor "Hero" tiap kali pasangan berpindah ke tab Pengaturan — menimpa
   * bagian yang baru saja ia pilih. Ditemukan lewat tiga tes merah yang hanya merah di project
   * sempit, dan sempat dua kali salah didiagnosis sebagai soal waktu.
   */
  if (!host || !host.clientHeight) return null
  /*
   * Titik tengah layar, dan satuannya harus disamakan dulu.
   *
   * `getBoundingClientRect()` menjawab piksel layar (sudah diperkecil) sedangkan `clientHeight`
   * hidup di koordinat render 390px. Menjumlahkan keduanya mentah-mentah membuat titik "tengah"
   * jatuh jauh di bawah layar: pada skala 0,497 melesetnya 212px — cukup untuk mendarat di bagian
   * berikutnya. Di desktop skalanya 0,79 sehingga melesetnya 89px dan jawabannya kebetulan masih
   * benar; itulah kenapa cacat ini hijau di satu project dan merah di tiga lainnya.
   */
  const kotak = host.getBoundingClientRect()
  const skala = kotak.width / host.offsetWidth || 1
  const tengah = kotak.top + (host.clientHeight * skala) / 2
  let terdekat: { id: string, jarak: number } | null = null
  // Gerbang amplop ikut dihitung: ia punya `id="iv-opening-envelope"` dan sejak fase 76 ia
  // memang satu layar di puncak aliran, jadi rail berhak menyorotnya seperti bagian mana pun.
  for (const el of host.querySelectorAll<HTMLElement>('[data-iv-section], .iv-gate[id]')) {
    if (!el.id.startsWith('iv-')) continue
    const kotak = el.getBoundingClientRect()
    // Yang memuat titik tengah menang mutlak; sisanya diadu jarak tepi, untuk celah antar bagian.
    const jarak = kotak.top <= tengah && kotak.bottom >= tengah
      ? 0
      : Math.min(Math.abs(kotak.top - tengah), Math.abs(kotak.bottom - tengah))
    if (!terdekat || jarak < terdekat.jarak) terdekat = { id: el.id, jarak }
  }
  return terdekat ? terdekat.id.slice(3) : null
}

function pasangPengamat() {
  pengamat?.disconnect()
  pengamat = null
  const host = scroller.value
  if (!host || typeof IntersectionObserver === 'undefined') return
  /*
   * `observe()` selalu mengirim satu callback pembuka berisi keadaan saat itu, dan callback itu
   * bukan gulir siapa pun. Tanpa ditahan, membuka amplop — yang memasang ulang pengamat —
   * langsung memindahkan sorot: pasangan yang sedang menyunting kata-kata amplop lalu menekan
   * amplopnya untuk melihat hasilnya akan kehilangan formulir yang sedang ia isi.
   *
   * **Garis dasar, bukan bendera, dan bukan jendela waktu.** Dua percobaan sebelumnya gagal
   * dengan cara yang sama: membungkam 250ms/1,1s ikut menelan gulir sungguhan yang datang di
   * dalam jendelanya, dan melewati "callback pertama" ikut menelannya juga — kalau gulir mendahului
   * pengiriman, callback pertama itu SUDAH memuat keadaan sesudah gulir. Keduanya merah di tiga
   * project sempit sekaligus dan hijau di desktop, karena di sana tab "Pratinjau" tidak pernah
   * diklik sehingga urutannya berbeda.
   *
   * Yang tidak bisa salah: catat bagian di tengah **pada saat memasang**, lalu diam selama
   * jawabannya belum berubah. Callback pembuka yang datang sebelum gulir menjawab sama → diam;
   * yang datang sesudah gulir menjawab beda → bicara.
   */
  terakhir = bagianDiTengah()
  gulirTerakhir = host.scrollTop
  pengamat = new IntersectionObserver(() => {
    const layar = scroller.value
    if (!layar) return
    /*
     * **Hanya gulir pasangan yang boleh memindahkan sorot.**
     *
     * `IntersectionObserver` juga menyala karena hal-hal yang bukan gulir: panggung yang berganti
     * dari tersembunyi jadi terlihat, jendela yang berubah ukuran, atau halaman di luar bingkai
     * yang tergeser. Tanpa penjaga ini, sekadar MENAMPILKAN pratinjau memindahkan bagian yang
     * sedang disunting — terukur: membuka pratinjau saat sedang menyunting "Ucapan" melompat ke
     * "Acara", panel gaya teksnya menutup, dan form yang sedang diisi pasangan berganti isi.
     *
     * `scrollTop` menjawab pertanyaan yang benar: kalau ia tidak bergerak, tidak ada yang digulir.
     */
    if (layar.scrollTop === gulirTerakhir) return
    gulirTerakhir = layar.scrollTop
    // Masih dalam perjalanan menuju bagian yang diminta rail: yang terlewati bukan yang dipilih.
    if (targetGulir !== null && Math.abs(layar.scrollTop - targetGulir) > 4) return
    targetGulir = null
    const id = bagianDiTengah()
    if (!id || id === terakhir) return
    terakhir = id
    emit('sectionInView', id)
  }, { root: host, rootMargin: '-45% 0px -45% 0px', threshold: 0 })
  host.querySelectorAll<HTMLElement>('[data-iv-section], .iv-gate[id]').forEach(el => pengamat!.observe(el))
}

async function segarkanPanggung() {
  await nextTick()
  bacaScroller()
  pasangPengamat()
}

onMounted(segarkanPanggung)
onBeforeUnmount(() => { pengamat?.disconnect(); pengamat = null })

/** Bagian bisa muncul, hilang, atau bertukar urutan — daftar yang diamati ikut ditulis ulang. */
const kunciBagian = computed(() => props.document.sections.map(section => `${section.type}:${section.enabled ? 1 : 0}`).join('|'))
watch([ulang, kunciBagian, device], segarkanPanggung, { flush: 'post' })
watch(terkunci, (kunci) => { if (!kunci) segarkanPanggung() })

/* ── Klik ornamen di kanvas (fase 76) ───────────────────────────────────────── */
function onKlikKanvas(event: MouseEvent) {
  const awal = event.target as Element | null
  const keping = awal?.closest<HTMLElement>('[data-iv-slot],[data-layer-slot]')
  if (!keping) return
  /*
   * Kontrol menang atas ornamen. Segel amplop ADALAH tombolnya dan isinya glyph slot `seal`;
   * tanpa baris ini, satu-satunya cara membuka amplop malah membuka pemilih ornamen.
   */
  if (keping.closest('button, a, [role="button"]')) return
  const layer = keping.dataset.layerSlot
  if (layer && (layerSlots as readonly string[]).includes(layer)) { emit('pilihSlot', { layer: layer as LayerSlot }); return }
  const slot = keping.dataset.ivSlot
  if (slot && (ornamentSlots as readonly string[]).includes(slot)) emit('pilihSlot', { slot: slot as OrnamentSlotKey })
}

const aktif = computed(() => previewDevices.find(d => d.id === device.value) ?? previewDevices[0])
const previewWidth = computed(() => aktif.value.width)
const previewHeight = computed(() => aktif.value.height)

const previewScale = ref(1)
const previewScalePct = computed(() => Math.round(previewScale.value * 100))
/** Lebar wadah yang ditawarkan ke bingkai: lebar viewport × zoom. Bingkai yang menghitung skala pasnya. */
const zoomFactor = computed(() => Math.min(zoomMax, Math.max(zoomMin, zoom.value)) / 100)

/*
 * Tinggi yang boleh dipakai ponsel sesudah diperkecil.
 *
 * Sebelum fase 76 angka ini tidak pernah ada: `PhoneFrame` menghitung skala hanya dari lebar,
 * jadi di laptop bezel 390×844 berdiri melewati tepi bawah panggung dan pemilik melihat ponsel
 * raksasa yang terpotong. `useElementSize` menjawab content-box, jadi `pt-28`/`pb-12` viewport
 * sudah dikurangkan; 24px sisanya napas supaya layarnya tidak menempel tepi ke tepi.
 *
 * Lantai 420px bukan angka pengaman kosong: di jendela yang sangat pendek, "muat seluruhnya"
 * berarti memperkecil ponsel sampai hurufnya tidak lagi terbaca — dan pratinjau yang tidak
 * terbaca lebih buruk daripada bingkai yang menjulur. Di bawah lantai itu bingkainya memang
 * melewati tepi panggung, dan viewport luar yang menggulungnya; isi undangannya tetap bisa
 * digulir sendiri karena `overscroll-behavior: contain` memisahkan keduanya.
 */
const { height: tinggiViewport } = useElementSize(viewport)
const tinggiTersedia = computed(() => (
  tinggiViewport.value ? Math.max(420, Math.round(tinggiViewport.value - 24)) : undefined
))

function ubahZoom(delta: number) {
  zoom.value = Math.min(zoomMax, Math.max(zoomMin, zoom.value + delta))
}
</script>

<template>
  <section
    class="relative flex min-h-0 min-w-0 flex-col bg-surface [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] lg:overflow-hidden"
    aria-label="Pratinjau draft"
  >
    <div class="pointer-events-none absolute inset-x-0 top-3 z-[var(--z-raised)] flex flex-wrap justify-center gap-2 px-4">
      <div class="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-lift" role="group" aria-label="Zoom pratinjau">
        <button id="editor-preview-reload" type="button" class="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label="Refresh preview" @click="muatUlang">
          <RotateCw :size="15" aria-hidden="true" />
        </button>
        <span class="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
        <span class="px-1 text-ui-label font-bold uppercase tracking-[0.12em] text-ink-muted-subtle">Zoom</span>
        <button id="editor-zoom-out" type="button" class="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink disabled:opacity-40" aria-label="Perkecil Kanvas" :disabled="zoom <= zoomMin" @click="ubahZoom(-zoomStep)">
          <ZoomOut :size="15" aria-hidden="true" />
        </button>
        <button id="editor-zoom-reset" type="button" class="min-w-[3.25rem] rounded-full px-1 text-ui font-semibold tabular-nums text-ink hover:bg-surface-3" aria-label="Reset zoom ke 100%" @click="zoom = zoomMax">
          {{ zoom }}%
        </button>
        <button id="editor-zoom-in" type="button" class="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink disabled:opacity-40" aria-label="Perbesar Kanvas" :disabled="zoom >= zoomMax" @click="ubahZoom(zoomStep)">
          <ZoomIn :size="15" aria-hidden="true" />
        </button>
      </div>

      <div class="pointer-events-auto flex gap-1 rounded-full border border-border bg-surface p-1 shadow-lift" role="group" aria-label="Lebar pratinjau">
        <button
          v-for="option in previewDevices"
          :id="`editor-preview-${option.id}`"
          :key="option.id"
          type="button"
          :aria-pressed="device === option.id"
          :aria-label="option.aria"
          :class="cn(
            'flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-caption font-semibold transition-colors duration-200',
            device === option.id ? 'bg-success text-ink-inverse' : 'text-ink-muted hover:bg-surface-3 hover:text-ink',
          )"
          @click="device = option.id"
        >
          <component :is="option.icon" :size="15" aria-hidden="true" />
          {{ option.label }}
        </button>
      </div>
    </div>

    <p class="pointer-events-none absolute bottom-3 left-1/2 z-[var(--z-raised)] m-0 -translate-x-1/2 rounded-full bg-surface/85 px-3 py-1 text-caption text-ink-muted backdrop-blur">
      <span>Selebar {{ previewWidth }}px</span>
      <span v-if="previewScalePct < 100" class="tabular-nums"> · diperkecil {{ previewScalePct }}%</span>
    </p>

    <div
      ref="viewport"
      class="max-h-[36rem] min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-12 pt-28 [scrollbar-gutter:stable] sm:px-6 lg:max-h-none"
      @click="onKlikKanvas"
    >
      <div class="mx-auto" :style="{ width: `${Math.round(zoomFactor * 100)}%` }">
        <!-- Layar polos bersudut membulat: pengganti bezel, dan satu-satunya hiasan yang tersisa. -->
        <div class="mx-auto w-fit overflow-hidden rounded-[1.75rem] bg-surface shadow-float ring-1 ring-border">
          <InvitationPhoneFrame
            v-model:scale="previewScale"
            scrollable
            :width="previewWidth"
            :screen-height="previewHeight"
            :max-height="tinggiTersedia"
          >
            <InvitationRenderer :key="ulang" :document="props.document" mode="stage" @gate-lock="value => terkunci = value" />
          </InvitationPhoneFrame>
        </div>
      </div>
    </div>
  </section>
</template>
