import { deflateSync } from 'node:zlib'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync, existsSync } from 'node:fs'

const fixturePath = '.data/qa-account.json'
const account = existsSync(fixturePath) ? JSON.parse(readFileSync(fixturePath, 'utf8')) as { email: string; password: string; invitationId: string; slug: string; locked?: { email: string; password: string; invitationId: string } } : null

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
 * Membuka pratinjau perangkat dan mengembalikan panggungnya.
 *
 * **Wajib dipanggil ulang setiap kali lebar jendela berubah**, dan itu bukan kehati-hatian
 * berlebih. `mobilePanel` bawaannya `'settings'`, jadi di 1440 tab `Pratinjau` yang ber-`xl:hidden`
 * tidak pernah diklik dan panelnya tampil semata-mata berkat `xl:block`. Begitu jendela menyempit
 * melewati 1280, panel itu jadi `hidden` — `offsetHeight`-nya 0, angka yang terbaca persis seperti
 * "tinggi rendernya berubah", yakni kegagalan palsu yang bentuknya sama dengan cacat yang dicari.
 *
 * Cabangnya dibaca dari `matchMedia`, bukan dari `tab.isVisible()`: yang kedua sekali baca dan
 * bisa mendarat di tengah relayout sesudah `setViewportSize`.
 */
