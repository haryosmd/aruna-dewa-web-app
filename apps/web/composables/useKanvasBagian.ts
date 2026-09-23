import type { ComputedRef, InjectionKey } from 'vue'
import type { Section } from '~/types/aruna'
import { bacaKanvas, type Kanvas } from '~/utils/kanvas'

/**
 * Bagian yang sedang merender sebuah keping kanvas (fase 81).
 *
 * `InvitationOrnamen` dan `InvitationText` perlu tahu bagian mana yang memiliki mereka supaya bisa
 * membaca `section.data.kanvas` — tapi sebagian besar pemanggilnya (sudut di kartu acara, segel di
 * gerbang, pita babak) tidak memegang `section` sebagai prop. Disalurkan lewat provide/inject dari
 * SATU tempat, loop di `Renderer.vue`, supaya tiga puluh lebih situs render tidak perlu diubah
 * tanda tangannya hanya untuk meneruskan bagian.
 */
export interface LingkupBagian {
  section: ComputedRef<Section | undefined>
  kanvas: ComputedRef<Required<Kanvas>>
}

const kunciLingkup = Symbol('aruna-lingkup-bagian') as InjectionKey<LingkupBagian>

export function sediakanBagian(section: () => Section | undefined) {
  const bagian = computed(section)
  provide(kunciLingkup, { section: bagian, kanvas: computed(() => bacaKanvas(bagian.value?.data)) })
}

const kosong: LingkupBagian = {
  section: computed(() => undefined),
  kanvas: computed(() => ({ keping: {}, tambahan: [] })),
}

/** Di luar lingkup (pratinjau tema di landing, dasbor) keping dirender apa adanya, tanpa kanvas. */
export function useLingkupBagian(): LingkupBagian {
  return inject(kunciLingkup, kosong)
}
