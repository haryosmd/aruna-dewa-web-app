export interface DashboardPrefs {
  sidebarCollapsed: boolean
}

export const dashboardPrefsDefaults: DashboardPrefs = { sidebarCollapsed: false }

/**
 * Nilai dari `localStorage` tidak dipercaya begitu saja — JSON yang disunting tangan tidak boleh
 * menghasilkan rail yang bukan lebar dan bukan ciut. Murni supaya bisa diuji tanpa Nuxt.
 */
export function mergeDashboardPrefs(stored: unknown, defaults: DashboardPrefs = dashboardPrefsDefaults): DashboardPrefs {
  const raw = (stored ?? {}) as Partial<Record<keyof DashboardPrefs, unknown>>
  return {
    sidebarCollapsed: typeof raw.sidebarCollapsed === 'boolean' ? raw.sidebarCollapsed : defaults.sidebarCollapsed,
  }
}
