import { useLocalStorage } from '@vueuse/core'
import { dashboardPrefsDefaults, mergeDashboardPrefs, type DashboardPrefs } from '~/utils/dashboard-prefs'

/**
 * Preferensi kerangka dasbor yang bertahan antar kunjungan — sejauh ini hanya rail navigasi ciut.
 *
 * Kuncinya sengaja terpisah dari `aruna:editor:prefs`: preferensi ini milik semua halaman dasbor,
 * bukan editor saja, dan e2e menegaskan bentuk kunci editor apa adanya. `initOnMounted` wajib
 * dengan alasan yang sama seperti di `useEditorPrefs` — HTML server memakai bawaan (lebar), dan
 * klien baru menukarnya sesudah mount, jadi hidrasi tidak pernah melihat dua lebar berbeda.
 */
export function useDashboardPrefs() {
  return useLocalStorage<DashboardPrefs>('aruna:dashboard:prefs', { ...dashboardPrefsDefaults }, {
    initOnMounted: true,
    mergeDefaults: (stored, defaults) => mergeDashboardPrefs(stored, defaults),
  })
}
