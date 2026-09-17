import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync, existsSync } from 'node:fs'

const fixturePath = '.data/qa-account.json'
const account = existsSync(fixturePath) ? JSON.parse(readFileSync(fixturePath, 'utf8')) as { email: string; password: string; invitationId: string; slug: string } : null

/*
 * Di mesin pengembang, tidak adanya fixture adalah keadaan wajar dan `test.skip` di bawah memberi
 * petunjuk yang benar. Di CI ia adalah kegagalan yang menyamar jadi kelulusan: `test.skip`
 * menandai eksekusi sebagai *skipped*, bukan *failed*, jadi 44 eksekusi (11 tes x 4 project)
 * hilang diam-diam, Playwright tetap keluar 0, `workflow_run.conclusion` tetap 'success', dan
 * Deploy berjalan — gerbang rilisnya terbuka justru ketika separuh suite tidak pernah jalan.
 */
if (!account && process.env.CI) {
  throw new Error('.data/qa-account.json tidak ada. `pnpm test:integration` harus berhasil sebelum `playwright test` di CI.')
}

/**
 * Editor dirender di server, jadi tombolnya sudah ada di DOM sebelum Vue terpasang. Klik yang
 * mendarat sebelum hidrasi tidak mengubah apa pun dan tidak melaporkan apa pun — gejalanya
 * panel tetap menampilkan bagian pertama, atau tab Pratinjau tidak pernah terbuka, seolah
 * pemilihnya salah sasaran.
 */
async function hydrated(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__))
}

async function openSection(page: import('@playwright/test').Page, sectionId: string) {
  await hydrated(page)
  await page.locator(`#editor-section-${sectionId}`).click()
}

/**
 * Memuat huruf yang benar-benar dipakai sebuah elemen, dan menunggunya — bukan menunggu
 * `document.fonts.ready`.
 *
 * Undangan ini hampir seluruhnya huruf display besar: diukur sebelum fontnya terpasang,
 * tingginya adalah tinggi huruf cadangan, dan kapan font selesai dimuat berbeda-beda.
 * Penantiannya harus ada. Yang tidak boleh adalah cara lamanya.
 *
 * `document.fonts.ready` **tidak pernah resolve** di WebKit pada halaman editor. `@nuxt/fonts`
 * mendeklarasikan tiap keluarga dua kali — satu set ber-`unicode-range` dan satu rentang penuh,
 * 12 blok `@font-face` per weight Cormorant, di bundel produksi maupun dev. Saat keduanya mulai
 * memuat untuk glyph yang sama, WebKit membatalkan yang kalah dan mencatatnya `error`, dan satu
 * face `error` membuat `document.fonts.status` mandek di `loading` selamanya. Terukur: 0–1ms di
 * Chromium 390 dan WebKit 1440, tidak pernah selesai di WebKit 390.
 *
 * Yang membuatnya sulit dikenali: penantian itu memakan seluruh jatah 30 detik, jadi yang
 * dilaporkan gagal adalah langkah mana pun yang kebetulan berjalan saat tenggatnya lewat —
 * dua kali berturut-turut dengan langkah yang berbeda. Tidak ada yang rusak di layar: face
 * rentang penuh tetap menang, dan `document.fonts.check('600 24px "Cormorant Garamond"')`
 * bernilai `true` di ketiga kombinasi, termasuk yang punya dua face `error`.
 *
 * Penggantinya lebih ketat, bukan lebih longgar: ia menyebut huruf yang dipakai elemen yang
 * sedang diukur dan memuatnya, alih-alih menunggu himpunan yang memuat 136 face.
 */
async function fontsUsedBy(locator: import('@playwright/test').Locator) {
  await locator.evaluate(async (el) => {
    const specs = new Set<string>()
    for (const node of el.querySelectorAll('*')) {
      if (!node.textContent?.trim()) continue
      const style = getComputedStyle(node)
      specs.add(`${style.fontStyle} ${style.fontWeight} 16px ${style.fontFamily}`)
    }
    // `load()` menolak untuk spec yang tidak cocok satu face pun; itu bukan kegagalan tes.
    await Promise.all([...specs].map(spec => document.fonts.load(spec).catch(() => {})))
  })
}

