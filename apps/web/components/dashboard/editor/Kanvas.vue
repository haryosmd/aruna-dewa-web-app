<script setup lang="ts">
import { ContextMenuContent, ContextMenuItem, ContextMenuPortal, ContextMenuRoot, ContextMenuSeparator, ContextMenuTrigger } from 'reka-ui'
import { Lock, RotateCw } from 'lucide-vue-next'
import { sectionFields, type V2SectionType } from '@aruna/contracts'
import type { InvitationDocument } from '~/types/aruna'
import {
  angka, arahDasar, batasi, bacaKanvas, hitungTempel, kunciSumbu, labelKeping, layarKeCqw, normalSudut, semuaPegangan, sudutPutar, tempelUkuran, ubahUkuran,
  type AksiKanvas, type GarisPanduan, type InfoKeping, type JarakPanduan, type Kotak, type KotakAabb, type Pegangan,
} from '~/utils/kanvas'

/**
 * Kanvas bebas di panggung editor (fase 81): hover, pilih, seret, ubah ukuran 8 arah (Shift
 * mengunci rasio), putar (Shift = kelipatan 15°), sunting teks di tempat (klik dua kali), menu klik
 * kanan, dan pintasan keyboard.
 *
 * **Digambar di LUAR bingkai yang diperkecil.** Garis dan pegangan hidup di lapisan ini, bukan di
 * dalam undangan: ukurannya px layar, jadi pegangan tetap 10px pada pratinjau 26 % maupun 100 %, dan
 * undangan yang dilihat tamu tidak pernah membawa satu pun elemen editor. Posisinya dibaca dari
 * `getBoundingClientRect()` keping yang ditunjuk, tiap frame selama ada yang disorot.
 *
 * **Yang ditulis hanya maksud, bukan dokumen.** Komponen ini memancarkan `ubah`/`teks`/`aksi`;
 * `editor.vue` yang menulis dokumen dan riwayat. Satu seretan = satu langkah undo: `catat` hanya
 * `true` pada gerakan pertama.
 *
 * **Terkunci = tidak bisa disunting di panggung sama sekali** (keputusan pemilik): tidak diseret,
 * tidak diukur, tidak diputar, teksnya tidak disunting, ornamennya tidak diganti. Keping itu tetap
 * bisa dipilih — supaya form-nya terbuka — dan geraknya tetap jalan.
 */
const props = defineProps<{
  viewport: HTMLElement | null
  skala: number
  document: InvitationDocument
  /** Bagian yang sedang terbuka di form — daftar Lapisannya dipancarkan lewat `daftar`. */
  bagianAktif?: string | null
  bisaDesain: boolean
}>()

const terpilih = defineModel<InfoKeping | null>('terpilih', { default: null })

const emit = defineEmits<{
  ubah: [target: InfoKeping, patch: Record<string, unknown>, catat: boolean]
  ukurTeks: [target: InfoKeping, fontSize: number, catat: boolean]
  teks: [target: InfoKeping, nilai: string]
  aksi: [nama: AksiKanvas, target: InfoKeping]
  daftar: [InfoKeping[]]
}>()

const lapisan = ref<HTMLElement | null>(null)
const hover = ref<InfoKeping | null>(null)
const pesan = ref('')
let pesanTimer = 0
function beriTahu(teks: string) {
  pesan.value = teks
  window.clearTimeout(pesanTimer)
  pesanTimer = window.setTimeout(() => { pesan.value = '' }, 2200)
}

/* ── Membaca DOM ─────────────────────────────────────────────────────────── */

const elemenKeping = (info: Pick<InfoKeping, 'bagianId' | 'kunci'> | null) => (info && props.viewport
  ? props.viewport.querySelector<HTMLElement>(`[data-iv-el="${CSS.escape(info.kunci)}"][data-iv-bagian="${CSS.escape(info.bagianId)}"]`)
  : null)

function labelKolom(bagianId: string) {
  const type = props.document.sections.find(section => section.id === bagianId)?.type as V2SectionType | undefined
  const fields = type ? sectionFields[type] ?? [] : []
  return (kolom: string) => fields.find(field => field.key === kolom)?.label
}

function infoDari(el: HTMLElement): InfoKeping | null {
  const kunci = el.dataset.ivEl
  const bagianId = el.dataset.ivBagian
  if (!kunci || !bagianId) return null
  return {
    bagianId,
    kunci,
    label: labelKeping(kunci, labelKolom(bagianId)),
    jenis: kunci.startsWith('t:') ? 'teks' : kunci.startsWith('a:') ? 'tambahan' : 'ornamen',
    glyph: el.dataset.ivGlyph,
    terkunci: el.hasAttribute('data-iv-terkunci'),
    tersembunyi: el.hasAttribute('data-iv-tersembunyi'),
    dasar: arahDasar(getComputedStyle(el).transform),
  }
}

function kepingDari(target: EventTarget | null): HTMLElement | null {
  const el = (target as Element | null)?.closest?.<HTMLElement>('[data-iv-el]')
  return el && props.viewport?.contains(el) && el.dataset.ivBagian ? el : null
}

/** Nilai kanvas yang sedang tersimpan untuk keping ini — titik awal seretan. */
function nilaiKeping(info: InfoKeping): Record<string, number | boolean | undefined> {
  const section = props.document.sections.find(item => item.id === info.bagianId)
  const kanvas = bacaKanvas(section?.data)
  if (info.jenis === 'tambahan') return { ...(kanvas.tambahan.find(item => `a:${item.id}` === info.kunci) ?? {}) } as never
  return { ...(kanvas.keping[info.kunci] ?? {}) } as never
}

