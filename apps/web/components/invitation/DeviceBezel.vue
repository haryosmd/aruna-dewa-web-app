<script setup lang="ts">
/**
 * Bezel perangkat untuk panggung pratinjau (fase 72.2): iPhone bernotch, Android berlubang kamera.
 * Murni dekoratif — undangannya dirender apa adanya di dalam slot dan tetap `data-preview-stage`
 * milik `InvitationPhoneFrame`. Ukuran layar mengikuti lebar render (390/412), bezelnya yang
 * menyesuaikan diri, bukan sebaliknya.
 */
withDefaults(defineProps<{ device?: 'iphone' | 'android' | 'none'; screenHeight?: number }>(), { device: 'iphone', screenHeight: 780 })
</script>

<template>
  <div
    v-if="device === 'none'"
    class="overflow-hidden rounded-xl bg-surface shadow-float ring-1 ring-border"
  >
    <slot />
  </div>
  <div
    v-else
    :class="cn(
      'relative rounded-[3rem] bg-[#141416] p-[10px] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6),inset_0_0_0_2px_#2a2a2e]',
      device === 'android' && 'rounded-[2.2rem]',
    )"
    :data-device="device"
  >
    <span
      v-if="device === 'iphone'"
      class="pointer-events-none absolute left-1/2 top-[10px] z-10 h-[30px] w-[38%] -translate-x-1/2 rounded-b-[18px] bg-[#141416]"
      aria-hidden="true"
    />
    <span
      v-else
      class="pointer-events-none absolute left-1/2 top-[18px] z-10 h-[14px] w-[14px] -translate-x-1/2 rounded-full bg-[#141416] ring-2 ring-[#2a2a2e]"
      aria-hidden="true"
    />
    <div
      :class="cn('relative overflow-hidden bg-surface', device === 'iphone' ? 'rounded-[2.4rem]' : 'rounded-[1.7rem]')"
      :style="{ maxHeight: `${screenHeight}px` }"
    >
      <slot />
    </div>
    <span v-if="device === 'iphone'" class="pointer-events-none absolute bottom-[16px] left-1/2 z-10 h-[5px] w-[34%] -translate-x-1/2 rounded-full bg-[#141416]/85" aria-hidden="true" />
  </div>
</template>
