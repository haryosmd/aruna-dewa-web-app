/**
 * Penjaga keterbacaan palet undangan.
 *
 * Preset tema sudah diverifikasi tangan (DESIGN.md), tapi pasangan boleh mengganti
 * `background`/`foreground`/`primary` sendiri lewat fitur premium `design` — dan sebuah
 * undangan yang tidak terbaca di layar ponsel tamu adalah kegagalan produk, bukan selera.
 * Modul ini memakai empat pasangan yang sama persis dengan yang diaudit di DESIGN.md,
 * supaya angka di editor dan angka di dokumen desain tidak pernah berbeda.
 */

/** Ambang teks normal WCAG 2.1 AA. Teks undangan tidak pernah dijamin "large text". */
export const textContrastMinimum = 4.5

/** Tinta tombol dan bidang bertone `primary` di renderer — nilainya dipanggang di CSS. */
const buttonInk = '#FFFDF7'

/** Bidang `tint` di `Section.vue`: `color-mix(in srgb, var(--iv-primary) 9%, var(--iv-bg))`. */
const tintPrimaryShare = 0.09

export interface PaletteTokens {
  background: string
  foreground: string
  primary: string
}

export interface ContrastCheck {
  id: 'body' | 'accent' | 'accentOnTint' | 'button'
  label: string
  /** Di mana pasangan ini muncul, dalam bahasa pemakai — bukan nama token. */
  where: string
  ratio: number
  passes: boolean
  /** Token yang harus digeser untuk memperbaikinya. */
  blame: 'foreground' | 'primary'
}

type Rgb = [number, number, number]

