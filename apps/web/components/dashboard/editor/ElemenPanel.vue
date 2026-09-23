<script setup lang="ts">
import { ChevronsDown, ChevronsUp, Eye, EyeOff, FlipHorizontal2, FlipVertical2, Lock, LockOpen, Minus, Play, Plus, Replace, RotateCcw, Trash2, Type } from 'lucide-vue-next'
import { kanvasGerak, maksTambahanKanvas, type FieldMeta } from '@aruna/contracts'
import { arahDariPutar, arahSudut, labelGerakKeping, putarUntukArah, slotDariKunci, type InfoKeping } from '~/utils/kanvas'
import type { OrnamentRef } from '~/utils/ornaments'

/**
 * Tab "Elemen" di Inspector (fase 81): keping yang dipilih di kanvas, sebagai kontrol bernomor.
 *
 * **Inilah jalur form yang dijanjikan kunci.** Keping terkunci tidak bisa disunting di panggung
 * (keputusan pemilik), tapi di sini semuanya tetap bisa — kunci hanya melindungi dari geseran
 * tetikus yang tidak disengaja. Angka yang diketik bisa diulang, di-undo, dan dijangkau keyboard;
 * seret di kanvas menulis angka yang sama.
 *
 * Di bawahnya daftar Lapisan bagian ini: semua keping, termasuk yang tersembunyi (dua sudut baru
 * fase 81 lahir tersembunyi dan dimunculkan dari sini), dengan mata dan gembok per baris.
 */
const props = defineProps<{
  info: InfoKeping | null
  /** Nilai kanvas keping terpilih yang tersimpan di dokumen. */
  nilai: Record<string, unknown>
  daftar: InfoKeping[]
  /**
   * Ringkasan tiap keping di bagian ini: lapis (urutan daftar), putaran dan cermin (supaya
   * pratinjaunya menghadap ke arah yang sama dengan di kanvas), dan cuplikan isi untuk teks.
   */
  ringkas: Record<string, { lapis?: number, putar?: number, cerminX?: boolean, cerminY?: boolean, teks?: string }>
  /** Variabel ramp ornamen undangan (`--iv-orn-*`) dan latarnya, untuk pratinjau kecil. */
  ramp: Record<string, string>
  latar: string
  labelBagian: string
  bisaDesain: boolean
  lockedBy?: string
  /** Kolom teks keping terpilih (jenis teks), dari kontrak. */
  kolom?: FieldMeta
  teks?: string
  ukuranHuruf?: number
  jumlahTambahan: number
}>()

const emit = defineEmits<{
  ubah: [patch: Record<string, unknown>]
  aksi: [nama: 'ganti' | 'kembalikan' | 'hapus' | 'putarGerak' | 'depan' | 'belakang']
  pilih: [info: InfoKeping]
  tampil: [info: InfoKeping, tampil: boolean]
  kunci: [info: InfoKeping]
  teks: [nilai: string]
  ukurTeks: [ukuran: number]
  tambah: []
}>()

const n = (kunci: string, bawaan: number) => {
  const nilai = props.nilai[kunci]
  return typeof nilai === 'number' ? nilai : bawaan
}
const tambahan = computed(() => props.info?.jenis === 'tambahan')
const teksKeping = computed(() => props.info?.jenis === 'teks')
const posisi = computed(() => props.info?.kunci.split(':')[2] ?? '')
const sudut = computed(() => (props.info ? slotDariKunci(props.info.kunci) === 'corner' : false))
const arahSekarang = computed(() => arahDariPutar(posisi.value, n('putar', 0)))
const terkunci = computed(() => Boolean(props.nilai.terkunci))

/** Angka dari input; kosong atau tak terbaca = tidak menulis apa pun. */
function angkaDari(event: Event): number | null {
  const nilai = Number.parseFloat((event.target as HTMLInputElement).value.replace(',', '.'))
  return Number.isFinite(nilai) ? nilai : null
}
function tulisAngka(kunci: string, event: Event, opsi: { min: number; max: number; skala?: number; kosong?: number }) {
  const nilai = angkaDari(event)
  if (nilai === null) return
  const hasil = Math.min(opsi.max, Math.max(opsi.min, nilai / (opsi.skala ?? 1)))
  const bulat = Math.round(hasil * 100) / 100
  emit('ubah', { [kunci]: bulat === opsi.kosong ? undefined : bulat })
}