/**
 * Terkunci dibaca dari DOKUMEN, bukan dari atribut saat keping diklik: mengunci lewat menu atau
 * panel tidak mengganti objek pilihan, dan kotak yang masih menampilkan pegangan akan menjanjikan
 * suntingan yang ditolak.
 */
const terkunciKini = (info: InfoKeping | null) => Boolean(info && nilaiKeping(info).terkunci)
const pilihanTerkunci = computed(() => terkunciKini(terpilih.value))

/** Lebar acuan `cqw` keping ini, dalam px render. */
function lebarAcuan(el: HTMLElement): number {
  const wadah = el.closest<HTMLElement>('.iv-kanvas-lapisan') ?? el.closest<HTMLElement>('.iv-column')
  return wadah?.clientWidth ?? 390
}

/**
 * Kotak keping di layar SEBELUM diputar: pusat dari `getBoundingClientRect` (pusat tidak berubah
 * oleh putaran), ukuran dari kotak tata letak × skala pratinjau × skala kanvasnya sendiri.
 */
function kotakLayar(el: HTMLElement, info: InfoKeping): Kotak & { putar: number } {
  const r = el.getBoundingClientRect()
  const nilai = nilaiKeping(info)
  let w = el.offsetWidth * props.skala
  let h = el.offsetHeight * props.skala
  if (info.jenis === 'ornamen') {
    w *= Math.abs(Number(nilai.skala ?? 1))
    h *= Math.abs(Number(nilai.skalaY ?? nilai.skala ?? 1))
  }
  else if (info.jenis === 'tambahan') {
    h *= Math.abs(Number(nilai.rasio ?? 1))
  }
  if (!w || !h) { w = r.width; h = r.height }
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w, h, putar: Number(nilai.putar ?? 0) }
}

/* ── Posisi kotak di lapisan ─────────────────────────────────────────────── */

const detak = ref(0)
let raf = 0
function jalankan() {
  cancelAnimationFrame(raf)
  const langkah = () => {
    detak.value++
    if (hover.value || terpilih.value) raf = requestAnimationFrame(langkah)
  }
  raf = requestAnimationFrame(langkah)
}
watch([hover, terpilih], jalankan)
/* Viewport yang berubah ukuran (jendela, panel dilipat, Fokus) menghitung ulang potongan saat itu juga. */
let pengamatUkuran: ResizeObserver | null = null
watch(() => props.viewport, (el) => {
  pengamatUkuran?.disconnect()
  if (!el || typeof ResizeObserver === 'undefined') return
  pengamatUkuran = new ResizeObserver(() => { detak.value++ })
  pengamatUkuran.observe(el)
}, { immediate: true })
onBeforeUnmount(() => pengamatUkuran?.disconnect())
onBeforeUnmount(() => { cancelAnimationFrame(raf); window.clearTimeout(pesanTimer) })

function kotakDiLapisan(info: InfoKeping | null) {
  void detak.value
  const el = elemenKeping(info)
  const akar = lapisan.value?.getBoundingClientRect()
  if (!el || !akar || !info || !el.getClientRects().length) return null
  const k = kotakLayar(el, info)
  return { left: k.cx - akar.left - k.w / 2, top: k.cy - akar.top - k.h / 2, width: k.w, height: k.h, putar: k.putar }
}
const kotakHover = computed(() => (hover.value && hover.value.kunci !== terpilih.value?.kunci ? kotakDiLapisan(hover.value) : null))
const kotakPilih = computed(() => kotakDiLapisan(terpilih.value))
/**
 * Lapisan dipotong seluas viewport panggung, supaya kotak tidak menimpa toolbar.
 *
 * Tanpa sorotan, lapisannya tidak berukuran sama sekali: angka potongan dihitung ulang hanya selama
 * ada yang disorot, dan potongan basi sesudah jendela mengecil (1440 → 420) sempat mendorong halaman
 * editor melebar — ditangkap e2e "device preview" lintasan keduanya.
 */
const potong = computed(() => {
  void detak.value
  if (!hover.value && !terpilih.value) return { width: '0px', height: '0px' }
  const vp = props.viewport?.getBoundingClientRect()
  const induk = lapisan.value?.parentElement?.getBoundingClientRect()
  if (!vp || !induk) return {}
  return { left: `${vp.left - induk.left}px`, top: `${vp.top - induk.top}px`, width: `${vp.width}px`, height: `${vp.height}px` }
})

/* ── Seret, ukur, putar ──────────────────────────────────────────────────── */

interface Seretan {
  mode: 'geser' | 'ukur' | 'putar'
  pegangan?: Pegangan
  el: HTMLElement
  info: InfoKeping
  x0: number
  y0: number
  nilai: Record<string, number | boolean | undefined>
  kotak: Kotak & { putar: number }
  lebar: number
  sudut0: number
  huruf: number
  bergerak: boolean
  /** Kotak objek di sekitar keping, dikumpulkan sekali saat mulai menyeret (smart guide). */
  sasaran: KotakAabb[]
  /** Kotak keping di layar saat mulai, sebelum diputar — bukan kotak tata letaknya. */
  aabb: KotakAabb
  /** Pojok kiri-atas bagiannya di layar, untuk label posisi X/Y. */
  asal: { x: number, y: number }
}
let seret: Seretan | null = null
let telanKlik = false
/** Garis bantu dan penanda jarak yang sedang tampil, dalam koordinat lapisan. */
const panduan = ref<{ garis: GarisPanduan[], jarak: JarakPanduan[] }>({ garis: [], jarak: [] })
const ukuranLabel = ref('')

