<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { Crop, X } from 'lucide-vue-next'
import { cropPhoto, type CropRect } from '~/utils/image-normalize'

/**
 * Pangkas foto di Pustaka Saya (fase 74.6). Dijanjikan `FASE-72.md:488` lewat
 * `vue-advanced-cropper`; ditulis sendiri, dan itu keputusan sadar.
 *
 * Repo ini belum pernah menambah satu dependensi runtime pun sejak fase 57 — `docs/DEPENDENCIES.md`
 * mencatat "tanpa dependensi baru" di tiap fase — dan seluruh mesin yang dibutuhkan pangkas sudah
 * ada di `utils/image-normalize.ts`: canvas, `targetSize`, encode WebP 0,82, `File` keluar,
 * berikut dua jebakan yang sudah dibayar di sana (EXIF potret, dan browser yang mengembalikan PNG
 * saat diminta WebP). Yang benar-benar kurang cuma pemilih kotaknya, dan itu ada di bawah.
 *
 * Kotaknya disimpan **ternormalisasi 0–1**, bukan piksel: `<img>` di sini lebarnya ditentukan
 * tata letak dialog, bukan ukuran asli foto, jadi piksel harus dikonversi ulang tiap kali dialog
 * berubah lebar. `cropRect` yang menerjemahkannya, dan ia diuji tanpa browser.
 *
 * Hasilnya diunggah sebagai ASET BARU. Aslinya tidak pernah ditimpa — pasangan yang memangkas
 * terlalu dalam masih punya fotonya, dan bagian undangan yang sudah memakai URL lama tidak
 * berubah diam-diam.
 */
const props = defineProps<{ open: boolean; src: string; nama: string }>()
const emit = defineEmits<{ 'update:open': [boolean]; simpan: [File] }>()

/** Rasio yang ditawarkan. `null` = bebas. 4:5 ada karena itu rasio potret galeri undangan. */
const rasioPilihan = [
  { id: 'bebas', label: 'Bebas', nilai: null },
  { id: 'persegi', label: '1:1', nilai: 1 },
  { id: 'potret', label: '4:5', nilai: 4 / 5 },
  { id: 'lebar', label: '16:9', nilai: 16 / 9 },
] as const

const gambar = ref<HTMLImageElement | null>(null)
const rasio = ref<(typeof rasioPilihan)[number]['id']>('bebas')
const kotak = ref<CropRect>({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 })
const menyimpan = ref(false)
const galat = ref('')

/** Rasio piksel gambar yang sedang ditampilkan — dibutuhkan supaya 1:1 benar-benar persegi. */
const rasioTampil = ref(1)

function ukurGambar() {
  const el = gambar.value
  if (!el || !el.clientHeight) return
  rasioTampil.value = el.clientWidth / el.clientHeight
}

watch(() => props.open, async (open) => {
  if (!open) return
  kotak.value = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }
  rasio.value = 'bebas'
  galat.value = ''
  menyimpan.value = false
  await nextTick()
  ukurGambar()
})

/**
 * Menerapkan rasio pada kotak saat ini, dengan pusat yang tetap.
 *
 * Rasio dinyatakan dalam piksel FOTO, sementara `kotak` dalam pecahan lebar/tinggi elemen —
 * jadi `rasioTampil` harus ikut dihitung, kalau tidak "1:1" akan terlihat persegi panjang pada
 * foto lanskap. Ini kesalahan yang mudah dibuat dan sulit dilihat di layar.
 */
function terapkanRasio(id: (typeof rasioPilihan)[number]['id']) {
  rasio.value = id
  const target = rasioPilihan.find(item => item.id === id)?.nilai
  if (!target) return
  const kini = kotak.value
  const pusatX = kini.x + kini.width / 2
  const pusatY = kini.y + kini.height / 2
  let width = kini.width
  let height = (width * rasioTampil.value) / target
  if (height > 1) { height = 1; width = (height * target) / rasioTampil.value }
  kotak.value = jinakkan({
    x: pusatX - width / 2,
    y: pusatY - height / 2,
    width,
    height,
  })
}

/** Menjaga kotak tetap di dalam gambar dan tidak menyusut sampai tak bisa dipegang. */
function jinakkan(rect: CropRect): CropRect {
  const minimal = 0.05
  const width = Math.min(1, Math.max(minimal, rect.width))
  const height = Math.min(1, Math.max(minimal, rect.height))
  return {
    width,
    height,
    x: Math.min(1 - width, Math.max(0, rect.x)),
    y: Math.min(1 - height, Math.max(0, rect.y)),
  }
}

