<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, CreditCard, Loader2 } from 'lucide-vue-next'
import { createDefaultDocument, liveStructureIds, priceOrder, structures, type LiveTemplateId, type StructureId } from '@aruna/contracts'
import type { ApiError } from '@aruna/contracts/api'
import type { Catalog, InvitationDocument } from '~/types/aruna'
import { ornamentRamp, rampStyle } from '~/utils/ornament-palette'
import { langkahDariQuery, focusPreview, previewScrolls } from '~/utils/order-preview'

const toast = useToast()

definePageMeta({ middleware: 'auth', layout: false })

const invitationsApi = useInvitations()
const ordersApi = useOrders()
const { fetchCatalog } = useCatalog()
const route = useRoute()
const ready = useInteractiveReady()

const STEPS = [
  { label: 'Pasangan', eyebrow: 'Siapa yang menikah', title: 'Mari mulai dari nama kalian.' },
  { label: 'Acara', eyebrow: 'Kapan dan di mana', title: 'Di mana kalian merayakan?' },
  { label: 'Tema', eyebrow: 'Suasana undangan', title: 'Pilih tema yang paling terasa kalian.' },
  { label: 'Paket', eyebrow: 'Paket dan pembayaran', title: 'Terakhir, pilih paketnya.' },
]

const step = ref(1)
const pending = ref(false)
const error = ref('')
const fieldErrors = reactive<Record<string, string>>({})
const catalog = ref<Catalog | null>(null)

const form = reactive({
  partner1: '',
  partner2: '',
  title: '',
  slug: '',
  date: '',
  venue: '',
  address: '',
  mapUrl: '',
  // Sebagian besar pasangan menggelar akad dan resepsi di tempat yang sama, jadi ini
  // default-nya menyala. Nilainya tidak pernah masuk dokumen — lihat `preview`.
  sameVenue: true,
  venue2: '',
  address2: '',
  mapUrl2: '',
  templateId: 'aruna-bloom' as LiveTemplateId,
  /*
   * Struktur undangan (fase 74.11). Plumbingnya lengkap; PEMILIHNYA belum tampil karena baru
   * ada satu struktur hidup — kartu pilihan yang cuma berisi satu kartu adalah wizard yang
   * lebih buruk daripada tanpa pemilih, dan itu pola yang sudah dipakai `liveTemplateIds`.
   * Barisnya muncul sendiri begitu struktur kedua lahir; tidak ada yang perlu diingat.
   */
  structureId: 'elegance' as StructureId,
  packageId: typeof route.query.package === 'string' ? route.query.package : 'mula',
  addonIds: [] as string[],
  invitationId: '',
  orderId: '',
})

const storageKey = 'aruna-order-draft'

onMounted(() => {
  const saved = localStorage.getItem(storageKey)
  if (saved) {
    try { Object.assign(form, JSON.parse(saved)) } catch { localStorage.removeItem(storageKey) }
  }
  /*
   * Tautan "Buat tema versi Anda sendiri" (fase 69): buka langsung di langkah Tema dengan add-on
   * Desain tercentang. Langkah 1–2 belum divalidasi di sini — `checkout()` yang mengembalikan
   * pasangan ke langkah pertama yang belum lengkap, bukan server lewat 400.
   */
  step.value = langkahDariQuery(route.query.langkah)
  dariTautanTema.value = step.value === 3
  if (route.query.addon === 'design' && !form.addonIds.includes('design')) form.addonIds.push('design')
  loadCatalog()
})
const dariTautanTema = ref(false)

watch(form, () => localStorage.setItem(storageKey, JSON.stringify(form)), { deep: true })

async function loadCatalog() {
  try { catalog.value = await fetchCatalog() } catch (cause) { error.value = apiErrorMessage(cause) }
}

