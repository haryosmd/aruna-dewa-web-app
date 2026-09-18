import { bacaTema } from '../verify.mjs'

/**
 * Himpunan parameter per tema — gagasan inti seluruh rombak ini.
 *
 * Sebelum berkas ini, sebuah tema adalah sebelas SVG yang digambar terpisah lalu diletakkan
 * berdampingan. Itu sebabnya pemilik menilai "ornamen dan bingkai tidak cocok": tidak ada satu
 * pun yang memaksa mereka berbagi apa pun. Audit menemukan buktinya — ketupat empat titik yang
 * sama muncul di 13 komponen lintas 7 kategori, dan `divider-row` meminjam 100% geometrinya
 * dari `divider-lung-lungan` milik tema lain.
 *
 * Sekarang sebuah tema adalah SATU himpunan parameter yang diinstansiasi sebelas kali.
 * Bingkai, pemisah, sudut, motif, simbol, dan segelnya memakai keluarga isen yang sama,
 * ketebalan garis yang sama, dan periode pengulangan yang sama. Kecocokan dijamin konstruksi,
 * bukan ketelitian penggambar — dan gerbang kohesi di `verify.mjs` menegakkannya.
 *
 * `mahkota` adalah satu-satunya yang benar-benar membedakan wajah tiap tema, dan itu memang
 * yang seharusnya: yang khas dari sebuah bingkai adalah puncaknya.
 */
export const temaOrnamen = {
  'aruna-bloom': {
    mahkota: 'gerbang', isen: 'ukel', stroke: 3, rapport: 4, isenSkala: 0.5,
    catatan: 'Gerbang ganda berbahu lebar; sulur mengisi bandnya.',
  },
  'aruna-wastra': {
    // Garis 3,5, bukan 4. Bobot 4 sempat dipilih dengan alasan "bidang besar butuh garis yang
    // tidak hilang di sebelahnya", dan itu membuat wastra satu-satunya tema pada bobot itu —
    // kolam variannya jadi kosong, karena syarat keanggotaan kolam adalah ketebalan yang sama.
    // Wajah tema ini hidup di mahkota berdataran dan isen yang besar-jarang, bukan di setengah
    // satuan garis, jadi yang dikorbankan nyaris tidak ada dan yang didapat satu keluarga penuh.
    mahkota: 'wastra', isen: 'cecek', stroke: 3.5, rapport: 3, isenSkala: 0.62,
    catatan: 'Tumpal diperbesar jadi bidang, bukan renda tepi; isen cecek besar dan jarang.',
  },
  'aruna-hening': {
    /*
     * Tinta paling sedikit di seluruh bank — tapi bukan nol, dan bukan 2.
     *
     * Bobot 2 sempat dipilih karena tema ini editorial minimal, dan keenam glyphnya langsung
     * gagal gerbang `stroke`. Ambangnya 2,5, dan ia **terukur**, bukan dikarang: ia lahir dari
     * `corner-flourish` yang stroke 1,1-nya menyusut jadi 0,31px tinta di titik pakainya —
     * keluhan "garis tipis" yang memulai seluruh rombak bermassa. Menurunkan ambang demi satu
     * tema berarti membatalkan temuan yang membayar rombak itu.
     *
     * Wataknya tetap yang paling tertahan lewat `rapport` 10 dan `isenSkala` 0,28, keduanya
     * nilai paling ekstrem di repo. Efek sampingnya bagus: pada 2,5 ia sebobot dengan alba
     * yang pensiun, jadi kolam variannya sudah ada sejak hari pertama.
     */
    // `rapport` 4, bukan 10. Sepuluh dipilih karena "paling jarang", dan itu salah arah:
    // `sudut.mjs` menurunkan jumlah lobus dari rapport (`round(rapport/2)+1`, dibatasi 5),
    // jadi 10 justru menghasilkan lobus TERBANYAK — tepi diagonal yang penuh kejadian pada
    // tema bernama hening. Empat memberi tiga lobus, dan `bandBerukir` ikut turun jadi 13 unit.
    mahkota: 'hening', isen: 'sawut', stroke: 2.5, rapport: 4, isenSkala: 0.28,
    catatan: 'Satu takik pada garis yang selain itu datar; isen hanya guratan rambut.',
  },
  'aruna-pelita': {
    /*
     * Garis 3,5 pada tema gelap, bukan 3.
     *
     * Bukan selera: tinta terang di atas bidang gelap terbaca lebih tipis daripada tinta gelap
     * di atas bidang terang (iradiasi). Bobot yang sama akan tampak lebih ringan di sini
     * daripada di tema mana pun yang lain.
     */
    mahkota: 'pelita', isen: 'cecek', stroke: 3.5, rapport: 6, isenSkala: 0.46,
    catatan: 'Kubah bertingkat di atas bahu yang melebar; isen titik yang rapat.',
  },
}

