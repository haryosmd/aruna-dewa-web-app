<script setup lang="ts">
import { AlertCircle, ArrowLeft, Check, CloudUpload, LayoutTemplate, MessageSquareHeart, Send, UserPlus } from 'lucide-vue-next'

/**
 * Header studio (fase 72.1), meniru referensi: kiri = kembali + `Nama tema · kode` + pil status
 * simpan; tengah = segmented **Editor | Generator | Ucapan**; kanan = "Undang" (kolaborator, belum
 * ada — tombolnya jujur bilang "Segera") + tombol status **Published / Publikasikan**.
 *
 * Satu-satunya pemegang `<h1>` halaman editor sejak fase 62 — tes axe "dashboard screens are
 * accessible and titled" menagihnya. Status simpan tetap **tertulis** (`#editor-save-state`, dua
 * kalimat yang sama, tes membacanya kata demi kata): tanpa autosave (fase 18), "sudah tersimpan
 * atau belum" tidak boleh ditebak-tebak.
 */
const props = defineProps<{
  title: string
  slug: string
  invitationId: string
  themeName: string
  revision: number
  dirty: boolean
  saving: boolean
  publishing: boolean
  published: boolean
  error: string
  conflict: boolean
}>()

const emit = defineEmits<{
  publish: []
  reload: []
}>()

const route = useRoute()
const aktif = (path: string) => route.path.endsWith(path)

/** Editor | Generator | Ucapan — tiga halaman satu undangan, persis segmented nav referensi. */
const halaman = computed(() => [
  { id: 'editor', label: 'Editor', to: `/dashboard/${props.invitationId}/editor`, icon: LayoutTemplate },
  { id: 'generator', label: 'Generator', to: `/dashboard/${props.invitationId}/guests`, icon: Send },
  { id: 'ucapan', label: 'Ucapan', to: `/dashboard/${props.invitationId}/rsvps`, icon: MessageSquareHeart },
])
</script>

<template>
  <header class="sticky top-16 z-[var(--z-sticky)] grid gap-2 border-b border-border bg-surface/92 px-4 py-2.5 backdrop-blur-xl lg:static lg:px-5">
    <div class="grid items-center gap-x-4 gap-y-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div class="flex min-w-0 items-center gap-2">
        <UiButton id="editor-back" as="NuxtLink" :to="`/dashboard/${invitationId}`" tone="ghost" size="sm" class="-ml-2 px-2" aria-label="Kembali ke ringkasan">
          <ArrowLeft :size="18" aria-hidden="true" />
        </UiButton>
        <div class="grid min-w-0 gap-0">
          <h1 class="m-0 truncate font-display text-body-lg font-semibold leading-tight text-ink" :title="title">{{ title }}</h1>
          <p class="m-0 truncate text-caption text-ink-muted">{{ themeName }} · <code class="font-semibold">{{ slug }}</code></p>
        </div>
        <p
          id="editor-save-state"
          :class="cn('m-0 hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-ui-label font-medium md:flex', dirty ? 'bg-gold-soft text-warning' : 'bg-success-soft text-success')"
        >
          <AlertCircle v-if="dirty" :size="12" aria-hidden="true" />
          <Check v-else :size="12" aria-hidden="true" />
          {{ dirty ? 'Ada perubahan yang belum tersimpan' : 'Semua perubahan tersimpan' }}
        </p>
        <p class="sr-only">Draft revisi {{ revision }}. Versi publik hanya berubah saat kalian menerbitkan.</p>
      </div>

      <nav aria-label="Halaman undangan" class="justify-self-center">
        <ul class="m-0 flex list-none gap-0.5 rounded-full border border-border bg-surface-2 p-1">
          <li v-for="item in halaman" :key="item.id">
            <NuxtLink
              :id="`editor-nav-${item.id}`"
              :to="item.to"
              :aria-current="aktif(item.to) ? 'page' : undefined"
              :class="cn(
                'flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-ui font-semibold transition-colors duration-200',
                aktif(item.to) ? 'bg-surface text-success shadow-hairline' : 'text-ink-muted hover:text-ink',
              )"
            >
              <component :is="item.icon" :size="15" aria-hidden="true" />
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <UiTooltip content="Undang kolaborator untuk mengedit bersama — segera" side="bottom">
          <UiButton id="editor-undang" tone="outline" size="sm" disabled aria-label="Undang kolaborator (segera)">
            <UserPlus :size="16" aria-hidden="true" />
            Undang
          </UiButton>
        </UiTooltip>
        <UiButton
          id="editor-publish"
          :tone="published ? 'primary' : 'ink'"
          size="sm"
          :loading="publishing"
          :class="cn(published && 'bg-success hover:bg-success')"
          @click="emit('publish')"
        >
          <Check v-if="published && !publishing" :size="16" aria-hidden="true" />
          <CloudUpload v-else-if="!publishing" :size="16" aria-hidden="true" />
          {{ publishing ? 'Menerbitkan…' : published ? (dirty ? 'Terbitkan ulang' : 'Published') : 'Publikasikan' }}
        </UiButton>
      </div>
    </div>

    <p v-if="error" class="notice m-0" role="alert">
      {{ error }}
      <button v-if="conflict" id="editor-reload-server" class="button button-secondary ml-2" type="button" @click="emit('reload')">Muat ulang versi server</button>
    </p>
  </header>
</template>