/**
 * Menyimpan draft dan menunggu servernya benar-benar menjawab.
 *
 * Sejak fase 18 tidak ada lagi autosave, jadi apa pun yang harus bertahan sampai muat ulang
 * wajib melewati tombol ini. Yang ditunggu penanda di header, bukan toast — toast menghilang
 * sendiri setelah beberapa detik dan membuat tesnya bergantung pada waktu.
 */
async function saveDraft(page: import('@playwright/test').Page) {
  await page.locator('#editor-save').click()
  await expect(page.locator('#editor-save-state')).toHaveText('Semua perubahan tersimpan')
}

/** Aset draft dilayani API langsung, bukan lewat origin web. */
const apiOrigin = process.env.E2E_API_ORIGIN ?? 'http://127.0.0.1:3001'

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
    '/account',
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
  await hydrated(page)
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

    /*
     * Diukur setelah setiap foto benar-benar termuat.
     *
     * Foto galeri `loading="lazy"`, dan berapa banyak yang termuat bergantung pada seberapa
     * jauh render diperkecil — yang sendiri bergantung pada lebar layar yang menjalankan tes.
     * Tanpa penyetaraan ini, tinggi yang sama diukur berbeda di 360px dan di 1440px, dan
     * tesnya lulus atau gagal karena hal yang sama sekali tidak ingin diujinya.
     */
    await stage.evaluate(async (el) => {
      const images = [...el.querySelectorAll('img')]
      for (const image of images) image.loading = 'eager'
      await Promise.all(images.map(image => image.complete
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          })))
    })

    await fontsUsedBy(stage)
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

/*
 * Foto dan musik di dasbor (fase 16).
 *
 * Sebelum fase ini satu-satunya tombol unggah ada di galeri, menerima `image/*` — GIF, AVIF,
 * dan SVG lolos di klien lalu ditolak server, jadi pasangan baru tahu berkasnya salah setelah
 * berkas 12 MB selesai naik lewat data seluler. Yang diuji di sini persisnya itu: penolakan
 * terjadi **sebelum** ada satu permintaan jaringan pun.
 */
async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account!.email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(account!.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
}

/** Menjatuhkan berkas sungguhan ke dropzone lewat `DataTransfer`, bukan lewat `setInputFiles`. */
async function dropFiles(page: import('@playwright/test').Page, inputId: string, files: { name: string; type: string; bytes: number }[]) {
  await page.evaluate(({ inputId, files }) => {
    const zone = document.querySelector(`#${inputId}`)!.closest('label')!
    const dt = new DataTransfer()
    for (const file of files) dt.items.add(new File([new Uint8Array(file.bytes)], file.name, { type: file.type }))
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
  }, { inputId, files })
}

test('gallery dropzone refuses the wrong file before it reaches the network', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await openSection(page, 'gallery')
  await expect(page.locator('#editor-gallery-upload')).toBeAttached()

  const uploads: string[] = []
  page.on('request', request => { if (request.url().includes('/media')) uploads.push(request.url()) })

  await dropFiles(page, 'editor-gallery-upload', [
    { name: 'nikah-01.gif', type: 'image/gif', bytes: 500 },
    { name: 'prewed-besar.jpg', type: 'image/jpeg', bytes: 12 * 1024 * 1024 },
  ])

  // Pesannya menyebut berkas mana dan kenapa — satu jatuhan bisa berisi sepuluh foto.
  await expect(page.getByText('nikah-01.gif — jenis berkas harus JPG, JPEG, PNG, atau WebP')).toBeVisible()
  await expect(page.getByText('prewed-besar.jpg — 12,0 MB, maksimal 10,0 MB')).toBeVisible()
  expect(uploads, 'berkas yang salah tidak boleh menyentuh jaringan').toEqual([])
})

