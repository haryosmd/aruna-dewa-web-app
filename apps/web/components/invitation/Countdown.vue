<script setup lang="ts">
const props = defineProps<{ date: string }>()

const now = ref(0)
/** Server and browser clocks differ by seconds, so the ticking numbers only start after hydration. */
const live = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  now.value = Date.now()
  live.value = true
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const target = computed(() => Date.parse(props.date))
const valid = computed(() => Number.isFinite(target.value))

const units = computed(() => {
  if (!valid.value) return null
  if (!live.value) return [{ value: 0, label: 'Hari' }, { value: 0, label: 'Jam' }, { value: 0, label: 'Menit' }, { value: 0, label: 'Detik' }]
  const remaining = Math.max(0, target.value - now.value)
  const seconds = Math.floor(remaining / 1000)
  return [
    { value: Math.floor(seconds / 86400), label: 'Hari' },
    { value: Math.floor(seconds / 3600) % 24, label: 'Jam' },
    { value: Math.floor(seconds / 60) % 60, label: 'Menit' },
    { value: seconds % 60, label: 'Detik' },
  ]
})

const passed = computed(() => live.value && valid.value && target.value <= now.value)
const pad = (value: number) => String(value).padStart(2, '0')
</script>

<template>
  <div v-if="units" class="grid w-full gap-4">
    <p v-if="passed" class="iv-display m-0 text-[1.75rem]">Hari bahagia telah tiba.</p>

    <ul v-else class="m-0 grid grid-cols-4 gap-2 p-0 list-none sm:gap-3">
      <li
        v-for="unit in units"
        :key="unit.label"
        data-iv-reveal
        class="iv-card grid justify-items-center gap-1 rounded-md px-1 py-4 sm:py-5"
      >
        <span class="iv-display text-[clamp(1.6rem,7vw,2.4rem)] leading-none tabular-nums">{{ pad(unit.value) }}</span>
        <span class="iv-kicker m-0 text-[0.5625rem]">{{ unit.label }}</span>
      </li>
    </ul>

    <p class="sr-only" aria-live="polite">
      {{ passed ? 'Acara sedang berlangsung.' : `${units[0]!.value} hari menuju hari bahagia.` }}
    </p>
  </div>

  <p v-else class="iv-display m-0 text-[1.75rem]">Tanggal akan segera diumumkan.</p>
</template>