const selectedPackage = computed(() => catalog.value?.packages.find(item => item.id === form.packageId))
/** Add-ons already bundled in the chosen package cannot be bought again. */
const availableAddons = computed(() => (catalog.value?.addons ?? []).filter(addon => !selectedPackage.value?.features.includes(addon.id)))
watch(availableAddons, addons => { form.addonIds = form.addonIds.filter(id => addons.some(addon => addon.id === id)) })

const total = computed(() => {
  if (!selectedPackage.value) return 0
  try { return priceOrder(form.packageId, form.addonIds).total } catch { return selectedPackage.value.price }
})

function autoSlug() {
  if (form.slug || !form.partner1 || !form.partner2) return
  form.slug = slugify(`${form.partner1} dan ${form.partner2}`)
}

function validate(target: number) {
  Object.keys(fieldErrors).forEach(key => delete fieldErrors[key])
  if (target === 1) {
    if (!form.partner1.trim()) fieldErrors.partner1 = 'Nama pasangan pertama wajib diisi.'
    if (!form.partner2.trim()) fieldErrors.partner2 = 'Nama pasangan kedua wajib diisi.'
    if (!form.slug.trim()) fieldErrors.slug = 'Alamat undangan wajib diisi.'
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) fieldErrors.slug = 'Huruf kecil dan tanda hubung saja, tanpa spasi.'
  }
  return Object.keys(fieldErrors).length === 0
}

/**
 * Kolom yang ditolak server dibawa kembali ke tahap tempat ia diisi. Tanpa ini pesannya
 * hanya muncul sebagai banner di tahap paket, jauh dari kolom yang harus diperbaiki.
 */
const stepOfField: Record<string, number> = { partner1: 1, partner2: 1, title: 1, slug: 1, date: 2, venue: 2, address: 2, templateId: 3, structureId: 3, packageId: 4, addonIds: 4 }

function applyServerFieldErrors(cause: unknown) {
  const reported = (cause as Partial<ApiError> | undefined)?.fieldErrors
  if (!reported) return
  let earliest = STEPS.length
  for (const [field, messages] of Object.entries(reported)) {
    const message = messages?.[0]
    if (!message) continue
    fieldErrors[field] = message
    earliest = Math.min(earliest, stepOfField[field] ?? STEPS.length)
  }
  step.value = earliest
}

function next() {
  error.value = ''
  if (!validate(step.value)) return
  if (step.value < STEPS.length) step.value++
}

async function checkout() {
  // Masuk lewat ?langkah=tema bisa melompati nama dan acara; kembalikan ke langkah yang kosong.
  for (const target of [1, 2]) { if (!validate(target)) { step.value = target; return } }
  error.value = ''
  pending.value = true
  try {
    if (!form.invitationId) {
      const invitation = await invitationsApi.create({
        title: form.title || `${form.partner1} & ${form.partner2}`,
        slug: form.slug,
        partner1: form.partner1,
        partner2: form.partner2,
        date: form.date || undefined,
        venue: form.venue || undefined,
        address: form.address || undefined,
        templateId: form.templateId,
        structureId: form.structureId,
      })
      form.invitationId = invitation.id
    }
    if (!form.orderId) {
      const order = await ordersApi.create(form.invitationId, { packageId: form.packageId, addonIds: form.addonIds })
      form.orderId = order.id
    }
    const payment = await ordersApi.checkout(form.orderId)
    localStorage.removeItem(storageKey)
    // Operator melewati gerbang pembayaran, jadi tidak ada halaman bayar yang perlu dibuka.
    if (payment.paid) {
      toast.success('Undangan aktif — semua fitur terbuka.')
      await navigateTo(`/dashboard/${form.invitationId}`)
      return
    }
    if (!payment.snapUrl) throw new Error('Halaman pembayaran belum bisa dibuka. Coba lagi sebentar lagi.')
    window.location.assign(payment.snapUrl)
  } catch (cause) {
    // API akhirnya mengirim `fieldErrors`, jadi penolakannya bisa menunjuk kolomnya —
    // bukan lagi banner tanpa arah di tahap terakhir untuk, misalnya, slug yang sudah dipakai.
    applyServerFieldErrors(cause)
    error.value = apiErrorMessage(cause)
    toast.error(error.value)
  } finally {
    pending.value = false
  }
}

