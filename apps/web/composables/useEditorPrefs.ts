import { useLocalStorage } from '@vueuse/core'

export type PreviewDevice = 'ponsel' | 'tablet' | 'laptop'
export type InspectorTab = 'bagian' | 'tema'

export interface EditorPrefs {
  device: PreviewDevice
  inspectorTab: InspectorTab
  railCollapsed: boolean
}

export const editorPrefsDefaults: EditorPrefs = { device: 'ponsel', inspectorTab: 'bagian', railCollapsed: false }

const devices = new Set<PreviewDevice>(['ponsel', 'tablet', 'laptop'])
const tabs = new Set<InspectorTab>(['bagian', 'tema'])

/**
 * Preferensi editor yang bertahan antar kunjungan: perangkat pratinjau, tab inspektor, rail ciut.
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
      device: devices.has(stored?.device) ? stored.device : defaults.device,
      inspectorTab: tabs.has(stored?.inspectorTab) ? stored.inspectorTab : defaults.inspectorTab,
      railCollapsed: typeof stored?.railCollapsed === 'boolean' ? stored.railCollapsed : defaults.railCollapsed,
    }),
  })
}
