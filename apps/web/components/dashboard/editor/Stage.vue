<script setup lang="ts">
import { MailOpen, Maximize2, Minimize2, Monitor, Pause, Play, RotateCw, Smartphone, Tablet, ZoomIn, ZoomOut } from 'lucide-vue-next'
import type { InvitationDocument } from '~/types/aruna'
import { zoomMax, zoomMin, zoomStep, type PreviewDevice } from '~/composables/useEditorPrefs'
import { sectionDomId, stageScrollOffset, stageScrollTop } from '~/utils/editor-sections'
import type { AksiKanvas, InfoKeping } from '~/utils/kanvas'

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
 * berbohong soal ukuran huruf. Zoom 50–200 % (fase 81) dihitung dari "pas": di atas 100 % bingkai
 * boleh melebar melewati panggung dan digeser, sampai ukuran aslinya.
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
  /** Navigasi, rail, dan inspektor sedang dilipat oleh tombol Fokus (fase 81). */
  fokus?: boolean
  /** Nonce ▶ gerak dari form (fase 81), diteruskan ke renderer. */
  putar?: number
  /** Bagian yang terbuka di form: daftar Lapisannya dipancarkan kanvas (fase 81). */
  bagianAktif?: string | null
  /** Add-on desain aktif: tanpa itu kanvas hanya memilih, tidak mengatur tata letak. */
  bisaDesain?: boolean
}>()
const emit = defineEmits<{
  /** Bagian yang sedang berdiri di tengah layar (fase 76), supaya rail ikut menyorot. */
  sectionInView: [type: string]
  /* Kanvas bebas (fase 81) — diteruskan apa adanya ke `editor.vue`, yang menulis dokumen. */
  ubah: [target: InfoKeping, patch: Record<string, unknown>, catat: boolean]
  ukurTeks: [target: InfoKeping, fontSize: number, catat: boolean]
  teks: [target: InfoKeping, nilai: string]
  aksi: [nama: AksiKanvas, target: InfoKeping]
  daftar: [InfoKeping[]]
  /** Minta pemilik halaman melipat/membuka semua panel di sekitar panggung (fase 81). */
  fokus: []
}>()
const device = defineModel<PreviewDevice>('device', { default: 'ponsel' })
const zoom = defineModel<number>('zoom', { default: 100 })
/**
 * Gerak panggung dimatikan (fase 78).
 *
 * Diteruskan ke `Renderer` sebagai prop biasa, **tidak** ikut `:key`: mematikan gerak tidak boleh
 * me-remount pratinjau, karena remount menutup ulang amplop dan melempar posisi gulir pasangan ke
 * puncak. `useArunaMotion` mengurusnya dengan `ctx.revert()`, yang menulis balik gaya inline gsap
 * dan menyisakan markup keadaan-akhir yang memang sudah terbaca tanpa JS.
 */
const statis = defineModel<boolean>('statis', { default: false })
/** Keping kanvas yang sedang dipilih (fase 81). */
const terpilih = defineModel<InfoKeping | null>('terpilih', { default: null })

const viewport = ref<HTMLElement | null>(null)
let percobaan = 0

/**
 * Gerbang amplop masih tertutup.
 *
 * **Tidak lagi mengunci gulir** (fase 76): gerbang ikut aliran setinggi satu layar, jadi tidak
 * ada yang perlu dikunci. Sesudah fase 77 ia juga tidak lagi PERGI saat dibuka — ia bagian pertama
 * undangan dan tetap berdiri, tersegel ulang, supaya bisa dikunjungi lagi dari puncak. Yang
 * tersisa dari sinyal ini satu: memasang ulang garis dasar scroll-spy di saat gerbangnya dibuka,
 * supaya sorot rail tidak berpindah sendiri dan menghapus form yang sedang diisi pasangan.
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
    jagaPendaratan(tiket, tujuan)
  }, halus ? 900 : 300)
}

/**
 * Pendaratan dijaga sebentar sesudah koreksi (fase 80).
 *
 * Koreksi di atas hanya sekali. Di bawah beban — suite e2e penuh, atau ponsel lambat — font dan
 * gambar di atas bagian tujuan masih tiba sesudahnya, dan bagian itu bergeser tanpa satu pun
 * yang membetulkannya: `dashboard.spec.ts:754` mencatat 38,3px dan tidak pernah pulih selama
 * lima detik polling. Jadi pendaratan diperiksa tiga kali lagi dalam 2,4 detik — dan dilepas
 * begitu pasangan menggulir sendiri (`scrollTop` berubah bukan oleh kita), karena menarik balik
 * gulir orang adalah cacat yang lebih buruk daripada meleset 30px.
 */
