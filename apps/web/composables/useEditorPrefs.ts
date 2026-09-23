import { useLocalStorage } from '@vueuse/core'

/**
 * Lebar pratinjau panggung: Ponsel 390 | Tablet 768 | Desktop 1280.
 *
 * **Bezel ponsel dibuang di fase 76**, dan `ponsel-besar` 412 menyusul di fase 77: ia tidak pernah
 * menyalakan satu pun aturan tata letak, hanya menggeser angka. Ketiga lebar yang tersisa
 * masing-masing memilih cabang yang berbeda di `Renderer.vue` — satu kolom penuh, kolom melapang,
 * dan dua kolom berpanel galeri.
 *
 * Nilai tersimpan yang lama dipetakan, bukan dibuang. Tanpa pemetaan ini pasangan yang
 * preferensinya `iphone` akan tersangkut pada nilai yang sudah tidak punya kode.
 */
export type PreviewDevice = 'laptop' | 'ponsel' | 'tablet'
/** Empat tab inspektor (fase 72.1). Nilai lama `tema` dipetakan ke `global`. */
export type InspectorTab = 'bagian' | 'elemen' | 'global' | 'ornamen' | 'kartu'

export interface EditorPrefs {
  device: PreviewDevice
  inspectorTab: InspectorTab
  railCollapsed: boolean
  inspectorCollapsed: boolean
  /** Zoom panggung dalam persen, 50–200 dari skala pas (fase 81); skala akhir tetap tidak melebihi 1. */
  zoom: number
  /**
   * Gerak di panggung dimatikan (fase 78).
   *
   * **Pilihan menonton, bukan bagian dokumen.** Ia hidup di sini — bersama zoom dan lebar
   * pratinjau — justru supaya tidak pernah punya jalan masuk ke `InvitationDocument`: yang
   * disimpan `localStorage` tidak bisa ikut `saveDraft`, dan undangan yang dilihat tamu karena
   * itu selalu bergerak.
   */
  statis: boolean
}

export const editorPrefsDefaults: EditorPrefs = { device: 'ponsel', inspectorTab: 'bagian', railCollapsed: false, inspectorCollapsed: false, zoom: 100, statis: false }

const devices = new Set<PreviewDevice>(['laptop', 'ponsel', 'tablet'])
const tabs = new Set<InspectorTab>(['bagian', 'elemen', 'global', 'ornamen', 'kartu'])

export const zoomMin = 50
export const zoomMax = 200
export const zoomStep = 10

function bacaDevice(value: unknown): PreviewDevice {
  if (devices.has(value as PreviewDevice)) return value as PreviewDevice
  // Simpanan fase 76 (`ponsel-besar`), fase 72.2 (bezel), dan sebelum fase 72.
  if (value === 'ponsel-besar' || value === 'android' || value === 'iphone' || value === 'bersih') return 'ponsel'
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
      statis: typeof stored?.statis === 'boolean' ? stored.statis : defaults.statis,
    }),
  })
}