async function openPreview(page: import('@playwright/test').Page) {
  await hydrated(page)
  const berdampingan = await page.evaluate(() => matchMedia('(min-width: 80rem)').matches)
  if (!berdampingan) await page.getByRole('tab', { name: 'Pratinjau', exact: true }).click()
  // Dikaitkan lewat `data-preview-stage`, bukan lewat inline style: undangannya sendiri
  // penuh `transform: scale(...)` milik GSAP dan ornamen.
  const stage = page.locator('[data-preview-stage]')
  await expect(stage).toBeVisible()
  return stage
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
 * Axe selama ini hanya menyapu landing, auth, dan tiap tema undangan — tidak satu pun
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
 * memperkecilnya. Dua hal yang membuktikannya, dan keduanya dibutuhkan.
 *
 * Yang pertama tinggi relatif: wadah yang lebih sempit selalu lebih tinggi, karena teksnya
 * membungkus jadi lebih banyak baris. Komentar lama menyebut cover `split-editorial` yang
 * menumpuk di bawah 768px sebagai sebabnya — itu **tidak lagi benar untuk fixture ini**, yang
 * covernya `arch-potret` dan tidak pernah membelah. Yang menanggung urutannya sekarang
 * pembungkusan teks di tiga belas section, bukan satu cabang layout.
 *
 * Yang kedua kemandirian dari jendela: lebar perangkat yang sama wajib menghasilkan tinggi yang
 * sama, berapa pun lebar jendela yang kebetulan membuka editornya. Itu janji `DESIGN.md` —
 * undangan sepenuhnya container query, nol breakpoint viewport — dan selama ditepati, satu-satunya
 * yang berubah saat relnya menyempit adalah `transform: scale(...)`, yang tidak dibaca
 * `offsetHeight`. Kalau seseorang mengembalikan `@min-[48rem]:` jadi `md:`, atau meloloskan satu
 * satuan `vw` ke jalur `compact`, render "Ponsel" berubah bentuk hanya karena editornya dibuka di
 * layar lebar — pratinjau yang menampilkan tata letak yang tidak akan pernah dilihat tamu.
 *
 * `expect(heights.Tablet).toBe(heights.Laptop)` **dicabut di fase 61 karena tidak pernah menjaga
 * apa pun**: media query membaca jendela yang sama untuk ketiga panggung, jadi `md:` yang kembali
 * menggeser Tablet dan Laptop bersama-sama dan kesetaraannya tetap hijau. Yang sebenarnya
 * dituntutnya — tata letak berhenti berubah di atas 48rem — tidak pernah dijanjikan siapa pun, dan
 * `Segue.vue` (`clamp(1.5rem, 4cqw, 3rem)`) memang melanggarnya dengan sengaja.
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

  const stage = await openPreview(page)

  const ukur = async (panggung: typeof stage) => {
    const heights: Record<string, number> = {}

    for (const [device, width] of [['Ponsel', 390], ['Tablet', 834], ['Laptop', 1280]] as const) {
      await page.getByRole('button', { name: device, exact: true }).click()
      await expect(page.getByText(`Selebar ${width}px`, { exact: true })).toBeVisible()
      await expect(panggung).toHaveCSS('width', `${width}px`)

      /*
       * Diukur setelah setiap foto benar-benar termuat.
       *
       * Foto galeri `loading="lazy"`, dan berapa banyak yang termuat bergantung pada seberapa
       * jauh render diperkecil — yang sendiri bergantung pada lebar layar yang menjalankan tes.
       * Tanpa penyetaraan ini, tinggi yang sama diukur berbeda di 360px dan di 1440px, dan
       * tesnya lulus atau gagal karena hal yang sama sekali tidak ingin diujinya.
       */
      await panggung.evaluate(async (el) => {
        const images = [...el.querySelectorAll('img')]
        for (const image of images) image.loading = 'eager'
        await Promise.all(images.map(image => image.complete
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              image.addEventListener('load', () => resolve(), { once: true })
              image.addEventListener('error', () => resolve(), { once: true })
            })))
      })

      await fontsUsedBy(panggung)
      heights[device] = await panggung.evaluate(el => (el as HTMLElement).offsetHeight)

      /*
       * Render yang diperkecil tidak boleh melebihi viewport yang menggulungnya: selisih
       * selebar scrollbar sudah cukup untuk memotong tepi kanan undangan.
       *
       * `expect.poll`, bukan sekali baca: `previewScale` lahir dari `useElementSize` yang
       * berjalan di atas `ResizeObserver`, jadi sesudah jendela berubah lebar skalanya baru
       * menyusul satu frame kemudian. Sekali baca di antaranya melaporkan render yang belum
       * sempat diperkecil sebagai rel yang kesempitan.
       */
      await expect.poll(
        () => panggung.evaluate((el) => {
          const viewport = el.parentElement!.parentElement!
          return viewport.scrollWidth <= viewport.clientWidth
        }),
        { message: `${device} preview overflows its rail horizontally` },
      ).toBe(true)
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    return heights
  }

  const heights = await ukur(stage)
  expect(heights.Ponsel, 'phone render must stack the cover, so it is taller than tablet').toBeGreaterThan(heights.Tablet)

  /*
   * Lintasan kedua di lebar jendela yang berseberangan: di sinilah kemandirian dari viewport
   * benar-benar diuji. Satu project Playwright hanya pernah melihat satu lebar jendela, jadi
   * tanpa perbandingan dua lebar di dalam satu tes tidak ada yang bisa membedakan undangan yang
   * mengukur dirinya sendiri dari undangan yang diam-diam membaca layar.
   *
   * Lebar pembandingnya selalu menyeberangi 1280 dari lebar project-nya sendiri, jadi keempat
   * project menguji seberangan yang berbeda dengan tes yang sama: 360↔1440, 768↔1440, 390↔1440,
   * dan 1440↔420. `toEqual` atas record memberi sembilan perbandingan sekaligus, dan diff-nya
   * menyebut perangkat mana yang bergeser.
   */
  const jendela = page.viewportSize()!
  await page.setViewportSize({ width: jendela.width < 1280 ? 1440 : 420, height: jendela.height })
  const lagi = await openPreview(page)
  expect(
    await ukur(lagi),
    'tinggi tiap lebar perangkat harus lepas dari lebar jendela editor',
  ).toEqual(heights)
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
async function signIn(page: import('@playwright/test').Page, sebagai: { email: string; password: string } = account!) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(sebagai.email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(sebagai.password)
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

/*
 * Studio tiga panel (fase 62): rail, inspektor bertab, dan preferensi yang bertahan.
 *
 * Empat hal yang masing-masing pernah salah dengan cara yang diam:
 * - tab Tema yang tersimpan di `localStorage` menyembunyikan form bagian yang baru diklik;
 * - panah urut di daftar tersaring memindahkan bagian yang salah (indeks daftar ≠ indeks dokumen);
 * - sakelar tampil tidak lewat `checkpoint()`, jadi mematikan galeri tidak bisa di-undo;
 * - preferensi yang dibaca sebelum hidrasi membuat `width` panggung berganti di tengah render.
 */
test('studio editor: rail, inspektor, dan preferensi yang bertahan', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await openSection(page, 'cover')
  const berdampingan = () => page.evaluate(() => matchMedia('(min-width: 80rem)').matches)
  const tidakMeluber = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  // Tab inspektor: Tema menyembunyikan form bagian, Bagian mengembalikannya.
  await page.locator('#editor-inspector-tema').click()
  await expect(page.locator('#editor-theme-aruna-bloom')).toBeVisible()
  await expect(page.locator('#editor-text-title')).toBeHidden()
  await tidakMeluber()

  // Memilih bagian dari tab Tema membuka tab Bagian lagi — bukan membiarkan formnya tersembunyi.
  await openSection(page, 'couple')
  await expect(page.locator('#editor-inspector-bagian')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#editor-inspector-panel-bagian h2')).toHaveText('Mempelai')

  // Pencarian menyaring rail; panah mati selama tersaring supaya indeksnya tidak berbohong.
  await page.locator('#editor-section-search').fill('gal')
  await expect(page.locator('[id^="editor-section-toggle-"]')).toHaveCount(1)
  await expect(page.locator('#editor-section-toggle-gallery')).toBeVisible()
  await expect(page.locator('#editor-section-up-gallery')).toBeDisabled()
  await page.locator('#editor-section-search-clear').click()
  await expect(page.locator('[id^="editor-section-toggle-"]')).toHaveCount(14)

  // Bagian inti tidak bisa disembunyikan; sisanya bisa, dan bisa di-undo.
  await expect(page.locator('#editor-section-toggle-cover')).toBeDisabled()
  const hitung = async () => Number((await page.locator('#editor-section-count').innerText()).match(/^(\d+)/)?.[1])
  const sebelum = await hitung()
  const video = page.locator('#editor-section-toggle-video')
  const semulaHidup = await video.isChecked()
  await video.setChecked(!semulaHidup)
  expect(await hitung()).toBe(sebelum + (semulaHidup ? -1 : 1))
  await expect(page.locator('#editor-save-state')).toHaveText('Ada perubahan yang belum tersimpan')
  await page.locator('#editor-undo').click()
  await expect(video).toBeChecked({ checked: semulaHidup })
  expect(await hitung()).toBe(sebelum)
  await expect(page.locator('#editor-save-state')).toHaveText('Semua perubahan tersimpan')

  // Rail → panggung (fase 70): memilih bagian menggulir viewport pratinjau sampai bagian itu
  // berdiri di bawah pemilih perangkat. Di ponsel gulirnya ditahan sampai tab Pratinjau dibuka.
  const posisiBagian = (type: string) => page.evaluate((t) => {
    const stage = document.querySelector('[data-preview-stage]')!
    const viewport = stage.parentElement!.parentElement!
    const el = document.getElementById(`iv-${t}`)!
    return { atas: el.getBoundingClientRect().top - viewport.getBoundingClientRect().top, gulir: viewport.scrollTop }
  }, type)
  await openSection(page, 'rsvp')
  if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pratinjau', exact: true }).click()
  await expect.poll(async () => (await posisiBagian('rsvp')).gulir).toBeGreaterThan(0)
  await expect.poll(async () => Math.abs((await posisiBagian('rsvp')).atas - 96)).toBeLessThan(24)
  if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
  await openSection(page, 'cover')

  // Ponsel: tab Pratinjau menyembunyikan rail dan inspektor; Pengaturan mengembalikannya.
  if (!(await berdampingan())) {
    await page.getByRole('tab', { name: 'Pratinjau', exact: true }).click()
    await expect(page.locator('#editor-section-cover')).toBeHidden()
    await expect(page.locator('[data-preview-stage]')).toBeVisible()
    await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
    await expect(page.locator('#editor-section-cover')).toBeVisible()
  }

  // Preferensi bertahan setelah muat ulang: perangkat Laptop dan tab Tema.
  await openPreview(page)
  await page.getByRole('button', { name: 'Laptop', exact: true }).click()
  await expect(page.locator('[data-preview-stage]')).toHaveCSS('width', '1280px')
  if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
  await page.locator('#editor-inspector-tema').click()
  await tidakMeluber()

  await page.reload()
  await hydrated(page)
  await expect(page.locator('#editor-inspector-tema')).toHaveAttribute('aria-selected', 'true')
  const stage = await openPreview(page)
  await expect(stage).toHaveCSS('width', '1280px')
  await expect(page.getByText('Selebar 1280px', { exact: true })).toBeVisible()
  await tidakMeluber()

  // Kembalikan bawaannya supaya tes lain di konteks ini tidak mewarisi Laptop + Tema.
  await page.getByRole('button', { name: 'Ponsel', exact: true }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aruna:editor:prefs') ?? '{}'))).toMatchObject({ device: 'ponsel', inspectorTab: 'tema' })
})

/*
 * Gulir dokumen yang bocor (fase 71). Ketiga panel studio menggulung sendiri, tapi input berkas
 * `UiDropzone` (`.sr-only` = `position: absolute`) tidak punya leluhur ber-posisi, jadi kotaknya
 * mendarat di koordinat dokumen dan `scrollHeight` ikut ke sana — terukur 2168px pada viewport 900.
 * Diukur di desktop saja: di bawah `lg` halaman memang menggulung.
 */
test('studio tidak menarik gulir dokumen', async ({ page }, testInfo) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  test.skip(testInfo.project.name !== 'desktop', 'Di bawah lg halaman memang menggulung.')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  const tidakMenggulung = async () => {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(0)
    await page.evaluate(() => window.scrollTo(0, 9999))
    expect(await page.evaluate(() => scrollY)).toBe(0)
  }
  await openSection(page, 'music')
  await expect(page.locator('#editor-music-upload')).toBeAttached()
  await tidakMenggulung()
  await openSection(page, 'cover')
  await expect(page.locator('#editor-cover-image-drop')).toBeAttached()
  await tidakMenggulung()
  await page.locator('#editor-inspector-tema').click()
  await expect(page.locator('#editor-theme-aruna-bloom')).toBeVisible()
  await tidakMenggulung()
  await openSection(page, 'cover')
})

/*
 * Rail dasbor ciut (fase 67). Diuji di desktop saja: di bawah `lg` rail-nya `display:none` dan
 * dock bawah yang memegang navigasi. Tooltip dicari lewat `[data-tooltip]`, bukan
 * `getByRole('tooltip')` — reka merender salinan tersembunyi ber-role yang sama.
 */
test('rail dasbor ciut jadi ikon, bertahan setelah muat ulang, dan tetap bisa dinavigasi', async ({ page }, testInfo) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  test.skip(testInfo.project.name !== 'desktop', 'Rail samping hanya ada di ≥1024px.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/guests`)
  await hydrated(page)
  const rail = page.locator('#dash-nav-rail')
  const toggle = page.locator('#dash-nav-toggle')
  const tidakMeluber = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  await expect(rail).toHaveCSS('width', '256px')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await toggle.click()
  await expect(rail).toHaveCSS('width', '56px')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#dash-nav-guests')).toBeVisible()
  await tidakMeluber()

  // Ikon tanpa teks menjelaskan dirinya pada mouse, bukan hanya pada pembaca layar.
  await page.locator('#dash-nav-guests').hover()
  await expect(page.locator('[data-tooltip]', { hasText: 'Kelola tamu' })).toBeVisible()

  // Rail ciut tidak boleh menyentuh anggaran nol pelanggaran axe milik tes di atas.
  const scan = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(scan.violations.map(v => v.id)).toEqual([])

  await page.reload()
  await hydrated(page)
  await expect(rail).toHaveCSS('width', '56px')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aruna:dashboard:prefs') ?? '{}'))).toMatchObject({ sidebarCollapsed: true })

  await page.locator('#dash-nav-rsvps').click()
  await expect(page).toHaveURL(/\/rsvps$/)
  await expect(rail).toHaveCSS('width', '56px')

  // Kembalikan supaya tes lain di konteks ini tidak mewarisi rail ciut.
  await toggle.click()
  await expect(rail).toHaveCSS('width', '256px')
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
 * Toast muncul di `top-center` dan, pada lebar ponsel, ia menutupi persis sudut tempat pemicu
 * menu akun berdiri. Klik yang mendarat di atasnya tidak membuka apa pun dan tidak melaporkan
 * apa pun — tes gagal di baris berikutnya, jauh dari sebabnya. Menunggunya pergi lebih jujur
 * daripada menambah `waitForTimeout` yang angkanya cuma tebakan.
 */
async function openAccountMenu(page: import('@playwright/test').Page) {
  await expect(page.locator('[data-aruna-toast]')).toHaveCount(0)
  await page.locator('#account-menu-trigger').click()
  await expect(page.locator('#account-menu-logout')).toBeVisible()
}

/**
 * Studio Ornamen: pemilih bank penuh, dan tiga hal yang hanya bisa dibuktikan di browser.
 *
 * Tiga spec node sudah menjaga datanya — kosakata slot, kesegaran metrik, dan urutan grid. Yang
 * tidak bisa mereka jawab: apakah dialognya benar-benar terbuka, apakah pilihannya benar-benar
 * sampai ke dokumen tersimpan, dan apakah undangannya mengirim salinan ringan alih-alih berkas
 * penuh. Ketiganya pernah salah di fase ini — Studio versi pertama mendarat di cabang `v-else`
 * yang mati, dan tiap gerbang statis tetap hijau.
 */
test.describe('studio ornamen', () => {
  test('membuka bank penuh, menyimpan pilihan, dan melayani salinan ringan', async ({ page }) => {
    test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await openSection(page, 'cover')

    /*
     * Mulai dari bawaan tema, bukan dari apa pun yang tertinggal di draft.
     *
     * Tanpa langkah ini tes ini gagal dengan cara yang menyesatkan: kalau pilihan yang hendak
     * diklik KEBETULAN sudah tersimpan, dokumennya tidak berubah, tombol simpan tetap mati, dan
     * yang dilaporkan adalah "tombol tidak pernah aktif" — bukan "tidak ada yang berubah".
     * Terjadi sungguhan saat tes ini ditulis, karena draft QA masih membawa sisa verifikasi manual.
     */
    const reset = page.locator('#ornament-kembalikan-semua')
    if (await reset.count()) {
      await reset.click()
      await saveDraft(page)
    }

    // Ringkasan menggantikan empat grid ubin: sebelas slot skalar (fase 69: + dua amplop) + lima jangkar ladang.
    await expect(page.locator('[id^="ornament-ganti-"]')).toHaveCount(16)

    await page.locator('#ornament-ganti-divider').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Kolam terkurasi selalu lebih kecil daripada bank — itu yang membuat tab kedua berarti.
    const terkurasi = await page.locator('#studio-grid [role="radio"]').count()
    await page.locator('#studio-tab-semua').click()
    const semua = await page.locator('#studio-grid [role="radio"]').count()
    expect(semua).toBeGreaterThan(terkurasi)

    /*
     * Lencana wajib terbaca sebagai TEKS, bukan hanya warna.
     *
     * Fase 59 mengganti larangan dengan keterangan; keterangan yang hanya berupa ikon berwarna
     * tidak sampai ke pembaca layar, dan pasangan yang memakainya kehilangan satu-satunya
     * peringatan yang kami punya.
     */
    const beralasan = page.locator('#studio-grid [role="radio"][aria-label*="Ketebalan garis berbeda"]')
    expect(await beralasan.count()).toBeGreaterThan(0)

    /*
     * Sapuan axe pada dialog yang SEDANG TERBUKA — yang tidak pernah dilihat sapuan halaman.
     *
     * Sampai fase 60 baris ini mengecualikan `[data-sonner-toaster]`: tes ini menyimpan draft
     * lebih dulu, jadi ia sapuan pertama di seluruh suite yang kebetulan menatap toast, dan
     * markup `vue-sonner` menaruh `role="status"` pada `<li>` di dalam `<ol>`-nya — `serious` di
     * `list`/`only-listitems`. Toaster-nya sekarang milik kita dan wadahnya bukan daftar, jadi
     * tidak ada lagi yang perlu dikecualikan. Yang menjaganya tetap begitu ada di `public.spec.ts`
     * ("landing tetap bersih dengan toast di layar") — sapuan yang SENGAJA menampilkan toast,
     * bukan yang kebetulan.
     */
    const sapuan = await new AxeBuilder({ page })
      .exclude('nuxt-devtools-frame')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(sapuan.violations.map(v => `${v.id} (${v.impact})`)).toEqual([])

    // Aset referensi: jalur terberat yang ada, dan satu-satunya yang paletnya terpanggang.
    /*
     * Id-nya dikunci lebih dulu, dan itu bukan kerapian.
     *
     * `:not([aria-checked="true"])` adalah locator HIDUP: begitu ubinnya terpilih ia berhenti
     * cocok, Playwright menyelesaikan ulang ke ubin lain, dan assert berikutnya memeriksa elemen
     * yang tidak pernah diklik. Gejalanya "klik tidak memilih apa pun" — salah sasaran, dan
     * persis jenis kegagalan yang membuat orang mencurigai produknya.
     */
    const kandidat = page.locator('#studio-grid [role="radio"][id^="studio-ubin-ref-"]:not([aria-checked="true"])').first()
    await expect(kandidat).toHaveAttribute('aria-label', /Warna tetap/)
    const idReferensi = await kandidat.getAttribute('id')
    await kandidat.click()
    await expect(page.locator(`#${idReferensi}`)).toHaveAttribute('aria-checked', 'true')
    await page.locator('#studio-selesai').click()
    await expect(dialog).toBeHidden()

    /*
     * Yang dirender undangan wajib salinan `web/`, bukan berkas penuh.
     *
     * Aset terberat 1,8 MB dan keenam puluh lima-nya 24 MB. Sebelum fase 59 tidak satu pun bisa
     * dicapai pasangan, jadi beratnya tidak pernah sampai ke tamu; membuka pemilihnya tanpa
     * varian ringan akan mengirim angka itu ke tiap ponsel yang membuka undangan.
     */
    const sumber = page.locator('.iv-root img[src*="/ornaments/referensi/"]').first()
    await expect(sumber).toHaveAttribute('src', /\/ornaments\/referensi\/web\//)
    await expect(sumber).toHaveAttribute('width', /\d+/)

    await saveDraft(page)
    await page.reload()
    await openSection(page, 'cover')

    /*
     * Sesudah muat ulang, buktinya diambil dari DOM yang ADA — bukan dari yang terlihat.
     *
     * Pada tata letak ponsel panel pratinjau disembunyikan di balik tab, jadi `toBeVisible()`
     * di sini menguji tata letak dan bukan penyimpanan; ia lulus di desktop dan gagal di mobile
     * pada fitur yang sama-sama bekerja. Yang ingin dibuktikan adalah pilihannya bertahan, dan
     * itu terbaca dari `src` yang dirender renderer plus penanda "Diganti" di ringkasan.
     */
    await expect(page.locator('.iv-root img[src*="/ornaments/referensi/web/"]').first()).toHaveAttribute('src', /web\//)
    await expect(page.locator('#ornament-ganti-divider').locator('xpath=ancestor::div[1]')).toContainText('Diganti')

    // Jalan keluar dari wajah campuran — tanpa ini penukaran bertahan lintas tema tanpa cara kembali.
    await page.locator('#ornament-kembalikan-semua').click()
    await saveDraft(page)
    await expect(page.locator('.iv-root img[src*="/ornaments/referensi/"]')).toHaveCount(0)
  })

  /*
   * Kontrol yang terlihat hidup tapi berujung simpan ditolak adalah bentuk kegagalan yang paling
   * membingungkan, dan API memang menolaknya sejak `ornamentOverrides` ikut `designFingerprint()`.
   *
   * Diuji pada undangan **kedua**, milik akun yang tidak pernah dinaikkan jadi `OPERATOR`.
   * `canEditDesign()` bernilai `isOperator || features.includes('design')`, jadi pemilik fixture
   * utama — yang sengaja dioperatorkan supaya bisa mengaktifkan tanpa bayar — tidak akan pernah
   * melihat keadaan terkunci. Versi lama tes ini menghadapi itu dengan `test.skip` saat
   * `#ornament-locked` tidak ada, dan akibatnya ia lulus di keempat project tanpa sekali pun
   * berjalan. Sebuah tes yang melewati dirinya sendiri persis ketika subjeknya tidak ada bukan
   * tes; ia laporan hijau. Fixture-nya yang diperbaiki, bukan tesnya yang dilonggarkan.
   */
  test('mengunci pemilih saat add-on desain belum dibeli', async ({ page }) => {
    test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
    const terkunci = account!.locked
    expect(terkunci, 'fixture QA wajib memuat akun tanpa add-on desain; jalankan ulang `pnpm test:integration`').toBeTruthy()
    await signIn(page, terkunci!)
    await page.goto(`/dashboard/${terkunci!.invitationId}/editor`)
    await openSection(page, 'cover')

    await expect(page.locator('#ornament-locked')).toHaveCount(1)
    await expect(page.locator('#ornament-ganti-divider')).toBeDisabled()
    await expect(page.locator('#ornament-ganti-divider')).toHaveAttribute('aria-describedby', 'ornament-locked')
  })
})

/*
 * Kata-kata (fase 69): kalimat sistem yang dulu ditulis mati kini bisa ditulis ulang dari tab
 * Tema, dan hasilnya terlihat di panggung pratinjau tanpa memuat ulang. Yang diperiksa lewat
 * `rsvp.yes`, bukan `gate.open`: gerbang tidak dirender di pratinjau `compact`, sedangkan kartu
 * RSVP ada di panggung — jadi satu tes mengukur form, dokumen, autosave, dan renderer sekaligus.
 */
test.describe('kata-kata undangan', () => {
  test('menulis ulang label RSVP, tampil di pratinjau, bertahan setelah muat ulang', async ({ page }) => {
    test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(page)
    const berdampingan = () => page.evaluate(() => matchMedia('(min-width: 80rem)').matches)

    await page.locator('#editor-inspector-tema').click()
    const kembalikan = page.locator('#editor-copy-kembalikan')
    if (await kembalikan.count()) {
      await kembalikan.click()
      await saveDraft(page)
    }

    const grupRsvp = page.locator('details', { has: page.locator('summary', { hasText: 'RSVP' }) })
    await grupRsvp.locator('summary').click()
    const kolom = page.locator('#editor-copy-rsvp-yes')
    await expect(kolom).toHaveAttribute('placeholder', 'Hadir')
    await kolom.fill('Datang')
    await kolom.press('Tab')
    await expect(grupRsvp.locator('summary')).toContainText('1 diubah')

    const stage = await openPreview(page)
    await expect(stage.locator('#iv-rsvp')).toContainText('Datang')
    if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
    await saveDraft(page)

    await page.reload()
    await hydrated(page)
    await page.locator('#editor-inspector-tema').click()
    await expect(page.locator('#editor-copy-kembalikan')).toBeVisible()
    const grupLagi = page.locator('details', { has: page.locator('summary', { hasText: 'RSVP' }) })
    await grupLagi.locator('summary').click()
    await expect(page.locator('#editor-copy-rsvp-yes')).toHaveValue('Datang')

    // Kosongkan = kembali ke bawaan, dan dokumen tidak lagi membawa `copy`.
    await page.locator('#editor-copy-kembalikan').click()
    await expect(page.locator('#editor-copy-kembalikan')).toHaveCount(0)
    await saveDraft(page)
  })
})

/*
 * Gerak per undangan (fase 69): dua pilihan terenumerasi di tab Tema. Yang diukur di sini adalah
 * penulisannya — "Sedang"/"Ikut tema" menghapus kuncinya (dokumen kembali identik dengan preset),
 * pilihan lain tersimpan dan bertahan setelah muat ulang. Temponya sendiri diukur di
 * `motion-envelope.spec.ts`; gerbang tidak dirender di pratinjau `compact`.
 */
test.describe('gerak undangan', () => {
  test('memilih tempo amplop dan gaya masuk, bertahan setelah muat ulang, kembali ke tema', async ({ page }) => {
    test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(page)
    await page.locator('#editor-inspector-tema').click()

    const amplop = page.locator('#editor-motion-amplop')
    const masuk = page.locator('#editor-motion-masuk')
    await expect(amplop).toHaveValue('sedang')
    await expect(masuk).toHaveValue('tema')

    await amplop.selectOption('pelan')
    await masuk.selectOption('iris')
    await expect(page.locator('#editor-save-state')).toHaveText('Ada perubahan yang belum tersimpan')
    await saveDraft(page)

    await page.reload()
    await hydrated(page)
    await page.locator('#editor-inspector-tema').click()
    await expect(page.locator('#editor-motion-amplop')).toHaveValue('pelan')
    await expect(page.locator('#editor-motion-masuk')).toHaveValue('iris')

    await page.locator('#editor-motion-amplop').selectOption('sedang')
    await page.locator('#editor-motion-masuk').selectOption('tema')
    await saveDraft(page)
  })
})

/*
 * Ornamen unggahan (fase 69): raster transparan pasangan masuk lewat tab Unggahan di Studio,
 * terpasang ke slot, tampil di ringkasan sebagai "Unggahan kalian", dan bisa dihapus lagi.
 * PNG-nya dirakit di dalam tes (RGBA 24×24, IDAT deflate sungguhan) supaya browser benar-benar
 * bisa merendernya — bukan fixture dari disk yang bisa hilang.
 */
function pngTransparan(size = 24): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf: Buffer) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, sum])
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = y * (1 + size * 4) + 1 + x * 4
    const dalam = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) < size / 2 - 1
    raw[o] = 0x9a; raw[o + 1] = 0x4b; raw[o + 2] = 0x2f; raw[o + 3] = dalam ? 255 : 0
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

test.describe('ornamen unggahan', () => {
  test('mengunggah PNG transparan ke slot Simbol, memasangnya, lalu menghapusnya', async ({ page }) => {
    test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await openSection(page, 'cover')

    await page.locator('#ornament-ganti-symbol').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.locator('#studio-tab-unggahan').click()
    await expect(page.locator('#studio-unggah')).toBeVisible()

    await page.locator('input#studio-unggah, #studio-unggah input[type="file"]').setInputFiles({ name: 'lingkaran.png', mimeType: 'image/png', buffer: pngTransparan() })
    const ubin = dialog.locator('[id^="studio-unggahan-"]')
    await expect(ubin.first()).toBeVisible()
    await expect(ubin.first()).toHaveAttribute('aria-checked', 'true')
    await expect(dialog).toContainText('Unggahan kalian')

    await dialog.getByRole('button', { name: 'Pakai ornamen ini' }).click()
    const kartu = page.locator('#ornament-ganti-symbol').locator('xpath=ancestor::div[1]')
    await expect(kartu).toContainText('Unggahan kalian')
    await expect(kartu).toContainText('Diganti')
    await saveDraft(page)

    // Bersihkan: hapus unggahannya. Tombol hapus melepas slot lebih dulu supaya dokumen tidak menunjuk aset yang hilang.
    await page.locator('#ornament-ganti-symbol').click()
    await page.locator('#studio-tab-unggahan').click()
    // Semua `lingkaran.png` dihapus, bukan cuma satu: putaran tes yang gagal di tengah meninggalkan sisa.
    const hapus = dialog.getByRole('button', { name: /^Hapus lingkaran\.png/ })
    await expect(hapus.first()).toBeVisible()
    while (await hapus.count()) {
      const sebelum = await hapus.count()
      await hapus.first().click()
      await expect(hapus).toHaveCount(sebelum - 1)
    }
    await dialog.getByRole('button', { name: 'Pakai ornamen ini' }).click()
    await expect(kartu).not.toContainText('Unggahan kalian')
    await saveDraft(page)
  })
})

/* Fase 69.5: tautan dari landing membuka wizard langsung di langkah Tema dengan add-on Desain tercentang. */
test('tautan tema sendiri membuka /order di langkah Tema dengan add-on Desain', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.evaluate(() => localStorage.removeItem('aruna-order-draft'))
  await page.goto('/order?langkah=tema&addon=design')
  await hydrated(page)
  await expect(page.locator('#order-tema-catatan')).toBeVisible()
  await expect(page.locator('input[name="tema"]').first()).toBeAttached()
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('aruna-order-draft') ?? '{}'))).addonIds).toContain('design')
  await page.evaluate(() => localStorage.removeItem('aruna-order-draft'))
})