function jagaPendaratan(tiket: number, tujuan: () => number) {
  const host = scroller.value
  if (!host) return
  /*
   * Posisi yang KITA tulis, dicatat sendiri. Bukan `gulirTerakhir`: pengamat gulir ikut
   * menulisnya tiap kali pasangan menggulir, jadi membandingkan dengannya membuat gulir pasangan
   * terbaca sebagai "belum ada yang menyentuh" — dan panggungnya ditarik balik ke tujuan lama.
   */
  let pendaratan = host.scrollTop
  /*
   * Satu langkah ekor animasi gulir halus bisa jatuh SESUDAH koreksi instan: terukur di fase 81,
   * koreksi menulis 6034, frame berikutnya animasi yang belum berhenti menambah langkah terakhirnya
   * (+18) dan layar mendarat di 6052. Dua frame kemudian titik pendaratannya dibaca ulang dan,
   * bila masih meleset, ditulis sekali lagi — baru sesudah itu penjaga di bawah memakainya.
   */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (tiket !== percobaan) return
    if (Math.abs(tujuan() - host.scrollTop) > 8) host.scrollTo({ top: tujuan(), behavior: 'instant' })
    pendaratan = host.scrollTop
    gulirTerakhir = host.scrollTop
  }))
  for (const jeda of [500, 1200, 2400]) {
    setTimeout(() => {
      if (tiket !== percobaan || Math.abs(host.scrollTop - pendaratan) > 1) return
      if (Math.abs(tujuan() - host.scrollTop) <= 8) return
      host.scrollTo({ top: tujuan(), behavior: 'instant' })
      pendaratan = host.scrollTop
      gulirTerakhir = host.scrollTop
    }, jeda)
  }
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

/**
 * Amplop selesai dibuka: panggung melompat ke bagian pertama di bawah gerbang.
 *
 * Sampai fase 77 tidak ada yang perlu melompat — gerbangnya melepas diri dari DOM dan isi di
 * bawahnya naik mengisi tempatnya. Itu juga yang membuat amplop jadi satu-satunya bagian yang
 * tidak bisa dikunjungi dua kali. Sekarang gerbangnya tetap berdiri, jadi pengungkapannya
 * dilakukan dengan gulir.
 *
 * **Sengaja bukan `gulirKe()`, dan itu diukur.** Perjalanan `gulirKe` punya ekor 300–900ms yang
 * mengoreksi pendaratan lalu melaporkan sorotnya. Untuk lompatan ini ekor itu tidak punya
 * pekerjaan (lompatnya instan, tidak ada yang perlu dikoreksi) tapi tetap punya akibat: gulir
 * pasangan yang datang di dalam jendela itu akan **ditarik balik** ke Hero oleh koreksi, dan
 * laporannya ditelan. Terukur lewat tes "gulir panggung menyorot bagiannya di rail" — panggung
 * digulir ke Ucapan tepat sesudah amplop dibuka, dan rail diam.
 *
 * Jadi: lompat, tulis ulang garis dasar scroll-spy di tempat, selesai. Tanpa laporan sorot,
 * karena yang membuka amplop biasanya sedang menyunting kata-kata amplop itu — memindahkan
 * sorot ke Hero akan me-remount form yang sedang ia isi.
 */
