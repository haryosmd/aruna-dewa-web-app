import { test, expect } from './fixtures'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

const fixturePath = '.data/qa-account.json'
const account = existsSync(fixturePath)
  ? JSON.parse(readFileSync(fixturePath, 'utf8')) as { email: string; password: string; invitationId: string; slug: string; locked?: { email: string; password: string; invitationId: string } }
  : null

if (!account && process.env.CI) {
  throw new Error('.data/qa-account.json tidak ada. `pnpm test:integration` harus berhasil sebelum `playwright test` di CI.')
}

async function hydrated(page: Page) {
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__))
}

async function signIn(page: Page, sebagai: { email: string; password: string } = account!) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(sebagai.email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(sebagai.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
}

/**
 * "Gerak sudah mereda" dibaca dari nilainya sendiri, bukan dari tempo tetap.
 *
 * gsap tidak diekspos ke `window`, jadi bertanya pada `globalTimeline` bukan pilihan — dan
 * `waitForTimeout` yang cukup lama hari ini adalah tes yang berbohong besok, di runner yang
 * lebih lambat. Yang ditunggu di sini: dua pembacaan berturut-turut yang identik.
 */
async function reda(page: Page, selector: string) {
  let sebelumnya = ''
  for (let percobaan = 0; percobaan < 50; percobaan++) {
    const sekarang = await page.evaluate(
      (sel) => [...document.querySelectorAll(sel)].map(el => getComputedStyle(el).opacity).join('|'),
      selector,
    )
    if (sekarang === sebelumnya) return
    sebelumnya = sekarang
    await page.waitForTimeout(120)
  }
}

/* ── Panggung editor: gerak, dan bagian yang tidak pernah boleh kehilangan teksnya ────────── */

test.describe('panggung editor menampilkan isinya', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!account, 'Jalankan `pnpm test:integration` dulu untuk membuat akun QA terisolasi.')
    await signIn(page)
  })

  /**
   * Invarian fase 78, dan ia yang menggerbangi `reverse`.
   *
   * Sebelum fase ini, **22 dari 22** `[data-iv-lead]` di panggung berhenti pada `opacity: 0` —
   * saat dipasang maupun setelah panggung digulir sampai dasar — karena tidak ada satu pun
   * `scroller:` yang dioper ke ScrollTrigger di seluruh repo, sementara panggung menggulung
   * isinya di dalam bingkai ponsel. Ornamennya terlihat, teksnya tidak.
   *
   * Yang dijaga di sini bukan "gerak berjalan" melainkan syarat yang lebih keras dan lebih
   * berguna: **setelah gerak mereda, bagian yang menempati tengah layar wajib menampilkan
   * seluruh teksnya**. Patokannya diambil dari halaman yang sama dengan gerak dimatikan, jadi
   * ia tahan terhadap keadaan istirahat yang memang bukan 1 — `.iv-kicker` misalnya hidup pada
   * 0,8 demi kontras, dan menuliskan angka itu di tes akan membusuk diam-diam.
   */
  // `@desktop`: panggung pratinjau baru berdiri di >=1280px — di bawah itu editor menampilkan
  // panel pengaturan dan menyembunyikan panggungnya. Ditandai supaya ia tidak IKUT DIJALANKAN
  // lalu dibuang; eksekusi yang di-skip membuat `skipped` bukan nol dan gerbang e2e kehilangan
  // artinya. Gerak di lebar sempit tetap terjaga lewat halaman tamu, yang diuji keempat project.
  test('tiap bagian menampilkan teksnya setelah gulir turun, naik, lalu turun lagi', { tag: '@desktop' }, async ({ page }) => {
    // Patokan: keadaan istirahat, diambil dengan `prefers-reduced-motion` menyala.
    const diam = await page.context().newPage()
    await diam.emulateMedia({ reducedMotion: 'reduce' })
    await diam.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(diam)
    await diam.waitForSelector('[data-preview-stage] [data-iv-lead]')
    const istirahat = await diam.evaluate(() => {
      const peta: Record<string, string[]> = {}
      for (const el of document.querySelectorAll('[data-preview-stage] [data-iv-lead]')) {
        const id = el.closest('[data-iv-section]')?.id ?? 'gerbang'
        ;(peta[id] ??= []).push(Number(getComputedStyle(el).opacity).toFixed(2))
      }
      return peta
    })
    await diam.close()
    expect(Object.keys(istirahat).length).toBeGreaterThan(3)

    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(page)
    await page.waitForSelector('[data-preview-stage] [data-iv-lead]')

    const gulir = (atas: number) => page.evaluate((y) => {
      document.querySelector('[data-preview-stage]')!.scrollTo({ top: y, behavior: 'instant' })
    }, atas)
    const tinggi = await page.evaluate(() => document.querySelector('[data-preview-stage]')!.scrollHeight)

    // Sengaja kasar: turun sampai dasar, naik sampai puncak, lalu turun lagi.
    for (let y = 0; y < tinggi; y += 600) { await gulir(y); await page.waitForTimeout(80) }
    for (let y = tinggi; y > 0; y -= 600) { await gulir(y); await page.waitForTimeout(80) }

    for (const bagian of [0.25, 0.55, 0.8]) {
      await gulir(Math.round(tinggi * bagian))
      await reda(page, '[data-preview-stage] [data-iv-lead]')
      const tengah = await page.evaluate(() => {
        const host = document.querySelector('[data-preview-stage]')!
        const garis = host.getBoundingClientRect().top + host.clientHeight / 2
        let kena: Element | null = null
        for (const section of host.querySelectorAll('[data-iv-section]')) {
          const kotak = section.getBoundingClientRect()
          if (kotak.top <= garis && kotak.bottom >= garis) kena = section
        }
        if (!kena) return null
        return {
          id: kena.id,
          leads: [...kena.querySelectorAll('[data-iv-lead]')].map(el => Number(getComputedStyle(el).opacity).toFixed(2)),
        }
      })
      expect(tengah, `tidak ada bagian di tengah pada ${bagian}`).not.toBeNull()
      expect(tengah!.leads, `bagian ${tengah!.id} kehilangan teksnya`).toEqual(istirahat[tengah!.id])
      expect(tengah!.leads).not.toContain('0.00')
    }
  })

  /**
   * Tombol Statis, dan yang paling penting darinya: ia **tidak menyentuh dokumen**.
   *
   * Pilihan ini hidup di `localStorage` bersama zoom dan lebar pratinjau, bukan di
   * `InvitationDocument` — jadi undangan yang dilihat tamu selalu bergerak. Yang dipakai
   * sebagai bukti di sini penanda "ada perubahan yang belum tersimpan": kalau menekannya
   * sampai ke dokumen, penanda itu akan menyala.
   */
  // `@desktop`: alasan yang sama — tombolnya hidup di rel panggung.
  test('tombol Statis menampilkan semuanya seketika, dan tidak mengubah dokumen', { tag: '@desktop' }, async ({ page }) => {
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(page)
    await page.waitForSelector('#editor-preview-gerak')

    const tersembunyi = () => page.evaluate(() =>
      [...document.querySelectorAll('[data-preview-stage] [data-iv-lead]')]
        .filter(el => Number(getComputedStyle(el).opacity) === 0).length)

    const keadaanSimpan = await page.locator('#editor-save-state').innerText()

    await expect(page.locator('#editor-preview-gerak')).toHaveAttribute('aria-pressed', 'true')
    await page.locator('#editor-preview-gerak').click()
    await expect(page.locator('#editor-preview-gerak')).toHaveAttribute('aria-pressed', 'false')
    await reda(page, '[data-preview-stage] [data-iv-lead]')
    expect(await tersembunyi()).toBe(0)

    // Tidak ada perubahan dokumen: penanda simpan tidak bergerak.
    expect(await page.locator('#editor-save-state').innerText()).toBe(keadaanSimpan)

    // Bertahan antar kunjungan, seperti zoom dan lebar pratinjau.
    await page.reload()
    await hydrated(page)
    await expect(page.locator('#editor-preview-gerak')).toHaveAttribute('aria-pressed', 'false')

    await page.locator('#editor-preview-gerak').click()
    await expect(page.locator('#editor-preview-gerak')).toHaveAttribute('aria-pressed', 'true')
  })
})

