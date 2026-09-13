<script setup lang="ts">
import { Quote } from 'lucide-vue-next'
import { testimonials } from '~/content/social-proof'

const root = ref<HTMLElement | null>(null)

useArunaMotion(root, ({ revealText, revealUp }) => {
  revealText('[data-quotes-title]', { trigger: root.value })
  revealUp('[data-quote-card]', { y: 30, stagger: 0.08 })
})
</script>

<template>
  <section ref="root" class="section bg-surface-3">
    <div class="shell grid gap-12">
      <header class="grid max-w-2xl gap-5">
        <p class="eyebrow">Kata pasangan lain</p>
        <h2 data-quotes-title class="font-display text-display-2 font-semibold text-ink">
          Yang mereka ingat bukan websitenya — tapi tidak repotnya.
        </h2>
      </header>

      <UiCarousel label="Testimoni pasangan" align="start">
        <figure
          v-for="item in testimonials"
          :key="item.name"
          data-quote-card
          class="m-0 min-w-0 shrink-0 basis-[88%] sm:basis-[60%] lg:basis-[calc(33.333%-1rem)]"
        >
          <div class="grid h-full content-between gap-7 rounded-xl border border-border bg-surface p-7">
            <Quote :size="26" class="text-primary/40" aria-hidden="true" />
            <blockquote class="m-0 font-garamond text-[1.375rem] leading-[1.45] text-ink">
              {{ item.quote }}
            </blockquote>
            <figcaption class="grid gap-0.5 border-t border-border pt-5">
              <span class="text-[0.9375rem] font-semibold text-ink">{{ item.name }}</span>
              <span class="text-caption text-ink-subtle">{{ item.detail }}</span>
            </figcaption>
          </div>
        </figure>
      </UiCarousel>
    </div>
  </section>
</template>