/**
 * Parameter kedelapan tema yang dipensiunkan di fase 48.
 *
 * **Beku, dan tetap dipakai.** Yang mati adalah palet, font, dan foto covernya; sebelas glyph
 * tiap tema masih di disk sebagai kolam varian terkurasi, jadi mereka masih ikut di-forge dan
 * masih harus lolos gerbang mutu. Kolam yang tidak kohesif merusak tema yang memanggilnya.
 *
 * Dipisah dari `temaOrnamen` supaya berkas ini berhenti mengklaim ada sembilan tema hidup —
 * itu satu-satunya alasannya; `paramUntuk()` memperlakukan keduanya sama persis.
 */
export const temaPensiun = {
  'aruna-lumine': {
    mahkota: 'deco', isen: 'cecek', stroke: 3, rapport: 6, isenSkala: 0.42,
    catatan: 'Art deco: puncak bertingkat, isen titik yang tertib.',
  },
  'aruna-senja': {
    mahkota: 'ogee', isen: 'ukel', stroke: 3.5, rapport: 3, isenSkala: 0.55,
    catatan: 'Gerbang runcing ogee; sulur lebih besar dan lebih jarang.',
  },
  'aruna-alba': {
    mahkota: 'halus', isen: 'sawut', stroke: 2.5, rapport: 8, isenSkala: 0.34,
    catatan: 'Paling tertahan: sudut membulat, isen hanya garis rambut.',
  },
  'aruna-sogan': {
    mahkota: 'kayon', isen: 'ukel', stroke: 3.5, rapport: 4, isenSkala: 0.48,
    catatan: 'Siluet kayon, isen ukel — tata bahasa pack kayon apa adanya.',
  },
  'aruna-gonjong': {
    mahkota: 'gonjong', isen: 'cecek', stroke: 3.5, rapport: 5, isenSkala: 0.44,
    catatan: 'Empat gonjong; tepinya bertumpal, isennya titik seperti cukia songket.',
  },
  'aruna-mendung': {
    mahkota: 'mendung', isen: 'ukel', stroke: 3, rapport: 5, isenSkala: 0.5,
    catatan: 'Awan berlapis bersarang; ekor sulurnya melingkar ke dalam.',
  },
  'aruna-kenanga': {
    mahkota: 'kenanga', isen: 'sawut', stroke: 3, rapport: 6, isenSkala: 0.4,
    catatan: 'Kelopak pita yang meluruh — bukan kelopak membulat.',
  },
  'aruna-bentar': {
    mahkota: 'bentar', isen: 'cecek', stroke: 3, rapport: 8, isenSkala: 0.4,
    catatan: 'Gerbang terbelah: celah puncak wajib penuh, tidak boleh ada yang menyeberang.',
  },
}

/**
 * Glyph yang tidak dimiliki tema mana pun tapi tetap terdaftar di bank.
 *
 * Mereka tetap digubah dengan tata bahasa yang sama — bank yang setengah dibenahi akan
 * terbaca persis seperti bank yang tidak dibenahi begitu salah satunya terpilih.
 */
export const lepasTema = {
  'frame-oval': { mahkota: 'oval', isen: 'ukel', stroke: 3, rapport: 4, isenSkala: 0.46 },
  'frame-rounded': { mahkota: 'rounded', isen: 'cecek', stroke: 3, rapport: 6, isenSkala: 0.42 },
  'frame-rose': { mahkota: 'rose', isen: 'ukel', stroke: 3, rapport: 8, isenSkala: 0.44 },
  'frame-tumpal': { mahkota: 'tumpal', isen: 'cecek', stroke: 3, rapport: 6, isenSkala: 0.42 },
}

/**
 * Glyph milik tiap tema di luar bingkai, DIBACA dari `apps/web/utils/theme.ts`.
 *
 * Dibaca, bukan disalin: peta tema→glyph sudah hidup di satu tempat, dan menyalinnya ke sini
 * berarti dua daftar yang akan menyimpang diam-diam. `bacaTema()` adalah pembaca yang sama
 * yang dipakai gerbang keunikan, jadi resep dan gerbang tidak mungkin melihat peta berbeda.
 */
export const bingkaiTema = {
  arch: 'aruna-bloom',
  'frame-wastra': 'aruna-wastra',
  'frame-hening': 'aruna-hening',
  'frame-pelita': 'aruna-pelita',
  'frame-deco': 'aruna-lumine',
  'frame-ogee': 'aruna-senja',
  'frame-line': 'aruna-alba',
  'frame-gunungan': 'aruna-sogan',
  'frame-gonjong': 'aruna-gonjong',
  'frame-mendung': 'aruna-mendung',
  'frame-kenanga': 'aruna-kenanga',
  'frame-bentar': 'aruna-bentar',
}

