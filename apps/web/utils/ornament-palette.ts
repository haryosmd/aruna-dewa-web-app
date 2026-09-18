import { contrastRatio, inkDark, inkLight, mixSrgb, type PaletteTokens } from './contrast'

/**
 * Ramp warna ornamen — empat tingkat, diturunkan dari token tema.
 *
 * **Kenapa berkas ini ada.** Sampai fase 42 seluruh bank adalah satu tinta: diukur pada 133
 * komponen, 283 `fill="currentColor"`, 60 `stroke="currentColor"`, dan **nol** hex, gradient,
 * atau pattern. Kedalaman dipalsukan sepenuhnya dengan `opacity`, dan 128 dari 133 glyph cuma
 * punya dua tingkat. Pemilik produk menilainya monoton, dan menunjuk pack Canva yang ia impor
 * sendiri sebagai pembanding — pack itu memang punya ramp warna sungguhan.
 *
 * Yang meratakannya bisa ditunjuk barisnya:
 * `docs/features/ornament-builder/imported/lib/convert.mjs` memetakan tiap warna sumber ke
 * satu tinta lewat luminance WCAG, dan menyatakannya sebagai tujuan di header modulnya.
 *
 * **Bentuk rampnya diambil dari pack yang terukur, bukan dikarang.** `canva-emas-hitam`
 * berjalan `#423d35 → #8c8153 → #ccb554 → #dbcd93`: gelap netral, medium, aksen terang,
 * pucat. Empat stop di bawah mengikuti bentuk itu.
 *
 * **Diturunkan, bukan ditulis tangan per tema.** Pasangan boleh mengubah
 * `background`/`foreground`/`primary` lewat fitur premium `design`; palet tulisan tangan akan
 * membuat ornamen berhenti mengikuti warna pilihan mereka. Dan `tokens` tidak bertambah key,
 * jadi gerbang entitlement `design` serta `tests/contracts.test.ts` tidak tersentuh —
 * `accent` memang sudah hidup di luar `tokens` sebagai konstanta per template.
 *
 * **Dihitung di sini dan dipancarkan sebagai hex, bukan sebagai string `color-mix()`.**
 * Node tidak bisa mengevaluasi `color-mix`, jadi nilai yang sebenarnya tidak akan pernah bisa
 * diperiksa gerbang kontras sampai ia sudah sampai di browser. Itu persis bentuk kegagalan
 * fase 20: tiga syarat hidup-matinya situs lolos semua gerbang karena tak satu pun hidup di
 * kode yang diuji.
 */
export interface OrnamentRamp {
  /** Kedalaman ukiran dan lapisan garis. Selalu lebih gelap dari `body`. */
  deep: string
  /** Badan bentuk. Inilah tinta lama, dan ia tidak bergeser. */
  body: string
  /** Plat di balik rongga dan inlay — emas pada lima tema. */
  accent: string
  /** Sorot dan rel tipis. */
  glow: string
}

export const ornamentStops = ['deep', 'body', 'accent', 'glow'] as const

/**
 * Ramp untuk bidang terang (kertas tema).
 *
 * `body` sengaja **persis** `primary`: ornamen yang sudah tayang tidak boleh bergeser warnanya
 * hanya karena rampnya ditambahkan. Yang baru adalah tiga tetangganya.
 */
export function ornamentRamp(tokens: PaletteTokens, accent: string): OrnamentRamp {
  return {
    deep: mixSrgb(tokens.primary, tokens.foreground, 0.64),
    body: tokens.primary,
    accent,
    glow: mixSrgb(accent, tokens.background, 0.55),
  }
}

/**
 * Ramp untuk bidang gelap (`data-tone="ink"`/`"primary"`, dan ladang ornamen ber-`data-dark`).
 *
 * Di sana ornamen harus kertas — `primary` tema mana pun ikut tenggelam. Aturan itu sudah ada
 * sebagai `color: #fffdf7` di empat belas tempat; yang ditambahkan di sini hanya memberinya
 * tiga tetangga, supaya bidang gelap tidak kembali jadi satu tinta begitu bidang terang
 * berhenti jadi satu tinta.
 */
