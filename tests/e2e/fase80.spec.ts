import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

/*
 * Fase 80 — amplop yang benar-benar bergerak, gerak masuk yang terlihat, form yang tidak direbut.
 *
 * Tiga dari empat tes di sini membaca halaman TAMU (`/i/demo`), karena ketiga cacatnya memang
 * hidup di sana: amplop yang sudah transparan sebelum segelnya terbelah, hero yang memutar gerak
 * masuknya di belakang amplop, dan `iris` yang tidak pernah membuka apa pun.
 */

const fixturePath = '.data/qa-account.json'
const account = existsSync(fixturePath)
  ? JSON.parse(readFileSync(fixturePath, 'utf8')) as { email: string; password: string; invitationId: string }
  : null

async function hydrated(page: Page) {
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__))
}

/**
 * Menekan segel lalu mencatat opacity gerbang, surat, dan judul hero tiap 50ms sampai gerbang pergi.
 * Satu `evaluate`, bukan polling dari Node: jarak antar-sampel harus jam halaman, bukan jam IPC.
 */
async function rekamPembukaan(page: Page) {
  return page.evaluate(async () => {
    const gerbang = document.querySelector<HTMLElement>('.iv-gate')!
    document.querySelector<HTMLButtonElement>('[data-gate-seal]')!.click()
    const sampel: { t: number, gerbang: number, surat: number, hero: number }[] = []
    const t0 = performance.now()
    while (performance.now() - t0 < 9000) {
      const surat = document.querySelector<HTMLElement>('[data-gate-card]')
      const hero = document.querySelector<HTMLElement>('#iv-hero [data-iv-lead]')
      sampel.push({
        t: performance.now() - t0,
        gerbang: gerbang.isConnected ? Number(getComputedStyle(gerbang).opacity) : -1,
        surat: surat?.isConnected ? Number(getComputedStyle(surat).opacity) : -1,
        hero: hero ? Number(getComputedStyle(hero).opacity) : -1,
      })
      if (!gerbang.isConnected && sampel.length > 5) break
      await new Promise(r => setTimeout(r, 50))
    }
    return sampel
  })
}

test.describe('amplop tamu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/i/demo')
    await hydrated(page)
    // Modul motion harus sudah terpasang, supaya yang diukur adalah gerak — bukan lompatan.
    await page.waitForLoadState('networkidle')
  })

  test('gerbang tetap utuh sampai surat berdiri, lalu hero masuk bersamaan pudarnya', async ({ page }) => {
    /*
     * `networkidle` belum berarti gerak masuk sudah dipasang. Sebelum terpasang judul hero tampil
     * dalam keadaan istirahat (opacity 1, aturan markup keadaan-akhir), dan menekan segel di saat
     * itu mengukur hal lain. Trace safari CI: sampel t=0 hero 1, halaman membeku 1,9 s, sesudahnya
     * hero 0 sepanjang gerbang utuh. Tanda siapnya adalah hero yang sudah disembunyikan dan ditahan.
     */
    await expect.poll(() => page.evaluate(() => Number(getComputedStyle(document.querySelector('#iv-hero [data-iv-lead]')!).opacity)), { timeout: 10_000 }).toBeLessThan(0.1)
    const sampel = await rekamPembukaan(page)

    /*
     * Sampai fase 80 gerbangnya sudah mulai pudar di detik nol (posisi `"-0.22"` dibaca GSAP
     * sebagai waktu mutlak), jadi TIDAK ADA satu sampel pun dengan surat penuh di atas gerbang utuh.
     */
    expect(sampel.some(s => s.surat > 0.95 && s.gerbang === 1), 'surat tidak pernah terlihat di atas gerbang yang utuh').toBe(true)

    // Selama gerbang utuh, hero belum bergerak: ia ditahan, bukan diputar di belakang amplop.
    const utuh = sampel.filter(s => s.gerbang === 1)
    expect(Math.max(...utuh.map(s => s.hero))).toBeLessThan(0.1)

    // Dan ia benar-benar masuk sesudahnya.
    await expect.poll(() => page.evaluate(() => Number(getComputedStyle(document.querySelector('#iv-hero [data-iv-lead]')!).opacity))).toBeGreaterThan(0.85)
  })

  test('iris membuka dari tengah — clip-path, bukan sekadar pudar', async ({ page }) => {
    await page.goto('/i/demo?tema=aruna-sekar')
    await hydrated(page)
    await page.waitForLoadState('networkidle')
    await page.locator('[data-gate-seal]').click()
    await expect(page.locator('.iv-gate')).toHaveCount(0)

    const terbuka = await page.evaluate(async () => {
      const bagian = document.querySelector<HTMLElement>('#iv-wishes')!
      bagian.scrollIntoView({ block: 'start' })
      const judul = bagian.querySelector<HTMLElement>('[data-iv-lead]')!
      const t0 = performance.now()
      while (performance.now() - t0 < 2500) {
        if (getComputedStyle(judul).clipPath.startsWith('inset')) return true
        await new Promise(r => setTimeout(r, 30))
      }
      return false
    })
    expect(terbuka, 'judul bagian tanpa foto tidak pernah memakai bukaan iris').toBe(true)
  })
})

