import { liveTemplateIds, resolveTemplateId, type LiveTemplateId } from '@aruna/contracts'

import type { OrnamentId } from './ornaments'

/**
 * Varian ornamen terkurasi: yang boleh ditukar pasangan, dan yang tidak.
 *
 * Pemilik meminta ornamen "bisa dipilih dan disesuaikan". Pemilih bank penuh menjawab itu
 * dengan cara yang menghapus temanya — alasan yang sama persis dipakai untuk menolak color
 * picker bebas: lima tema berubah jadi satu tema dengan lima nilai awal. Yang ditawarkan
 * karena itu bukan 132 ornamen melainkan beberapa alternatif yang memang seresep.
 *
 * **Syarat keanggotaan kolam: ketebalan garis yang sama dengan tema induknya.** Itu bukan
 * selera; `gerbangKohesi` di `scripts/ornament-forge/verify.mjs` mengukur persis itu, dan
 * alasannya tertulis di sana — bingkai berstroke 3 di sebelah pemisah berstroke 2,6 tidak
 * akan pernah terbaca sebagai satu keluarga. `apps/web/test/ornament-variants.spec.ts`
 * menegakkannya dengan mengukur ulang tiap kandidat lewat mesin gerbang yang sama, jadi
 * kolam yang salah tidak bisa lolos hanya karena daftarnya terlihat masuk akal.
 *
 * Keluarga isen BOLEH berbeda, dan itu justru yang membuat sebuah varian terasa varian.
 * Batasnya: satu slot ditukar sekali. Empat slot di antara sebelas keping tema tetap terbaca
 * sebagai aksen, bukan sebagai tema yang kehilangan wajahnya.
 */

/** Slot yang boleh ditukar. Sengaja bukan kesebelasnya. */
export const variantSlots = ['frame', 'divider', 'corner', 'seal'] as const
export type VariantSlot = (typeof variantSlots)[number]

export type OrnamentOverrides = Partial<Record<VariantSlot, OrnamentId>>

export const variantSlotLabels: Record<VariantSlot, { label: string, hint: string }> = {
  frame: { label: 'Bingkai', hint: 'Dipakai sampul dan amplop pembuka.' },
  divider: { label: 'Pemisah', hint: 'Pita tipis antar bagian undangan.' },
  corner: { label: 'Sudut', hint: 'Hiasan di pojok kartu dan judul bagian.' },
  seal: { label: 'Segel', hint: 'Lilin penutup amplop, terbelah saat dibuka.' },
}

/**
 * Kandidat per tema. Entri **pertama selalu bawaan tema** — nilai yang sama persis dengan
 * `themeOrnaments()`, bukan salinannya yang bisa menyimpang; sebuah tes mengunci kesamaannya.
 *
 * Kolam bloom diambil dari tema yang dipensiunkan fase 48 yang ketebalan garisnya juga 3:
 * lumine, mendung, kenanga, dan bentar. Senja, sogan, dan gonjong (3,5) serta alba (2,5)
 * sengaja tidak masuk.
 */
/**
 * **Kolam bingkai dan segel menyusut drastis pada fase 58**, dan itu disengaja.
 *
 * Isinya dulu sebagian besar glyph forge dari tema pensiun. Pemilik menilai keluarga bingkai
 * dan segel forge tidak memenuhi standar, jadi keduanya dicabut dari seluruh kolam — kolam
 * adalah satu-satunya jalan sebuah glyph bisa dipilih pasangan di editor.
 *
 * Yang tersisa pada beberapa slot tinggal satu pilihan, dan itu jujur: syarat keanggotaan kolam
 * (ketebalan garis sama dengan tema induk, punya lapisan garis, tidak dipakai tema lain) memang
 * hanya menyisakan sebanyak itu setelah forge keluar. Menambah kolamnya berarti menggambar
 * keping baru, bukan melonggarkan syaratnya — kolam yang bisa dicampur adalah kolam yang cepat
 * atau lambat akan membuat dua undangan bertema berbeda berakhir identik.
 *
 * Kolam `divider` dan `corner` tidak disentuh: pemilik tidak menunjuk keduanya.
 */
