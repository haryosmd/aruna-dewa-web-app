<script setup lang="ts">
import { FolderOpen, Trash2 } from 'lucide-vue-next'
import type { FieldMeta, FontChoice, InvitationSection, SectionBackground, SectionMotion, TextStyle, V2SectionType } from '@aruna/contracts'
import { isRequiredSection, maxGalleryPhotoLimit, sectionFields, sectionMeta, sectionMotions, selectableFonts } from '@aruna/contracts'
import { bodyFontOf } from '~/utils/theme'
import type { InvitationDocument } from '~/types/aruna'

/**
 * Form satu bagian (fase 72.0/72.4), **digenerate dari `sectionFields` kontrak** — bukan cabang
 * `v-if` per tipe seperti editor lama. Menambah kolom di kontrak berarti kolomnya muncul di sini,
 * lengkap dengan panel Gaya teks, tanpa satu baris pun di berkas ini.
 *
 * Susunannya persis referensi: judul bagian + deskripsi + lencana Tampil/Tersembunyi, kartu per
 * kolom, kartu Foto komponen, lalu blok "Gerak masuk" (pembeda kita) dan "Background section"
 * (warna + gambar) di bawah. Komponen ini tidak memutasi `section` — halaman yang menulis, supaya
 * tiap tulisan lewat `checkpoint()` dan bisa di-undo.
 */
const props = defineProps<{
  section: InvitationSection
  document: InvitationDocument
  invitationId: string
  canEditDesign: boolean
  lockedBy?: string
  /**
   * Kuota foto galeri paket ini, dari `GET /invitations/:id` (fase 75) — bukan dihitung ulang di
   * sini. `field.limit` di kontrak adalah PLAFON katalog (paket teratas), karena skema dokumen
   * tidak tahu paketnya; yang mengikat pasangan ini angka di bawah. Diambil yang terkecil supaya
   * tombolnya tidak pernah menjanjikan lebih dari yang API terima.
   */
  photoLimit?: number
}>()

const emit = defineEmits<{
  tulis: [key: string, value: unknown]
  tulisGaya: [key: string, style: TextStyle | null]
  tulisLatar: [patch: Partial<SectionBackground> | null]
  tulisGerak: [motion: SectionMotion]
  release: [url: string]
}>()

const type = computed(() => props.section.type as V2SectionType)
const meta = computed(() => sectionMeta[type.value])
const fields = computed<FieldMeta[]>(() => sectionFields[type.value] ?? [])
const data = computed(() => props.section.data as Record<string, unknown>)
const textStyles = computed(() => (data.value.textStyles ?? {}) as Record<string, TextStyle | undefined>)
const background = computed(() => (data.value.background ?? {}) as SectionBackground)
const motion = computed<SectionMotion>(() => (data.value.motion as SectionMotion | undefined) ?? 'tema')

const str = (key: string) => String(data.value[key] ?? '')
const bool = (key: string) => Boolean(data.value[key])
const list = (key: string) => (Array.isArray(data.value[key]) ? (data.value[key] as string[]) : [])

/** Kolom yang tampil: yang punya syarat `bila` hanya saat sakelarnya menyala. */
const tampil = computed(() => fields.value.filter(field => !field.bila || bool(field.bila)))

/**
 * Font milik tema untuk panel Gaya teks: huruf judul dan paragraf yang sedang berlaku, plus
 * kaligrafi — bukan seluruh `fontChoices`. Kaligrafi ditandai `script` supaya `TextStyleField`
 * menyembunyikannya untuk kolom paragraf.
 */
const fonts = computed(() => {
  const judul = props.document.tokens.font as FontChoice
  const body = bodyFontOf(props.document)
  const script: FontChoice[] = ['great-vibes', 'parisienne', 'pinyon', 'allura']
  const ids = [...new Set<FontChoice>([judul, body, ...script])]
  return ids.map(id => ({ id, label: selectableFonts.find(font => font.id === id)?.label ?? id, script: script.includes(id) }))
})

const gerakLabels: Record<SectionMotion, { label: string; hint: string }> = {
  tema: { label: 'Ikut tema', hint: 'Bawaan. Gaya masuk ditentukan partitur tema.' },
  rise: { label: 'Naik', hint: 'Unsur naik lembut dari bawah — paling tenang.' },
  sweep: { label: 'Sapuan', hint: 'Masuk dari samping seperti disapu.' },
  iris: { label: 'Iris', hint: 'Terbuka dari tengah seperti diafragma.' },
  silhouette: { label: 'Siluet', hint: 'Bayangan dulu, lalu warnanya menyusul.' },
  tanpa: { label: 'Tanpa gerak', hint: 'Bagian ini diam; unsurnya langsung tampil.' },
}

const { pilih } = useMediaLibrary()

/** Batas efektif satu kolom foto: plafon skema dan kuota paket, yang mana pun lebih kecil. */
function batasFoto(field: FieldMeta): number {
  return Math.min(field.limit ?? maxGalleryPhotoLimit, props.photoLimit ?? maxGalleryPhotoLimit)
}

