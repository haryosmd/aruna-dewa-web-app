<script setup lang="ts">
import { gayaTambahan } from '~/utils/kanvas'
import type { OrnamentRef } from '~/utils/ornaments'

/**
 * Ornamen yang DITAMBAHKAN pasangan ke sebuah bagian (fase 81), maksimal enam.
 *
 * Lapisan absolut seluas bagiannya; tiap ornamen berpusat di (x, y) `cqw` dari pojok kiri-atas
 * bagian, jadi posisinya sama di ponsel, tablet, dan kolom desktop. Lapisannya sendiri tembus
 * pointer di mana pun — hanya kepingnya yang bisa ditunjuk, dan hanya di panggung.
 *
 * Kunci keping `a:<id>`, terpisah dari `o:`/`t:` milik keping yang sudah ada di markup: ornamen
 * tambahan bisa dihapus, keping bawaan hanya bisa disembunyikan.
 */
const { kanvas, section } = useLingkupBagian()
const tambahan = computed(() => kanvas.value.tambahan)
</script>

<template>
  <div v-if="tambahan.length" class="iv-kanvas-lapisan" aria-hidden="true">
    <span
      v-for="item in tambahan"
      :key="item.id"
      :data-iv-el="`a:${item.id}`"
      :data-iv-bagian="section?.id"
      :data-iv-glyph="item.glyph"
      :data-iv-terkunci="item.terkunci ? '' : undefined"
      class="iv-keping iv-keping--ornamen iv-kanvas-tambahan"
      :style="gayaTambahan(item)"
    >
      <OrnamentGlyph
        :glyph="(item.unggahan ?? item.glyph) as OrnamentRef"
        data-iv-ornament
        :data-iv-gerak="item.gerak && item.gerak !== 'bagian' ? item.gerak : undefined"
        :data-iv-tunda="item.tunda || undefined"
        class="iv-keping-isi iv-keping-isi--penuh"
      />
    </span>
  </div>
</template>

<style>
.iv-kanvas-lapisan {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  /*
   * Acuan `cqw` ornamen tambahan adalah lapisan ini sendiri — seluas bagiannya. Di halaman tamu
   * desktop gerbang amplop selebar layar, bukan selebar kolom, dan posisi tambahan harus ikut
   * bidang yang benar-benar ia hiasi.
   */
  container-type: inline-size;
}
.iv-kanvas-tambahan {
  position: absolute;
  height: auto;
  color: var(--iv-primary);
}
</style>