/**
 * Yang tertulis di cover: nama kalian berdua, dan hanya itu.
 *
 * `form.title` sengaja TIDAK ikut. API membangun dokumen lewat `createDefaultDocument(partner1,
 * partner2)`, jadi judul cover undangan yang sungguhan selalu nama pasangan; `title` hanya
 * menjadi nama undangan di dasbor dan tab. Sebelum ini pratinjau memakai `form.title` sebagai
 * judul cover, sehingga mengetik nama dasbor terlihat menimpa nama di cover — dua kolom yang
 * tampak mengatur satu hal, padahal yang satu tidak pernah sampai ke tamu.
 */
const previewTitle = computed(() => `${form.partner1 || 'Aruna'} & ${form.partner2 || 'Dewa'}`)
const previewSlug = computed(() => form.slug || 'aruna-dan-dewa')
const previewFocus = computed(() => ({ hasDate: Boolean(form.date) }))
const previewScrollable = computed(() => previewScrolls(step.value, previewFocus.value))

/*
 * Section yang difokuskan harus muat tanpa menggulung, jadi bingkainya boleh diperkecil
 * mengikuti tinggi jendela. 300px adalah header + jarak sticky + pil alamat + dua baris
 * keterangan di bawah kartu. Di langkah terakhir batasnya dilepas: seluruh undangan memang
 * digulung, dan memperkecilnya sampai muat hanya menghasilkan huruf yang tak terbaca.
 */
const { height: windowHeight } = useWindowSize()
const previewMaxHeight = computed(() => (previewScrollable.value ? undefined : Math.max(360, windowHeight.value - 300)))
const previewScale = ref(1)
const previewScalePct = computed(() => Math.round(previewScale.value * 100))

/**
 * Dokumen pratinjau dibangun ulang dari formulir supaya panel kanan tidak pernah basi.
 *
 * Dokumennya lengkap — semua section bawaan diisi — lalu `focusPreview` menyalakan hanya
 * section yang disentuh langkah aktif. Sebelum fase 65 seluruh undangan digulung di kotak
 * 34rem: di langkah "nama kalian" yang terlihat foto stok dan eyebrow, sementara namanya
 * sendiri jatuh di bawah lipatan.
 */
const preview = computed<InvitationDocument>(() => {
  /*
   * Toggle "lokasi sama" hanya gula di formulir: nilainya disalin ke bagian `map` di sini,
   * sehingga dokumen yang tersimpan selalu lengkap dan tidak ada pembaca lain yang perlu
   * tahu soal flag-nya. Struktur v2 (fase 72) punya satu bagian lokasi, jadi lokasi resepsi
   * yang berbeda ditulis sebagai baris kedua alamatnya.
   */
  const reception = form.sameVenue
    ? { venue: form.venue, address: form.address, mapUrl: form.mapUrl }
    : { venue: form.venue2, address: form.address2, mapUrl: form.mapUrl2 }
  const document = createDefaultDocument(form.partner1 || 'Aruna', form.partner2 || 'Dewa', form.templateId, {
    date: form.date || undefined, venue: form.venue, address: form.address, mapUrl: form.mapUrl,
  }, form.structureId)
  const at = (id: string) => document.sections.find(section => section.id === id)!
  at('opening-envelope').data = { ...at('opening-envelope').data, title: previewTitle.value }
  at('hero').data = { ...at('hero').data, title: previewTitle.value, imageUrl: themeOf(form.templateId).cover }
  at('couple').data = { ...at('couple').data, imageUrl: '/images/couple.webp' }
  at('countdown').data = { ...at('countdown').data, targetDate: form.date ? `${form.date}T09:00` : '' }
  const lokasiAkad = [form.venue || 'Lokasi menyusul', form.address].filter(Boolean).join('\n')
  const lokasiResepsi = form.sameVenue ? '' : [reception.venue || form.venue || 'Lokasi menyusul', reception.address].filter(Boolean).join('\n')
  at('map').data = {
    ...at('map').data,
    title: form.sameVenue ? 'Lokasi Akad & Resepsi' : 'Lokasi Acara',
    subtitle: lokasiResepsi ? `Akad: ${lokasiAkad}\n\nResepsi: ${lokasiResepsi}` : lokasiAkad,
    mapUrl: form.mapUrl || reception.mapUrl,
  }
  at('gallery').data = { ...at('gallery').data, imageUrls: ['/images/couple.webp', '/images/rings.webp'] }
  document.sections = focusPreview(document.sections, step.value, previewFocus.value)
  return document
})

