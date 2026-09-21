import { useLocalStorage } from '@vueuse/core'

/**
 * Perangkat pratinjau panggung (fase 72.2), meniru referensi: Desktop | iPhone | Android | Bersih.
 * `bersih` = lebar ponsel tanpa bezel. Nilai lama `ponsel`/`tablet` dipetakan ke `iphone`.
 */
export type PreviewDevice = 'laptop' | 'iphone' | 'android' | 'bersih'
/** Empat tab inspektor (fase 72.1). Nilai lama `tema` dipetakan ke `global`. */
export type InspectorTab = 'bagian' | 'global' | 'ornamen' | 'kartu'

export interface EditorPrefs {
  device: PreviewDevice
  inspectorTab: InspectorTab
  railCollapsed: boolean
  inspectorCollapsed: boolean
  /** Zoom panggung dalam persen, 50–100; skala akhir tetap tidak melebihi 1 (lihat `Stage.vue`). */
  zoom: number
}

export const editorPrefsDefaults: EditorPrefs = { device: 'iphone', inspectorTab: 'bagian', railCollapsed: false, inspectorCollapsed: false, zoom: 100 }

const devices = new Set<PreviewDevice>(['laptop', 'iphone', 'android', 'bersih'])
const tabs = new Set<InspectorTab>(['bagian', 'global', 'ornamen', 'kartu'])

export const zoomMin = 50
export const zoomMax = 100
export const zoomStep = 10

function bacaDevice(value: unknown): PreviewDevice {
  if (devices.has(value as PreviewDevice)) return value as PreviewDevice
  // Simpanan sebelum fase 72.
  if (value === 'ponsel' || value === 'tablet') return 'iphone'
  return editorPrefsDefaults.device
}

function bacaTab(value: unknown): InspectorTab {
  if (tabs.has(value as InspectorTab)) return value as InspectorTab
  if (value === 'tema') return 'global'
  return editorPrefsDefaults.inspectorTab
}

function bacaZoom(value: unknown): number {
  const angka = typeof value === 'number' ? value : Number.NaN
  if (!Number.isFinite(angka)) return editorPrefsDefaults.zoom
  return Math.min(zoomMax, Math.max(zoomMin, Math.round(angka / zoomStep) * zoomStep))
}

/**
 * Preferensi editor yang bertahan antar kunjungan.
 *
 * `initOnMounted` wajib. Tanpanya HTML dari server memakai bawaan sementara klien langsung membaca
 * simpanan, dan `aria-pressed` maupun `width` inline panggung berbeda saat hidrasi — Vue
 * memperingatkan, dan tes yang membaca lebar panggung sebelum klik pertama melihat nilai yang
 * berganti di tengah jalan. Dengan `initOnMounted`, frame pertama memakai bawaan lalu bertukar.
 *
 * Nilai dari `localStorage` tidak dipercaya begitu saja: `merge` menolak apa pun yang bukan
 * anggota himpunan, supaya JSON yang disunting tangan tidak menghasilkan perangkat tanpa lebar.
 */
export function useEditorPrefs() {
  return useLocalStorage<EditorPrefs>('aruna:editor:prefs', { ...editorPrefsDefaults }, {
    initOnMounted: true,
    mergeDefaults: (stored, defaults) => ({
      device: bacaDevice(stored?.device),
      inspectorTab: bacaTab(stored?.inspectorTab),
      railCollapsed: typeof stored?.railCollapsed === 'boolean' ? stored.railCollapsed : defaults.railCollapsed,
      inspectorCollapsed: typeof stored?.inspectorCollapsed === 'boolean' ? stored.inspectorCollapsed : defaults.inspectorCollapsed,
      zoom: bacaZoom(stored?.zoom),
    }),
  })
}
