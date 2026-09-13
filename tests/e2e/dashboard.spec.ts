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