/**
 * Objek pembanding smart guide: keping lain di bagian yang sama (yang terlihat), plus kotak bagian itu
 * sendiri — dipotong ke viewport panggung, supaya tengah bagian setinggi 3000px tidak jatuh di luar.
 */
/** Garis bantu dan penanda jarak dari koordinat layar ke koordinat lapisan overlay. */
function tampilkanPanduan(garis: GarisPanduan[], jarak: JarakPanduan[]) {
  const akar = lapisan.value?.getBoundingClientRect()
  const ox = akar?.left ?? 0
  const oy = akar?.top ?? 0
  panduan.value = {
    garis: garis.map(g => (g.sumbu === 'x' ? { ...g, posisi: g.posisi - ox, dari: g.dari - oy, ke: g.ke - oy } : { ...g, posisi: g.posisi - oy, dari: g.dari - ox, ke: g.ke - ox })),
    jarak: jarak.map(j => (j.sumbu === 'x' ? { ...j, dari: j.dari - ox, ke: j.ke - ox, pada: j.pada - oy } : { ...j, dari: j.dari - oy, ke: j.ke - oy, pada: j.pada - ox })),
  }
}

function kumpulkanSasaran(el: HTMLElement, info: InfoKeping): KotakAabb[] {
  const aabb = (r: DOMRect): KotakAabb => ({ kiri: r.left, atas: r.top, kanan: r.right, bawah: r.bottom })
  const sasaran: KotakAabb[] = []
  props.viewport?.querySelectorAll<HTMLElement>(`[data-iv-el][data-iv-bagian="${CSS.escape(info.bagianId)}"]`).forEach((lain) => {
    if (lain === el || lain.contains(el) || el.contains(lain)) return
    const r = lain.getBoundingClientRect()
    if (r.width && r.height) sasaran.push(aabb(r))
  })
  const bagian = el.closest<HTMLElement>('[data-iv-section], [data-gate-variant]')?.getBoundingClientRect()
  const vp = props.viewport?.getBoundingClientRect()
  if (bagian) {
    sasaran.push(vp
      ? { kiri: bagian.left, kanan: bagian.right, atas: Math.max(bagian.top, vp.top), bawah: Math.min(bagian.bottom, vp.bottom) }
      : aabb(bagian))
  }
  return sasaran
}

function mulai(event: PointerEvent, el: HTMLElement, info: InfoKeping, mode: Seretan['mode'], pegangan?: Pegangan) {
  const kotak = kotakLayar(el, info)
  const r = el.getBoundingClientRect()
  seret = {
    mode, pegangan, el, info,
    x0: event.clientX, y0: event.clientY,
    nilai: nilaiKeping(info),
    kotak,
    lebar: lebarAcuan(el),
    sudut0: sudutPutar(kotak.cx, kotak.cy, event.clientX, event.clientY),
    huruf: Number.parseFloat(getComputedStyle(el).fontSize) || 16,
    bergerak: false,
    // Teks tidak ikut menempel saat diukur: ukurannya `fontSize` yang dibulatkan dan barisnya membungkus ulang.
    sasaran: mode === 'geser' || (mode === 'ukur' && info.jenis !== 'teks') ? kumpulkanSasaran(el, info) : [],
    aabb: { kiri: r.left, atas: r.top, kanan: r.right, bawah: r.bottom },
    asal: (() => {
      const b = el.closest<HTMLElement>('[data-iv-section], [data-gate-variant]')?.getBoundingClientRect()
      return { x: b?.left ?? 0, y: b?.top ?? 0 }
    })(),
  }
  window.addEventListener('pointermove', saatGerak)
  window.addEventListener('pointerup', selesai, { once: true })
  window.addEventListener('pointercancel', selesai, { once: true })
}