test('gallery dropzone accepts a real photo, downscales it, and labels it as what it really is', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await openSection(page, 'gallery')
  await expect(page.locator('#editor-gallery-upload')).toBeAttached()
  const before = await page.locator('[id^=editor-gallery-url-]').count()

  // 2400px: di atas batas 2000px, jadi jalur perkecil + konversi WebP ikut teruji.
  // Berkas yang benar-benar dikirim ditangkap di `fetch` halaman — Playwright tidak menyangga
  // badan multipart lintas-origin, dan yang ingin dibuktikan justru apa yang keluar dari browser.
  const hasil = await page.evaluate(async () => {
    const terkirim: { nama: string; jenis: string; bytes: number }[] = []
    const asli = window.fetch
    window.fetch = function (...args: Parameters<typeof fetch>) {
      const body = (args[1] as RequestInit | undefined)?.body
      if (body instanceof FormData) {
        const file = body.get('file')
        if (file instanceof File) terkirim.push({ nama: file.name, jenis: file.type, bytes: file.size })
      }
      return asli.apply(this, args)
    }

    const canvas = document.createElement('canvas')
    canvas.width = 2400; canvas.height = 1600
    const context = canvas.getContext('2d')!
    context.fillStyle = '#8a5a3b'; context.fillRect(0, 0, 2400, 1600)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))

    const zone = document.querySelector('#editor-gallery-upload')!.closest('label')!
    const dt = new DataTransfer()
    dt.items.add(new File([blob!], 'prewed-uji.png', { type: 'image/png' }))
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
    await new Promise(resolve => setTimeout(resolve, 6000))

    window.fetch = asli
    const inputs = [...document.querySelectorAll<HTMLInputElement>('[id^=editor-gallery-url-]')]
    return { url: inputs[inputs.length - 1]?.value ?? '', terkirim, pngAsli: blob!.size }
  })

  expect(await page.locator('[id^=editor-gallery-url-]').count()).toBe(before + 1)
  expect(hasil.url).toMatch(/\/v1\/public\/media\/[0-9a-f-]{36}$/)

  /*
   * PNG 2400px yang dijatuhkan berangkat sudah diperkecil — dan berangkat dengan nama serta
   * MIME yang **cocok dengan isinya**.
   *
   * Dulu dua baris di sini mengunci `prewed-uji.webp` dan `image/webp` tanpa syarat, karena
   * satu-satunya mesin yang pernah menjalankannya adalah Chromium. `canvas.toBlob` boleh
   * mengabaikan jenis yang diminta dan mengembalikan PNG — WebKit memakainya — dan waktu itu
   * hasilnya tetap dilabeli WebP, jadi server menolak **setiap** unggahan dari sana. Yang
   * dikunci sekarang aturannya, bukan satu jawaban yang kebetulan benar di satu mesin.
   */
  expect(hasil.terkirim).toHaveLength(1)
  const terkirim = hasil.terkirim[0]!
  expect(['image/webp', 'image/jpeg', 'image/png']).toContain(terkirim.jenis)
  expect(terkirim.nama).toBe(`prewed-uji.${({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' } as Record<string, string>)[terkirim.jenis]}`)
  expect(terkirim.bytes).toBeLessThan(hasil.pngAsli)

  /*
   * Siklus penuh, bukan cuma "hilang dari layar".
   *
   * Yang lama berhenti di `toHaveCount(before)` sesudah menekan hapus — dan itu lolos pada
   * polling pertama, tepat sebelum jawaban autosave yang melayang mendarat dan menghidupkan
   * fotonya kembali. Karena URL-nya bangkit, ia ikut terbit, dan `MediaService.remove` menolak
   * menghapus aset yang dipakai revisi aktif: kuota 15 foto naik satu tiap putaran sampai
   * `Dropzone` memasang `blocked` dan tes ini tidak pernah bisa hijau dua kali berturut-turut.
   *
   * Sejak autosave dicabut, simpan adalah tindakan sadar — jadi buktinya juga harus melewati
   * server: simpan, muat ulang, foto masih ada; hapus, simpan, muat ulang, foto benar-benar
   * hilang dan berkasnya ikut dilepas.
   */
  const assetId = hasil.url.split('/').pop()!
  await saveDraft(page)
  await page.reload()
  await openSection(page, 'gallery')
  await expect(page.locator('[id^=editor-gallery-url-]')).toHaveCount(before + 1)
  expect((await page.request.get(`${apiOrigin}/v1/media/${assetId}`)).status(), 'berkasnya ada sesudah disimpan').toBe(200)

  await page.locator('[id^=editor-gallery-remove-]').last().click()
  await saveDraft(page)
  await page.reload()
  await openSection(page, 'gallery')
  await expect(page.locator('[id^=editor-gallery-url-]')).toHaveCount(before)

  // Kuotanya benar-benar kembali: yang dilepas adalah berkasnya, bukan cuma tautannya.
  expect((await page.request.get(`${apiOrigin}/v1/media/${assetId}`)).status(), 'berkasnya ikut dilepas sesudah simpan').toBe(400)
})