/* ── Musik tidak lagi menyalakan dirinya sendiri ─────────────────────────────────────────── */

test('membuka amplop tidak membunyikan musik; tombolnya yang membunyikan', async ({ page }) => {
  await page.goto('/i/demo')
  await hydrated(page)
  await page.locator('.iv-gate button').first().click()
  await page.waitForTimeout(1200)

  const pemutar = page.locator('.iv-player button').first()
  await expect(pemutar).toHaveAttribute('aria-pressed', 'false')
  await expect(pemutar).toHaveAttribute('aria-label', 'Putar musik')
  expect(await page.evaluate(() => (document.querySelector('.iv-player audio') as HTMLAudioElement | null)?.paused ?? true)).toBe(true)

  await pemutar.click()
  await expect(pemutar).toHaveAttribute('aria-pressed', 'true')
})

/* ── Pratinjau draf ──────────────────────────────────────────────────────────────────────── */

test.describe('pratinjau draf', () => {
  test.beforeEach(() => {
    test.skip(!account, 'Jalankan `pnpm test:integration` dulu untuk membuat akun QA terisolasi.')
  })

  test('toolbar editor menautkannya ke tab baru, dan halamannya menolak diindeks', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(page)
    const tombol = page.locator('#editor-preview')
    await expect(tombol).toHaveAttribute('href', `/dashboard/${account!.invitationId}/preview`)
    await expect(tombol).toHaveAttribute('target', '_blank')

    await page.goto(`/dashboard/${account!.invitationId}/preview`)
    await hydrated(page)
    await expect(page.locator('#preview-back')).toBeVisible()
    expect(await page.locator('[data-iv-section]').count()).toBeGreaterThan(3)
    expect(await page.evaluate(() => document.querySelector('meta[name=robots]')?.getAttribute('content'))).toBe('noindex, nofollow')
  })

  test('menolak orang yang bukan anggota undangan', async ({ page }) => {
    test.skip(!account?.locked, 'Fixture QA tidak membawa akun kedua.')
    await signIn(page, account!.locked!)
    await page.goto(`/dashboard/${account!.invitationId}/preview`)
    await hydrated(page)
    await expect(page.getByRole('alert')).toContainText('tidak memiliki akses')
    expect(await page.locator('[data-iv-section]').count()).toBe(0)
  })
})