function parseHex(value: string): Rgb {
  const hex = value.trim().replace(/^#/u, '')
  const full = hex.length === 3 ? hex.replace(/./gu, channel => channel + channel) : hex
  if (!/^[0-9a-f]{6}$/iu.test(full)) return [0, 0, 0]
  return [0, 2, 4].map(offset => Number.parseInt(full.slice(offset, offset + 2), 16)) as Rgb
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map(channel => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0')).join('')}`
}

function linearize(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map(linearize) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Rasio kontras WCAG 2.1 antara dua warna hex. Urutan argumen tidak berpengaruh. */
export function contrastRatio(a: string, b: string): number {
  const first = luminance(parseHex(a))
  const second = luminance(parseHex(b))
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

/** Dibulatkan seperti tabel DESIGN.md, dua desimal, tanpa membulatkan ke atas melewati ambang. */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2).replace('.', ',')
}

/** `color-mix(in srgb, …)` mencampur nilai sRGB ber-gamma apa adanya, jadi campuran lurus sudah tepat. */
function mix(top: string, bottom: string, share: number): string {
  const a = parseHex(top)
  const b = parseHex(bottom)
  return toHex(a.map((channel, index) => channel * share + b[index]! * (1 - share)) as Rgb)
}

/** Bidang bertinta tempat aksen paling sering gagal — pasangan paling ketat dari keempatnya. */
export function tintSurface(tokens: PaletteTokens): string {
  return mix(tokens.primary, tokens.background, tintPrimaryShare)
}

/**
 * Empat pasangan yang sama dengan audit tema di DESIGN.md. Urutannya sengaja dari yang
 * paling merusak (teks isi) ke yang paling lokal (tinta tombol).
 */
interface PairSpec {
  id: ContrastCheck['id']
  label: string
  where: string
  blame: ContrastCheck['blame']
  /** Warna teks lalu warna bidang di belakangnya. */
  on: [string, string]
}

/**
 * Empat pasangan yang sama dengan audit tema di DESIGN.md. Urutannya sengaja dari yang
 * paling merusak (teks isi) ke yang paling lokal (tinta tombol).
 */
export function checkPalette(tokens: PaletteTokens): ContrastCheck[] {
  const tint = tintSurface(tokens)
  const pairs: PairSpec[] = [
    { id: 'body', label: 'Teks isi di atas latar', where: 'Seluruh paragraf undangan', blame: 'foreground', on: [tokens.foreground, tokens.background] },
    { id: 'accent', label: 'Warna aksi di atas latar', where: 'Jam rundown, label acara, tautan', blame: 'primary', on: [tokens.primary, tokens.background] },
    { id: 'accentOnTint', label: 'Warna aksi di atas bidang bertinta', where: 'Section berlatar nuansa warna aksi', blame: 'primary', on: [tokens.primary, tint] },
    { id: 'button', label: 'Tulisan tombol di atas warna aksi', where: 'Tombol kirim RSVP dan pemutar musik', blame: 'primary', on: [buttonInk, tokens.primary] },
  ]
  return pairs.map(({ on, ...rest }) => {
    const ratio = contrastRatio(on[0], on[1])
    return { ...rest, ratio, passes: ratio >= textContrastMinimum }
  })
}

function toHsl([r, g, b]: Rgb): [number, number, number] {
  const [red, green, blue] = [r / 255, g / 255, b / 255]
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  if (max === min) return [0, 0, lightness]
  const delta = max - min
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  const hue = max === red
    ? ((green - blue) / delta + (green < blue ? 6 : 0))
    : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4
  return [hue * 60, saturation, lightness]
}

function fromHsl(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const segment = ((hue % 360) + 360) % 360 / 60
  const second = chroma * (1 - Math.abs((segment % 2) - 1))
  const [r, g, b] = ([
    [chroma, second, 0], [second, chroma, 0], [0, chroma, second],
    [0, second, chroma], [second, 0, chroma], [chroma, 0, second],
  ][Math.floor(segment) % 6] ?? [0, 0, 0]) as Rgb
  const offset = lightness - chroma / 2
  return toHex([(r + offset) * 255, (g + offset) * 255, (b + offset) * 255])
}

/** Kandidat perbaikan: hue dan saturasi dipertahankan, hanya terang-gelapnya yang digeser. */
function lightnessLadder(color: string): string[] {
  const [hue, saturation, lightness] = toHsl(parseHex(color))
  const steps: { value: string; distance: number }[] = []
  for (let step = 0; step <= 100; step += 1) {
    const candidate = step / 100
    steps.push({ value: fromHsl(hue, saturation, candidate), distance: Math.abs(candidate - lightness) })
  }
  // Warna terdekat dengan pilihan pasangan menang: perbaikan harus terasa seperti
  // koreksi, bukan seperti palet mereka dibuang dan diganti.
  return steps.sort((a, b) => a.distance - b.distance).map(step => step.value)
}

/**
 * Palet terdekat yang lolos keempat pasangan. `primary` dicari lebih dulu karena ia
 * ikut dalam tiga pasangan sekaligus — memperbaikinya satu per satu bisa saling membatalkan.
 */
export function repairPalette(tokens: PaletteTokens): PaletteTokens {
  const primaryChecks = (candidate: string) => checkPalette({ ...tokens, primary: candidate }).filter(check => check.blame === 'primary')
  const primaryLadder = lightnessLadder(tokens.primary)
  // Token yang sudah lolos dikembalikan persis apa adanya — melewatkannya lewat tangga
  // HSL akan menulis ulang huruf besar/kecil hex dan menandai dokumen berubah tanpa sebab.
  const primary = primaryChecks(tokens.primary).every(check => check.passes)
    ? tokens.primary
    : primaryLadder.find(candidate => primaryChecks(candidate).every(check => check.passes))
    // Latar yang sangat gelap membuat ketiga pasangan `primary` saling tarik: aksen minta
    // terang, tinta tombol minta gelap. Tidak ada jawaban sempurna, jadi ambil yang paling
    // sedikit merugikan pasangan terlemah dan biarkan editor tetap melaporkan sisanya.
    ?? primaryLadder.reduce((best, candidate) => {
      const score = (value: string) => Math.min(...primaryChecks(value).map(check => check.ratio))
      return score(candidate) > score(best) ? candidate : best
    }, tokens.primary)
  const foreground = contrastRatio(tokens.foreground, tokens.background) >= textContrastMinimum
    ? tokens.foreground
    : lightnessLadder(tokens.foreground).find(candidate => contrastRatio(candidate, tokens.background) >= textContrastMinimum) ?? tokens.foreground
  return { ...tokens, primary, foreground }
}