/*
 * Penjaga "perubahan belum tersimpan" (fase 18).
 *
 * Autosave dicabut karena ia menimpa dokumen lokal dengan gema jawaban server, dan penjaganya
 * sendiri tidak pernah berhasil menahan apa pun — satu suntingan menghasilkan 13 revisi dalam
 * 12 detik, lalu terus begitu selama editornya terbuka. Yang menggantikannya bukan simpan yang
 * lebih pintar melainkan pasangan yang diberi tahu: keadaan tersimpan tertulis di layar, dan
 * halaman tidak bisa ditinggalkan diam-diam sambil membawa pekerjaan yang belum dikirim.
 */
test('editor menahan perpindahan halaman selama ada perubahan belum tersimpan', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await openSection(page, 'cover')
  await expect(page.locator('#editor-save-state')).toHaveText('Semua perubahan tersimpan')
  await expect(page.locator('#editor-save')).toBeDisabled()

  const judul = `Aruna & Dewa ${Date.now() % 10_000}`
  await page.locator('#editor-text-title').fill(judul)
  await expect(page.locator('#editor-save-state')).toHaveText('Ada perubahan yang belum tersimpan')

  // Rel samping di ≥1024px, bilah bawah di bawah itu — keduanya menuju halaman yang sama.
  const keTamu = page.locator('#dash-nav-guests:visible, #dash-tab-guests:visible').first()

  // "Kembali menyunting" menahan di halaman ini, dan suntingannya tetap ada.
  await keTamu.click()
  await expect(page.locator('#aruna-popup-title')).toHaveText('Perubahan belum tersimpan')
  await page.locator('#aruna-popup-kembali').click()
  await expect(page).toHaveURL(/\/editor$/)
  await expect(page.locator('#editor-text-title')).toHaveValue(judul)

  // Escape berarti hal yang sama: yang ragu-ragu tidak boleh kehilangan pekerjaannya.
  await keTamu.click()
  await expect(page.locator('#aruna-popup-title')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#aruna-popup-title')).toHaveCount(0)
  await expect(page).toHaveURL(/\/editor$/)

  // "Simpan perubahan" menyimpan lebih dulu, baru berpindah — dan simpanannya sungguhan.
  await keTamu.click()
  await page.locator('#aruna-popup-simpan').click()
  await expect(page).toHaveURL(/\/guests$/)

  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await openSection(page, 'cover')
  await expect(page.locator('#editor-text-title')).toHaveValue(judul)
  await expect(page.locator('#editor-save-state')).toHaveText('Semua perubahan tersimpan')
})