export function ornamentRampOnDark(accent: string, ground: string): OrnamentRamp {
  /*
   * Ujungnya DIPILIH, tidak diasumsikan kertas.
   *
   * Fungsi ini lahir saat setiap tema berlatar terang, jadi `data-tone="ink"` dan
   * `"primary"` selalu berarti bidang gelap dan kertas selalu jawabannya. Pada tema gelap
   * keduanya terbalik: `--iv-fg` justru krem dan `primary` justru emas, jadi bidang bertone
   * adalah bidang paling TERANG di halaman. Kertas di atasnya hilang — terukur pada
   * `aruna-pelita`, accent jatuh ke 1,03 dan rampnya runtuh dari empat langkah jadi satu.
   *
   * Namanya dipertahankan karena pemakainya tetap sama: bidang bertone, apa pun terangnya.
   */
  const paper = contrastRatio(inkLight, ground) >= contrastRatio(inkDark, ground) ? inkLight : inkDark
  return {
    // Diredupkan ke arah BIDANGNYA, bukan ke arah aksen. Versi pertama mencampur ke aksen,
    // dan `aruna-lumine` langsung jatuh ke 1,10:1 — aksennya `#2E3330`, nyaris hitam, jadi
    // "kertas yang diwarnai aksen" di sana berarti kertas yang dihitamkan di atas bidang yang
    // sudah gelap. Aksen gelap adalah pilihan tema yang sah; rampnya yang harus tahu itu.
    deep: mixSrgb(paper, ground, 0.47),
    body: paper,
    // Kertas yang diberi rona aksen, bukan aksen yang diberi rona kertas.
    accent: mixSrgb(accent, paper, 0.47),
    glow: mixSrgb(paper, ground, 0.89),
  }
}

/** Custom property yang dibaca tiap `<g fill="var(--iv-orn-…)">` hasil forge. */
export function rampStyle(ramp: OrnamentRamp, awalan = '--iv-orn'): Record<string, string> {
  return {
    [`${awalan}-deep`]: ramp.deep,
    [`${awalan}-body`]: ramp.body,
    [`${awalan}-accent`]: ramp.accent,
    [`${awalan}-glow`]: ramp.glow,
  }
}

/**
 * Ambang ramp, dan keduanya **bukan** ambang teks.
 *
 * Ornamen adalah bidang dekoratif, bukan kalimat yang harus dibaca. Memaksakan 4,5:1 WCAG ke
 * sini akan membunuh seluruh gagasannya: `accent` diukur serendah 2,32:1 terhadap latarnya
 * (alba) dan 1,68:1 terhadap `primary` (bloom), dan justru di dua tema itulah aksennya bekerja
 * sebagai bidang besar. Yang dijaga adalah ornamennya **terlihat** dan rampnya terbaca sebagai
 * empat langkah, bukan dua.
 */
export const rampMinimum = {
  /** Tiap stop harus terlihat di atas latarnya. */
  terhadapLatar: 1.18,
  /** Dua stop bertetangga harus terpisah, atau rampnya cuma dua langkah yang menyamar empat. */
  antarStop: 1.12,
}

export interface RampCheck {
  stop: string
  ratio: number
  passes: boolean
}

/** Tiap stop terhadap latarnya. Dipakai gerbang unit, bukan ditampilkan ke pasangan. */
export function checkRamp(ramp: OrnamentRamp, ground: string): RampCheck[] {
  return ornamentStops.map((stop) => {
    const ratio = contrastRatio(ramp[stop], ground)
    return { stop, ratio, passes: ratio >= rampMinimum.terhadapLatar }
  })
}

/**
 * Jarak tiap pasangan stop bertetangga, **diurutkan menurut terangnya**, bukan menurut urutan
 * penulisannya.
 *
 * Versi pertama membandingkan `deep→body→accent→glow` apa adanya, dan itu salah di bidang
 * gelap: di sana `body` adalah kertas, jadi ia stop paling TERANG, bukan stop kedua. Urutan
 * tulisan bukan urutan mata, dan yang ditanyakan gerbang ini — "apakah rampnya terbaca empat
 * langkah" — hanya berarti pada urutan mata.
 */
export function rampSteps(ramp: OrnamentRamp): { pair: string, ratio: number, passes: boolean }[] {
  const urut = [...ornamentStops].sort((a, b) => contrastRatio(ramp[a], '#000000') - contrastRatio(ramp[b], '#000000'))
  const out: { pair: string, ratio: number, passes: boolean }[] = []
  for (let i = 0; i + 1 < urut.length; i += 1) {
    const a = urut[i]!
    const b = urut[i + 1]!
    const ratio = contrastRatio(ramp[a], ramp[b])
    out.push({ pair: `${a}→${b}`, ratio, passes: ratio >= rampMinimum.antarStop })
  }
  return out
}
