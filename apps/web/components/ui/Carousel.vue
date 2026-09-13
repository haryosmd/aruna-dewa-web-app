<script setup lang="ts">
import emblaCarouselVue from 'embla-carousel-vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{ label: string; align?: 'start' | 'center'; loop?: boolean; controls?: boolean }>(),
  { align: 'start', loop: false, controls: true },
)

const [container, embla] = emblaCarouselVue({ align: props.align, loop: props.loop, containScroll: 'trimSnaps', skipSnaps: false })

const snaps = ref<number[]>([])
const selected = ref(0)
const canPrev = ref(false)
const canNext = ref(false)

function sync() {
  const api = embla.value
  if (!api) return
  snaps.value = api.scrollSnapList()
  selected.value = api.selectedScrollSnap()
  canPrev.value = api.canScrollPrev()
  canNext.value = api.canScrollNext()
}

watch(embla, (api) => {
  if (!api) return
  sync()
  api.on('select', sync).on('reInit', sync)
}, { immediate: true })

defineExpose({ scrollTo: (index: number) => embla.value?.scrollTo(index) })
</script>

<template>
  <!-- min-w-0 keeps the shrink-0 slides from widening a grid track and overflowing the page. -->
  <section :aria-label="label" class="relative min-w-0">
    <div ref="container" class="min-w-0 overflow-hidden">
      <div class="flex touch-pan-y gap-4 md:gap-6">
        <slot />
      </div>
    </div>

    <div v-if="controls" class="mt-6 flex items-center justify-between gap-4">
      <div class="flex items-center gap-2" role="tablist" :aria-label="`Posisi ${label}`">
        <button
          v-for="(_, index) in snaps"
          :key="index"
          type="button"
          role="tab"
          :aria-selected="selected === index"
          :aria-label="`Ke slide ${index + 1}`"
          :class="cn(
            'h-2 rounded-full transition-all duration-300 ease-[var(--ease-out-quart)]',
            selected === index ? 'w-7 bg-primary' : 'w-2 bg-border-strong hover:bg-ink-subtle',
          )"
          @click="embla?.scrollTo(index)"
        />
      </div>

      <div class="flex gap-2">
        <button
          type="button"
          aria-label="Sebelumnya"
          :disabled="!canPrev"
          class="grid h-11 w-11 place-items-center rounded-full border border-border-strong text-ink transition-colors duration-200 hover:border-ink hover:bg-surface-2 disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:bg-transparent"
          @click="embla?.scrollPrev()"
        >
          <ChevronLeft :size="19" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Berikutnya"
          :disabled="!canNext"
          class="grid h-11 w-11 place-items-center rounded-full border border-border-strong text-ink transition-colors duration-200 hover:border-ink hover:bg-surface-2 disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:bg-transparent"
          @click="embla?.scrollNext()"
        >
          <ChevronRight :size="19" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>