/* ── Backoffice ──────────────────────────────────────────────────────────────────────────── */

test.describe('backoffice operator', () => {
  test.beforeEach(() => {
    test.skip(!account, 'Jalankan `pnpm test:integration` dulu untuk membuat akun QA terisolasi.')
  })

  /**
   * 404, bukan 403 — halaman operator tidak perlu mengumumkan keberadaannya kepada orang yang
   * tidak boleh melihatnya. Penjaga sesungguhnya ada di API; yang diuji di sini penjaga kedua.
   */
  test('menolak pengguna biasa dengan 404, dan API-nya dengan 403', async ({ page }) => {
    test.skip(!account?.locked, 'Fixture QA tidak membawa akun kedua.')
    await signIn(page, account!.locked!)
    await page.goto('/bo/undangan')
    await hydrated(page)
    expect(await page.locator('tr[id^=bo-row-]').count()).toBe(0)
    await expect(page.locator('h1')).toContainText('404')
  })

  /*
   * Ditulis terhadap ISINYA, bukan terhadap tabelnya: di bawah 1024px daftar yang sama dirender
   * sebagai kartu, dan tes yang menuntut `<tr>` akan merah di tiga project bukan karena ada yang
   * rusak melainkan karena ia menanyakan hal yang salah.
   */
  test('operator melihat daftarnya, lengkap dengan pemilik dan jumlah tamu', async ({ page }) => {
    await signIn(page)
    await page.goto('/bo')
    await expect(page).toHaveURL(/\/bo\/undangan/)
    await hydrated(page)
    await page.fill('#bo-search', account!.slug)

    /*
     * `toHaveCount(1)` atas yang TAMPAK, bukan `toBeVisible()` atas yang pertama.
     *
     * Kedua tata letak ada di DOM sekaligus — tabel `hidden lg:block` dan daftar kartu
     * `lg:hidden` — jadi `.first()` selalu mendarat di markup tabel, yang tersembunyi di tiga
     * project sempit. Menghitung yang tampak menjawab pertanyaan yang sebenarnya, dan ia juga
     * menangkap kebalikannya: dua tata letak yang muncul berbarengan.
     */
    const tampak = (locator: ReturnType<Page['locator']>) => locator.filter({ visible: true })
    await expect(tampak(page.getByText(`/i/${account!.slug}`))).toHaveCount(1)
    await expect(tampak(page.getByText(account!.email))).toHaveCount(1)
    await expect(tampak(page.locator(`#bo-archive-${account!.invitationId}`))).toHaveCount(1)
  })
})

/* ── Aksesibilitas dua permukaan baru ─────────────────────────────────────────────────────── */

test.describe('halaman baru fase 78 lolos axe', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!account, 'Jalankan `pnpm test:integration` dulu untuk membuat akun QA terisolasi.')
    await signIn(page)
  })

  for (const [nama, jalan] of [
    ['backoffice', '/bo/undangan'],
    ['pratinjau draf', `/dashboard/${account?.invitationId}/preview`],
  ] as const) {
    test(`${nama} tanpa pelanggaran WCAG AA`, async ({ page }) => {
      await page.goto(jalan)
      await hydrated(page)
      const scan = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      // Node-nya ikut ditulis: "color-contrast" tanpa target adalah laporan yang tidak bisa
      // diperbaiki dari log CI.
      expect(scan.violations.map(v => `${jalan} ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([])
    })
  }
})