const draftTeks = ref(props.teks ?? '')
watch(() => props.teks, nilai => { draftTeks.value = nilai ?? '' })
function simpanTeks() {
  const nilai = draftTeks.value.trim().slice(0, props.kolom?.max ?? 600)
  if (nilai !== (props.teks ?? '')) emit('teks', nilai)
}

const daftarUrut = computed(() => [...props.daftar].sort((a, b) => (props.ringkas[b.kunci]?.lapis ?? 0) - (props.ringkas[a.kunci]?.lapis ?? 0)))

/**
 * Pratinjau kecil tiap keping (permintaan pemilik): nama "Ladang · 1" saja tidak mengatakan keping
 * mana yang dimaksud. Menghadap ke arah yang sama dengan di kanvas: `transform` bawaan komponen yang
 * dibaca dari pembungkusnya (sudut kanan-bawah, simbol bawah Hero, keping ladang yang dibalik),
 * ditambah putaran dan cermin pasangan — urutannya sama dengan pembungkus di kanvas.
 */
function gayaPratinjau(item: InfoKeping): Record<string, string> {
  const r = props.ringkas[item.kunci] ?? {}
  const gaya: Record<string, string> = {}
  if (item.dasar) gaya.transform = item.dasar
  if (r.putar) gaya.rotate = `${r.putar}deg`
  if (r.cerminX || r.cerminY) gaya.scale = `${r.cerminX ? -1 : 1} ${r.cerminY ? -1 : 1}`
  return gaya
}
const glyphDari = (item: InfoKeping) => item.glyph as OrnamentRef | undefined
const kelasInput = 'min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-ui tabular-nums text-ink disabled:opacity-50'
const kelasTombol = 'flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-border-strong px-3 text-caption font-semibold text-ink hover:bg-surface-3 disabled:opacity-40'
</script>