type Pegangan = 'geser' | 'kiri-atas' | 'kanan-atas' | 'kiri-bawah' | 'kanan-bawah'

function mulaiSeret(event: PointerEvent, pegangan: Pegangan) {
  const el = gambar.value
  if (!el) return
  event.preventDefault()
  const rect = el.getBoundingClientRect()
  const awal = { ...kotak.value }
  const mulaiX = event.clientX
  const mulaiY = event.clientY
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)

  const gerak = (e: PointerEvent) => {
    const dx = (e.clientX - mulaiX) / rect.width
    const dy = (e.clientY - mulaiY) / rect.height
    if (pegangan === 'geser') {
      kotak.value = jinakkan({ ...awal, x: awal.x + dx, y: awal.y + dy })
      return
    }
    const kiri = pegangan.startsWith('kiri')
    const atas = pegangan.endsWith('atas')
    const next = { ...awal }
    if (kiri) { next.x = awal.x + dx; next.width = awal.width - dx }
    else next.width = awal.width + dx
    if (atas) { next.y = awal.y + dy; next.height = awal.height - dy }
    else next.height = awal.height + dy
    // Menyeret melewati sisi seberang membalik kotaknya; dicegah di sini, bukan di `cropRect`,
    // supaya yang terlihat di layar tidak pernah berbeda dari yang dipangkas.
    if (next.width < 0.05 || next.height < 0.05) return
    kotak.value = jinakkan(next)
    if (rasio.value !== 'bebas') terapkanRasio(rasio.value)
  }
  const selesai = () => {
    window.removeEventListener('pointermove', gerak)
    window.removeEventListener('pointerup', selesai)
  }
  window.addEventListener('pointermove', gerak)
  window.addEventListener('pointerup', selesai)
}

/** Panah menggeser kotak — pangkas harus bisa dipakai tanpa tetikus. */
function geserDenganPapanKetik(event: KeyboardEvent) {
  const langkah = event.shiftKey ? 0.05 : 0.01
  const arah: Record<string, [number, number]> = {
    ArrowLeft: [-langkah, 0], ArrowRight: [langkah, 0], ArrowUp: [0, -langkah], ArrowDown: [0, langkah],
  }
  const delta = arah[event.key]
  if (!delta) return
  event.preventDefault()
  kotak.value = jinakkan({ ...kotak.value, x: kotak.value.x + delta[0], y: kotak.value.y + delta[1] })
}

const gaya = computed(() => ({
  left: `${kotak.value.x * 100}%`,
  top: `${kotak.value.y * 100}%`,
  width: `${kotak.value.width * 100}%`,
  height: `${kotak.value.height * 100}%`,
}))