test.describe('editor', () => {
  test('@desktop menambah langkah cerita tidak merebut form ke bagian lain', async ({ page }) => {
    test.skip(!account, 'Jalankan `pnpm test:integration` dulu untuk membuat akun QA terisolasi.')
    test.slow()
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(account!.email)
    await page.getByLabel('Kata sandi', { exact: true }).fill(account!.password)
    await page.getByRole('button', { name: 'Masuk', exact: true }).click()
    await expect(page).toHaveURL(/dashboard/)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(page)
    await page.locator('#editor-inspector-bagian').click()

    const sakelar = page.locator('#editor-section-toggle-story')
    if ((await sakelar.getAttribute('aria-pressed')) === 'true') await sakelar.click()
    const baris = page.locator('#editor-section-story')
    await baris.scrollIntoViewIfNeeded()
    await baris.click()
    await expect(baris).toHaveAttribute('aria-current', 'true')

    /*
     * Tiga langkah, bukan satu: yang diuji adalah bagian yang MEMANJANG di bawah posisi gulir
     * yang sama. Sampai fase 80 itu cukup untuk membuat penyorot-gulir memilih Rundown dan
     * Inspector berganti ke sana di tengah pasangan mengetik.
     */
    const awal = await page.locator('[id^="editor-story-title-"]').count()
    for (let i = 0; i < 3; i++) {
      await page.locator('#editor-story-add').click()
      const judul = page.locator(`#editor-story-title-${awal + i + 1}`)
      await judul.fill(`LANGKAH-80-${i}`)
      await judul.blur()
    }

    /*
     * Lalu panggungnya bergeser ke bagian sesudahnya — di suite penuh itu terjadi sendiri karena
     * tinggi cerita berubah di bawah posisi gulir yang sama; di sini dibuat pasti dengan roda
     * tetikus sungguhan, langsung sesudah klik rail. Sebelum fase 80 gulir ini saja sudah memindah
     * Inspector, dan ekor koreksi rail menarik panggungnya balik ke Cerita.
     */
    await page.locator('[data-preview-stage]').hover()
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 500)
      await page.waitForTimeout(150)
      const id = await page.locator('[data-terlihat="true"]').getAttribute('id', { timeout: 500 }).catch(() => null)
      if (id && id !== 'editor-section-story') break
    }
    // Penanda "tampak di panggung" berpindah ke bagian lain…
    await expect.poll(() => page.locator('[data-terlihat="true"]').getAttribute('id')).not.toBe('editor-section-story')
    // …tapi yang disunting tetap Cerita.
    await expect(baris).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('#editor-field-story-variant')).toBeVisible()

    // Bersih-bersih: undangan QA dipakai bersama tes lain.
    for (let i = awal + 3; i > awal; i--) await page.locator(`#editor-story-remove-${i}`).click()
    await expect(page.locator('[id^="editor-story-title-"]')).toHaveCount(awal)
  })
})
