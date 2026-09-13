<script setup lang="ts">
import { intensityScale, layerSlot, ornamentBank, type LayerSlot, type OrnamentId, type OrnamentIntensity, type OrnamentSet } from '~/utils/ornaments'

/**
 * Ladang ornamen satu section.
 *
 * Menggantikan `frame` tunggal yang dulu dipasang di tengah pada `opacity-[0.18]` — satu
 * keping 34rem yang menyisakan 0,27–0,42px tinta. Di sini 2–6 keping dipasang pada jangkar
 * tepi dengan bleed 8–18% keluar section, jadi ornamennya terbaca sebagai lapisan cetak di
 * balik isi, bukan sebagai watermark.
 *
 * Ukuran keping diturunkan dari lebar **wadahnya**, bukan dari viewport — lihat
 * `referenceWidth` dan `minRatio` di bawah.
 *
 * Section induknya yang memotong bleed (`.iv-section` sudah `overflow-hidden`).
 * Semua keping ditulis pada keadaan akhirnya; gerakannya murni `gsap.from` dari renderer,
 * jadi tanpa JS ladangnya tetap utuh.
 */

type Position =
  | 'top-left' | 'top-right' | 'top-center'
  | 'mid-left' | 'mid-right'
  | 'bottom-left' | 'bottom-right' | 'bottom-center'

interface Placement {
  slot: LayerSlot
  pos: Position
  /** Lebar dasar pada section selebar `referenceWidth`, sebelum dikalikan intensitas. */
  size: number
  /** Berapa bagian dari lebarnya sendiri yang dibiarkan meluber keluar tepi section. */
  bleed: number
  rotate?: number
  flip?: boolean
}

/**
 * Lebar section yang menjadi acuan angka `size` di bawah. Keping diukur terhadap lebar
 * wadahnya sendiri (`cqw`), bukan terhadap viewport, supaya ladang yang sama bekerja di
 * section selebar layar maupun di kartu tema landing selebar 300px.
 */
const referenceWidth = 1400

/**
 * Batas bawah dan atas, sebagai pecahan dari `size`.
 *
 * Tanpa batas bawah ornamen kembali jadi hantu di ponsel — masalah yang dibereskan Fase 1.
 * Dengan proporsi murni, `cascade` 250px di section 375px hanya 67px. `0.44` membuatnya
 * berhenti mengecil di 110px: keping tetap terbaca sebagai cetakan, tapi porsinya terhadap
 * bidang turun dari 62% (sebelum perbaikan ini) ke 29%. Titik peralihannya di 616px, jadi
 * ponsel dan kartu memakai batas bawah sementara tablet ke atas murni proporsional.
 */
const minRatio = 0.44
const maxRatio = 1.25

/**
 * Empat resep jangkar. Section berurutan memakai resep berbeda lewat `seed`, jadi
 * undangan tidak terbaca sebagai satu pola yang diulang sepuluh kali. Deterministik,
 * supaya render server dan klien sepakat.
 */
const recipes: Placement[][] = [
  [
    { slot: 'bloom', pos: 'bottom-center', size: 460, bleed: 0.16 },
    { slot: 'cascade', pos: 'top-left', size: 250, bleed: 0.14 },
    { slot: 'cascade', pos: 'top-right', size: 250, bleed: 0.14, flip: true },
    { slot: 'cluster', pos: 'bottom-left', size: 240, bleed: 0.12, rotate: 180, flip: true },
    { slot: 'cluster', pos: 'bottom-right', size: 240, bleed: 0.12, rotate: 180 },
    { slot: 'crown', pos: 'top-center', size: 440, bleed: 0.18 },
  ],
  [
    { slot: 'crown', pos: 'top-center', size: 470, bleed: 0.16 },
    { slot: 'cluster', pos: 'top-left', size: 270, bleed: 0.10 },
    { slot: 'cluster', pos: 'top-right', size: 270, bleed: 0.10, flip: true },
    { slot: 'swag', pos: 'bottom-center', size: 600, bleed: 0.08 },
    { slot: 'cascade', pos: 'mid-left', size: 220, bleed: 0.16 },
    { slot: 'cascade', pos: 'mid-right', size: 220, bleed: 0.16, flip: true },
  ],
  [
    { slot: 'cluster', pos: 'top-left', size: 290, bleed: 0.12 },
    { slot: 'cluster', pos: 'bottom-right', size: 290, bleed: 0.12, rotate: 180 },
    { slot: 'bloom', pos: 'bottom-center', size: 420, bleed: 0.14 },
    { slot: 'cluster', pos: 'top-right', size: 230, bleed: 0.12, flip: true },
    { slot: 'cluster', pos: 'bottom-left', size: 230, bleed: 0.12, rotate: 180, flip: true },
    { slot: 'crown', pos: 'top-center', size: 400, bleed: 0.18 },
  ],
  [
    { slot: 'cascade', pos: 'top-left', size: 260, bleed: 0.12 },
    { slot: 'cascade', pos: 'top-right', size: 260, bleed: 0.12, flip: true },
    { slot: 'swag', pos: 'bottom-center', size: 620, bleed: 0.10 },
    { slot: 'crown', pos: 'top-center', size: 420, bleed: 0.18 },
    { slot: 'cluster', pos: 'mid-left', size: 210, bleed: 0.14 },
    { slot: 'cluster', pos: 'mid-right', size: 210, bleed: 0.14, flip: true },
  ],
]