test('music section offers a library, and picking a track switches it on', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await openSection(page, 'music')
  await expect(page.locator('#editor-music-upload')).toBeAttached()

  // Sebelum fase ini bagian ini hanya menampilkan satu kotak teks berlabel "URL".
  // Tujuh lagu, masing-masing dengan id sendiri — judulnya sendiri tidak unik di layar ini,
  // karena kartu "sedang dipakai" di atas mengulang judul yang sama.
  await expect(page.locator('[id^=editor-music-pick-]')).toHaveCount(7)
  await page.locator('#editor-music-pick-gymnopedie-1').click()

  await expect(page.locator('#editor-music-pick-gymnopedie-1')).toHaveText(/Dipakai/)
  // Memilih lagu menyalakan sectionnya — memilih lalu bingung kenapa senyap adalah jebakan.
  await expect(page.locator('#editor-section-toggle-music')).toBeChecked()
  await expect(page.locator('#editor-music-url')).toHaveValue('/audio/gymnopedie-1.mp3')

  // Berkasnya benar-benar ada dan benar-benar audio.
  const track = await page.request.get('/audio/gymnopedie-1.mp3')
  expect(track.status()).toBe(200)
  expect(track.headers()['content-type']).toContain('audio')
})

/*
 * Musik sampai ke tamu, dan sampai dengan cara yang benar.
 *
 * Yang diuji bukan "ada elemen audio", melainkan tiga keputusan: gerbang mengumumkan musiknya
 * **sebelum** dibuka, `play()` berhasil karena dipanggil di dalam gestur klik gerbang (bukan
 * lewat `watch` yang menumpang sisa masa aktivasi), dan tamu yang menekan jeda tidak dipaksa
 * mendengarnya lagi setelah memuat ulang.
 */
test('background music reaches the guest only after the gate, and stays refused once paused', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await openSection(page, 'music')
  await page.locator('#editor-music-pick-gymnopedie-1').click()
  await expect(page.locator('#editor-music-pick-gymnopedie-1')).toHaveText(/Dipakai/)
  await page.getByRole('button', { name: 'Publikasikan', exact: true }).click()
  await expect(page.getByText('Versi publik diperbarui.')).toBeVisible({ timeout: 15_000 })

  await page.goto(`/i/${account!.slug}`)
  // Diumumkan lebih dulu: tamu yang dikejutkan suara menutup tab, bukan mengecilkan volume.
  await expect(page.getByText('Undangan ini memakai musik latar — nyalakan suara ponselmu.')).toBeVisible()
  /*
   * Elemennya memang sudah ada sebelum gerbang dibuka — harus, karena `arm()` dipanggil
   * sinkron di dalam klik gerbang dan butuh sasaran yang sudah ter-mount. Yang ditahan adalah
   * unduhannya: `preload="none"` membuat berkas 1,4 MB tidak menyentuh kuota tamu yang belum
   * tentu membuka undangannya.
   */
  expect(await page.evaluate(() => {
    const audio = document.querySelector('audio')
    return { ada: Boolean(audio), berbunyi: audio ? !audio.paused : null, preload: audio?.preload, terunduh: audio?.readyState }
  })).toEqual({ ada: true, berbunyi: false, preload: 'none', terunduh: 0 })

  await page.getByRole('button', { name: 'Buka Undangan' }).click()
  await expect.poll(() => page.evaluate(() => {
    const audio = document.querySelector('audio')
    return audio ? !audio.paused : false
  }), { timeout: 10_000 }).toBe(true)

  const state = await page.evaluate(() => {
    const audio = document.querySelector('audio')!
    return { src: audio.currentSrc, loop: audio.loop, volume: Math.round(audio.volume * 100) / 100 }
  })
  expect(state.src).toContain('/audio/gymnopedie-1.mp3')
  expect(state.loop, 'lagu dua menit harus mengulang').toBe(true)
  // Fade berhenti di 0,6, bukan 1: musik latar yang penuh terdengar seperti iklan.
  expect(state.volume).toBeLessThanOrEqual(0.6)

  await page.getByRole('button', { name: 'Jeda musik' }).click()
  await expect(page.getByRole('button', { name: 'Putar musik' })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Buka Undangan' }).click()
  await page.waitForTimeout(2500)
  expect(await page.evaluate(() => {
    const audio = document.querySelector('audio')
    return audio ? !audio.paused : false
  }), 'tamu yang sudah menolak tidak boleh dipaksa mendengarnya lagi').toBe(false)
})

