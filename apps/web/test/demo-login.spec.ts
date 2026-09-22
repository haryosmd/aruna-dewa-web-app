import { describe, expect, it } from 'vitest'

import { DemoCooldown, demoPathAllowed, shouldDemoLogin } from '../utils/demo-login'

const ok = { enabled: true, dev: true, hostname: '127.0.0.1', pathname: '/dashboard', hasSessionCookie: false, isDocument: true }

describe('shouldDemoLogin', () => {
  it('menyala hanya bila keempat gerbang lolos', () => {
    expect(shouldDemoLogin(ok)).toBe(true)
  })

  it('mati tanpa sakelar env, dan mati di build produksi walau sakelarnya ada', () => {
    expect(shouldDemoLogin({ ...ok, enabled: false })).toBe(false)
    expect(shouldDemoLogin({ ...ok, dev: false })).toBe(false)
  })

  it('hanya host loopback — ketiga ejaannya', () => {
    expect(shouldDemoLogin({ ...ok, hostname: 'localhost' })).toBe(true)
    expect(shouldDemoLogin({ ...ok, hostname: '[::1]' })).toBe(true)
    expect(shouldDemoLogin({ ...ok, hostname: 'arunadewa.id' })).toBe(false)
    expect(shouldDemoLogin({ ...ok, hostname: undefined })).toBe(false)
  })

  it('tidak menimpa sesi yang sudah ada', () => {
    expect(shouldDemoLogin({ ...ok, hasSessionCookie: true })).toBe(false)
  })

  it('hanya permintaan dokumen, bukan payload atau prefetch', () => {
    expect(shouldDemoLogin({ ...ok, isDocument: false })).toBe(false)
  })

  it('halaman tamu, login, dan landing tidak pernah memicu login', () => {
    for (const pathname of ['/', '/login', '/register', '/i/demo-aruna-dewa', '/dashboardx']) {
      expect(shouldDemoLogin({ ...ok, pathname }), pathname).toBe(false)
    }
  })

  it('jalur yang butuh akun, termasuk yang dalam', () => {
    for (const pathname of ['/dashboard', '/dashboard/abc/editor', '/order', '/account']) {
      expect(demoPathAllowed(pathname), pathname).toBe(true)
    }
  })
})

describe('DemoCooldown', () => {
  it('aktif selama jendela sesudah diarmkan, lalu lepas sendiri', () => {
    let clock = 1_000
    const cooldown = new DemoCooldown(() => clock)
    expect(cooldown.active).toBe(false)
    cooldown.arm(60_000)
    expect(cooldown.active).toBe(true)
    clock += 59_999
    expect(cooldown.active).toBe(true)
    clock += 1
    expect(cooldown.active).toBe(false)
  })
})