async function tambahFotoGaleri(field: FieldMeta) {
  const ada = list(field.key)
  const batas = batasFoto(field)
  const sisa = Math.max(0, batas - ada.length)
  if (!sisa) return
  const hasil = await pilih({ multiple: true, remaining: sisa, judul: `${field.label} · ${meta.value.label}` })
  if (!hasil?.length) return
  emit('tulis', field.key, [...ada, ...hasil.filter(url => !ada.includes(url))].slice(0, batas))
}

function hapusFotoGaleri(field: FieldMeta, index: number) {
  const ada = list(field.key)
  const [dihapus] = ada.splice(index, 1)
  emit('tulis', field.key, [...ada])
  if (dihapus) emit('release', dihapus)
}

async function pilihLatar() {
  const hasil = await pilih({ judul: `Background image · ${meta.value.label}` })
  const url = hasil?.[0]
  if (!url) return
  const previous = background.value.imageUrl
  emit('tulisLatar', { imageUrl: url })
  if (previous && previous !== url) emit('release', previous)
}

function hapusLatar() {
  const previous = background.value.imageUrl
  emit('tulisLatar', { imageUrl: undefined })
  if (previous) emit('release', previous)
}

const idKolom = (key: string) => `editor-field-${type.value}-${key}`
</script>