function saatGerak(event: PointerEvent) {
  const s = seret
  if (!s) return
  let dx = event.clientX - s.x0
  let dy = event.clientY - s.y0
  if (!s.bergerak) {
    if (Math.hypot(dx, dy) < 3) return
    if (terkunciKini(s.info)) { beriTahu('Terkunci. Sunting lewat form di panel kanan.'); selesai(); return }
    if (!props.bisaDesain) { beriTahu('Mengatur tata letak butuh add-on desain.'); selesai(); return }
  }
  const catat = !s.bergerak
  s.bergerak = true
  const n = s.nilai
  const cqw = (px: number) => layarKeCqw(px, props.skala, s.lebar)

  if (s.mode === 'geser') {
    /*
     * Seperti Figma: Shift mengunci ke arah dominan (mendatar, tegak, 45°); smart guide menempelkan
     * tepi dan tengah keping ke objek di sekitarnya atau ke jarak yang seimbang; ⌘/Ctrl mematikan
     * tempel. Urutannya penting — kunci sumbu dulu, lalu tempel hanya di sumbu yang masih bebas.
     */
    let sumbu: 'x' | 'y' | 'diagonal' | null = null
    if (event.shiftKey) ({ dx, dy, sumbu } = kunciSumbu(dx, dy))
    panduan.value = { garis: [], jarak: [] }
    if (!(event.metaKey || event.ctrlKey) && sumbu !== 'diagonal') {
      const tempel = hitungTempel({ kiri: s.aabb.kiri + dx, kanan: s.aabb.kanan + dx, atas: s.aabb.atas + dy, bawah: s.aabb.bawah + dy }, s.sasaran, 4)
      if (sumbu !== 'y') dx += tempel.dx
      if (sumbu !== 'x') dy += tempel.dy
      const bebas = (p: { sumbu: 'x' | 'y' }) => (p.sumbu === 'x' ? sumbu !== 'y' : sumbu !== 'x')
      tampilkanPanduan(tempel.garis.filter(bebas), tempel.jarak.filter(bebas))
    }
    // Posisi keping di bagiannya, dalam px render — angka yang sama di pratinjau 26 % maupun 100 %.
    ukuranLabel.value = `X ${Math.round((s.aabb.kiri + dx - s.asal.x) / props.skala)} · Y ${Math.round((s.aabb.atas + dy - s.asal.y) / props.skala)}`
    if (s.info.jenis === 'tambahan') {
      emit('ubah', s.info, { x: angka(batasi(Number(n.x ?? 50) + cqw(dx), -50, 150)), y: angka(batasi(Number(n.y ?? 20) + cqw(dy), -50, 2000)) }, catat)
    }
    else {
      emit('ubah', s.info, { x: angka(batasi(Number(n.x ?? 0) + cqw(dx), -100, 100)), y: angka(batasi(Number(n.y ?? 0) + cqw(dy), -400, 400)) }, catat)
    }
    return
  }

  if (s.mode === 'putar') {
    const sekarang = sudutPutar(s.kotak.cx, s.kotak.cy, event.clientX, event.clientY)
    let putar = normalSudut(Number(n.putar ?? 0) + sekarang - s.sudut0)
    if (event.shiftKey) putar = normalSudut(Math.round(putar / 15) * 15)
    ukuranLabel.value = `${putar}°`
    emit('ubah', s.info, { putar: putar || undefined }, catat)
    return
  }

  // Ukur. Tepi yang ditarik menempel ke objek sekitar seperti saat menyeret; ⌘/Ctrl mematikannya.
  const teks = s.info.jenis === 'teks'
  let baru = ubahUkuran(s.kotak, s.pegangan!, dx, dy, { putar: s.kotak.putar, rasio: event.shiftKey || teks, min: 12 })
  panduan.value = { garis: [], jarak: [] }
  if (!teks && !(event.metaKey || event.ctrlKey)) {
    const tempel = tempelUkuran(baru, s.pegangan!, s.sasaran, { putar: s.kotak.putar, rasio: event.shiftKey, ambang: 4, min: 12 })
    baru = tempel.kotak
    tampilkanPanduan(tempel.garis, [])
  }
  const fx = baru.w / s.kotak.w
  const fy = baru.h / s.kotak.h
  ukuranLabel.value = `${Math.round(baru.w / props.skala)} × ${Math.round(baru.h / props.skala)}${event.shiftKey || teks ? ' · sebanding' : ''}`
  if (teks) {
    emit('ukurTeks', s.info, Math.round(batasi(s.huruf * fy, 10, 96)), catat)
    return
  }
  const geserX = cqw(baru.cx - s.kotak.cx)
  const geserY = cqw(baru.cy - s.kotak.cy)
  if (s.info.jenis === 'tambahan') {
    const rasioAwal = Number(n.rasio ?? 1)
    const rasio = angka(batasi(rasioAwal * fy / fx, 0.1, 10))
    emit('ubah', s.info, {
      lebar: angka(batasi(Number(n.lebar ?? 24) * fx, 4, 100)),
      rasio: rasio === 1 ? undefined : rasio,
      x: angka(batasi(Number(n.x ?? 50) + geserX, -50, 150)),
      y: angka(batasi(Number(n.y ?? 20) + geserY, -50, 2000)),
    }, catat)
    return
  }
  const sx = angka(batasi(Number(n.skala ?? 1) * fx, 0.25, 3))
  const sy = angka(batasi(Number(n.skalaY ?? n.skala ?? 1) * fy, 0.25, 3))
  emit('ubah', s.info, {
    skala: sx === 1 && sy === 1 ? undefined : sx,
    skalaY: sy === sx ? undefined : sy,
    x: angka(batasi(Number(n.x ?? 0) + geserX, -100, 100)) || undefined,
    y: angka(batasi(Number(n.y ?? 0) + geserY, -400, 400)) || undefined,
  }, catat)
}

function selesai() {
  const tadiDiseret = Boolean(seret?.bergerak)
  window.removeEventListener('pointermove', saatGerak)
  window.removeEventListener('pointerup', selesai)
  window.removeEventListener('pointercancel', selesai)
  seret = null
  panduan.value = { garis: [], jarak: [] }
  ukuranLabel.value = ''
  if (tadiDiseret) window.setTimeout(kumpulkanDaftar, 60)
}
onBeforeUnmount(selesai)

