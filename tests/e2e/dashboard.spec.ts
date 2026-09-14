import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync, existsSync } from 'node:fs'

const fixturePath = '.data/qa-account.json'
const account = existsSync(fixturePath) ? JSON.parse(readFileSync(fixturePath, 'utf8')) as { email: string; password: string; invitationId: string; slug: string } : null

test('signed-in editor and guest management use persisted data', async ({ page }, testInfo) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account!.email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(account!.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await expect(page.getByRole('button', { name: 'Simpan draft', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `docs/features/invitation-builder/verification/editor-${testInfo.project.name}.png`, fullPage: true })
  await page.goto(`/dashboard/${account!.invitationId}/guests`)
  await expect(page.getByRole('heading', { name: 'Daftar yang terasa personal.', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Nama undangan', exact: true }).nth(2)).toHaveValue('dr. Yosi Susanti, Sp.OG')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `docs/features/guests-import/verification/guests-${testInfo.project.name}.png`, fullPage: true })
})

/*
 * Axe selama ini hanya menyapu landing, auth, dan keenam tema undangan — tidak satu pun
 * halaman dasbor. Karena itu empat halaman bisa berjalan tanpa `<title>` sama sekali, dan
 * `<dl>` ringkasan memuat `<p>` di dalam pembungkus `dt`/`dd`, tanpa pernah tertangkap.
 *
 * `nuxt-devtools-frame` dikecualikan seperti di `public.spec.ts`: label badge-nya 9,6px
 * abu-abu di atas putih dan selalu gagal kontras, tapi ia milik dev server, bukan produk.
 */
test('dashboard screens are accessible and titled', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account!.email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(account!.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)

  const screens = [
    '/dashboard',
    `/dashboard/${account!.invitationId}`,
    `/dashboard/${account!.invitationId}/editor`,
    `/dashboard/${account!.invitationId}/guests`,
    `/dashboard/${account!.invitationId}/rsvps`,
    `/dashboard/${account!.invitationId}/orders`,
  ]

  for (const path of screens) {
    await page.goto(path)
    await expect(page.locator('h1')).toBeVisible()
    expect(await page.title(), `${path} needs a title`).not.toBe('')
    const scan = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(scan.violations.map(v => `${path} ${v.id}`)).toEqual([])
  }
})

/*
 * Pratinjau perangkat harus benar-benar mengubah apa yang dirender, bukan sekadar
 * memperkecilnya. Buktinya tinggi: cover `split-editorial` menumpuk di bawah 768px dan
 * membelah di atasnya, jadi render 390px selalu lebih tinggi daripada render 834px.
 * Kalau seseorang mengembalikan `@min-[48rem]:` di undangan jadi `md:`, breakpoint-nya
 * kembali membaca lebar layar editor — 1440, selalu benar — kedua tinggi jadi sama, dan
 * tes ini merah. Itulah satu-satunya hal yang membedakan pratinjau jujur dari sekadar zoom.
 */
test('device preview renders each width for real, without overflowing its rail', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account!.email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(account!.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await expect(page.getByRole('button', { name: 'Simpan draft', exact: true })).toBeVisible()

  // Di bawah `xl` pratinjau ada di balik tab; di 1280+ ketiga panel tampil sekaligus.
  const tab = page.getByRole('tab', { name: 'Pratinjau', exact: true })
  if (await tab.isVisible()) await tab.click()

  // Dikaitkan lewat `data-preview-stage`, bukan lewat inline style: undangannya sendiri
  // penuh `transform: scale(...)` milik GSAP dan ornamen.
  const stage = page.locator('[data-preview-stage]')
  const heights: Record<string, number> = {}

  for (const [device, width] of [['Ponsel', 390], ['Tablet', 834], ['Laptop', 1280]] as const) {
    await page.getByRole('button', { name: device, exact: true }).click()
    await expect(page.getByText(`Selebar ${width}px`, { exact: true })).toBeVisible()
    await expect(stage).toHaveCSS('width', `${width}px`)

    heights[device] = await stage.evaluate(el => (el as HTMLElement).offsetHeight)

    // Render yang diperkecil tidak boleh melebihi viewport yang menggulungnya: selisih
    // selebar scrollbar sudah cukup untuk memotong tepi kanan undangan.
    const fits = await stage.evaluate((el) => {
      const viewport = el.parentElement!.parentElement!
      return viewport.scrollWidth <= viewport.clientWidth
    })
    expect(fits, `${device} preview overflows its rail horizontally`).toBe(true)
  }

  expect(heights.Ponsel, 'phone render must stack the cover, so it is taller than tablet').toBeGreaterThan(heights.Tablet)
  expect(heights.Tablet).toBe(heights.Laptop)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

/*
 * Satu sesi per akun: masuk di tempat baru mengakhiri yang lama. Yang diuji di sini bukan
 * cuma bahwa perangkat lama kehilangan akses, tapi bahwa ia diberi tahu sebabnya — tanpa itu
 * pemiliknya hanya melihat form login muncul entah dari mana.
 */
test('signing in elsewhere ends the older session with an explanation', async ({ browser }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  const signIn = async (page: import('@playwright/test').Page) => {
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(account!.email)
    await page.getByLabel('Kata sandi', { exact: true }).fill(account!.password)
    await page.getByRole('button', { name: 'Masuk', exact: true }).click()
    await expect(page).toHaveURL(/dashboard/)
  }

  const first = await browser.newContext()
  const second = await browser.newContext()
  try {
    const older = await first.newPage()
    await signIn(older)
    await signIn(await second.newPage())

    await older.goto('/dashboard')
    await expect(older).toHaveURL(/\/login\?.*reason=SESSION_REPLACED/)
    await expect(older.getByText('dipakai masuk di perangkat lain')).toBeVisible()
  } finally {
    await first.close()
    await second.close()
  }
})

/*
 * Peta situs di footer tidak boleh menawarkan "Masuk" kepada orang yang sudah masuk.
 */
test('footer sitemap follows the session', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await page.goto('/')
  const bantuan = page.locator('footer li')
  await expect(bantuan.filter({ hasText: 'Masuk' })).toHaveCount(1)
  await expect(bantuan.filter({ hasText: 'Dashboard' })).toHaveCount(0)

  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account!.email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(account!.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)

  await page.goto('/')
  await expect(page.locator('footer').getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(page.locator('footer').getByRole('button', { name: 'Keluar', exact: true })).toBeVisible()
  await expect(page.locator('footer').getByRole('link', { name: 'Daftar', exact: true })).toHaveCount(0)
})
