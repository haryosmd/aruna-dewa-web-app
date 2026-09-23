<script setup lang="ts">
import type { OrnamentId } from '~/utils/ornaments'

/**
 * Pita pergantian babak.
 *
 * Yang membuat undangan terbaca sebagai loop bukan cuma keseragaman geraknya, tapi juga
 * bahwa tiga belas section sekadar bersambung tanpa ada yang menandai bahwa babaknya
 * berganti. Pita ini yang menandainya, dan ia juga yang dianimasikan — bukan lapisan baru
 * yang dibuat JavaScript lalu menelan section di bawahnya.
 *
 * **Keadaan istirahatnya adalah keadaan yang benar.** Tanpa JavaScript — dan pada
 * `prefers-reduced-motion`, di mana callback motion tidak pernah jalan — pita ini tetap
 * terbaca sebagai pembatas bab yang wajar. Tidak ada `opacity: 0` di sini, dan ada tes
 * yang menjaganya (`test/motion-rules.spec.ts`): aturan "efek ber-pin wajib punya keadaan
 * istirahat" berlaku sama untuk topeng.
 */
const props = withDefaults(
  defineProps<{
    kind?: 'none' | 'dissolve' | 'veil' | 'wipe'
    /** Bentuk topengnya. Selalu `OrnamentId`, jadi ia tidak bisa jadi path lepas. */
    shape?: OrnamentId | null
    from?: 'top' | 'bottom'
  }>(),
  { kind: 'dissolve', shape: null, from: 'bottom' },
)

/** `none` tidak merender apa pun — babak itu memang sengaja bersambung langsung. */
const tampil = computed(() => props.kind !== 'none')
/** Pita milik bagian SESUDAHNYA (fase 81) — lingkupnya disediakan loop Renderer. */
const { section } = useLingkupBagian()
</script>

<template>
  <div
    v-if="tampil"
    class="iv-segue"
    data-iv-segue
    :data-segue-kind="kind"
    :data-segue-from="from"
    aria-hidden="true"
  >
    <!-- `data-iv-slot` sejak fase 80: pitanya kini slot `segue` yang bisa diganti dari kanvas. -->
    <!--
      Fase 81: keping kanvas `o:segue:pita`, milik bagian SESUDAH pita (lingkupnya disediakan loop
      Renderer). `.iv-segue-shape` dipasang di glyph, bukan di pembungkus: kelas itulah yang
      dianimasikan `segue()`, dan pembungkus membawa transform kanvas.
    -->
    <InvitationOrnamen v-if="shape" :glyph="shape" kelas-isi="iv-segue-shape" data-iv-ornament slot-id="segue" posisi="pita" />
    <span v-else class="iv-segue-rule" data-iv-slot="segue" data-iv-el="o:segue:pita" :data-iv-bagian="section?.id" />
  </div>
</template>

<style>
/*
 * Tinggi pita memakai `cqw`, bukan `vw`: undangan mengukur dirinya sendiri, dan pratinjau
 * perangkat di editor akan berbohong kalau pita ini membaca lebar layar.
 */
.iv-segue {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  height: clamp(1.5rem, 4cqw, 3rem);
  background: var(--iv-bg);
  color: var(--iv-accent);
  opacity: 0.8;
  pointer-events: none;
}

.iv-segue-shape {
  width: min(52%, 22rem);
  height: 100%;
  object-fit: contain;
}

/* Cadangan untuk `dissolve`, yang tidak membawa bentuk: satu garis rambut yang memudar di kedua ujungnya. */
.iv-segue-rule {
  width: min(46%, 18rem);
  height: 1px;
  background: linear-gradient(90deg, transparent, currentColor 22%, currentColor 78%, transparent);
}

/*
 * Pita `veil` menggantung dari tepi yang disebut `from` — itulah yang menentukan ke arah
 * mana ia menutup saat disapu. `transform-origin` ditulis di CSS, bukan di JS, supaya
 * keadaan istirahatnya sudah benar sebelum GSAP menyentuhnya sama sekali.
 */
.iv-segue[data-segue-from='top'] .iv-segue-shape { transform-origin: top center; }
.iv-segue[data-segue-from='bottom'] .iv-segue-shape { transform-origin: bottom center; }

.iv-segue[data-segue-kind='wipe'] { height: clamp(2rem, 5cqw, 3.5rem); }

/*
 * Dua pita bertetangga terjadi ketika section di antaranya merender nol elemen —
 * `Video` tanpa URL, `Rundown` tanpa acara. Menyembunyikan yang kedua di CSS jauh lebih
 * jujur daripada membuat Renderer menebak isi tiap section sebelum merendernya.
 */
.iv-segue + .iv-segue { display: none; }
</style>