function ungkap() {
  bacaScroller()
  const host = scroller.value
  if (!host) return
  const pertama = host.querySelector<HTMLElement>('[data-iv-section][id^="iv-"]')
  if (!pertama) return

  // Batalkan ekor perjalanan gulir mana pun yang masih menunggu; ini yang paling akhir diminta.
  percobaan++
  targetGulir = null
  host.scrollTo({
    top: stageScrollTop(
      { top: host.getBoundingClientRect().top, scrollTop: host.scrollTop },
      { top: pertama.getBoundingClientRect().top },
      stageScrollOffset,
      previewScale.value,
    ),
    behavior: 'instant',
  })
  gulirTerakhir = host.scrollTop
  terakhir = bagianDiTengah()
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

/**
 * Gestur gulir pasangan membatalkan perjalanan yang sedang berjalan (fase 80).
 *
 * Ekor koreksi `gulirKe` (300–900ms) dan penjaga pendaratan sama-sama menulis `scrollTop`. Tanpa
 * pembatalan ini, pasangan yang menekan bagian di rail lalu langsung memutar roda tetikus ditarik
 * balik ke bagian itu — terukur di `fase80.spec.ts`: 9875 → 8653px, 400ms sesudah gulirnya.
 * Hanya gestur, bukan event `scroll`: gulir halus milik kita sendiri juga memancarkan `scroll`.
 */
function batalkanPerjalanan() {
  percobaan++
  targetGulir = null
}

/*
 * Buka amplop dari toolbar (fase 81). Di panggung klik amplop MEMILIH segel/flap/kantong, jadi
 * pembukanya dua: callout berikon di bawah amplop, dan tombol ini — yang sekadar menekan callout
 * itu, supaya hanya ada satu jalur membuka yang harus benar.
 */
function bukaAmplop() {
  viewport.value?.querySelector<HTMLButtonElement>('[data-gate-callout]')?.click()
}

const aktif = computed(() => previewDevices.find(d => d.id === device.value) ?? previewDevices[0])
const previewWidth = computed(() => aktif.value.width)
const previewHeight = computed(() => aktif.value.height)

const previewScale = ref(1)
const previewScalePct = computed(() => Math.round(previewScale.value * 100))
/** Pengali zoom di atas skala pas (fase 81: 50–200 %, 100 % = pas). Bingkai yang menghitung skalanya. */
const zoomFactor = computed(() => Math.min(zoomMax, Math.max(zoomMin, zoom.value)) / 100)
/*
 * Lebar yang tersedia untuk bingkai, diukur dari VIEWPORT panggung dan dioper sebagai angka.
 *
 * Fase 76–80 membiarkan bingkai membaca induknya sendiri — pembungkus `w-fit` yang lebarnya justru
 * hasil bingkai itu. Akibatnya skala pas tidak pernah tumbuh: sesudah Ponsel, Tablet tersangkut di
 * 0,43 dan Desktop di 0,26 pada jendela yang sama, dan ZOOM tidak mengubah apa pun.
 */
/*
 * Diukur dengan `ResizeObserver` milik sendiri yang mengikuti ref-nya, bukan `useElementSize`.
 * Sejak fase 81 viewport ini dirender lewat slot `ContextMenuTrigger as-child` milik kanvas, dan
 * `useElementSize` tertinggal mengamati elemen yang sudah diganti: lebarnya terbaca 0, bingkai
 * kembali mengukur induknya sendiri, dan Desktop dirender 1:1 selebar 1280px di kolom 528px.
 */
const lebarViewport = ref(0)
const tinggiViewport = ref(0)
let pengukur: ResizeObserver | null = null
function ukurViewport(el: HTMLElement) {
  const gaya = getComputedStyle(el)
  /*
   * Tidak pernah negatif. Di bawah `xl` panggung tersembunyi selama tab Pengaturan terbuka, dan
   * `clientWidth` 0 dikurangi padding sempat melahirkan skala negatif dan tinggi palsu tepat saat
   * rail memerintahkan gulir — pendaratannya meleset 25px (e2e "studio editor", mobile & tablet).
   * 0 berarti "belum terukur", sama seperti jawaban `useElementSize` untuk elemen tersembunyi.
   */
  lebarViewport.value = Math.max(0, el.clientWidth - Number.parseFloat(gaya.paddingLeft) - Number.parseFloat(gaya.paddingRight))
  tinggiViewport.value = Math.max(0, el.clientHeight - Number.parseFloat(gaya.paddingTop) - Number.parseFloat(gaya.paddingBottom))
}
watch(viewport, (el) => {
  pengukur?.disconnect()
  if (!el || typeof ResizeObserver === 'undefined') return
  ukurViewport(el)
  pengukur = new ResizeObserver(() => ukurViewport(el))
  pengukur.observe(el)
}, { immediate: true, flush: 'post' })
onBeforeUnmount(() => pengukur?.disconnect())
/** Ponsel harus terlihat utuh; tablet dan desktop pas lebar lalu mengisi tinggi panggung. */
const caraMuat = computed(() => (device.value === 'ponsel' ? 'utuh' : 'lebar'))

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
        <!--
          Fase 81: dua aksi panggung sebagai ikon bertooltip, di pil yang sudah ada — sebagai pil
          sendiri keduanya mendorong toolbar ke baris ketiga di kolom panggung 528px (1440×900).
        -->
        <UiTooltip content="Buka amplop" side="bottom">
          <button id="editor-preview-buka-amplop" type="button" class="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label="Buka amplop di pratinjau" @click="bukaAmplop">
            <MailOpen :size="15" aria-hidden="true" />
          </button>
        </UiTooltip>
        <UiTooltip :content="fokus ? 'Keluar dari fokus' : 'Fokus pratinjau: lipat semua panel'" side="bottom">
          <button
            id="editor-preview-fokus"
            type="button"
            :aria-pressed="Boolean(fokus)"
            :aria-label="fokus ? 'Keluar dari fokus pratinjau; buka lagi panel' : 'Fokus pratinjau; lipat navigasi, daftar bagian, dan pengaturan'"
            :class="cn('hidden h-10 w-10 place-items-center rounded-full lg:grid', fokus ? 'bg-success text-ink-inverse' : 'text-ink-muted hover:bg-surface-3 hover:text-ink')"
            @click="emit('fokus')"
          >
            <component :is="fokus ? Minimize2 : Maximize2" :size="15" aria-hidden="true" />
          </button>
        </UiTooltip>
        <span class="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
        <span class="px-1 text-ui-label font-bold uppercase tracking-[0.12em] text-ink-muted-subtle">Zoom</span>
        <button id="editor-zoom-out" type="button" class="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink disabled:opacity-40" aria-label="Perkecil Kanvas" :disabled="zoom <= zoomMin" @click="ubahZoom(-zoomStep)">
          <ZoomOut :size="15" aria-hidden="true" />
        </button>
        <button id="editor-zoom-reset" type="button" class="min-w-[3.25rem] rounded-full px-1 text-ui font-semibold tabular-nums text-ink hover:bg-surface-3" aria-label="Reset zoom ke 100% (pas)" @click="zoom = 100">
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

      <!--
        Gerak: Dinamis ↔ Statis.

        Satu tombol dua keadaan, bukan dua tombol bergantian, karena yang ditanyakan memang satu
        hal — jadi `aria-pressed` bisa menjawabnya jujur dan pembaca layar tidak perlu menebak
        mana yang sedang aktif di antara dua pil kembar.
      -->
      <div class="pointer-events-auto flex gap-1 rounded-full border border-border bg-surface p-1 shadow-lift">
        <button
          id="editor-preview-gerak"
          type="button"
          :aria-pressed="!statis"
          :aria-label="statis ? 'Gerak mati; nyalakan gerak pratinjau' : 'Gerak hidup; matikan gerak pratinjau'"
          :class="cn(
            'flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-caption font-semibold transition-colors duration-200',
            statis ? 'text-ink-muted hover:bg-surface-3 hover:text-ink' : 'bg-success text-ink-inverse',
          )"
          @click="statis = !statis"
        >
          <component :is="statis ? Pause : Play" :size="15" aria-hidden="true" />
          {{ statis ? 'Statis' : 'Dinamis' }}
        </button>
      </div>
    </div>

    <p class="pointer-events-none absolute bottom-3 left-1/2 z-[var(--z-raised)] m-0 -translate-x-1/2 rounded-full bg-surface/85 px-3 py-1 text-caption text-ink-muted backdrop-blur">
      <span>Selebar {{ previewWidth }}px</span>
      <span v-if="previewScalePct < 100" class="tabular-nums"> · diperkecil {{ previewScalePct }}%</span>
    </p>

    <DashboardEditorKanvas
      v-model:terpilih="terpilih"
      :viewport="viewport"
      :skala="previewScale"
      :document="props.document"
      :bagian-aktif="props.bagianAktif"
      :bisa-desain="props.bisaDesain ?? true"
      @ubah="(target, patch, catat) => emit('ubah', target, patch, catat)"
      @ukur-teks="(target, ukuran, catat) => emit('ukurTeks', target, ukuran, catat)"
      @teks="(target, nilai) => emit('teks', target, nilai)"
      @aksi="(nama, target) => emit('aksi', nama, target)"
      @daftar="daftar => emit('daftar', daftar)"
    >
    <div
      ref="viewport"
      class="max-h-[36rem] min-h-0 flex-1 overflow-y-auto overflow-x-auto px-4 pb-12 pt-28 [scrollbar-gutter:stable] sm:px-6 lg:max-h-none"
      @wheel.passive="batalkanPerjalanan"
      @touchstart.passive="batalkanPerjalanan"
      @keydown="batalkanPerjalanan"
    >
      <div class="mx-auto w-fit">
        <!-- Layar polos bersudut membulat: pengganti bezel, dan satu-satunya hiasan yang tersisa. -->
        <div class="mx-auto w-fit overflow-hidden rounded-[1.75rem] bg-surface shadow-float ring-1 ring-border">
          <InvitationPhoneFrame
            v-model:scale="previewScale"
            scrollable
            :width="previewWidth"
            :screen-height="previewHeight"
            :max-height="tinggiTersedia"
            :host-width="lebarViewport || undefined"
            :muat="caraMuat"
            :zoom="zoomFactor"
          >
            <InvitationRenderer
              :key="ulang"
              :document="props.document"
              mode="stage"
              :statis="statis"
              :putar="props.putar ?? 0"
              @gate-lock="value => terkunci = value"
              @gate-reveal="ungkap"
            />
          </InvitationPhoneFrame>
        </div>
      </div>
    </div>
    </DashboardEditorKanvas>
  </section>
</template>