function mulaiPegangan(event: PointerEvent, mode: 'ukur' | 'putar', pegangan?: Pegangan) {
  const info = terpilih.value
  const el = elemenKeping(info)
  if (!info || !el || event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  mulai(event, el, info, mode, pegangan)
}

/* ── Peristiwa panggung (fase tangkap, di viewport) ─────────────────────── */

let sunting: { el: HTMLElement, info: InfoKeping, semula: string, selesai: (simpan: boolean) => void } | null = null

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  if (sunting?.el.contains(event.target as Node)) return
  const el = kepingDari(event.target)
  if (!el) {
    if ((event.target as Element | null)?.closest?.('[data-preview-stage]')) terpilih.value = null
    return
  }
  const info = infoDari(el)
  if (!info) return
  telanKlik = true
  terpilih.value = info
  /*
   * Fokus keyboard ikut pindah ke kanvas: tanpa ini tombol rail yang barusan diklik tetap memegang
   * fokus, dan panah/Delete/⌘L diabaikan karena fokusnya "di luar panggung" (terukur di e2e).
   */
  const fokus = window.document.activeElement as HTMLElement | null
  if (fokus && fokus !== window.document.body && !props.viewport?.contains(fokus) && !fokus.isContentEditable) fokus.blur()
  // Sentuhan hanya memilih: menyeret dengan jari berebut dengan gulir panggung.
  if (event.pointerType === 'touch') return
  event.preventDefault()
  mulai(event, el, info, 'geser')
}

/** Klik sesudah menekan keping ditelan: tombol di bawahnya (segel, pilihan RSVP) tidak ikut jalan. */
function onClick(event: MouseEvent) {
  if (!telanKlik) return
  telanKlik = false
  if (kepingDari(event.target)) { event.preventDefault(); event.stopPropagation() }
}

function onPointerOver(event: PointerEvent) {
  const el = kepingDari(event.target)
  hover.value = el ? infoDari(el) : null
}

function onDblClick(event: MouseEvent) {
  const el = kepingDari(event.target)
  const info = el ? infoDari(el) : null
  if (!el || !info) return
  event.preventDefault()
  if (info.jenis === 'teks') suntingTeks(el, info)
  else if (terkunciKini(info)) beriTahu('Terkunci. Ganti ornamennya lewat form di panel kanan.')
  else emit('aksi', 'ganti', info)
}

/** Di luar keping, menu bawaan browser yang tampil — menu kanvas hanya untuk keping. */
const menuInfo = ref<InfoKeping | null>(null)
function onContextMenu(event: MouseEvent) {
  const el = kepingDari(event.target)
  const info = el ? infoDari(el) : null
  if (!info) { menuInfo.value = null; event.stopPropagation(); return }
  terpilih.value = info
  menuInfo.value = info
}

watch(() => props.viewport, (baru, lama) => {
  const opsi = { capture: true }
  if (lama) {
    lama.removeEventListener('pointerdown', onPointerDown, opsi)
    lama.removeEventListener('click', onClick, opsi)
    lama.removeEventListener('pointerover', onPointerOver, opsi)
    lama.removeEventListener('dblclick', onDblClick, opsi)
    lama.removeEventListener('contextmenu', onContextMenu, opsi)
    lama.removeEventListener('pointerleave', keluar)
  }
  if (baru) {
    baru.addEventListener('pointerdown', onPointerDown, opsi)
    baru.addEventListener('click', onClick, opsi)
    baru.addEventListener('pointerover', onPointerOver, opsi)
    baru.addEventListener('dblclick', onDblClick, opsi)
    baru.addEventListener('contextmenu', onContextMenu, opsi)
    baru.addEventListener('pointerleave', keluar)
  }
}, { immediate: true })
function keluar() { hover.value = null }

/* ── Teks di tempat ──────────────────────────────────────────────────────── */

/**
 * Klik dua kali pada teks → sunting langsung di undangan.
 *
 * Isinya dikembalikan ke teks semula SEBELUM nilai baru dipancarkan: node teks itu milik Vue, dan
 * DOM yang sudah disunting tangan (baris baru jadi `<br>`/`<div>`) membuat patch berikutnya menulis
 * ke node yang sudah tidak ada. Dengan dikembalikan, Vue menulis nilai barunya sendiri.
 */