/*
 * Musik mengalah pada siaran, dan tidak kembali tanpa diminta (fase 17).
 *
 * Tab yang tersembunyi tetap berbunyi — browser tidak menjedanya sendiri. Tamu yang menekan
 * "Buka siaran" karena itu mendengar Gymnopédie menimpa ijab kabul, dan tidak ada satu pun tes
 * yang pernah membuka seksi video selagi musik berbunyi.
 *
 * Tiga keputusan yang diuji: siaran menjeda musik, tab yang kembali terlihat melanjutkannya,
 * dan tamu yang menjeda sendiri tetap mendapat senyap meski sempat pindah tab.
 */
test('background music yields to the live stream and stays silent for a guest who paused it', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  // Tautan siaran menunjuk ke server dev-nya sendiri: popup-nya tetap terbuka sungguhan,
  // tapi tidak satu pun tes menyentuh jaringan luar.
  const stream = `${process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'}/`

  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await openSection(page, 'music')
  await page.locator('#editor-music-pick-gymnopedie-1').click()
  await expect(page.locator('#editor-music-pick-gymnopedie-1')).toHaveText(/Dipakai/)

  await openSection(page, 'video')
  await page.locator('#editor-section-toggle-video').check()
  await page.locator('#editor-text-url').fill(stream)

  await page.getByRole('button', { name: 'Publikasikan', exact: true }).click()
  await expect(page.getByText('Versi publik diperbarui.')).toBeVisible({ timeout: 15_000 })

  const berbunyi = () => page.evaluate(() => {
    const audio = document.querySelector('audio')
    return audio ? !audio.paused : false
  })
  /** `visibilitychange` tidak bisa dipicu dengan memindah fokus tab dari dalam Playwright. */
  const visibility = (value: 'hidden' | 'visible') => page.evaluate((state) => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, value)

  await page.goto(`/i/${account!.slug}`)
  await page.getByRole('button', { name: 'Buka Undangan' }).click()
  await expect.poll(berbunyi, { timeout: 10_000 }).toBe(true)

  const popup = page.waitForEvent('popup')
  await page.getByRole('link', { name: /Buka siaran/ }).click()
  await (await popup).close()
  expect(await berbunyi(), 'musik tidak boleh menimpa siaran akad').toBe(false)

  // Kembali ke tab undangan bukan permintaan musik: siarannya masih berjalan di tab sebelah.
  await visibility('hidden')
  await visibility('visible')
  expect(await berbunyi(), 'kembali dari siaran tidak boleh menyalakan musik sendiri').toBe(false)

  await page.getByRole('button', { name: 'Putar musik' }).click()
  await expect.poll(berbunyi, { timeout: 10_000 }).toBe(true)

  await visibility('hidden')
  expect(await berbunyi(), 'tab tersembunyi tidak boleh terus berbunyi').toBe(false)
  await visibility('visible')
  await expect.poll(berbunyi, { timeout: 10_000 }).toBe(true)

  /*
   * Ini yang keliru di referensi: pemutar yang melanjutkan musik begitu tab terlihat lagi
   * tanpa memeriksa apa pun membatalkan sendiri jeda yang ditekan tamu di ruang rapat.
   */
  await page.getByRole('button', { name: 'Jeda musik' }).click()
  await visibility('hidden')
  await visibility('visible')
  await page.waitForTimeout(500)
  expect(await berbunyi(), 'jeda yang ditekan tamu tidak boleh batal karena pindah tab').toBe(false)
})

