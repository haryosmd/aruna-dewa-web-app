import { describe, expect, it } from 'vitest'
import { dashboardPrefsDefaults, mergeDashboardPrefs } from '../utils/dashboard-prefs'

describe('mergeDashboardPrefs', () => {
  it('memakai bawaan saat simpanan kosong', () => {
    expect(mergeDashboardPrefs(null)).toEqual(dashboardPrefsDefaults)
    expect(mergeDashboardPrefs(undefined)).toEqual({ sidebarCollapsed: false })
  })

  it('menolak nilai yang bukan boolean', () => {
    expect(mergeDashboardPrefs({ sidebarCollapsed: 'ya' })).toEqual({ sidebarCollapsed: false })
    expect(mergeDashboardPrefs({ sidebarCollapsed: 1 })).toEqual({ sidebarCollapsed: false })
  })

  it('mempertahankan rail ciut yang tersimpan', () => {
    expect(mergeDashboardPrefs({ sidebarCollapsed: true })).toEqual({ sidebarCollapsed: true })
  })
})
