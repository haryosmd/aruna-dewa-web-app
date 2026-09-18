import { liveTemplateIds, resolveTemplateId, type LiveTemplateId } from '@aruna/contracts'

import type { OrnamentId } from './ornaments'

/**
 * Kolam ornamen **terkurasi**: alternatif yang memang seresep dengan tema induknya.
 *
 * **Premisnya berubah pada fase 59, dan berkas ini tidak.** Sampai fase 58 kolam ini adalah
 * satu-satunya jalan sebuah glyph bisa dipilih pasangan, jadi ia sekaligus berarti "yang
 * seresep" dan "yang bisa dicapai". Pemilik lalu meminta seluruh bank dibuka. Yang dibuka
 * adalah jalur kedua (`ornament-slots.ts` + Studio Ornamen), **bukan berkas ini** — kolam di
 * bawah tetap kolam yang sama, dijaga syarat yang sama, dan sekarang tayang sebagai tab
 * "Disarankan".
 *
 * Pemisahan itu yang menjaga dua hal sekaligus tetap benar. Kurasi tidak dilemahkan supaya
 * bank bisa dibuka; kebebasan tidak dibayar dengan menghapus ukuran yang membuat sebuah tema
 * punya wajah. Yang dulu jadi larangan sekarang jadi urutan dan lencana: keping seresep tampil
 * lebih dulu, dan yang tidak membawa kalimat yang mengatakan kenapa.
 *
 * **Syarat keanggotaan kolam tetap: ketebalan garis yang sama dengan tema induknya.** Itu bukan
 * selera; `gerbangKohesi` di `scripts/ornament-forge/verify.mjs` mengukur persis itu, dan
 * alasannya tertulis di sana — bingkai berstroke 3 di sebelah pemisah berstroke 2,6 tidak
 * akan pernah terbaca sebagai satu keluarga. `apps/web/test/ornament-variants.spec.ts`
 * menegakkannya dengan mengukur ulang tiap kandidat lewat mesin gerbang yang sama, jadi
 * kolam yang salah tidak bisa lolos hanya karena daftarnya terlihat masuk akal.
 *
 * Keluarga isen BOLEH berbeda, dan itu justru yang membuat sebuah varian terasa varian.
 */

/**
 * Slot yang punya kolam terkurasi. Sengaja bukan kesembilannya.
 *
 * Sejak fase 59 ini **tidak** lagi berarti "slot yang boleh ditukar" — kesembilan slot skalar
 * dan kelima jangkar ladang semuanya bisa ditukar lewat Studio. Yang dibatasi di sini adalah
 * slot mana yang punya daftar alternatif yang sudah dikurasi tangan.
 */
export const variantSlots = ['frame', 'divider', 'corner', 'seal'] as const
export type VariantSlot = (typeof variantSlots)[number]

/*
 * `OrnamentOverrides` pindah ke `./ornament-slots.ts` pada fase 59 dan **tidak** dire-ekspor dari
 * sini. Re-ekspornya sempat ada dan langsung ditolak pemindai auto-import Nuxt: dua modul
 * mengekspor nama yang sama, salah satunya dimenangkan diam-diam, dan yang menang adalah berkas
 * ini — yang justru bukan pemiliknya lagi. Impor dari `ornament-slots.ts`.
 */

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

/**
 * Setiap glyph yang ditawarkan **kolam terkurasi**. Dipakai tes kohesi.
 *
 * Namanya diperjelas pada fase 59, dan itu bukan kosmetik. Bentuk lamanya, `semuaVarian()`,
 * berdokumentasi "setiap glyph yang bisa dicapai pasangan lewat pemilih mana pun" — kalimat
 * yang benar selama kolam ini satu-satunya pemilih, dan **salah** sejak Studio Ornamen membuka
 * seluruh bank. Tes yang membacanya akan tetap hijau sambil mengukur himpunan yang jauh lebih
 * kecil daripada yang dikiranya, yaitu persis bentuk kegagalan yang sudah ditulis di
 * `DESIGN.md` soal gerbang keunikan yang menyusut dari 54 slot ke 6 tanpa satu pun merah.
 *
 * Yang menjaga jalur bebas bukan berkas ini melainkan `ornament-fit.ts`, dan keduanya diikat
 * satu tes jembatan di `ornament-metrics.spec.ts`: tiap anggota kolam di bawah wajib
 * `fitOf().ok === true`, jadi lencana di browser tidak bisa menyimpang dari gerbang di node.
 */
export function semuaVarianTerkurasi(): { tema: LiveTemplateId, slot: VariantSlot, glyph: OrnamentId }[] {
  return liveTemplateIds.flatMap(tema =>
    variantSlots.flatMap(slot =>
      themeVariants[tema][slot].map(glyph => ({ tema, slot, glyph }))))
}