/*
 * Jalan keluar dari akun sendiri, dari layar pertama setelah masuk.
 *
 * Logout sebenarnya sudah bekerja jauh sebelum tes ini ditulis — yang tidak ada adalah jalan
 * menuju ke sana: tombolnya hanya hidup di rail per-undangan, yang baru muncul setelah sebuah
 * undangan dibuka. `/dashboard` sendiri tidak punya satu pun. Regresinya tidak akan terlihat
 * sebagai halaman yang rusak, hanya sebagai orang yang tidak bisa keluar, dan itu jenis
 * kerusakan yang dilaporkan sebagai "fiturnya belum ada".
 *
 * Keyboard ikut diuji di sini dan bukan sebagai pemanis: menu yang hanya bisa dibuka dengan
 * tetikus mengunci jalan keluar itu untuk siapa pun yang tidak memakai tetikus.
 */
test('account menu carries the way out of the account', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await hydrated(page)

  // Dibuka dari keyboard, bukan diklik: Escape harus mengembalikan fokus ke pemicunya.
  await page.locator('#account-menu-trigger').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#account-menu-account')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#account-menu-account')).toBeHidden()
  await expect(page.locator('#account-menu-trigger')).toBeFocused()

  await openAccountMenu(page)
  await page.locator('#account-menu-account').click()
  await expect(page).toHaveURL(/\/account$/)

  /*
   * Nama semula dibaca dari fieldnya, bukan dari `h1`.
   *
   * `toHaveURL` lulus begitu URL-nya berganti, dan pada navigasi SPA itu terjadi **sebelum**
   * DOM-nya ikut berganti. Versi pertama tes ini membaca `h1` di situ, mendapat judul halaman
   * sebelumnya — "Undangan kalian" — lalu menyimpannya sebagai nama akun, dan memulihkan
   * fixture ke nilai yang tidak pernah jadi namanya. Menunggu field milik halaman ini muncul
   * lebih dulu membuat yang terbaca dijamin milik halaman yang benar.
   */
  await expect(page.locator('#account-name')).toBeVisible()
  const semula = await page.locator('#account-name').inputValue()
  expect(semula).not.toBe('')

  await page.locator('#account-name').fill(`${semula} QA`)
  await page.locator('#account-name-submit').click()
  await expect(page.locator('h1')).toHaveText(`${semula} QA`)
  await page.reload()
  await expect(page.locator('h1')).toHaveText(`${semula} QA`)

  // Fixture dikembalikan ke keadaan semula; suite ini memakai satu akun bersama.
  await hydrated(page)
  await page.locator('#account-name').fill(semula)
  await page.locator('#account-name-submit').click()
  await expect(page.locator('h1')).toHaveText(semula)

  // Sesi yang sedang dipakai harus muncul sebagai perangkat ini, bukan sebagai baris berakhir.
  await expect(page.locator('#account-sessions').getByText('Perangkat ini')).toBeVisible()

  await openAccountMenu(page)
  await page.locator('#account-menu-logout').click()
  await expect(page).toHaveURL(/\/$/)

  // Keluar yang sungguhan: cookie sesi harus ikut mati, bukan cuma state di browser.
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

/**
 * Toast `vue-sonner` muncul di `top-center` dan, pada lebar ponsel, ia menutupi persis sudut
 * tempat pemicu menu akun berdiri. Klik yang mendarat di atasnya tidak membuka apa pun dan
 * tidak melaporkan apa pun — tes gagal di baris berikutnya, jauh dari sebabnya. Menunggunya
 * pergi lebih jujur daripada menambah `waitForTimeout` yang angkanya cuma tebakan.
 */
async function openAccountMenu(page: import('@playwright/test').Page) {
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
  await page.locator('#account-menu-trigger').click()
  await expect(page.locator('#account-menu-logout')).toBeVisible()
}