<template>
  <div class="grid gap-4">
    <p v-if="!bisaDesain" class="m-0 flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3.5 text-caption text-ink-muted">
      <Lock :size="15" class="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
      <span>Mengatur tata letak dan ornamen terkunci pada preset undangan ini. <span v-if="lockedBy" class="text-ink">{{ lockedBy }}</span></span>
    </p>

    <section v-if="info" class="grid gap-3 rounded-md border border-border bg-surface p-3.5" aria-labelledby="elemen-judul">
      <div class="flex items-start justify-between gap-3">
        <span class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border p-1.5" :style="{ ...ramp, background: latar }" aria-hidden="true" data-elemen-pratinjau>
          <OrnamentGlyph v-if="info.jenis !== 'teks' && glyphDari(info)" :glyph="glyphDari(info)" ubin class="max-h-full max-w-full object-contain text-[color:var(--iv-orn-body)]" :style="gayaPratinjau(info)" />
          <Type v-else-if="info.jenis === 'teks'" :size="20" class="text-ink-muted" />
          <Minus v-else :size="20" class="text-ink-muted" />
        </span>
        <div class="grid min-w-0 flex-1 gap-0.5">
          <p id="elemen-judul" class="m-0 text-ui font-semibold text-ink">{{ info.label }}</p>
          <p class="m-0 text-caption text-ink-muted">{{ labelBagian }}<span v-if="terkunci"> · terkunci di kanvas, bisa disunting di sini</span></p>
        </div>
        <button
          id="elemen-kunci"
          type="button"
          :class="cn(kelasTombol, 'shrink-0', terkunci && 'border-gold bg-gold-soft')"
          :aria-pressed="terkunci"
          :disabled="!bisaDesain"
          @click="emit('kunci', info)"
        >
          <component :is="terkunci ? Lock : LockOpen" :size="15" aria-hidden="true" />
          {{ terkunci ? 'Terkunci' : 'Kunci' }}
        </button>
      </div>

      <!-- Teks: isinya disunting di sini juga, karena keping terkunci tidak bisa disunting di panggung. -->
      <template v-if="teksKeping && kolom">
        <UiField id="elemen-teks" v-slot="{ id }" :label="kolom.label">
          <UiTextarea v-if="kolom.kind === 'paragraf'" :id="id" v-model="draftTeks" rows="3" @change="simpanTeks" />
          <UiInput v-else :id="id" v-model="draftTeks" @change="simpanTeks" />
        </UiField>
        <label class="grid gap-1 text-caption font-semibold text-ink" for="elemen-huruf">
          Ukuran huruf (px)
          <input id="elemen-huruf" :class="kelasInput" type="number" min="10" max="96" step="1" :value="ukuranHuruf" :disabled="!bisaDesain" @change="event => { const v = angkaDari(event); if (v !== null) emit('ukurTeks', Math.round(Math.min(96, Math.max(10, v)))) }">
        </label>
      </template>

      <div class="grid grid-cols-2 gap-2.5">
        <label class="grid gap-1 text-caption font-semibold text-ink" for="elemen-x">
          {{ tambahan ? 'Pusat X (%)' : 'Geser X (%)' }}
          <input id="elemen-x" :class="kelasInput" type="number" step="0.5" :value="n('x', tambahan ? 50 : 0)" :disabled="!bisaDesain" @change="event => tulisAngka('x', event, tambahan ? { min: -50, max: 150 } : { min: -100, max: 100, kosong: 0 })">
        </label>
        <label class="grid gap-1 text-caption font-semibold text-ink" for="elemen-y">
          {{ tambahan ? 'Pusat Y (%)' : 'Geser Y (%)' }}
          <input id="elemen-y" :class="kelasInput" type="number" step="0.5" :value="n('y', tambahan ? 20 : 0)" :disabled="!bisaDesain" @change="event => tulisAngka('y', event, tambahan ? { min: -50, max: 2000 } : { min: -400, max: 400, kosong: 0 })">
        </label>
        <template v-if="!teksKeping">
          <label v-if="tambahan" class="grid gap-1 text-caption font-semibold text-ink" for="elemen-lebar">
            Lebar (%)
            <input id="elemen-lebar" :class="kelasInput" type="number" min="4" max="100" step="1" :value="n('lebar', 24)" :disabled="!bisaDesain" @change="event => tulisAngka('lebar', event, { min: 4, max: 100 })">
          </label>
          <template v-else>
            <label class="grid gap-1 text-caption font-semibold text-ink" for="elemen-skala">
              Lebar (%)
              <input id="elemen-skala" :class="kelasInput" type="number" min="25" max="300" step="5" :value="Math.round(n('skala', 1) * 100)" :disabled="!bisaDesain" @change="event => tulisAngka('skala', event, { min: 0.25, max: 3, skala: 100, kosong: 1 })">
            </label>
            <label class="grid gap-1 text-caption font-semibold text-ink" for="elemen-skala-y">
              Tinggi (%)
              <input id="elemen-skala-y" :class="kelasInput" type="number" min="25" max="300" step="5" :value="Math.round(n('skalaY', n('skala', 1)) * 100)" :disabled="!bisaDesain" @change="event => tulisAngka('skalaY', event, { min: 0.25, max: 3, skala: 100 })">
            </label>
          </template>
          <label class="grid gap-1 text-caption font-semibold text-ink" for="elemen-putar">
            Putar (°)
            <input id="elemen-putar" :class="kelasInput" type="number" min="-180" max="180" step="1" :value="n('putar', 0)" :disabled="!bisaDesain" @change="event => tulisAngka('putar', event, { min: -180, max: 180, kosong: 0 })">
          </label>
        </template>
        <label class="grid gap-1 text-caption font-semibold text-ink" for="elemen-opasitas">
          Opasitas (%)
          <input id="elemen-opasitas" :class="kelasInput" type="number" min="0" max="100" step="5" :value="Math.round(n('opasitas', 1) * 100)" :disabled="!bisaDesain" @change="event => tulisAngka('opasitas', event, { min: 0, max: 1, skala: 100, kosong: 1 })">
        </label>
      </div>

      <!-- Empat arah sudut (fase 81): satu keping sudut untuk keempat pojok. -->
      <div v-if="sudut" class="grid gap-1.5">
        <span class="text-caption font-semibold text-ink">Arah sudut</span>
        <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Arah sudut">
          <button
            v-for="item in arahSudut"
            :id="`elemen-arah-${item.id}`"
            :key="item.id"
            type="button"
            role="radio"
            :aria-checked="arahSekarang === item.id"
            :aria-label="`Menghadap ${item.label.toLowerCase()}`"
            :disabled="!bisaDesain"
            :class="cn('grid min-h-10 min-w-11 place-items-center rounded-md border text-ui-lg', arahSekarang === item.id ? 'border-primary bg-primary-soft text-ink' : 'border-border text-ink-muted hover:border-border-strong')"
            @click="emit('ubah', { putar: putarUntukArah(posisi, item.id) || undefined })"
          >
            {{ item.simbol }}
          </button>
        </div>
      </div>

      <div v-if="!teksKeping" class="flex flex-wrap gap-2">
        <button id="elemen-cermin-x" type="button" :class="kelasTombol" :aria-pressed="Boolean(nilai.cerminX)" :disabled="!bisaDesain" @click="emit('ubah', { cerminX: nilai.cerminX ? undefined : true })">
          <FlipHorizontal2 :size="15" aria-hidden="true" /> Cermin
        </button>
        <button id="elemen-cermin-y" type="button" :class="kelasTombol" :aria-pressed="Boolean(nilai.cerminY)" :disabled="!bisaDesain" @click="emit('ubah', { cerminY: nilai.cerminY ? undefined : true })">
          <FlipVertical2 :size="15" aria-hidden="true" /> Balik
        </button>
        <button id="elemen-ganti" type="button" :class="kelasTombol" :disabled="!bisaDesain" @click="emit('aksi', 'ganti')">
          <Replace :size="15" aria-hidden="true" /> Ganti ornamen
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <button id="elemen-depan" type="button" :class="kelasTombol" :disabled="!bisaDesain" @click="emit('aksi', 'depan')">
          <ChevronsUp :size="15" aria-hidden="true" /> Paling depan
        </button>
        <button id="elemen-belakang" type="button" :class="kelasTombol" :disabled="!bisaDesain" @click="emit('aksi', 'belakang')">
          <ChevronsDown :size="15" aria-hidden="true" /> Paling belakang
        </button>
      </div>

      <!-- Gerak per keping: preset + tunda, dan ▶ untuk menontonnya. Kunci tidak menyentuh gerak. -->
      <div class="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-end gap-2">
        <label class="grid gap-1 text-caption font-semibold text-ink" for="elemen-gerak">
          Gerak masuk
          <select id="elemen-gerak" :class="kelasInput" :value="(nilai.gerak as string) ?? 'bagian'" :disabled="!bisaDesain" @change="event => emit('ubah', { gerak: (event.target as HTMLSelectElement).value === 'bagian' ? undefined : (event.target as HTMLSelectElement).value })">
            <option v-for="preset in kanvasGerak" :key="preset" :value="preset">{{ labelGerakKeping[preset] }}</option>
          </select>
        </label>
        <label class="grid gap-1 text-caption font-semibold text-ink" for="elemen-tunda">
          Tunda (dtk)
          <input id="elemen-tunda" :class="kelasInput" type="number" min="0" max="2" step="0.1" :value="n('tunda', 0)" :disabled="!bisaDesain" @change="event => tulisAngka('tunda', event, { min: 0, max: 2, kosong: 0 })">
        </label>
        <button id="elemen-putar-gerak" type="button" :class="cn(kelasTombol, 'w-10 px-0')" aria-label="Putar gerak masuk keping ini" @click="emit('aksi', 'putarGerak')">
          <Play :size="15" aria-hidden="true" />
        </button>
      </div>

      <div class="flex flex-wrap gap-2 border-t border-border pt-3">
        <button v-if="!tambahan" id="elemen-kembalikan" type="button" :class="kelasTombol" :disabled="!bisaDesain" @click="emit('aksi', 'kembalikan')">
          <RotateCcw :size="15" aria-hidden="true" /> Kembalikan ke bawaan
        </button>
        <button v-else id="elemen-hapus" type="button" :class="cn(kelasTombol, 'text-danger')" :disabled="!bisaDesain" @click="emit('aksi', 'hapus')">
          <Trash2 :size="15" aria-hidden="true" /> Hapus ornamen
        </button>
      </div>
    </section>

    <p v-else class="m-0 rounded-md border border-border bg-surface-2 p-3.5 text-caption text-ink-muted">
      Klik ornamen atau teks di pratinjau untuk mengaturnya. Seret untuk memindah, tarik pegangan untuk mengubah ukuran
      (<kbd>Shift</kbd> mengunci rasio), klik dua kali teks untuk menyuntingnya, klik kanan untuk menu.
    </p>

    <section class="grid gap-2" aria-labelledby="elemen-lapisan">
      <div class="flex items-center justify-between gap-2">
        <p id="elemen-lapisan" class="m-0 text-ui-label font-bold uppercase tracking-[0.12em] text-ink-muted">Lapisan · {{ labelBagian }}</p>
        <button
          id="elemen-tambah"
          type="button"
          :class="kelasTombol"
          :disabled="!bisaDesain || jumlahTambahan >= maksTambahanKanvas"
          :title="jumlahTambahan >= maksTambahanKanvas ? `Maksimal ${maksTambahanKanvas} ornamen tambahan per bagian` : undefined"
          @click="emit('tambah')"
        >
          <Plus :size="15" aria-hidden="true" /> Ornamen ({{ jumlahTambahan }}/{{ maksTambahanKanvas }})
        </button>
      </div>
      <ul v-if="daftarUrut.length" class="m-0 grid list-none gap-0.5 p-0">
        <li v-for="item in daftarUrut" :key="item.kunci" :class="cn('flex items-center gap-1 rounded-md pr-1', info?.kunci === item.kunci ? 'bg-success-soft' : 'hover:bg-surface-3')">
          <button
            :id="`elemen-lapis-${item.kunci.replace(/[^a-z0-9-]/gi, '-')}`"
            type="button"
            class="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-1.5 text-left text-ui text-ink"
            :aria-current="info?.kunci === item.kunci ? 'true' : undefined"
            @click="emit('pilih', item)"
          >
            <span
              class="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md border border-border p-1"
              :class="item.tersembunyi && 'opacity-45'"
              :style="{ ...ramp, background: latar }"
              aria-hidden="true"
              data-lapis-pratinjau
            >
              <OrnamentGlyph v-if="item.jenis !== 'teks' && glyphDari(item)" :glyph="glyphDari(item)" ubin class="max-h-full max-w-full object-contain text-[color:var(--iv-orn-body)]" :style="gayaPratinjau(item)" />
              <Type v-else-if="item.jenis === 'teks'" :size="15" class="text-ink-muted" />
              <Minus v-else :size="15" class="text-ink-muted" />
            </span>
            <span class="grid min-w-0">
              <span :class="cn('truncate', item.tersembunyi && 'text-ink-subtle')">{{ item.label }}</span>
              <span v-if="ringkas[item.kunci]?.teks" class="truncate text-caption text-ink-subtle">{{ ringkas[item.kunci]?.teks }}</span>
            </span>
          </button>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-md text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-40"
            :aria-label="item.tersembunyi ? `Tampilkan ${item.label}` : `Sembunyikan ${item.label}`"
            :aria-pressed="!item.tersembunyi"
            :disabled="!bisaDesain || item.jenis === 'tambahan'"
            @click="emit('tampil', item, item.tersembunyi)"
          >
            <component :is="item.tersembunyi ? EyeOff : Eye" :size="15" aria-hidden="true" />
          </button>
          <button
            type="button"
            :class="cn('grid h-9 w-9 place-items-center rounded-md hover:bg-surface disabled:opacity-40', item.terkunci ? 'text-gold' : 'text-ink-subtle hover:text-ink')"
            :aria-label="item.terkunci ? `Buka kunci ${item.label}` : `Kunci ${item.label}`"
            :aria-pressed="item.terkunci"
            :disabled="!bisaDesain"
            @click="emit('kunci', item)"
          >
            <component :is="item.terkunci ? Lock : LockOpen" :size="15" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <p v-else class="m-0 text-caption text-ink-subtle">Bagian ini belum terlihat di pratinjau.</p>
    </section>
  </div>
</template>
