<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from 'reka-ui'
import { ArrowRight, HelpCircle, LayoutDashboard, Menu, Palette, Route, Sparkles, Tag, X, type LucideIcon } from 'lucide-vue-next'

/**
 * Ikon hanya dirender di drawer mobile: di sana barisnya tinggi dan berpembatas, jadi
 * ikon memberi jangkar visual. Nav desktop tetap pill teks supaya tidak ramai.
 */
export type HeaderSection = { label: string; href: string; icon: LucideIcon }

const props = withDefaults(defineProps<{ sections?: HeaderSection[] }>(), {
  sections: () => [
    { label: 'Tema', href: '#tema', icon: Palette },
    { label: 'Fitur', href: '#fitur', icon: Sparkles },
    { label: 'Dasbor', href: '#dashboard', icon: LayoutDashboard },
    { label: 'Cara kerja', href: '#cara-kerja', icon: Route },
    { label: 'Harga', href: '#harga', icon: Tag },
    { label: 'FAQ', href: '#faq', icon: HelpCircle },
  ],
})

const active = ref('')
const scrolled = ref(false)
const open = ref(false)
const auth = useAuthStore()
/** The drawer is a client-only dialog, so its trigger stays inert until hydration. */
const ready = useInteractiveReady()

onMounted(() => {
  const onScroll = () => { scrolled.value = window.scrollY > 12 }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  const observer = new IntersectionObserver(
    entries => entries.forEach((entry) => { if (entry.isIntersecting) active.value = `#${entry.target.id}` }),
    { rootMargin: '-35% 0px -58% 0px' },
  )
  document.querySelectorAll('main section[id]').forEach(section => observer.observe(section))

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    observer.disconnect()
  })
})

const dashboardHref = computed(() => (auth.me ? '/dashboard' : '/login'))
const dashboardLabel = computed(() => (auth.me ? 'Dashboard' : 'Masuk'))
</script>

<template>
  <header
    :class="cn(
      'sticky top-0 z-20 border-b transition-[background-color,border-color,backdrop-filter] duration-300',
      scrolled ? 'border-border bg-surface/85 backdrop-blur-xl' : 'border-transparent bg-surface/0',
    )"
  >
    <div class="shell flex h-[4.5rem] items-center justify-between gap-6">
      <NuxtLink id="nav-home" to="/" class="no-underline" aria-label="Aruna Dewa, ke beranda">
        <BrandLogo />
      </NuxtLink>

      <nav class="hidden items-center gap-1 lg:flex" aria-label="Bagian halaman">
        <a
          v-for="section in props.sections"
          :id="`nav-section-${section.href.replace('#', '')}`"
          :key="section.href"
          :href="section.href"
          :aria-current="active === section.href ? 'true' : undefined"
          :class="cn(
            'rounded-full px-3.5 py-2 text-[0.875rem] font-medium no-underline transition-colors duration-200',
            active === section.href ? 'bg-surface-3 text-ink' : 'text-ink-muted hover:text-ink',
          )"
        >{{ section.label }}</a>
      </nav>

      <div class="flex items-center gap-2">
        <NuxtLink
          id="nav-dashboard"
          :to="dashboardHref"
          class="hidden rounded-full px-3.5 py-2 text-[0.875rem] font-semibold text-ink no-underline transition-colors duration-200 hover:text-primary sm:inline-flex"
        >
          {{ dashboardLabel }}
        </NuxtLink>

        <UiButton id="nav-order" as="NuxtLink" to="/order" size="sm" class="hidden sm:inline-flex">
          Buat undangan
          <ArrowRight :size="16" aria-hidden="true" />
        </UiButton>

        <DialogRoot v-model:open="open">
          <DialogTrigger
            id="nav-menu-toggle"
            class="grid h-11 w-11 place-items-center rounded-full border border-border-strong text-ink disabled:opacity-60 lg:hidden"
            aria-label="Menu"
            :disabled="!ready"
          >
            <Menu :size="20" aria-hidden="true" />
          </DialogTrigger>

          <DialogPortal>
            <DialogOverlay class="fixed inset-0 z-40 bg-ink/45 backdrop-blur-sm data-[state=open]:animate-[fade-in_200ms_ease-out]" />
            <DialogContent
              class="fixed inset-y-0 right-0 z-50 flex w-[min(22rem,88vw)] flex-col gap-8 overflow-y-auto bg-surface p-6 shadow-[var(--shadow-veil)] data-[state=open]:animate-[slide-in-right_320ms_var(--ease-out-expo)]"
            >
              <div class="flex items-start justify-between gap-4">
                <DialogTitle class="font-display text-h3">Menu</DialogTitle>
                <DialogClose class="grid h-11 w-11 place-items-center rounded-full border border-border-strong text-ink" aria-label="Tutup menu">
                  <X :size="19" aria-hidden="true" />
                </DialogClose>
              </div>
              <DialogDescription class="sr-only">Navigasi bagian halaman dan akun</DialogDescription>

              <nav class="grid gap-1" aria-label="Bagian halaman">
                <a
                  v-for="section in props.sections"
                  :key="section.href"
                  :href="section.href"
                  class="flex min-h-12 items-center gap-3 border-b border-border text-[1.0625rem] font-medium text-ink no-underline"
                  @click="open = false"
                >
                  <component :is="section.icon" :size="18" class="shrink-0 text-primary" aria-hidden="true" />
                  {{ section.label }}
                </a>
              </nav>

              <div class="mt-auto grid gap-3">
                <UiButton id="nav-menu-dashboard" as="NuxtLink" :to="dashboardHref" tone="outline" block @click="open = false">
                  {{ dashboardLabel }}
                </UiButton>
                <UiButton id="nav-menu-order" as="NuxtLink" to="/order" block @click="open = false">
                  Buat undangan
                  <ArrowRight :size="16" aria-hidden="true" />
                </UiButton>
              </div>
            </DialogContent>
          </DialogPortal>
        </DialogRoot>
      </div>
    </div>
  </header>
</template>

<style>
@keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes slide-in-right { from { transform: translateX(100%) } to { transform: translateX(0) } }
</style>