/*
 * Pergantian adegan, bukan gerakan masuk: saat langkah berganti, isi pratinjau berganti dan
 * bingkainya memudar masuk (`sine.inOut`, resep fase 32). Fungsinya baru terisi setelah modul
 * motion tiba, dan tidak pernah terisi saat `prefers-reduced-motion` — `useArunaMotion` tidak
 * menjalankan setup-nya, jadi pratinjau langsung berganti tanpa tween. Tidak ada `opacity: 0`
 * di CSS (DESIGN.md, aturan 3).
 */
const previewRoot = ref<HTMLElement | null>(null)
let fadePreview: (() => void) | null = null
useArunaMotion(previewRoot, ({ gsap }) => {
  fadePreview = () => {
    gsap.fromTo('[data-order-preview]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'sine.inOut', overwrite: true })
  }
})
watch(step, () => {
  fadePreview?.()
  /*
   * Formulir acara panjang; tombol Lanjut ditekan di bawah, dan judul langkah berikutnya tidak
   * boleh lahir di luar layar.
   *
   * `instant`, bukan `auto`: `html { scroll-behavior: smooth }` di main.css membuat `auto`
   * berarti halus, dan gulungan halus itu asinkron — di langkah terakhir ia dibatalkan oleh
   * ScrollTrigger yang baru dipasang renderer (refresh-nya mengembalikan posisi gulung yang
   * ia ingat), sehingga halaman tetap di dasar. Terukur: `auto` menyisakan 229px, `instant` 0.
   * Aksesibilitas tidak dikorbankan — lompatan seketika justru yang diminta reduced-motion.
   */
  if (import.meta.client) nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
})

// Sengaja tidak menimpa `noindex` bawaan. Halaman ini ada di balik middleware `auth`, jadi
// perayap selalu menerima 302 ke `/login` dan tidak pernah melihat isinya — menandainya
// `index, follow` hanya akan membuat orang berikutnya mengira ini permukaan SEO. Harga dan
// paket sudah tayang di beranda, yang memang terindeks.
useHead({ title: 'Buat undangan — Aruna Dewa' })
</script>

<template>
  <div class="min-h-svh bg-surface">
    <header class="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-xl">
      <div class="shell flex h-[4.5rem] items-center justify-between gap-6">
        <NuxtLink id="order-home" to="/" class="no-underline" aria-label="Aruna Dewa, ke beranda">
          <BrandLogo />
        </NuxtLink>

        <ol class="m-0 flex list-none items-center gap-1.5 p-0 sm:gap-3" aria-label="Tahapan pemesanan">
          <li v-for="(item, index) in STEPS" :key="item.label" class="flex items-center gap-1.5 sm:gap-3">
            <span
              :class="cn(
                'flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-2 text-caption font-semibold transition-colors duration-300 sm:pr-3.5',
                step === index + 1 ? 'bg-primary-soft text-primary-strong' : step > index + 1 ? 'text-ink' : 'text-ink-subtle',
              )"
              :aria-current="step === index + 1 ? 'step' : undefined"
            >
              <span
                :class="cn(
                  'grid h-7 w-7 place-items-center rounded-full text-[0.75rem]',
                  step === index + 1 ? 'bg-primary text-white' : step > index + 1 ? 'bg-success text-white' : 'border border-border-strong',
                )"
              >
                <Check v-if="step > index + 1" :size="13" :stroke-width="3" aria-hidden="true" />
                <template v-else>{{ index + 1 }}</template>
              </span>
              <span class="hidden sm:inline">{{ item.label }}</span>
            </span>
            <span v-if="index < STEPS.length - 1" class="h-px w-3 bg-border sm:w-6" aria-hidden="true" />
          </li>
        </ol>
      </div>

      <div class="h-0.5 w-full bg-border">
        <div
          class="h-full bg-primary transition-[width] duration-500 ease-out-expo"
          :style="{ width: `${(step / STEPS.length) * 100}%` }"
        />
      </div>
    </header>

    <div class="shell grid gap-10 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-16">
      <div class="grid content-start gap-7">
        <header class="grid gap-3">
          <p class="eyebrow">{{ STEPS[step - 1]!.eyebrow }}</p>
          <h1 class="m-0 font-display text-h1 font-semibold text-ink">{{ STEPS[step - 1]!.title }}</h1>
          <!--
            Di bawah `lg` bingkai pratinjau disembunyikan: kartu setinggi undangan di bawah
            formulir hanya menggandakan gulungan. Yang perlu dipantau di ponsel cukup satu
            baris — nama yang akan tampil dan alamatnya.
          -->
          <p id="order-preview-summary" class="m-0 text-caption text-ink-muted lg:hidden">
            Tampil sebagai <strong class="font-semibold text-ink">{{ previewTitle }}</strong>
            · arunadewa.id/i/{{ previewSlug }}
          </p>
        </header>

        <form class="grid gap-6" @submit.prevent="step === STEPS.length ? checkout() : next()">
          <fieldset :disabled="!ready || pending" class="grid gap-5">
            <!-- Step 1 — couple ------------------------------------------------>
            <template v-if="step === 1">
              <div class="grid gap-5 sm:grid-cols-2">
                <UiField id="order-partner1" v-slot="{ id, invalid }" label="Nama pasangan 1" :error="fieldErrors.partner1" required>
                  <UiInput :id="id" v-model="form.partner1" :invalid="invalid" placeholder="Aruna" required @blur="autoSlug" />
                </UiField>
                <UiField id="order-partner2" v-slot="{ id, invalid }" label="Nama pasangan 2" :error="fieldErrors.partner2" required>
                  <UiInput :id="id" v-model="form.partner2" :invalid="invalid" placeholder="Dewa" required @blur="autoSlug" />
                </UiField>
              </div>

              <!--
                Labelnya menyebut tempatnya, karena itulah satu-satunya efeknya: nama ini tampil di
                dasbor dan judul tab, tidak pernah di undangan. Placeholder-nya nama yang sedang
                diketik, supaya "kosongkan" punya wajah.
              -->
              <UiField id="order-title" v-slot="{ id }" label="Nama undangan di dasbor" hint="Hanya kalian yang melihatnya, tamu tidak. Kosongkan untuk memakai nama kalian berdua.">
                <UiInput :id="id" v-model="form.title" :placeholder="previewTitle" />
              </UiField>

              <UiField