export const themeVariants: Record<LiveTemplateId, Record<VariantSlot, OrnamentId[]>> = {
  /*
   * Bawaan Bloom kini glyph pack `melati`, dan wajah lamanya turun jadi alternatif pertama —
   * bukan dibuang. Ketebalan garis pack sudah diseragamkan ke 3 saat impor, jadi ia tetap
   * satu kolam dengan lumine, mendung, kenanga, dan bentar yang juga 3.
   */
  'aruna-bloom': {
    frame: ['melati-bingkai-ronce', 'melati-bingkai-kembar-mayang', 'melati-bingkai-anyaman', 'melati-bingkai-segi'],
    divider: ['melati-pemisah-ronce', 'divider-leaf', 'melati-pemisah-kenanga', 'melati-pemisah-sulur', 'divider-diamond', 'divider-wave', 'divider-row', 'divider-knot'],
    corner: ['melati-sudut-melati', 'corner-vine', 'melati-sudut-ronce', 'corner-deco', 'corner-wadasan', 'corner-kenanga', 'corner-catur'],
    seal: ['melati-segel-kuncup', 'melati-segel-melati'],
  },
  /**
   * Kolam wastra dan pelita sama-sama berketebalan 3,5, jadi keduanya menarik dari tema pensiun
   * yang sama: senja, sogan, dan gonjong. Kumpulannya **dibagi, tidak dipakai bersama** —
   * kalau dua tema hidup menawarkan glyph yang sama, dua undangan bertema berbeda bisa berakhir
   * identik pada slot itu, dan aturan "tidak pernah berulang antar tema" jadi tidak berarti
   * begitu pasangan menyentuh pemilihnya. `ornament-variants.spec.ts` menegakkan pembagiannya.
   */
  'aruna-wastra': {
    frame: ['kayon-bingkai-tumpal', 'kayon-bingkai-lung'],
    divider: ['divider-wastra', 'divider-rope', 'divider-lung-lungan'],
    corner: ['corner-wastra', 'corner-flourish', 'corner-batik'],
    seal: ['kayon-segel-kayon', 'pusaka-segel-tumpal-jajar'],
  },
  'aruna-pelita': {
    frame: ['kayon-bingkai-medalion', 'pusaka-bingkai-kubah'],
    divider: ['divider-pelita', 'divider-songket'],
    corner: ['corner-pelita', 'corner-pucuak-rabuang'],
    seal: ['pusaka-segel-sulur-bintang', 'kayon-segel-medalion'],
  },
  /**
   * Kolam sekar: seluruhnya packnya sendiri, dan itu bukan kebetulan.
   *
   * Ketebalan garisnya 3,2 — satu-satunya di repo — jadi tidak ada satu pun glyph tema lain
   * yang memenuhi syarat "seketebalan temanya". Konsekuensinya kolam ini tidak mungkin
   * beririsan dengan empat kolam di atas, dan packnya memang dibangun membawa dua kandidat
   * untuk keempat slot.
   */
  'aruna-sekar': {
    frame: ['sekar-bingkai-gapura', 'sekar-bingkai-oval', 'sekar-bingkai-segi'],
    divider: ['sekar-pemisah-mahkota', 'sekar-pemisah-sulur'],
    corner: ['sekar-sudut-sulur-kiri', 'sekar-sudut-sulur-kanan', 'sekar-sudut-damask'],
    seal: ['sekar-segel-rozet', 'sekar-segel-tumpal'],
  },
  /** Kolam hening: alba yang pensiun, satu-satunya tema lain pada ketebalan 2,5. */
  'aruna-hening': {
    frame: ['melati-bingkai-oval-kantil', 'sunda-bingkai-sunda'],
    divider: ['divider-hening', 'divider-dotted'],
    corner: ['corner-hening', 'corner-angle'],
    seal: ['melati-segel-janur', 'pusaka-segel-karangan-tipis'],
  },
}

/** Kandidat untuk satu slot, dengan id pensiun diterjemahkan lebih dulu. */
export function variantsFor(templateId: string, slot: VariantSlot): OrnamentId[] {
  return themeVariants[resolveTemplateId(templateId)][slot]
}

/** Apakah sebuah glyph benar-benar ditawarkan tema ini untuk slot ini. */
export function isVariantOf(templateId: string, slot: VariantSlot, glyph: unknown): glyph is OrnamentId {
  return typeof glyph === 'string' && variantsFor(templateId, slot).includes(glyph as OrnamentId)
}

/** Setiap glyph yang bisa dicapai pasangan lewat pemilih mana pun. Dipakai tes kohesi. */
export function semuaVarian(): { tema: LiveTemplateId, slot: VariantSlot, glyph: OrnamentId }[] {
  return liveTemplateIds.flatMap(tema =>
    variantSlots.flatMap(slot =>
      themeVariants[tema][slot].map(glyph => ({ tema, slot, glyph }))))
}