/**
 * Glyph → tema pemiliknya, untuk seluruh kategori unik (frame, divider, corner, motif,
 * symbol, seal). Dibangun sekali dari `bacaTema()`.
 */
const pemilik = (() => {
  const out = { ...bingkaiTema }
  for (const [tema, set] of Object.entries(bacaTema())) {
    for (const glyph of Object.values(set)) out[glyph] ??= tema
  }
  return out
})()

/**
 * Glyph di kategori unik yang **tidak** dimiliki tema mana pun.
 *
 * Mereka tetap digubah dengan tata bahasa yang sama. Bank yang setengah dibenahi akan terbaca
 * persis seperti bank yang tidak dibenahi begitu salah satunya terpilih — dan `corner-fan`
 * memang bisa dipilih pasangan.
 */
export const lepasKategori = {
  'corner-fan': { mahkota: 'halus', isen: 'cecek', stroke: 3, rapport: 5, isenSkala: 0.44 },

  /*
   * Wajah Bloom yang lama, sejak kesebelas slotnya pindah ke pack `melati`.
   *
   * Mereka tidak dipensiunkan dan tidak dihapus: kelimanya turun jadi alternatif pertama di
   * kolam varian Bloom, jadi pasangan yang menyukai wajah lama tetap bisa memilihnya. Karena
   * `bacaTema()` membangun kepemilikan dari `theme.ts`, mereka kini glyph tanpa tema — dan
   * glyph tanpa tema tetap wajib punya parameter, kalau tidak `pnpm ornament:forge` berhenti
   * di tengah jalan. Parameternya persis parameter Bloom, karena memang dari sanalah mereka
   * berasal dan karena syarat keanggotaan kolam adalah ketebalan garis yang sama.
   */
  'divider-leaf': { mahkota: 'gerbang', isen: 'ukel', stroke: 3, rapport: 4, isenSkala: 0.5 },
  'corner-vine': { mahkota: 'gerbang', isen: 'ukel', stroke: 3, rapport: 4, isenSkala: 0.5 },
  'motif-arabesque': { mahkota: 'gerbang', isen: 'ukel', stroke: 3, rapport: 4, isenSkala: 0.5 },
  'symbol-dove': { mahkota: 'gerbang', isen: 'ukel', stroke: 3, rapport: 4, isenSkala: 0.5 },
  'seal-laurel': { mahkota: 'gerbang', isen: 'ukel', stroke: 3, rapport: 4, isenSkala: 0.5 },
}

/**
 * Keluarga keping ladang → tema yang memiliki wajahnya.
 *
 * Dipetakan di sini dan tidak dibaca dari `theme.ts`, karena `bacaTema()` sengaja hanya
 * membaca enam kategori unik: penjaga cakupan di `ornament-quality.spec.ts` mengunci
 * `slot === jumlahTema * 6`, jadi menambahkan `layers` ke pembacaan itu akan memecahkannya
 * tanpa ada yang salah dengan temanya.
 *
 * Sembilan keluarga, dan dua di antaranya dipakai dua tema sekaligus (`deco` oleh Pelita dan
 * Lumine, `songket` oleh Wastra dan Gonjong, `geometris` oleh Hening dan Alba). Yang dicatat
 * di sini selalu tema HIDUP-nya, karena tema hidup itulah yang wajahnya sedang dijual;
 * `layers` memang tidak termasuk kategori yang DESIGN.md wajibkan unik antar tema.
 */
export const keluargaLapis = {
  botanical: 'aruna-bloom',
  songket: 'aruna-wastra',
  geometris: 'aruna-hening',
  deco: 'aruna-pelita',
  tropis: 'aruna-senja',
  sogan: 'aruna-sogan',
  mendung: 'aruna-mendung',
  kenanga: 'aruna-kenanga',
  bentar: 'aruna-bentar',
}

const LAPIS = /^layer-(?:bloom|cascade|crown|cluster|swag)-([a-z]+)$/

/** Parameter untuk sebuah id ornamen, dari temanya kalau ada, dari daftar lepas kalau tidak. */
export function paramUntuk(id) {
  const lapis = LAPIS.exec(id)
  if (lapis) {
    const tema = keluargaLapis[lapis[1]]
    if (!tema) throw new Error(`keluarga keping tidak dikenal: ${lapis[1]}`)
    return { ...(temaOrnamen[tema] ?? temaPensiun[tema]), tema }
  }
  const tema = pemilik[id]
  if (tema) return { ...(temaOrnamen[tema] ?? temaPensiun[tema]), tema }
  if (lepasTema[id]) return { ...lepasTema[id], tema: null }
  if (lepasKategori[id]) return { ...lepasKategori[id], tema: null }
  throw new Error(`tidak ada parameter untuk ${id}`)
}