async function simpan() {
  menyimpan.value = true
  galat.value = ''
  try {
    /*
     * Fotonya diambil ulang lewat `fetch`, bukan digambar dari `<img>` di layar: canvas yang
     * menggambar dari `HTMLImageElement` lintas-origin akan ternoda dan `toBlob` melempar.
     * `createImageBitmap` di `cropPhoto` menerima `Blob`, jadi jalurnya bersih.
     *
     * **`credentials: 'include'` wajib**, dan absennya adalah bug yang hanya terlihat di stack
     * sungguhan. `GET /v1/public/media/:id` menolak aset yang belum dipakai undangan terbit,
     * LALU jatuh ke cookie `aruna_access` untuk pemiliknya (`media.controller.ts`). `<img>`
     * mengirim cookie itu sendiri, jadi pratinjau di atas tampil normal — sementara `fetch`
     * bawaannya `same-origin` dan web (:3000) beda origin dari API (:3001), jadi ia mengirim
     * tanpa cookie dan menerima 400 "Media belum dipakai pada undangan publik". Gejalanya:
     * foto terlihat jelas di dialog, tapi setiap Simpan gagal.
     */
    const response = await fetch(props.src, { credentials: 'include' })
    if (!response.ok) throw new Error('gagal memuat foto')
    const blob = await response.blob()
    const file = new File([blob], props.nama, { type: blob.type })
    const hasil = await cropPhoto(file, kotak.value)
    // `cropPhoto` mengembalikan `null` alih-alih foto utuh: mengunggah foto UTUH padahal
    // pasangan baru memilih sebagian adalah hasil yang salah, bukan sekadar kurang hemat.
    if (!hasil) throw new Error('browser ini tidak bisa memangkas foto')
    emit('simpan', hasil)
    emit('update:open', false)
  } catch {
    galat.value = 'Foto gagal dipangkas. Coba lagi, atau unggah ulang fotonya.'
  } finally {
    menyimpan.value = false
  }
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="value => emit('update:open', value)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[var(--z-modal)] bg-ink/40 backdrop-blur-sm" />
      <DialogContent
        id="media-cropper"
        class="fixed inset-x-3 top-[6svh] z-[var(--z-modal)] mx-auto flex max-h-[88svh] w-auto max-w-2xl flex-col overflow-hidden rounded-xl bg-surface shadow-float focus:outline-none"
      >
        <header class="flex items-center gap-3 border-b border-border px-5 py-4">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary" aria-hidden="true">
            <Crop :size="20" />
          </span>
          <div class="grid min-w-0 flex-1 gap-0.5">
            <DialogTitle class="m-0 text-[1.0625rem] font-semibold text-ink">Pangkas foto</DialogTitle>
            <DialogDescription class="m-0 truncate text-caption text-ink-muted">
              Hasilnya disimpan sebagai foto baru — {{ props.nama }} tetap ada.
            </DialogDescription>
          </div>
          <DialogClose id="media-cropper-tutup" class="grid h-11 w-11 place-items-center rounded-md text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label="Tutup pangkas">
            <X :size="18" aria-hidden="true" />
          </DialogClose>
        </header>

        <div class="grid gap-4 overflow-y-auto px-5 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-caption font-semibold uppercase tracking-[0.08em] text-ink-muted">Rasio</span>
            <button
              v-for="pilihan in rasioPilihan"
              :id="`media-cropper-rasio-${pilihan.id}`"
              :key="pilihan.id"
              type="button"
              :aria-pressed="rasio === pilihan.id"
              :class="cn(
                'min-h-11 rounded-md border px-3 text-[0.875rem] font-medium transition-colors duration-200',
                rasio === pilihan.id ? 'border-primary bg-primary-soft text-primary' : 'border-border text-ink hover:bg-surface-3',
              )"
              @click="terapkanRasio(pilihan.id)"
            >
              {{ pilihan.label }}
            </button>
          </div>

          <div class="relative mx-auto max-w-full select-none">
            <img
              ref="gambar"
              :src="props.src"
              :alt="`Pangkas ${props.nama}`"
              class="max-h-[46svh] w-auto max-w-full rounded-md"
              draggable="false"
              @load="ukurGambar"
            >
            <!-- Bidang gelap di luar kotak: yang dibuang terlihat, bukan cuma yang disimpan. -->
            <div class="pointer-events-none absolute inset-0 bg-ink/50" aria-hidden="true" />
            <div
              class="absolute cursor-move rounded-[2px] shadow-[0_0_0_9999px_rgba(0,0,0,0)] outline outline-2 outline-white"
              :style="gaya"
              tabindex="0"
              role="application"
              aria-label="Kotak pangkas. Geser dengan tombol panah, tahan Shift untuk langkah besar."
              @pointerdown="event => mulaiSeret(event, 'geser')"
              @keydown="geserDenganPapanKetik"
            >
              <div class="absolute inset-0 bg-surface/10" />
              <span
                v-for="sudut in (['kiri-atas', 'kanan-atas', 'kiri-bawah', 'kanan-bawah'] as const)"
                :key="sudut"
                :class="cn(
                  'absolute h-5 w-5 rounded-full border-2 border-white bg-primary',
                  sudut === 'kiri-atas' && '-left-2.5 -top-2.5 cursor-nwse-resize',
                  sudut === 'kanan-atas' && '-right-2.5 -top-2.5 cursor-nesw-resize',
                  sudut === 'kiri-bawah' && '-bottom-2.5 -left-2.5 cursor-nesw-resize',
                  sudut === 'kanan-bawah' && '-bottom-2.5 -right-2.5 cursor-nwse-resize',
                )"
                @pointerdown.stop="event => mulaiSeret(event, sudut)"
              />
            </div>
          </div>

          <p v-if="galat" class="notice m-0" role="alert">{{ galat }}</p>
        </div>

        <footer class="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <UiButton id="media-cropper-batal" tone="outline" @click="emit('update:open', false)">Batal</UiButton>
          <UiButton id="media-cropper-simpan" :disabled="menyimpan" @click="simpan">
            {{ menyimpan ? 'Menyimpan…' : 'Simpan sebagai foto baru' }}
          </UiButton>
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