id="order-slug"
                v-slot="{ id, invalid }"
                label="Alamat undangan"
                :error="fieldErrors.slug"
                hint="Huruf kecil, angka, dan tanda hubung. Ini yang dibuka tamu."
                required
              >
                <UiInput :id="id" v-model="form.slug" :invalid="invalid" prefix="arunadewa.id/i/" placeholder="aruna-dan-dewa" required />
              </UiField>
            </template>

            <!-- Step 2 — event -------------------------------------------------->
            <template v-else-if="step === 2">
              <UiField id="order-date" v-slot="{ id }" label="Tanggal acara" hint="Bisa diubah kapan saja dari dashboard.">
                <UiInput :id="id" v-model="form.date" type="date" />
              </UiField>
              <UiField id="order-venue" v-slot="{ id }" label="Nama tempat">
                <UiInput :id="id" v-model="form.venue" placeholder="Pendopo Aruna" />
              </UiField>
              <UiField id="order-address" v-slot="{ id }" label="Alamat lengkap">
                <UiTextarea :id="id" v-model="form.address" rows="3" placeholder="Jl. Kaliurang KM 9, Sleman, Yogyakarta" />
              </UiField>
              <UiField id="order-map-url" v-slot="{ id }" label="Tautan Google Maps" hint="Opsional. Tamu akan melihat tombol “Buka peta” di undangan.">
                <UiInput :id="id" v-model="form.mapUrl" type="url" placeholder="https://maps.google.com/…" />
              </UiField>

              <label class="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.9375rem] text-ink">
                <input id="order-same-venue" v-model="form.sameVenue" type="checkbox" class="h-4 w-4 accent-[var(--color-primary)]">
                Lokasi akad dan resepsi sama
              </label>

              <template v-if="!form.sameVenue">
                <p class="m-0 text-[0.9375rem] font-semibold text-ink">Lokasi resepsi</p>
                <UiField id="order-venue2" v-slot="{ id }" label="Nama tempat resepsi">
                  <UiInput :id="id" v-model="form.venue2" placeholder="Gedung Kartika" />
                </UiField>
                <UiField id="order-address2" v-slot="{ id }" label="Alamat resepsi">
                  <UiTextarea :id="id" v-model="form.address2" rows="3" />
                </UiField>
                <UiField id="order-map-url2" v-slot="{ id }" label="Tautan Google Maps resepsi">
                  <UiInput :id="id" v-model="form.mapUrl2" type="url" placeholder="https://maps.google.com/…" />
                </UiField>
              </template>
            </template>

            <!-- Step 3 — theme -------------------------------------------------->
            <template v-else-if="step === 3">
              <p v-if="dariTautanTema" id="order-tema-catatan" class="notice m-0">
                Tema di sini adalah titik awal — warna, ornamen, amplop, kata-kata, dan gerak bisa
                kalian ubah di editor dengan add-on Desain, yang sudah kami centangkan.
              </p>
              <!--
                Pemilih STRUKTUR (fase 74.11), di atas pemilih tema karena ia keputusan yang
                lebih besar: struktur menentukan bagian apa saja yang ada, tema hanya warnanya.

                `v-if` sengaja: selama baru ada satu struktur hidup, barisnya tidak tampil sama
                sekali. Ia muncul sendiri begitu struktur kedua didaftarkan — tidak ada yang
                perlu diingat untuk menyalakannya.
              -->
              <fieldset v-if="liveStructureIds.length > 1" class="m-0 grid gap-2 border-0 p-0">
                <legend class="mb-1 p-0 text-caption font-semibold uppercase tracking-[0.08em] text-ink-muted">Tampilan undangan</legend>
                <div class="grid gap-2 sm:grid-cols-2">
                  <label
                    v-for="id in liveStructureIds"
                    :key="id"
                    :class="cn(
                      'grid cursor-pointer gap-1 rounded-lg border p-3 transition-colors duration-200',
                      form.structureId === id ? 'border-primary shadow-lift' : 'border-border hover:border-border-strong',
                    )"
                  >
                    <input :id="`order-struktur-${id}`" v-model="form.structureId" type="radio" name="struktur" :value="id" class="peer sr-only">
                    <span class="font-semibold text-ink">{{ structures[id].name }}</span>
                    <span class="text-caption text-ink-muted">{{ structures[id].tagline }}</span>
                  </label>
                </div>
              </fieldset>

              <div class="grid gap-3 sm:grid-cols-3">
                <label
                  v-for="theme in invitationThemes"
                  :key="theme.id"
                  :class="cn(
                    'group relative grid cursor-pointer gap-3 overflow-hidden rounded-lg border p-3 transition-[border-color,box-shadow] duration-300',
                    form.templateId === theme.id ? 'border-primary shadow-lift' : 'border-border hover:border-border-strong',
                  )"
                >
                  <input :id="`order-theme-${theme.id}`" v-model="form.templateId" type="radio" name="tema" :value="theme.id" class="peer sr-only">

                  <span
                    class="grid aspect-[3/4] place-items-center rounded-md px-3 text-center"
                    :style="{
                      background: theme.tokens.background,
                      color: theme.tokens.foreground,
                      // Tanpa ramp, pemisah di pratinjau ini jatuh ke `currentColor` dan tampil
                      // satu warna — pasangan memilih tema dari kartu yang tidak jujur.
                      ...rampStyle(ornamentRamp(theme.tokens, theme.accent)),
                    }"
                  >
                    <span class="grid justify-items-center gap-1.5">
                      <OrnamentDivider class="h-4 w-20 opacity-70" :style="{ color: theme.tokens.primary }" />
                      <span class="text-[1.05rem] leading-tight" :style="{ fontFamily: fontStack(theme.tokens.font) }">
                        Aruna &amp; Dewa
                      </span>
                    </span>
                  </span>

                  <span class="grid gap-1 px-1 pb-1">
                    <span class="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-ink">
                      <Check v-if="form.templateId === theme.id" :size="15" class="text-primary" aria-hidden="true" />
                      {{ theme.name }}
                    </span>
                    <span class="text-caption text-ink-subtle">{{ theme.mood }}</span>
                  </span>

                  <span class="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-[var(--color-ring)]" />
                </label>
              </div>

              <p class="m-0 text-caption text-ink-subtle">
                Warna, font, dan urutan section masih bisa diubah di editor setelah undangan dibuat.
              </p>
            </template>

            <!-- Step 4 — package & payment -------------------------------------->
            <template v-else>
              <div v-if="!catalog" class="grid gap-3">
                <UiSkeleton v-for="index in 2" :key="index" class="h-24" />
              </div>

              <div v-else class="grid gap-3">
                <UiRadioCard v-for="pack in catalog.packages" :id="`order-package-${pack.id}`" :key="pack.id" v-model="form.packageId" :value="pack.id" name="paket">
                  <span class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span class="text-[1.0625rem] font-semibold text-ink">{{ pack.name }}</span>
                    <span class="font-display text-[1.5rem] font-semibold text-ink">{{ formatRupiah(pack.price) }}</span>
                  </span>
                  <span class="mt-1 block text-caption text-ink-muted">{{ pack.features.length }} fitur termasuk · aktif 12 bulan</span>
                </UiRadioCard>
              </div>

              <fieldset v-if="availableAddons.length" class="grid gap-3">
                <legend class="mb-1 text-[0.8125rem] font-semibold text-ink">Tambahan (opsional)</legend>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="addon in availableAddons"
                    :key="addon.id"
                    :class="cn(
                      'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[0.875rem] transition-colors duration-200',
                      form.addonIds.includes(addon.id) ? 'border-primary bg-primary-soft text-primary-strong' : 'border-border-strong text-ink hover:border-ink/40',
                    )"
                  >
                    <input :id="`order-addon-${addon.id}`" v-model="form.addonIds" type="checkbox" :value="addon.id" class="sr-only">
                    <Check v-if="form.addonIds.includes(addon.id)" :size="14" aria-hidden="true" />
                    {{ addon.name }}
                    <span class="font-semibold">{{ formatRupiah(addon.price) }}</span>
                  </label>
                </div>
              </fieldset>

              <dl class="m-0 grid gap-2.5 rounded-lg border border-border bg-surface-2 p-5">
                <div class="flex justify-between gap-4">
                  <dt class="text-[0.9375rem] text-ink-muted">Undangan</dt>
                  <dd class="m-0 text-right text-[0.9375rem] font-medium text-ink">
                    {{ form.partner1 || 'Aruna' }} &amp; {{ form.partner2 || 'Dewa' }}
                    <span class="block text-caption text-ink-subtle">/i/{{ form.slug || 'aruna-dan-dewa' }}</span>
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-[0.9375rem] text-ink-muted">Tema</dt>
                  <dd class="m-0 text-[0.9375rem] font-medium text-ink">{{ invitationThemes.find(t => t.id === form.templateId)?.name }}</dd>
                </div>
                <div class="flex justify-between gap-4 border-t border-border pt-3">
                  <dt class="text-[0.9375rem] font-semibold text-ink">Total</dt>
                  <dd class="m-0 font-display text-[1.5rem] font-semibold text-primary">{{ formatRupiah(total) }}</dd>
                </div>
              </dl>
            </template>

            <p v-if="error" role="alert" class="m-0 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.875rem] text-danger">
              {{ error }}
            </p>

            <DemoBadge v-if="step === STEPS.length" note="Pembayaran dilewati: undangan langsung aktif." />

            <div class="flex items-center justify-between gap-3 pt-1">
              <UiButton v-if="step > 1" id="order-back" type="button" tone="ghost" @click="step--">
                <ArrowLeft :size="17" aria-hidden="true" />
                Kembali
              </UiButton>
              <span v-else />

              <UiButton id="order-submit" type="submit" size="lg" :loading="pending">
                <template v-if="step === STEPS.length">
                  <CreditCard v-if="!pending" :size="17" aria-hidden="true" />
                  {{ pending ? 'Menyiapkan pembayaran…' : 'Lanjut ke pembayaran' }}
                </template>
                <template v-else>
                  Lanjut
                  <ArrowRight :size="17" aria-hidden="true" />
                </template>
              </UiButton>
            </div>
          </fieldset>
        </form>
      </div>

      <!--
        Pratinjau langsung: barang yang sebenarnya dibeli. Dirender selebar ponsel karena
        tamu hampir selalu membukanya dari sana, dan hanya section langkah aktif yang tampil
        (lihat `utils/order-preview.ts`). Kotaknya baru menggulung di langkah terakhir.
      -->
      <aside ref="previewRoot" class="hidden lg:sticky lg:top-28 lg:grid lg:self-start" aria-label="Pratinjau undangan">
        <div class="grid gap-3">
          <p class="eyebrow">Pratinjau langsung</p>
          <div data-order-preview class="mx-auto w-full max-w-[26.5rem] overflow-hidden rounded-[1.25rem] border border-border bg-surface-2 shadow-float">
            <p class="m-0 flex items-center justify-center px-4 pt-3 pb-2">
              <span class="max-w-full truncate rounded-full bg-surface px-3.5 py-1.5 text-caption text-ink-subtle ring-1 ring-border">
                arunadewa.id/i/{{ previewSlug }}
              </span>
            </p>
            <div :class="cn('px-3 pb-3', previewScrollable && 'max-h-[34rem] overflow-y-auto [scrollbar-gutter:stable]')">
              <InvitationPhoneFrame v-model:scale="previewScale" :width="390" :max-height="previewMaxHeight" class="rounded-xl bg-surface ring-1 ring-border">
                <InvitationRenderer :document="preview" compact />
              </InvitationPhoneFrame>
            </div>
          </div>
          <p class="m-0 text-caption text-ink-subtle">
            Selebar ponsel, seperti yang dibuka tamu.
            <span v-if="previewScalePct < 100" class="tabular-nums">Diperkecil {{ previewScalePct }}%.</span>
          </p>
          <p class="m-0 flex items-center gap-2 text-caption text-ink-subtle">
            <Loader2 v-if="pending" :size="14" class="animate-spin" aria-hidden="true" />
            Draft tersimpan otomatis di perangkat ini.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
