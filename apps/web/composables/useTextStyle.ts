import { fontChoices, type FontChoice, type TextStyle } from '@aruna/contracts'
import type { CSSProperties, Ref } from 'vue'
import type { Section } from '~/types/aruna'
import { fontStack } from '~/utils/theme'

/**
 * Gaya teks per kolom (fase 72.4), dibaca dari `section.data.textStyles[field]`.
 *
 * Bentuknya mengikuti referensi: kunci yang absen berarti ikut tema, jadi hasilnya hanya
 * berisi properti yang benar-benar ditimpa — `InvitationText` menaruhnya sebagai `style`
 * inline di atas kelas `.iv-display`/`.iv-body`, dan kelas itu tetap memegang sisanya
 * (line-height, letter-spacing, opacity).
 *
 * `fontFamily` dipetakan lewat `fontStack()` yang sama dengan `tokens.font` → `--iv-display`
 * di `themeStyle()`, bukan ditulis mentah: nama font yang bukan anggota `fontChoices` tidak
 * pernah sampai ke CSS, dan setiap keluarga yang bisa dipilih di sini sudah dimuat
 * `@nuxt/fonts` secara global (DESIGN.md, Tipografi).
 */
export function textStyleOf(section: Section | undefined, field: string): CSSProperties {
  const styles = section?.data.textStyles
  if (!styles || typeof styles !== 'object' || Array.isArray(styles)) return {}
  const gaya = (styles as Record<string, TextStyle | undefined>)[field]
  if (!gaya || typeof gaya !== 'object') return {}
  const out: CSSProperties = {}
  if (gaya.fontFamily && (fontChoices as readonly string[]).includes(gaya.fontFamily)) out.fontFamily = fontStack(gaya.fontFamily as FontChoice)
  if (typeof gaya.fontSize === 'number' && Number.isFinite(gaya.fontSize)) out.fontSize = `${Math.min(96, Math.max(10, Math.round(gaya.fontSize)))}px`
  if (typeof gaya.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(gaya.color)) out.color = gaya.color
  if (gaya.fontWeight === 'bold') out.fontWeight = 700
  if (gaya.fontStyle === 'italic') out.fontStyle = 'italic'
  if (gaya.textAlign === 'left' || gaya.textAlign === 'center' || gaya.textAlign === 'right') out.textAlign = gaya.textAlign
  return out
}

/** Versi reaktif untuk komponen yang memegang `section` sebagai ref/prop. */
export function useTextStyle(section: Ref<Section | undefined> | (() => Section | undefined), field: string) {
  return computed(() => textStyleOf(typeof section === 'function' ? section() : section.value, field))
}