function suntingTeks(el: HTMLElement, info: InfoKeping) {
  if (terkunciKini(info)) { beriTahu('Terkunci. Sunting teksnya lewat form di panel kanan.'); return }
  if (sunting) sunting.selesai(true)
  const semula = el.textContent ?? ''
  /*
   * Node teks MILIK VUE disimpan, bukan isinya. Mengembalikan lewat `textContent =` membuat node
   * baru, dan Vue lalu menambal node lama yang sudah terlepas — dokumen berubah, layar tidak
   * (terukur di browser sebelum diperbaiki).
   */
  const nodeAsli = Array.from(el.childNodes)
  const type = props.document.sections.find(section => section.id === info.bagianId)?.type as V2SectionType | undefined
  const kolom = type ? sectionFields[type]?.find(field => field.key === info.kunci.slice(2)) : undefined
  const banyakBaris = kolom?.kind === 'paragraf'
  el.setAttribute('contenteditable', 'plaintext-only')
  if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true')
  el.dataset.ivSunting = ''
  el.focus()
  const range = window.document.createRange()
  range.selectNodeContents(el)
  const pilihan = window.getSelection()
  pilihan?.removeAllRanges()
  pilihan?.addRange(range)

  const tombol = (event: KeyboardEvent) => {
    event.stopPropagation()
    if (event.key === 'Escape') { event.preventDefault(); akhiri(false) }
    else if (event.key === 'Enter' && (!banyakBaris || !event.shiftKey)) { event.preventDefault(); akhiri(true) }
  }
  const lepas = () => akhiri(true)
  function akhiri(simpan: boolean) {
    if (!sunting || sunting.el !== el) return
    const baru = (el.innerText ?? '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, kolom?.max ?? 600)
    el.removeEventListener('keydown', tombol)
    el.removeEventListener('blur', lepas)
    el.removeAttribute('contenteditable')
    delete el.dataset.ivSunting
    el.replaceChildren(...nodeAsli)
    for (const node of nodeAsli) if (node.nodeType === Node.TEXT_NODE && nodeAsli.length === 1) node.nodeValue = semula
    sunting = null
    if (simpan && baru && baru !== semula.trim()) emit('teks', info, baru)
  }
  el.addEventListener('keydown', tombol)
  el.addEventListener('blur', lepas)
  sunting = { el, info, semula, selesai: akhiri }
}

/* ── Keyboard ────────────────────────────────────────────────────────────── */

function onKeydown(event: KeyboardEvent) {
  const info = terpilih.value
  if (!info || sunting) return
  const fokus = window.document.activeElement
  const diLuar = fokus && fokus !== window.document.body && !props.viewport?.contains(fokus)
  if (diLuar || (fokus as HTMLElement | null)?.isContentEditable) return
  const mod = event.metaKey || event.ctrlKey

  if (event.key === 'Escape') { terpilih.value = null; return }
  if (mod && event.key.toLowerCase() === 'l') { event.preventDefault(); emit('aksi', 'kunci', info); return }
  if (mod && event.key === ']') { event.preventDefault(); emit('aksi', event.shiftKey ? 'depan' : 'naik', info); return }
  if (mod && event.key === '[') { event.preventDefault(); emit('aksi', event.shiftKey ? 'belakang' : 'turun', info); return }
  if ((event.key === 'Delete' || event.key === 'Backspace') && info.jenis === 'tambahan') {
    event.preventDefault()
    if (terkunciKini(info)) beriTahu('Terkunci. Buka kuncinya dulu.')
    else emit('aksi', 'hapus', info)
    return
  }
  if (event.key === 'Enter' && info.jenis === 'teks') {
    const el = elemenKeping(info)
    if (el) { event.preventDefault(); suntingTeks(el, info) }
    return
  }
  const arah = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
  if (!arah) return
  event.preventDefault()
  if (terkunciKini(info)) { beriTahu('Terkunci. Sunting lewat form di panel kanan.'); return }
  if (!props.bisaDesain) { beriTahu('Mengatur tata letak butuh add-on desain.'); return }
  const el = elemenKeping(info)
  if (!el) return
  // 1px / 10px RENDER per ketukan, diterjemahkan ke cqw lebar acuannya.
  const langkah = (event.shiftKey ? 10 : 1) * 100 / lebarAcuan(el)
  const n = nilaiKeping(info)
  const tambahan = info.jenis === 'tambahan'
  emit('ubah', info, {
    x: angka(Number(n.x ?? (tambahan ? 50 : 0)) + arah[0]! * langkah),
    y: angka(Number(n.y ?? (tambahan ? 20 : 0)) + arah[1]! * langkah),
  }, true)
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/* ── Daftar Lapisan untuk panel kanan ────────────────────────────────────── */

function kumpulkanDaftar() {
  // Selama diseret dokumen berubah tiap frame; daftarnya dikumpulkan sekali sesudah dilepas.
  if (seret) return
  const id = props.bagianAktif
  if (!id || !props.viewport) { emit('daftar', []); return }
  const lihat = new Set<string>()
  const daftar: InfoKeping[] = []
  props.viewport.querySelectorAll<HTMLElement>(`[data-iv-el][data-iv-bagian="${CSS.escape(id)}"]`).forEach((el) => {
    const info = infoDari(el)
    if (!info || lihat.has(info.kunci)) return
    lihat.add(info.kunci)
    daftar.push(info)
  })
  emit('daftar', daftar)
}
watch(() => [props.bagianAktif, props.document], () => { void nextTick(() => window.setTimeout(kumpulkanDaftar, 60)) }, { deep: true, immediate: true })

/* ── Menu ────────────────────────────────────────────────────────────────── */

const pintas = computed(() => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'))
const kelasItem = 'flex min-h-10 w-full cursor-pointer select-none items-center justify-between gap-4 rounded-md px-2.5 text-ui font-medium text-ink outline-none transition-colors duration-150 data-[highlighted]:bg-surface-3 data-[disabled]:cursor-default data-[disabled]:text-ink-subtle'

function pilihMenu(nama: AksiKanvas | 'sunting') {
  const info = menuInfo.value
  if (!info) return
  if (nama === 'sunting') {
    const el = elemenKeping(info)
    if (el) void nextTick(() => suntingTeks(el, info))
    return
  }
  emit('aksi', nama, info)
}

defineExpose({ suntingTeks: (info: InfoKeping) => { const el = elemenKeping(info); if (el) suntingTeks(el, info) } })
</script>

<template>
  <ContextMenuRoot :modal="false">
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuPortal>
      <ContextMenuContent
        v-if="menuInfo"
        :collision-padding="12"
        class="z-50 grid min-w-[15rem] gap-0.5 rounded-lg border border-border bg-surface p-1.5 shadow-[var(--shadow-veil)]"
        data-kanvas-menu
      >
        <p class="m-0 truncate px-2.5 pb-1 pt-1.5 text-caption font-semibold text-ink-muted">{{ menuInfo.label }}</p>
        <ContextMenuItem
          v-if="menuInfo.jenis === 'teks'"
          id="kanvas-menu-sunting"
          :class="kelasItem"
          :disabled="menuInfo.terkunci"
          @select="pilihMenu('sunting')"
        >
          Sunting teks <kbd class="text-caption text-ink-subtle">Klik 2×</kbd>
        </ContextMenuItem>
        <ContextMenuItem v-else id="kanvas-menu-ganti" :class="kelasItem" :disabled="menuInfo.terkunci || !bisaDesain" @select="pilihMenu('ganti')">
          Ganti ornamen… <kbd class="text-caption text-ink-subtle">Klik 2×</kbd>
        </ContextMenuItem>
        <ContextMenuItem v-if="menuInfo.jenis !== 'teks'" id="kanvas-menu-putar90" :class="kelasItem" :disabled="menuInfo.terkunci || !bisaDesain" @select="pilihMenu('putar90')">
          Putar 90°
        </ContextMenuItem>
        <ContextMenuItem v-if="menuInfo.jenis !== 'teks'" id="kanvas-menu-cermin" :class="kelasItem" :disabled="menuInfo.terkunci || !bisaDesain" @select="pilihMenu('cerminX')">
          Cerminkan
        </ContextMenuItem>
        <ContextMenuItem id="kanvas-menu-kunci" :class="kelasItem" :disabled="!bisaDesain" @select="pilihMenu('kunci')">
          {{ menuInfo.terkunci ? 'Buka kunci posisi' : 'Kunci posisi' }} <kbd class="text-caption text-ink-subtle">{{ pintas }} L</kbd>
        </ContextMenuItem>
        <ContextMenuSeparator class="mx-1 my-1 h-px bg-border" />
        <ContextMenuItem id="kanvas-menu-naik" :class="kelasItem" :disabled="menuInfo.terkunci || !bisaDesain" @select="pilihMenu('naik')">
          Bawa ke depan <kbd class="text-caption text-ink-subtle">{{ pintas }} ]</kbd>
        </ContextMenuItem>
        <ContextMenuItem id="kanvas-menu-depan" :class="kelasItem" :disabled="menuInfo.terkunci || !bisaDesain" @select="pilihMenu('depan')">
          Bawa ke paling depan <kbd class="text-caption text-ink-subtle">{{ pintas }} ⇧ ]</kbd>
        </ContextMenuItem>
        <ContextMenuItem id="kanvas-menu-turun" :class="kelasItem" :disabled="menuInfo.terkunci || !bisaDesain" @select="pilihMenu('turun')">
          Kirim ke belakang <kbd class="text-caption text-ink-subtle">{{ pintas }} [</kbd>
        </ContextMenuItem>
        <ContextMenuItem id="kanvas-menu-belakang" :class="kelasItem" :disabled="menuInfo.terkunci || !bisaDesain" @select="pilihMenu('belakang')">
          Kirim ke paling belakang <kbd class="text-caption text-ink-subtle">{{ pintas }} ⇧ [</kbd>
        </ContextMenuItem>
        <ContextMenuSeparator class="mx-1 my-1 h-px bg-border" />
        <ContextMenuItem id="kanvas-menu-putar-gerak" :class="kelasItem" @select="pilihMenu('putarGerak')">
          Putar geraknya
        </ContextMenuItem>
        <ContextMenuItem v-if="menuInfo.jenis !== 'tambahan'" id="kanvas-menu-sembunyikan" :class="kelasItem" :disabled="menuInfo.terkunci || !bisaDesain" @select="pilihMenu('sembunyikan')">
          Sembunyikan
        </ContextMenuItem>
        <ContextMenuItem v-if="menuInfo.jenis !== 'tambahan'" id="kanvas-menu-kembalikan" :class="kelasItem" :disabled="menuInfo.terkunci || !bisaDesain" @select="pilihMenu('kembalikan')">
          Kembalikan ke bawaan
        </ContextMenuItem>
        <ContextMenuItem
          v-else
          id="kanvas-menu-hapus"
          :class="cn(kelasItem, 'data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger')"
          :disabled="menuInfo.terkunci || !bisaDesain"
          @select="pilihMenu('hapus')"
        >
          Hapus <kbd class="text-caption text-ink-subtle">Del</kbd>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>

  <!--
    Lapisan gambar: tembus pointer kecuali pegangan. Diletakkan di atas viewport panggung dan
    dipotong seluas viewport, jadi kotak keping yang tergulir keluar tidak menimpa toolbar.
  -->
  <div ref="lapisan" class="pointer-events-none absolute z-[var(--z-raised)] overflow-hidden" :style="potong" aria-hidden="true" data-kanvas-lapisan>
    <div
      v-if="kotakHover"
      class="kanvas-kotak kanvas-kotak--hover"
      :style="{ left: `${kotakHover.left}px`, top: `${kotakHover.top}px`, width: `${kotakHover.width}px`, height: `${kotakHover.height}px`, rotate: `${kotakHover.putar}deg` }"
    >
      <span class="kanvas-label">{{ hover?.label }}<Lock v-if="hover?.terkunci" :size="11" class="ml-1 inline" /></span>
    </div>

    <div
      v-if="kotakPilih && terpilih"
      data-kanvas-pilih
      :class="['kanvas-kotak kanvas-kotak--pilih', pilihanTerkunci && 'kanvas-kotak--kunci']"
      :style="{ left: `${kotakPilih.left}px`, top: `${kotakPilih.top}px`, width: `${kotakPilih.width}px`, height: `${kotakPilih.height}px`, rotate: `${kotakPilih.putar}deg` }"
    >
      <span class="kanvas-label">{{ terpilih.label }}</span>
      <span v-if="pilihanTerkunci" class="kanvas-gembok"><Lock :size="12" /></span>
      <template v-else-if="bisaDesain">
        <span
          v-for="p in semuaPegangan"
          :key="p"
          :data-pegangan="p"
          :class="['kanvas-pegangan', `kanvas-pegangan--${p}`]"
          @pointerdown="event => mulaiPegangan(event, 'ukur', p)"
        />
        <span v-if="terpilih.jenis !== 'teks'" class="kanvas-putar" data-pegangan="putar" title="Putar (Shift: kelipatan 15°)" @pointerdown="event => mulaiPegangan(event, 'putar')">
          <RotateCw :size="12" />
        </span>
      </template>
      <span v-if="ukuranLabel" class="kanvas-ukuran">{{ ukuranLabel }}</span>
    </div>

    <!-- Smart guide (fase 81 lanjutan): garis sejajar dan penanda jarak seimbang, merah Figma. -->
    <template v-for="(g, i) in panduan.garis" :key="`g${i}`">
      <div
        class="kanvas-panduan"
        :style="g.sumbu === 'x'
          ? { left: `${g.posisi}px`, top: `${g.dari}px`, width: '1px', height: `${g.ke - g.dari}px` }
          : { top: `${g.posisi}px`, left: `${g.dari}px`, height: '1px', width: `${g.ke - g.dari}px` }"
      />
    </template>
    <template v-for="(j, i) in panduan.jarak" :key="`j${i}`">
      <div
        class="kanvas-panduan kanvas-jarak"
        :style="j.sumbu === 'x'
          ? { left: `${j.dari}px`, top: `${j.pada}px`, width: `${j.ke - j.dari}px`, height: '1px' }
          : { top: `${j.dari}px`, left: `${j.pada}px`, height: `${j.ke - j.dari}px`, width: '1px' }"
      >
        <span class="kanvas-jarak-label">{{ Math.round(j.panjang / skala) }}</span>
      </div>
    </template>
  </div>

  <p v-if="pesan" role="status" class="pointer-events-none absolute bottom-14 left-1/2 z-[var(--z-raised)] m-0 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-caption font-semibold text-ink-inverse shadow-lift">
    {{ pesan }}
  </p>
</template>

<style>
/*
 * Warna kanvas dari token aplikasi (DESIGN.md, Panggung editor): hover putus-putus `--color-success`
 * 1px, pilihan garis penuh 1,5px, terkunci putus-putus emas dengan gembok. Tidak ada angka warna
 * baru di sini.
 */
.kanvas-kotak { position: absolute; transform-origin: center; }
.kanvas-kotak--hover { outline: 1px dashed var(--color-success); outline-offset: 2px; }
.kanvas-kotak--pilih { outline: 1.5px solid var(--color-success); outline-offset: 2px; }
.kanvas-kotak--kunci { outline: 1.5px dashed var(--color-gold); }
.kanvas-label {
  position: absolute;
  bottom: calc(100% + 6px);
  left: -2px;
  white-space: nowrap;
  border-radius: 6px;
  background: var(--color-success);
  color: var(--color-ink-inverse);
  font: 600 11px/1 var(--font-sans, inherit);
  padding: 4px 6px;
}
.kanvas-kotak--kunci .kanvas-label { background: var(--color-gold); color: var(--color-ink); }
.kanvas-pegangan {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-success);
  pointer-events: auto;
  margin: -5px 0 0 -5px;
}
.kanvas-pegangan--nw { left: -2px; top: -2px; cursor: nwse-resize; }
.kanvas-pegangan--n { left: 50%; top: -2px; cursor: ns-resize; }
.kanvas-pegangan--ne { left: calc(100% + 2px); top: -2px; cursor: nesw-resize; }
.kanvas-pegangan--e { left: calc(100% + 2px); top: 50%; cursor: ew-resize; }
.kanvas-pegangan--se { left: calc(100% + 2px); top: calc(100% + 2px); cursor: nwse-resize; }
.kanvas-pegangan--s { left: 50%; top: calc(100% + 2px); cursor: ns-resize; }
.kanvas-pegangan--sw { left: -2px; top: calc(100% + 2px); cursor: nesw-resize; }
.kanvas-pegangan--w { left: -2px; top: 50%; cursor: ew-resize; }
.kanvas-putar {
  position: absolute;
  left: 50%;
  top: -34px;
  width: 22px;
  height: 22px;
  margin-left: -11px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-success);
  color: var(--color-success);
  pointer-events: auto;
  cursor: grab;
}
.kanvas-gembok {
  position: absolute;
  right: -12px;
  top: -12px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--color-gold);
  color: var(--color-ink);
}
.kanvas-ukuran {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  translate: -50% 0;
  white-space: nowrap;
  border-radius: 6px;
  background: var(--color-ink);
  color: var(--color-ink-inverse);
  font: 500 11px/1 ui-monospace, monospace;
  padding: 4px 6px;
}
.kanvas-panduan { position: absolute; background: var(--color-panduan); }
.kanvas-jarak-label {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  border-radius: 4px;
  background: var(--color-panduan);
  color: var(--color-ink-inverse);
  font: 600 10px/1 ui-monospace, monospace;
  padding: 2px 4px;
  white-space: nowrap;
}
</style>