<template>
  <div class="grid gap-4">
    <div class="flex items-start justify-between gap-3">
      <div class="grid gap-0.5">
        <h2 class="m-0 font-display text-h3 font-semibold text-ink">{{ meta.label }}</h2>
        <p class="m-0 text-caption text-ink-muted">{{ meta.description }}</p>
      </div>
      <span
        :id="`editor-section-status-${section.id}`"
        :class="cn('shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold', section.enabled ? 'bg-success-soft text-success' : 'bg-surface-3 text-ink-muted')"
      >
        {{ section.enabled ? 'Tampil' : 'Tersembunyi' }}<span v-if="isRequiredSection(section.type)" class="sr-only"> (wajib)</span>
      </span>
    </div>

    <template v-for="field in tampil" :key="field.key">
      <DashboardEditorTextStyleField
        v-if="field.kind === 'teks' || field.kind === 'paragraf'"
        :id="idKolom(field.key)"
        :field="field"
        :model-value="str(field.key)"
        :style="textStyles[field.key]"
        :fonts="fonts"
        :default-color="document.tokens.foreground"
        :terkunci="!canEditDesign"
        :locked-by="lockedBy"
        @update:model-value="value => emit('tulis', field.key, value)"
        @update:style="style => emit('tulisGaya', field.key, style)"
      />

      <UiField v-else-if="field.kind === 'tanggal'" :id="idKolom(field.key)" v-slot="{ id }" :label="field.label" class="rounded-md border border-border bg-surface p-3.5">
        <UiInput :id="id" type="datetime-local" :model-value="str(field.key)" @change="(event: Event) => emit('tulis', field.key, (event.target as HTMLInputElement).value)" />
      </UiField>

      <UiField v-else-if="field.kind === 'url'" :id="idKolom(field.key)" v-slot="{ id }" :label="field.label" class="rounded-md border border-border bg-surface p-3.5">
        <UiInput :id="id" type="url" placeholder="https://…" :model-value="str(field.key)" @change="(event: Event) => emit('tulis', field.key, (event.target as HTMLInputElement).value.trim())" />
      </UiField>

      <DashboardPhotoField
        v-else-if="field.kind === 'foto'"
        :id="idKolom(field.key)"
        :invitation-id="invitationId"
        :label="field.label"
        :konteks="meta.label"
        :model-value="str(field.key)"
        @update:model-value="value => emit('tulis', field.key, value)"
        @release="url => emit('release', url)"
      />

      <div v-else-if="field.kind === 'foto[]'" class="grid gap-2.5 rounded-md border border-border bg-surface p-3.5">
        <div class="grid gap-0.5">
          <p class="m-0 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-ink">{{ field.label }} (Maks {{ batasFoto(field) }})</p>
          <p class="m-0 text-caption text-ink-muted">{{ list(field.key).length }} dari {{ batasFoto(field) }} foto. Foto tampil publik setelah undangan diterbitkan.</p>
        </div>
        <ul v-if="list(field.key).length" class="m-0 grid list-none grid-cols-3 gap-2 p-0">
          <li v-for="(url, index) in list(field.key)" :key="url" class="relative overflow-hidden rounded-md bg-surface-2">
            <img :src="url" alt="" class="aspect-square w-full object-cover" loading="lazy">
            <span class="absolute left-1.5 top-1.5 rounded-full bg-ink/70 px-1.5 text-caption font-semibold text-ink-inverse">{{ String(index + 1).padStart(2, '0') }}</span>
            <button
              :id="`${idKolom(field.key)}-hapus-${index + 1}`"
              type="button"
              class="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-ink/70 text-ink-inverse hover:bg-danger"
              :aria-label="`Hapus foto ${index + 1}`"
              @click="hapusFotoGaleri(field, index)"
            >
              <Trash2 :size="14" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <UiButton
          :id="`${idKolom(field.key)}-pilih`"
          tone="outline"
          class="border-primary/40 bg-primary-soft/40 text-primary hover:bg-primary-soft"
          :disabled="list(field.key).length >= batasFoto(field)"
          @click="tambahFotoGaleri(field)"
        >
          <FolderOpen :size="16" aria-hidden="true" />
          Pilih dari Asset Saya
        </UiButton>
      </div>

      <label v-else-if="field.kind === 'boolean'" class="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-surface px-3.5 py-2">
        <span class="text-[0.875rem] font-semibold text-ink">{{ field.label }}</span>
        <span class="relative inline-flex h-6 w-11 shrink-0 items-center">
          <input
            :id="idKolom(field.key)"
            type="checkbox"
            class="peer sr-only"
            :checked="bool(field.key)"
            @change="emit('tulis', field.key, ($event.target as HTMLInputElement).checked)"
          >
          <span class="absolute inset-0 rounded-full bg-border-strong transition-colors duration-200 peer-checked:bg-success peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" aria-hidden="true" />
          <span class="absolute left-0.5 h-5 w-5 rounded-full bg-surface shadow-hairline transition-transform duration-200 peer-checked:translate-x-5" aria-hidden="true" />
        </span>
      </label>
    </template>

    <!-- Bagian ekstra kita (cerita, rundown, dresscode) membawa daftar yang tidak digenerate dari kolom. -->
    <DashboardEditorExtrasForm
      v-if="type === 'story' || type === 'rundown' || type === 'dresscode'"
      :section="section"
      :invitation-id="invitationId"
      @tulis="(key, value) => emit('tulis', key, value)"
      @release="url => emit('release', url)"
    />

    <!-- Gerak masuk per bagian: pembeda kita dari referensi, yang hanya menggerakkan amplop. -->
    <UiField :id="`editor-motion-${section.id}`" v-slot="{ id }" label="Gerak masuk" :hint="gerakLabels[motion].hint" class="rounded-md border border-border bg-surface p-3.5">
      <UiSelect :id="id" :model-value="motion" @update:model-value="value => emit('tulisGerak', value as SectionMotion)">
        <option v-for="option in sectionMotions" :key="option" :value="option">{{ gerakLabels[option].label }}</option>
      </UiSelect>
    </UiField>

    <div class="grid gap-3">
      <p class="m-0 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-muted">Background section</p>

      <div class="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3.5 py-2.5">
        <label :for="`editor-bg-color-${section.id}`" class="text-[0.875rem] font-semibold text-ink">Warna background</label>
        <span class="flex items-center gap-2">
          <input
            :id="`editor-bg-color-${section.id}`"
            type="color"
            class="h-9 w-9 cursor-pointer rounded-full border border-border bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
            :value="background.color ?? document.tokens.background"
            @input="emit('tulisLatar', { color: ($event.target as HTMLInputElement).value })"
          >
          <code class="text-[0.8125rem] font-semibold uppercase text-ink">{{ background.color ?? document.tokens.background }}</code>
          <button
            v-if="background.color"
            :id="`editor-bg-color-reset-${section.id}`"
            type="button"
            class="text-caption text-ink-muted underline-offset-2 hover:underline"
            @click="emit('tulisLatar', { color: undefined })"
          >
            Ikut tema
          </button>
        </span>
      </div>

      <div class="grid gap-2.5 rounded-md border border-border bg-surface p-3.5">
        <div class="grid gap-0.5">
          <p class="m-0 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-ink">Background image</p>
          <p class="m-0 text-caption text-ink-muted">Pilih background dari Asset Manager</p>
        </div>
        <div v-if="background.imageUrl" class="relative overflow-hidden rounded-md bg-surface-2">
          <img :src="background.imageUrl" alt="" class="aspect-video w-full object-cover">
          <button
            :id="`editor-bg-image-remove-${section.id}`"
            type="button"
            class="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-ink/70 text-ink-inverse hover:bg-danger"
            aria-label="Hapus background image"
            @click="hapusLatar"
          >
            <Trash2 :size="15" aria-hidden="true" />
          </button>
        </div>
        <p v-else class="m-0 rounded-md border border-dashed border-border bg-surface-2 px-4 py-5 text-center text-caption text-ink-muted">Belum ada gambar terpilih</p>
        <UiField v-if="background.imageUrl" :id="`editor-bg-overlay-${section.id}`" v-slot="{ id }" label="Kepekatan lapisan warna" hint="Warna latar di atas foto supaya teks tetap terbaca.">
          <input :id="id" type="range" min="0" max="1" step="0.05" class="w-full accent-[var(--color-primary)]" :value="background.overlay ?? 0.5" @input="emit('tulisLatar', { overlay: Number(($event.target as HTMLInputElement).value) })">
        </UiField>
        <UiButton :id="`editor-bg-image-pilih-${section.id}`" tone="outline" class="border-primary/40 bg-primary-soft/40 text-primary hover:bg-primary-soft" @click="pilihLatar">
          <FolderOpen :size="16" aria-hidden="true" />
          {{ background.imageUrl ? 'Ganti dari Asset Saya' : 'Pilih dari Asset Saya' }}
        </UiButton>
      </div>
    </div>
  </div>
</template>
