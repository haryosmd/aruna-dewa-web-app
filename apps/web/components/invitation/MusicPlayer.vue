<script setup lang="ts">
import { Disc3, Pause } from 'lucide-vue-next'

const props = defineProps<{ url: string; autostart?: boolean }>()

const audio = ref<HTMLAudioElement | null>(null)
const playing = ref(false)

/**
 * Browsers block audio that starts without a gesture, so playback is armed only after
 * the visitor opens the invitation. If it is still refused we simply stay paused.
 */
watch(() => props.autostart, async (armed) => {
  if (!armed || !audio.value || playing.value) return
  try {
    await audio.value.play()
    playing.value = true
  } catch { /* Visitor can start it from the button. */ }
})

async function toggle() {
  if (!audio.value) return
  if (playing.value) {
    audio.value.pause()
    playing.value = false
    return
  }
  try {
    await audio.value.play()
    playing.value = true
  } catch { playing.value = false }
}
</script>

<template>
  <div v-if="props.url" class="fixed bottom-[5.5rem] right-4 z-30">
    <audio ref="audio" :src="props.url" loop preload="none" />
    <button
      type="button"
      :aria-label="playing ? 'Jeda musik' : 'Putar musik'"
      :aria-pressed="playing"
      class="grid h-12 w-12 place-items-center rounded-full shadow-[0_10px_28px_-10px_rgb(0_0_0/0.5)] transition-transform duration-300 hover:scale-105"
      style="background: var(--iv-primary); color: #fffdf7"
      @click="toggle"
    >
      <Pause v-if="playing" :size="19" aria-hidden="true" />
      <Disc3 v-else :size="20" aria-hidden="true" />
    </button>
  </div>
</template>