/** Nilai dasar tiap slot, sebelum intensitas dan tone ikut mengalikannya. */
const slotOpacity: Record<LayerSlot, number> = {
  bloom: 0.88, cascade: 0.72, crown: 0.8, cluster: 0.68, swag: 0.62,
}

const props = withDefaults(
  defineProps<{
    set: OrnamentSet
    intensity?: OrnamentIntensity
    /** Nada section induk. Di atas bidang gelap ornamen jadi kertas dan jauh lebih redup. */
    tone?: 'base' | 'paper' | 'tint' | 'ink' | 'primary'
    /** Membedakan resep antar section. Cukup indeks section-nya. */
    seed?: number
  }>(),
  { intensity: 'seimbang', tone: 'base', seed: 0 },
)

const dark = computed(() => props.tone === 'ink' || props.tone === 'primary')

/** Peta slot → id ornamen milik tema. Tema lama tanpa `layers` menghasilkan peta kosong. */
const bySlot = computed(() => {
  const map = {} as Partial<Record<LayerSlot, OrnamentId>>
  for (const id of props.set.layers ?? []) {
    const slot = layerSlot(id)
    if (slot && !map[slot]) map[slot] = id
  }
  return map
})

const pieces = computed(() => {
  const scale = intensityScale[props.intensity]
  const recipe = recipes[Math.abs(props.seed) % recipes.length]!

  return recipe
    .slice(0, scale.count)
    .map((placement, index) => {
      const id = bySlot.value[placement.slot]
      if (!id) return null

      const size = placement.size * scale.size
      const ratio = ornamentBank[id].ratio
      const opacity = Math.min(1, slotOpacity[placement.slot] * scale.opacity * (dark.value ? 0.5 : 1))
      const transforms = [
        placement.pos.endsWith('-center') ? 'translateX(-50%)' : '',
        placement.rotate ? `rotate(${placement.rotate}deg)` : '',
        placement.flip ? 'scaleX(-1)' : '',
      ].filter(Boolean).join(' ')

      return {
        key: `${id}-${placement.pos}-${index}`,
        id,
        slot: placement.slot,
        style: {
          // Satu lebar dihitung sekali, lalu jangkarnya menurunkan bleed dari lebar itu —
          // kalau keduanya dihitung terpisah, bleed tidak lagi cocok saat clamp menggigit.
          '--iv-piece': `clamp(${Math.round(size * minRatio)}px, ${((size / referenceWidth) * 100).toFixed(1)}cqw, ${Math.round(size * maxRatio)}px)`,
          ...anchor(placement.pos, placement.bleed),
          width: 'var(--iv-piece)',
          aspectRatio: String(ratio),
          opacity: String(Number(opacity.toFixed(3))),
          ...(transforms ? { transform: transforms } : {}),
        } satisfies Record<string, string>,
      }
    })
    .filter((piece): piece is NonNullable<typeof piece> => piece !== null)
})

/** Jangkar diterjemahkan ke offset absolut, diturunkan dari lebar keping yang sudah di-clamp. */
function anchor(pos: Position, bleed: number): Record<string, string> {
  const edge = `calc(var(--iv-piece) * ${-bleed})`
  switch (pos) {
    case 'top-left': return { top: edge, left: edge }
    case 'top-right': return { top: edge, right: edge }
    case 'top-center': return { top: edge, left: '50%' }
    case 'mid-left': return { top: '28%', left: edge }
    case 'mid-right': return { top: '28%', right: edge }
    case 'bottom-left': return { bottom: edge, left: edge }
    case 'bottom-right': return { bottom: edge, right: edge }
    case 'bottom-center': return { bottom: edge, left: '50%' }
  }
}
</script>

<template>
  <div class="iv-field" :data-dark="dark ? 'true' : 'false'" aria-hidden="true">
    <OrnamentGlyph
      v-for="piece in pieces"
      :key="piece.key"
      :glyph="piece.id"
      data-iv-ornament
      data-iv-layer
      :data-layer-slot="piece.slot"
      class="iv-field-piece"
      :style="piece.style"
    />
  </div>
</template>

<style>
/*
 * Ladang duduk di lapisan 0 bersama backdrop dan butiran kertas; isi section berada di
 * `position: relative` sehingga selalu di atasnya. Tidak pernah menangkap pointer.
 */
.iv-field {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  /*
   * Acuan `cqw` tiap keping. Yang perlu tahu seberapa lebar bidangnya adalah ladang ini,
   * bukan pemanggilnya — itu sebabnya kartu tema landing tidak lagi mengoper pengali.
   */
  container-type: inline-size;
}

.iv-field-piece {
  position: absolute;
  /* SVG absolut tanpa tinggi eksplisit runtuh jadi 0; aspect-ratio dari bank yang menjaganya. */
  height: auto;
  color: var(--iv-primary);
  transform-origin: center;
}

/* Di atas bidang gelap ornamen harus kertas — primary tema mana pun ikut tenggelam di sana. */
.iv-field[data-dark='true'] .iv-field-piece { color: #fffdf7; }
</style>
