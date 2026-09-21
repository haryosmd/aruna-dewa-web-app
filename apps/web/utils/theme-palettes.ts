import { templates, type FontChoice, type LiveTemplateId } from '@aruna/contracts'

/**
 * Preset palet per tema (fase 72.3), meniru kartu "Preset Theme" referensi: tiga bulatan warna,
 * nama palet, nama huruf judul. Yang pertama selalu palet kurasi tema itu sendiri (persis
 * `templates[].tokens`); tiga sisanya variasi yang **lolos `checkPalette`** — dijaga
 * `theme-palettes.spec.ts`, jadi menambah palet yang tidak terbaca tamu memerahkan tes,
 * bukan undangan.
 */
export interface ThemePalette {
  id: string
  label: string
  tokens: { background: string; foreground: string; primary: string; font: FontChoice }
}

const bawaan = (id: LiveTemplateId): ThemePalette => {
  const template = templates.find(item => item.id === id)!
  return { id: `${id}-bawaan`, label: template.name.replace('Aruna ', ''), tokens: { ...template.tokens } }
}

export const themePalettes: Record<LiveTemplateId, ThemePalette[]> = {
  'aruna-bloom': [
    bawaan('aruna-bloom'),
    { id: 'bloom-terracotta', label: 'Terracotta & Gold', tokens: { background: '#FBF4EA', foreground: '#2E1A12', primary: '#994B36', font: 'great-vibes' } },
    { id: 'bloom-sage', label: 'Sage & Gold', tokens: { background: '#F6F5EE', foreground: '#1F2A22', primary: '#4F6B57', font: 'cormorant' } },
    { id: 'bloom-maroon', label: 'Maroon & Gold', tokens: { background: '#FBF3EF', foreground: '#2B1216', primary: '#7B2C3A', font: 'parisienne' } },
  ],
  'aruna-wastra': [
    bawaan('aruna-wastra'),
    { id: 'wastra-sogan', label: 'Sogan & Tembaga', tokens: { background: '#F4EBDD', foreground: '#2A1D14', primary: '#7A4A2A', font: 'fraunces' } },
    { id: 'wastra-indigo', label: 'Indigo & Gading', tokens: { background: '#F1EFE8', foreground: '#171B2A', primary: '#2E3A66', font: 'fraunces' } },
    { id: 'wastra-lumut', label: 'Lumut & Emas', tokens: { background: '#F2F0E6', foreground: '#1E2418', primary: '#4A5A2E', font: 'cormorant' } },
  ],
  'aruna-hening': [
    bawaan('aruna-hening'),
    { id: 'hening-arang', label: 'Arang & Kertas', tokens: { background: '#FAFAF8', foreground: '#111111', primary: '#2F2F2F', font: 'instrument' } },
    { id: 'hening-biru', label: 'Biru Laut', tokens: { background: '#F7F9FA', foreground: '#0F1A22', primary: '#1F4E66', font: 'jost' } },
    { id: 'hening-mawar', label: 'Mawar Pudar', tokens: { background: '#FBF7F6', foreground: '#2A1A1C', primary: '#8A3B4C', font: 'italiana' } },
  ],
  'aruna-pelita': [
    bawaan('aruna-pelita'),
    { id: 'pelita-zamrud', label: 'Zamrud Malam', tokens: { background: '#0F1A16', foreground: '#EEF3EC', primary: '#8FCBAA', font: 'italiana' } },
    { id: 'pelita-safir', label: 'Safir Malam', tokens: { background: '#10141F', foreground: '#EDEFF6', primary: '#9FB4E8', font: 'cormorant' } },
    { id: 'pelita-mawar', label: 'Mawar Malam', tokens: { background: '#1B1114', foreground: '#F4ECEE', primary: '#E3A0B0', font: 'great-vibes' } },
  ],
  'aruna-sekar': [
    bawaan('aruna-sekar'),
    { id: 'sekar-gading', label: 'Ivory & Gold', tokens: { background: '#F7F1E6', foreground: '#3A2C1E', primary: '#7A5A2E', font: 'great-vibes' } },
    { id: 'sekar-terakota', label: 'Terracotta & Gold', tokens: { background: '#F6ECE2', foreground: '#33201A', primary: '#95452F', font: 'cormorant' } },
    { id: 'sekar-hijau', label: 'Sage & Gold', tokens: { background: '#F3F0E4', foreground: '#26301F', primary: '#5A6B45', font: 'allura' } },
  ],
}

export function paletteOf(templateId: LiveTemplateId, tokens: { background: string; foreground: string; primary: string }): ThemePalette | undefined {
  return themePalettes[templateId].find(palette =>
    palette.tokens.background.toLowerCase() === tokens.background.toLowerCase()
    && palette.tokens.foreground.toLowerCase() === tokens.foreground.toLowerCase()
    && palette.tokens.primary.toLowerCase() === tokens.primary.toLowerCase())
}
