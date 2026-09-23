import { deflateSync } from 'node:zlib'
import { test, expect } from './fixtures'
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
/**
 * Menyimpan draft, dan menunggu HASILNYA — bukan tombolnya.
 *
 * `#editor-save` mati begitu `dirty` padam (Inspector.vue: `:disabled="!dirty"`), dan itu memang
 * benar. Yang salah adalah menganggap tombol itu bertahan hidup selama satu aksi Playwright.
 * Di WebKit CI yang lambat, klik mendarat, `save()` berhasil, `savedSnapshot` disamakan, tombolnya
 * mati — lalu pemeriksaan aksionabilitas Playwright mengulang aksinya dan menunggu 30 detik penuh
 * untuk tombol yang sengaja tidak akan pernah hidup lagi. Simpanannya sukses; tesnya tetap merah.
 *
 * Terukur di run 35706702896: hanya project `safari` yang merah, dan snapshot kegagalannya memuat
 * toast `Draft tersimpan.` berdampingan dengan `button "Simpan perubahan" [disabled]` — dua hal
 * yang hanya bisa muncul bersamaan kalau simpanannya sudah selesai dengan benar.
 *
 * Tidak ada cakupan yang hilang: kalau simpanannya benar-benar gagal, `dirty` tetap menyala,
 * tombolnya tetap hidup, kliknya berjalan seperti biasa, dan baris terakhir tetap yang memutuskan.
 */
async function saveDraft(page: import('@playwright/test').Page) {
  const status = page.locator('#editor-save-state')
  const tombol = page.locator('#editor-save')
  if (await tombol.isEnabled()) {
    await tombol.click({ timeout: 10_000 }).catch(async (cause: unknown) => {
      // Hanya dimaafkan kalau simpanannya memang sudah mendarat. Selain itu, lempar apa adanya.
      if ((await status.textContent())?.trim() === 'Semua perubahan tersimpan') return
      throw cause
    })
  }
  await expect(status).toHaveText('Semua perubahan tersimpan')
}

/**
 * Draft QA lahir sebagai dokumen v1 dan dimigrasi ke struktur Elegance **di klien** saat editor
 * dimuat (fase 72), jadi kunjungan pertama selalu "Ada perubahan yang belum tersimpan" meski belum
 * ada yang disentuh — dan begitu terus sampai seseorang menekan Simpan. Tes yang berangkat dari
 * keadaan tersimpan menyimpan dulu lewat sini, hanya bila memang kotor, supaya migrasi tidak
 * terbaca sebagai suntingan yang sedang diuji.
 */
async function pastikanTersimpan(page: import('@playwright/test').Page) {
  await hydrated(page)
  const status = page.locator('#editor-save-state')
  await expect(status).toHaveText(/tersimpan$/)
  if ((await status.textContent())?.includes('belum')) await saveDraft(page)
}

/**
 * Membuka amplop di panggung dan menunggu animasinya benar-benar tuntas.
 *
 * Panggung merender undangan `mode="stage"` (fase 72.2): amplop pembuka tampil persis seperti di
 * ponsel tamu. Tes yang mengukur posisi bagian di panggung wajib lewat sini dulu.
 *
 * **Sejak fase 81 lewat callout, bukan segel.** Keputusan pemilik: di panggung, klik segel MEMILIH
 * kepingnya (supaya bisa diganti), dan pembuka amplopnya callout berikon di bawahnya. `force`
 * karena callout berdenyut tanpa henti, jadi ia tidak pernah "stabil" bagi Playwright.
 *
 * **Yang ditunggu `data-gate-opened`, bukan hilangnya `.iv-gate`.** Di panggung amplop
 * adalah bagian pertama undangan, bukan gerbang: ia tetap berdiri sesudah dibuka dan menyegel
 * dirinya kembali begitu keluar layar, supaya pasangan bisa menggulir balik ke puncak dan
 * melihatnya lagi. Jadi "sudah terbuka" tidak lagi sama dengan "sudah tidak ada", dan hanya
 * penanda inilah yang tidak pernah berbalik.
 */
async function bukaAmplop(stage: import('@playwright/test').Locator) {
  const callout = stage.locator('[data-gate-callout]')
  if (!(await callout.count())) return
  // `force` melewati penantian "enabled" dan gulir otomatis juga: callout baru aktif sesudah modul
  // geraknya siap, dan panggung yang sedang di bagian lain digulir dulu ke amplop di puncaknya.
  await expect(callout).toBeEnabled()
  /*
   * Tunggu gulir panggung diam dulu. Pendaratan rail ke bagian yang terakhir dipilih punya ekor
   * koreksi sampai 2,4 s (fase 80); di runner CI yang lambat ekor itu jatuh SESUDAH `scrollTop = 0`
   * dan klik mendarat di callout yang sudah terbawa pergi — trace tablet: 0 → 83 → 1680 tepat di
   * sekitar klik, dan amplopnya tidak pernah dibuka.
   */
  await gulirDiam(stage)
  await stage.evaluate((el) => { el.scrollTop = 0 })
  await gulirDiam(stage)
  await expect.poll(() => stage.evaluate(el => el.scrollTop)).toBe(0)
  await callout.click({ force: true })
  await terbuka(stage)
}

/** Posisi gulir panggung tidak berubah selama 300 ms. */
async function gulirDiam(stage: import('@playwright/test').Locator) {
  await expect.poll(async () => {
    const awal = await stage.evaluate(el => el.scrollTop)
    await stage.page().waitForTimeout(300)
    return (await stage.evaluate(el => el.scrollTop)) === awal
  }, { timeout: 8_000 }).toBe(true)
}

/** Amplop panggung sudah tuntas terbuka, dan panggungnya sudah melewati gerbang. */
async function terbuka(stage: import('@playwright/test').Locator) {
  await expect(stage.locator('.iv-gate[data-gate-opened]')).toHaveCount(1, { timeout: 10_000 })
  await expect.poll(() => stage.evaluate(el => el.scrollTop), { timeout: 10_000 }).toBeGreaterThan(0)
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
  // Fase 72: tombol simpan jadi ikon di baris alat inspektor; teksnya tinggal di `aria-label`.
  await expect(page.locator('#editor-save')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `docs/features/invitation-builder/verification/editor-${testInfo.project.name}.png`, fullPage: true })
  await page.goto(`/dashboard/${account!.invitationId}/guests`)
  // Fase 72.6: halaman tamu menjadi Generator; nama tamu tampil sebagai teks tabel, bukan input inline.
  await expect(page.getByRole('heading', { name: 'Manajemen Tamu & Broadcast WhatsApp', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: /dr\. Yosi Susanti, Sp\.OG/ }).first()).toBeVisible()
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
    /*
     * Panggung pratinjau dikecualikan, bukan karena undangannya boleh gagal kontras — ia
     * diaudit di `public.spec.ts` pada ukuran aslinya — melainkan karena `useArunaMotion`
     * men-tween `opacity` dari 0 dan axe membaca elemen yang sedang di-tween sebagai teks
     * pudar. Di runner CI yang lambat scan ini jatuh di tengah tween (kena 2026-09-19: merah di
     * CI desktop saja, bersih di empat putaran lokal); layar yang diukur di sini adalah dasbornya.
     */
    const scan = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').exclude('[data-preview-stage]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    // Node-nya ikut ditulis: "color-contrast" tanpa target adalah laporan yang tidak bisa diperbaiki
    // dari log CI — kena 2026-09-19, gagal di CI desktop saja dan bersih di empat putaran lokal.
    expect(scan.violations.map(v => `${path} ${v.id}: ${v.nodes.map(n => `${n.target.join(' ')} ${JSON.stringify(n.any[0]?.data ?? {})}`).join(' | ')}`)).toEqual([])
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
  await expect(page.locator('#editor-save')).toBeVisible()

  const stage = await openPreview(page)

  const ukur = async (panggung: typeof stage) => {
    const heights: Record<string, { isi: number, bagian: number }> = {}

    /*
     * Fase 76 membuang bezel bergambar dan menyisakan apa yang benar-benar mengubah tata letak:
     * Ponsel (390) · Ponsel besar (412) · Desktop (1280). "Clean" ikut hilang karena ia dulu
     * hanya "iPhone tanpa bezel" — tanpa bezel, ia tidak lagi berbeda dari apa pun. Tombolnya
     * dipilih lewat id, bukan label, karena `aria-label`-nya kalimat panjang.
     */
    for (const [device, width] of [['ponsel', 390], ['tablet', 768], ['laptop', 1280]] as const) {
      await page.locator(`#editor-preview-${device}`).click()
      await expect(page.locator(`#editor-preview-${device}`)).toHaveAttribute('aria-pressed', 'true')
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
      /*
       * Dua angka, dan keduanya punya tugas berbeda.
       *
       * `isi` = `scrollHeight`, bukan `offsetHeight`: sejak fase 76 layar ponsel setinggi viewport
       * perangkatnya (844/915/800) dan menggulung isinya sendiri, jadi `offsetHeight` menjawab
       * tinggi LAYAR — angka yang sama di lebar jendela mana pun. Yang harus diukur adalah tinggi
       * isi yang digulungnya.
       *
       * `bagian` = tinggi "Ucapan", satu section yang tingginya benar-benar ditentukan lebar.
       * `isi` tidak bisa dipakai untuk perbandingan 390↔412, dan itu bukan kelalaian: ia memuat
       * dua blok setinggi `--iv-layar-h` (gerbang amplop dan hero), dan tinggi itu datang dari
       * VIEWPORT perangkat, bukan dari lebarnya. Terukur: 8.378 di 390×844 lawan 8.449 di
       * 412×915 — lebih lapang tapi lebih panjang, semata karena layarnya 71px lebih tinggi.
       *
       * "Ucapan" dipilih sesudah ketiganya diukur, bukan ditebak: ia satu-satunya yang mengikuti
       * lebar dengan rapi. "Mempelai" justru NAIK bersama lebar (815 · 819 · 833 di fase 76)
       * karena tata letaknya bertukar, dan memakainya sebagai probe berarti menguji hal lain
       * sambil mengira sedang menguji lebar.
       *
       * **Yang dibandingkan lebar KOLOM, bukan lebar perangkat** (fase 77): undangan dirender di
       * `.iv-column`, dan kolom itu 390 di ponsel, 640 di tablet, dan 480 di desktop — desktop
       * lebih sempit daripada tablet karena di sana kolomnya berbagi layar dengan panel foto.
       */
      heights[device] = await panggung.evaluate(el => ({
        isi: (el as HTMLElement).scrollHeight,
        bagian: el.querySelector<HTMLElement>('#iv-wishes')!.offsetHeight,
      }))

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
          // Viewport penggulung panggung = anak terakhir `<section aria-label="Pratinjau draft">`
          // (`Stage.vue`); sejak fase 72.2 ada bezel perangkat di antara keduanya, jadi menaiki
          // dua induk tidak lagi mendarat di elemen yang sama.
          const viewport = el.closest('section[aria-label="Pratinjau draft"]')!.querySelector(':scope > div:last-child')!
          return viewport.scrollWidth <= viewport.clientWidth
        }),
        { message: `${device} preview overflows its rail horizontally` },
      ).toBe(true)
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    return heights
  }

  const heights = await ukur(stage)
  // Kolom 390 (ponsel) < 480 (desktop) < 640 (tablet), jadi tingginya berurut terbalik dari itu.
  expect(heights.ponsel.bagian, 'kolom 390px harus lebih tinggi dari kolom 480px desktop').toBeGreaterThan(heights.laptop.bagian)
  expect(heights.laptop.bagian, 'kolom 480px desktop harus lebih tinggi dari kolom 640px tablet').toBeGreaterThan(heights.tablet.bagian)

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

/**
 * Membuka modal Pustaka (fase 72.8) dari tombol "Pilih dari Asset Saya" mana pun, dan menunggu
 * daftar asetnya selesai diminta — permintaan GET itu terjadi saat dialog dibuka, dan tes yang
 * menghitung permintaan jaringan tidak boleh menyangkanya sebagai unggahan.
 */
async function bukaPustaka(page: import('@playwright/test').Page, tombolId: string) {
  await page.locator(`#${tombolId}`).click()
  const pustaka = page.locator('#media-library')
  await expect(pustaka).toBeVisible()
  await expect(pustaka.getByText('Memuat pustaka…')).toHaveCount(0)
  return pustaka
}

test('pustaka menolak berkas yang salah sebelum menyentuh jaringan', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await openSection(page, 'gallery')
  // Fase 72.8: dropzone per kolom diganti satu modal Pustaka; input berkasnya `sr-only` di dalam dialog.
  await bukaPustaka(page, 'editor-field-gallery-imageUrls-pilih')

  const uploads: string[] = []
  page.on('request', request => { if (request.url().includes('/media') && request.method() === 'POST') uploads.push(request.url()) })

  await page.locator('#media-library-upload').setInputFiles([
    { name: 'nikah-01.gif', mimeType: 'image/gif', buffer: Buffer.alloc(500) },
    { name: 'prewed-besar.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(12 * 1024 * 1024) },
  ])

  // Pesannya menyebut berkas mana dan kenapa — satu pilihan bisa berisi sepuluh foto.
  await expect(page.getByText('nikah-01.gif — jenis berkas harus JPG, JPEG, PNG, atau WebP')).toBeVisible()
  await expect(page.getByText('prewed-besar.jpg — 12,0 MB, maksimal 10,0 MB')).toBeVisible()
  expect(uploads, 'berkas yang salah tidak boleh menyentuh jaringan').toEqual([])
})

test('pustaka menerima foto sungguhan, memperkecilnya, melabelinya apa adanya, dan melepasnya saat dihapus', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await openSection(page, 'gallery')
  // Foto galeri di form: satu tombol hapus per foto, jadi jumlah tombol = jumlah foto.
  const fotoGaleri = page.locator('[id^="editor-field-gallery-imageUrls-hapus-"]')
  const before = await fotoGaleri.count()
  await bukaPustaka(page, 'editor-field-gallery-imageUrls-pilih')

  // Id aset dibaca dari jawaban server, bukan dari DOM: kartu pustaka diberi id `media-library-pilih-<id>`.
  const jawabanUnggah = page.waitForResponse(response => response.url().includes('/media') && response.request().method() === 'POST')

  // 2400px: di atas batas 2000px, jadi jalur perkecil + konversi WebP ikut teruji.
  // Berkas yang benar-benar dikirim ditangkap di `fetch` halaman — Playwright tidak menyangga
  // badan multipart lintas-origin, dan yang ingin dibuktikan justru apa yang keluar dari browser.
  // Input berkasnya diisi lewat `DataTransfer` + `change`, bukan `setInputFiles`: PNG-nya
  // dirakit di dalam halaman, dan hanya di sana ukuran aslinya bisa dibandingkan.
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

    const input = document.querySelector<HTMLInputElement>('#media-library-upload')!
    const dt = new DataTransfer()
    dt.items.add(new File([blob!], 'prewed-uji.png', { type: 'image/png' }))
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))

    // Tunggu sampai `fetch`-nya benar-benar berangkat, lalu kembalikan yang asli.
    for (let i = 0; i < 100 && !terkirim.length; i++) await new Promise(resolve => setTimeout(resolve, 100))
    window.fetch = asli
    return { terkirim, pngAsli: blob!.size }
  })

  const aset = await (await jawabanUnggah).json() as { id: string; publicUrl: string }
  expect(aset.publicUrl).toMatch(/\/v1\/public\/media\/[0-9a-f-]{36}$/)

  // Galeri memilih banyak: kartunya ditandai dulu, lalu "Pakai … foto" yang menutup dialog.
  await page.locator(`#media-library-pilih-${aset.id}`).click()
  await page.locator('#media-library-selesai').click()
  await expect(page.locator('#media-library')).toBeHidden()
  await expect(fotoGaleri).toHaveCount(before + 1)

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
  const assetId = aset.id
  await saveDraft(page)
  await page.reload()
  await openSection(page, 'gallery')
  await expect(fotoGaleri).toHaveCount(before + 1)
  expect((await page.request.get(`${apiOrigin}/v1/media/${assetId}`)).status(), 'berkasnya ada sesudah disimpan').toBe(200)

  await fotoGaleri.last().click()
  await saveDraft(page)
  await page.reload()
  await openSection(page, 'gallery')
  await expect(fotoGaleri).toHaveCount(before)

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
  await pastikanTersimpan(page)
  await openSection(page, 'opening-envelope')
  await expect(page.locator('#editor-save-state')).toHaveText('Semua perubahan tersimpan')
  await expect(page.locator('#editor-save')).toBeDisabled()

  // Fase 72: nama mempelai adalah kolom `title` amplop pembuka, ditulis saat `change` (Tab), bukan tiap ketikan.
  const judul = `Aruna & Dewa ${Date.now() % 10_000}`
  const kolomJudul = page.locator('#editor-field-opening-envelope-title')
  await kolomJudul.fill(judul)
  await kolomJudul.press('Tab')
  await expect(page.locator('#editor-save-state')).toHaveText('Ada perubahan yang belum tersimpan')

  // Segmented nav di header studio (Editor | Generator | Ucapan) — satu tautan untuk semua lebar.
  const keTamu = page.locator('#editor-nav-generator')

  // "Kembali menyunting" menahan di halaman ini, dan suntingannya tetap ada.
  await keTamu.click()
  await expect(page.locator('#aruna-popup-title')).toHaveText('Perubahan belum tersimpan')
  await page.locator('#aruna-popup-kembali').click()
  await expect(page).toHaveURL(/\/editor$/)
  await expect(kolomJudul).toHaveValue(judul)

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
  await openSection(page, 'opening-envelope')
  await expect(page.locator('#editor-field-opening-envelope-title')).toHaveValue(judul)
  await expect(page.locator('#editor-save-state')).toHaveText('Semua perubahan tersimpan')
})

/*
 * Studio tiga panel (fase 62, dirombak fase 72): rail struktur, inspektor empat tab, dan
 * preferensi yang bertahan.
 *
 * Hal-hal yang masing-masing pernah salah dengan cara yang diam:
 * - tab yang tersimpan di `localStorage` menyembunyikan form bagian yang baru diklik;
 * - urutan dari daftar tersaring memindahkan bagian yang salah (indeks daftar ≠ indeks dokumen);
 * - sakelar tampil tidak lewat `checkpoint()`, jadi mematikan galeri tidak bisa di-undo;
 * - preferensi yang dibaca sebelum hidrasi membuat `width` panggung berganti di tengah render.
 *
 * Fase 72 mengubah kosakatanya, bukan janjinya: tombol mata (`aria-pressed` = tersembunyi)
 * menggantikan checkbox, bagian wajib tidak punya tombol sama sekali, urutan digeser lewat
 * pegangan ⠿ (drag, atau ↑/↓ dari keyboard), dan tab Tema jadi Global.
 */
test('studio editor: rail, inspektor, dan preferensi yang bertahan', async ({ page }) => {
  // Alur panjang (rail, inspektor, pratinjau, amplop, zoom, preferensi) yang kini juga menunggu gulir
  // panggung diam sebelum membuka amplop: di webkit CI 30 detik habis tepat di langkah pemulihannya.
  test.slow()
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await pastikanTersimpan(page)
  await openSection(page, 'opening-envelope')
  const berdampingan = () => page.evaluate(() => matchMedia('(min-width: 80rem)').matches)
  const tidakMeluber = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  // Tab inspektor: Global menyembunyikan form bagian, Bagian mengembalikannya.
  await page.locator('#editor-inspector-global').click()
  await expect(page.locator('#editor-theme-aruna-bloom')).toBeVisible()
  await expect(page.locator('#editor-field-opening-envelope-title')).toBeHidden()
  await tidakMeluber()

  /*
   * Memilih bagian dari tab Kartu membuka tab Bagian lagi — tab Kartu mengganti panggungnya
   * dengan pratinjau kartu, jadi bagian yang baru diklik tidak akan terlihat di mana pun. Dari
   * Global dan Ornamen tabnya dibiarkan: keduanya ikut membaca bagian yang dipilih.
   */
  await page.locator('#editor-inspector-kartu').click()
  await openSection(page, 'couple')
  await expect(page.locator('#editor-inspector-bagian')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#editor-inspector-panel-bagian h2')).toHaveText('Mempelai')

  // Pencarian menyaring rail; pegangan mati selama tersaring supaya indeksnya tidak berbohong.
  await page.locator('#editor-section-search').fill('gal')
  await expect(page.locator('[id^="editor-section-toggle-"]')).toHaveCount(1)
  await expect(page.locator('#editor-section-toggle-gallery')).toBeVisible()
  await expect(page.locator('#editor-section-handle-gallery')).toBeDisabled()
  await page.locator('#editor-section-search-clear').click()
  // Struktur Elegance: 12 bagian referensi + 4 bagian ekstra; 5 di antaranya wajib dan tanpa tombol mata.
  await expect(page.locator('[id^="editor-section-handle-"]')).toHaveCount(16)
  await expect(page.locator('[id^="editor-section-toggle-"]')).toHaveCount(11)

  // Bagian inti tidak punya sakelar; sisanya bisa disembunyikan, dan bisa di-undo.
  await expect(page.locator('#editor-section-toggle-opening-envelope')).toHaveCount(0)
  await expect(page.locator('#editor-section-toggle-couple')).toHaveCount(0)
  const hitung = async () => Number((await page.locator('#editor-section-count').innerText()).match(/^(\d+)/)?.[1])
  const sebelum = await hitung()
  const video = page.locator('#editor-section-toggle-video')
  // `aria-pressed="true"` berarti mata-coret: bagiannya sedang disembunyikan.
  const semulaTampil = (await video.getAttribute('aria-pressed')) === 'false'
  await video.click()
  await expect(video).toHaveAttribute('aria-pressed', String(semulaTampil))
  expect(await hitung()).toBe(sebelum + (semulaTampil ? -1 : 1))
  await expect(page.locator('#editor-save-state')).toHaveText('Ada perubahan yang belum tersimpan')
  await page.locator('#editor-undo').click()
  await expect(video).toHaveAttribute('aria-pressed', String(!semulaTampil))
  expect(await hitung()).toBe(sebelum)
  await expect(page.locator('#editor-save-state')).toHaveText('Semua perubahan tersimpan')

  // Urutan dari keyboard: ↑ pada pegangan memindahkan bagian satu langkah, lewat `checkpoint()` juga.
  const urutan = () => page.locator('[id^="editor-section-handle-"]').evaluateAll(els => els.map(el => el.id.replace('editor-section-handle-', '')))
  const urutanSemula = await urutan()
  const posisiVideo = urutanSemula.indexOf('video')
  await page.locator('#editor-section-handle-video').focus()
  await page.keyboard.press('ArrowUp')
  await expect.poll(async () => (await urutan()).indexOf('video')).toBe(posisiVideo - 1)
  await page.locator('#editor-undo').click()
  await expect.poll(urutan).toEqual(urutanSemula)
  await expect(page.locator('#editor-save-state')).toHaveText('Semua perubahan tersimpan')

  /*
   * Rail → panggung (fase 70, wadahnya berpindah di fase 76): memilih bagian menggulir LAYAR
   * PONSEL sampai bagian itu berdiri di tepi atasnya. Di ponsel gulirnya ditahan sampai tab
   * Pratinjau dibuka, dan amplopnya harus dibuka dulu karena selama tertutup layarnya terkunci.
   *
   * Dulu tes ini hanya bisa hijau di "Clean", dan komentarnya menuliskan sebabnya sebagai
   * keterangan: bezel iPhone/Android memotong layarnya dengan `overflow-hidden` tanpa gulir di
   * dalamnya, jadi bagian di bawah lipatan memang tidak pernah bisa dicapai. Itu cacat, bukan
   * keterangan — dan sejak fase 76 kedua mode diukur, justru supaya cacat itu tidak bisa pulang.
   *
   * `atas` dibagi skalanya: rect menjawab piksel layar sedangkan `stageScrollOffset` hidup di
   * koordinat render 390px, dan membandingkan keduanya mentah-mentah berarti membandingkan dua
   * satuan yang berbeda.
   */
  const posisiBagian = (type: string) => page.evaluate((t) => {
    const stage = document.querySelector('[data-preview-stage]') as HTMLElement
    const el = document.getElementById(`iv-${t}`)!
    const kotak = stage.getBoundingClientRect()
    const skala = kotak.width / stage.offsetWidth || 1
    return { atas: (el.getBoundingClientRect().top - kotak.top) / skala, gulir: stage.scrollTop }
  }, type)
  const panggung = await openPreview(page)
  await page.locator('#editor-preview-ponsel').click()
  await expect(panggung).toHaveCSS('width', '390px')
  await bukaAmplop(panggung)
  if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
  await openSection(page, 'wishes')
  if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pratinjau', exact: true }).click()
  await expect.poll(async () => (await posisiBagian('wishes')).gulir).toBeGreaterThan(0)
  await expect.poll(async () => Math.abs((await posisiBagian('wishes')).atas - 8)).toBeLessThan(24)

  /*
   * Lebar yang lain, yang selama empat fase tidak pernah bisa digulir sama sekali karena bezelnya
   * memotong layar tanpa memberi gulir.
   *
   * Digulir dengan tangan, bukan lewat rail: yang diuji bukan "apakah rail bisa memerintah",
   * melainkan "apakah layarnya sungguh menggulung" — dan itu hanya bisa dijawab oleh gulir yang
   * datang dari luar Vue.
   */
  await page.locator('#editor-preview-tablet').click()
  await expect(page.locator('#editor-preview-tablet')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => panggung.evaluate((el) => {
    el.scrollTop = 600
    return el.scrollTop
  })).toBeGreaterThan(0)
  await expect.poll(() => panggung.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
  await page.locator('#editor-preview-ponsel').click()

  if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
  await openSection(page, 'opening-envelope')

  // Ponsel: tab Pratinjau menyembunyikan rail dan inspektor; Pengaturan mengembalikannya.
  if (!(await berdampingan())) {
    await page.getByRole('tab', { name: 'Pratinjau', exact: true }).click()
    await expect(page.locator('#editor-section-opening-envelope')).toBeHidden()
    await expect(page.locator('[data-preview-stage]')).toBeVisible()
    await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
    await expect(page.locator('#editor-section-opening-envelope')).toBeVisible()
  }

  // Preferensi bertahan setelah muat ulang: perangkat Desktop, zoom 90 %, tab Global, rail ciut.
  await openPreview(page)
  await page.locator('#editor-preview-laptop').click()
  await expect(page.locator('[data-preview-stage]')).toHaveCSS('width', '1280px')
  await page.locator('#editor-zoom-out').click()
  await expect(page.locator('#editor-zoom-reset')).toHaveText('90%')
  if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
  await page.locator('#editor-inspector-global').click()
  // Tombol ciut rail hanya ada di ≥lg; di bawah itu rail memang satu kolom dengan yang lain.
  const railToggle = page.locator('#editor-rail-toggle')
  const railBisaCiut = await railToggle.isVisible()
  if (railBisaCiut) {
    await railToggle.click()
    await expect(railToggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#editor-section-search')).toBeHidden()
  }
  await tidakMeluber()

  await page.reload()
  await hydrated(page)
  await expect(page.locator('#editor-inspector-global')).toHaveAttribute('aria-selected', 'true')
  if (railBisaCiut) await expect(railToggle).toHaveAttribute('aria-expanded', 'false')
  const stage = await openPreview(page)
  await expect(stage).toHaveCSS('width', '1280px')
  await expect(page.getByText('Selebar 1280px', { exact: true })).toBeVisible()
  await expect(page.locator('#editor-zoom-reset')).toHaveText('90%')
  await tidakMeluber()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aruna:editor:prefs') ?? '{}')))
    .toMatchObject({ device: 'laptop', inspectorTab: 'global', railCollapsed: railBisaCiut, zoom: 90 })

  // Kembalikan bawaannya supaya tes lain di konteks ini tidak mewarisi Desktop + Global + rail ciut.
  await page.locator('#editor-preview-ponsel').click()
  await page.locator('#editor-zoom-reset').click()
  if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
  if (railBisaCiut) await railToggle.click()
  await page.locator('#editor-inspector-bagian').click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aruna:editor:prefs') ?? '{}')))
    .toMatchObject({ device: 'ponsel', inspectorTab: 'bagian', railCollapsed: false, zoom: 100 })
})

/*
 * Gulir dokumen yang bocor (fase 71). Ketiga panel studio menggulung sendiri, tapi input berkas
 * `UiDropzone` (`.sr-only` = `position: absolute`) tidak punya leluhur ber-posisi, jadi kotaknya
 * mendarat di koordinat dokumen dan `scrollHeight` ikut ke sana — terukur 2168px pada viewport 900.
 * Diukur di desktop saja: di bawah `lg` halaman memang menggulung.
 */
// `@desktop`, bukan `test.skip(project !== 'desktop')`: di bawah lg halaman memang menggulung,
// jadi tes ini tidak berlaku di sana. Ditandai supaya ia tidak IKUT DIJALANKAN lalu dibuang —
// eksekusi yang di-skip membuat `skipped` bukan nol, dan gerbang e2e kehilangan artinya.
test('studio tidak menarik gulir dokumen', { tag: '@desktop' }, async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  const tidakMenggulung = async () => {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(0)
    await page.evaluate(() => window.scrollTo(0, 9999))
    expect(await page.evaluate(() => scrollY)).toBe(0)
  }
  // Fase 72.8: input berkas pindah ke modal Pustaka; yang tinggal di form adalah tombol pembukanya.
  await openSection(page, 'gallery')
  await expect(page.locator('#editor-field-gallery-imageUrls-pilih')).toBeAttached()
  await tidakMenggulung()
  await openSection(page, 'hero')
  await expect(page.locator('#editor-field-hero-imageUrl-pilih')).toBeAttached()
  await tidakMenggulung()
  await page.locator('#editor-inspector-global').click()
  await expect(page.locator('#editor-theme-aruna-bloom')).toBeVisible()
  await expect(page.locator('#editor-music-upload')).toBeAttached()
  await tidakMenggulung()
  await page.locator('#editor-inspector-bagian').click()
  await openSection(page, 'opening-envelope')
})

/*
 * Rail dasbor ciut (fase 67). Diuji di desktop saja: di bawah `lg` rail-nya `display:none` dan
 * dock bawah yang memegang navigasi. Tooltip dicari lewat `[data-tooltip]`, bukan
 * `getByRole('tooltip')` — reka merender salinan tersembunyi ber-role yang sama.
 */
// `@desktop`: rail samping hanya ada di >=1024px. Alasan yang sama dengan di atas.
test('rail dasbor ciut jadi ikon, bertahan setelah muat ulang, dan tetap bisa dinavigasi', { tag: '@desktop' }, async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
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

/**
 * Musik pindah dari bagian `music` ke tab Global (fase 72.3): `settings.musicUrl` di dokumen,
 * bukan lagi section yang bisa dimatikan. Memilih lagu langsung menyalakannya — tidak ada lagi
 * sakelar terpisah yang bisa lupa dinyalakan — dan "Tanpa musik" adalah pilihan yang sama jelasnya.
 */
async function pilihLagu(page: import('@playwright/test').Page, url: string) {
  await page.locator('#editor-inspector-global').click()
  await page.locator('#editor-music-select').selectOption(url)
  await expect(page.locator('#editor-music-select')).toHaveValue(url)
}

test('tab Global menawarkan pustaka lagu, dan memilih lagu menyalakan musiknya', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await pastikanTersimpan(page)
  await page.locator('#editor-inspector-global').click()
  await expect(page.locator('#editor-music-upload')).toBeAttached()

  // Tujuh lagu pustaka, tiap-tiap `option` bernilai URL berkasnya; opsi kosong = tanpa musik.
  const lagu = page.locator('#editor-music-select')
  await expect(lagu.locator('option[value^="/audio/"]')).toHaveCount(7)
  await expect(lagu.locator('option[value=""]')).toHaveCount(1)

  // Lagu yang belum tentu sama dengan simpanan, supaya perubahannya sungguh terhitung.
  await pilihLagu(page, '/audio/etude-harpa.mp3')
  await expect(page.locator('#editor-music-preview')).toBeEnabled()
  await expect(page.locator('#editor-music-volume')).toBeEnabled()
  await expect(page.locator('#editor-save-state')).toHaveText('Ada perubahan yang belum tersimpan')

  // Tanpa musik: tombol tes dan volume mati — tidak ada yang bisa "diputar" dari kekosongan.
  await pilihLagu(page, '')
  await expect(page.locator('#editor-music-preview')).toBeDisabled()
  await expect(page.locator('#editor-music-volume')).toBeDisabled()

  // Berkasnya benar-benar ada dan benar-benar audio.
  const track = await page.request.get('/audio/gymnopedie-1.mp3')
  expect(track.status()).toBe(200)
  expect(track.headers()['content-type']).toContain('audio')
})

/**
 * Menerbitkan dari toolbar studio dan menutup dialog "Undangan telah published" yang menyusul —
 * dialog itu memang untuk pasangan (salin URL, buka undangan), tapi ia menutupi apa pun yang
 * hendak diklik tes sesudahnya.
 */
async function terbitkan(page: import('@playwright/test').Page) {
  await page.locator('#editor-publish').click()
  await expect(page.getByText('Versi publik diperbarui.')).toBeVisible({ timeout: 15_000 })
  await page.locator('#aruna-popup-tutup').click()
  await expect(page.locator('#aruna-popup-title')).toHaveCount(0)
}

/** Segel amplop di halaman tamu: nama aksesibelnya `sealLabel` pasangan, jadi dicari lewat penandanya. */
const segelTamu = (page: import('@playwright/test').Page) => page.locator('[data-gate-seal]')

/*
 * Musik sampai ke tamu, dan sampai hanya kalau diminta.
 *
 * **Kontraknya berubah di fase 78.** Tes ini dulu menjaga kebalikannya: membuka gerbang memanggil
 * `play()` sinkron di dalam gestur kliknya, dan yang diuji adalah bahwa izin autoplay itu benar
 * dipakai. Izinnya memang selalu sah; yang tidak pernah ditanyakan adalah apakah tamunya mau
 * mendengar. Sekarang satu-satunya yang menyalakan musik adalah tombolnya — yang juga gestur,
 * jadi tidak ada izin yang hilang, hanya keputusan yang berpindah tangan.
 *
 * Yang masih diuji sama kerasnya: elemennya ada sebelum gerbang dibuka tapi belum mengunduh
 * apa pun, membuka gerbang **tidak** membunyikan apa pun, dan tombolnya benar-benar memutar
 * lagu yang dipilih pasangan dengan volume dan pengulangan yang benar.
 */
test('background music stays silent until the guest asks for it', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  /*
   * `test.slow()` karena fase 78 menambah dua tindakan sungguhan ke tes yang sudah panjang:
   * membuktikan gerbang TIDAK membunyikan apa pun menuntut satu jeda yang ditunggu sampai
   * habis (tidak ada peristiwa untuk "tidak terjadi apa-apa"), lalu menyalakannya lewat
   * tombol. Di WebKit tambahan itu mendorongnya melewati 30 detik — dan yang gagal adalah
   * `page.reload()` di ujung, yaitu tempat jamnya kebetulan habis, bukan tempat yang rusak.
   * Memangkas jedanya sampai muat akan menukar kegagalan yang jujur dengan flake.
   */
  test.slow()
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await hydrated(page)
  await pilihLagu(page, '/audio/gymnopedie-1.mp3')
  await terbitkan(page)

  await page.goto(`/i/${account!.slug}`)
  /*
   * Kalimat "Undangan ini memutar musik saat dibuka." dicabut di fase 77 atas permintaan pemilik.
   * Yang mengumumkan musik sekarang tombolnya sendiri, yang memang terlihat sejak gerbang berdiri —
   * dan tombol yang bisa ditekan mengatakannya lebih baik daripada kalimat yang tidak bisa.
   */
  await expect(page.locator('[aria-label="Putar musik"], [aria-label="Jeda musik"]')).toHaveCount(1)
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

  await segelTamu(page).click()
  // Gerbang terbuka, dan tidak terjadi apa-apa pada audionya. Inilah inti fase 78.
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => {
    const audio = document.querySelector('audio')
    return audio ? !audio.paused : false
  }), 'membuka amplop bukan permintaan musik').toBe(false)
  await expect(page.getByRole('button', { name: 'Putar musik' })).toBeVisible()

  await page.getByRole('button', { name: 'Putar musik' }).click()
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

  /*
   * Muat ulang lalu buka gerbangnya lagi: tetap senyap.
   *
   * Sampai fase 77 baris-baris ini membuktikan sesuatu yang mahal — penolakan tamu bertahan di
   * `sessionStorage` dan menahan autoplay gerbang pada kunjungan berikutnya. Sesudah autoplay
   * dicabut, tidak ada lagi yang perlu ditahan di jalur ini, jadi yang tersisa di sini adalah
   * penjagaan kontrak barunya, bukan pembuktian aturan penolakan. Aturan itu **masih hidup dan
   * masih diuji**, di satu-satunya jalur yang masih bisa melanggarnya: lanjut-sendiri saat tab
   * kembali terlihat, di tes berikutnya.
   */
  await page.reload()
  await segelTamu(page).click()
  await page.waitForTimeout(2500)
  expect(await page.evaluate(() => {
    const audio = document.querySelector('audio')
    return audio ? !audio.paused : false
  }), 'kunjungan berikutnya juga tidak boleh berbunyi sendiri').toBe(false)
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
  // Alasan yang sama dengan tes di atas: satu klik tombol musik lagi di jalur yang sudah padat.
  test.slow()
  // Tautan siaran menunjuk ke server dev-nya sendiri: popup-nya tetap terbuka sungguhan,
  // tapi tidak satu pun tes menyentuh jaringan luar.
  const stream = `${process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'}/`

  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await hydrated(page)
  await pilihLagu(page, '/audio/gymnopedie-1.mp3')

  await page.locator('#editor-inspector-bagian').click()
  await openSection(page, 'video')
  // Tombol mata: `aria-pressed="true"` = sedang disembunyikan, jadi sekali klik menampilkannya.
  const sakelarVideo = page.locator('#editor-section-toggle-video')
  if ((await sakelarVideo.getAttribute('aria-pressed')) === 'true') await sakelarVideo.click()
  await expect(sakelarVideo).toHaveAttribute('aria-pressed', 'false')
  const kolomUrl = page.locator('#editor-field-video-url')
  await kolomUrl.fill(stream)
  await kolomUrl.press('Tab')

  await terbitkan(page)

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
  await segelTamu(page).click()
  // Fase 78: gerbang tidak lagi membunyikan apa pun, jadi musiknya dinyalakan di sini —
  // dan semua aturan di bawah ini berlaku persis seperti sebelumnya begitu ia berbunyi.
  await page.getByRole('button', { name: 'Putar musik' }).click()
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
/**
 * Membuka tab Ornamen pada bagian **Hadiah**, yang tidak merender satu keping pun.
 *
 * Tab Ornamen (fase 72.1) menumpuk dua ringkasan: "Ornamen di bagian ini" untuk bagian yang
 * dipilih, lalu ringkasan penuh dengan tombol kembalikan-semua. Keduanya memakai id kartu yang
 * sama (`ornament-ganti-<slot>`), jadi pada bagian yang punya keping — amplop, mempelai — id itu
 * muncul dua kali dan locator-nya ambigu. Hadiah tidak punya keping: hanya ringkasan penuh yang
 * berdiri, dan tiap id kembali tunggal. (Duplikat id-nya sendiri dilaporkan sebagai cacat.)
 */
async function bukaTabOrnamen(page: import('@playwright/test').Page) {
  await openSection(page, 'gift')
  await page.locator('#editor-inspector-ornamen').click()
  await expect(page.locator('#editor-inspector-panel-ornamen')).toBeVisible()
}

test.describe('studio ornamen', () => {
  test('membuka bank penuh, menyimpan pilihan, dan melayani salinan ringan', async ({ page }) => {
    test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await pastikanTersimpan(page)
    await bukaTabOrnamen(page)

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

    // Ringkasan menggantikan empat grid ubin: tiga belas slot skalar (fase 69: + dua amplop; fase 80:
    // + pita babak dan bingkai hero) + lima jangkar ladang.
    await expect(page.locator('[id^="ornament-ganti-"]')).toHaveCount(18)

    await page.locator('#ornament-ganti-divider').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    /*
     * Fase 80: tidak ada lagi tab yang menyaring menurut tema. Studio dibuka langsung pada seluruh
     * bank untuk jenis ini; yang serasi hanya diurutkan di depan dan diberi lencana.
     */
    await expect(page.locator('#studio-tab-disarankan')).toHaveCount(0)
    await expect(page.locator('#studio-tab-semua')).toHaveAttribute('aria-selected', 'true')
    expect(await page.locator('#studio-grid [role="radio"]').count()).toBeGreaterThan(20)
    await expect(page.locator('#studio-grid [role="radio"]').first()).toHaveAttribute('aria-label', /bawaan tema|serasi dengan tema/)

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
    // Node pelanggarnya ikut ditulis (pola fase 71.5): `id (impact)` saja tidak pernah cukup
    // untuk menemukan elemen mana yang gagal di dalam dialog sebesar ini.
    expect(sapuan.violations.flatMap(v => v.nodes.map(n => `${v.id} (${v.impact}) ${n.target.join(' ')}`))).toEqual([])

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
    await bukaTabOrnamen(page)

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
    await bukaTabOrnamen(page)

    await expect(page.locator('#ornament-locked')).toHaveCount(1)
    await expect(page.locator('#ornament-ganti-divider')).toBeDisabled()
    await expect(page.locator('#ornament-ganti-divider')).toHaveAttribute('aria-describedby', 'ornament-locked')
  })
})

/*
 * Tulisan dan gaya teks per kolom (fase 72.4), menggantikan `copyKeys` fase 69–71: kata-kata
 * bagian hidup di `data` bagiannya dan disunting dari kolom yang digenerate kontrak, dan tiap
 * kolom teks punya panel lipat "Gaya teks" (font · warna · ukuran px · tebal · miring · reset).
 *
 * Yang diukur di panggung, bukan di form: ukuran yang diketik dalam px harus menjadi `font-size`
 * elemen yang benar-benar dirender tamu, dan reset harus mengembalikan ukuran tema **tanpa**
 * menyentuh teksnya. Judul Ucapan dipilih karena ia `h2` tunggal di `#iv-wishes`, jadi
 * pengukurannya tidak bergantung pada urutan elemen lain.
 */
test.describe('gaya teks bagian', () => {
  test('menulis judul Ucapan dari form bagiannya, mengubah ukurannya, tampil di panggung, bertahan, dan bisa direset', async ({ page }) => {
    test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await pastikanTersimpan(page)
    const berdampingan = () => page.evaluate(() => matchMedia('(min-width: 80rem)').matches)
    const kePengaturan = async () => { if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click() }

    await openSection(page, 'wishes')
    const judul = page.locator('#editor-field-wishes-title')
    const gaya = page.locator('#editor-field-wishes-title-gaya')
    const ukuran = page.locator('#editor-field-wishes-title-ukuran')
    const tebal = page.locator('#editor-field-wishes-title-tebal')
    const reset = page.locator('#editor-field-wishes-title-reset-gaya')
    await expect(judul).toBeVisible()

    // Bersih-bersih dari putaran sebelumnya: gaya yang tertinggal membuat "ukuran semula" berbohong.
    await gaya.click()
    await expect(gaya).toHaveAttribute('aria-expanded', 'true')
    if (await reset.count()) await reset.click()
    await expect(reset).toHaveCount(0)

    await judul.fill('Doa kalian')
    await judul.press('Tab')
    const stage = await openPreview(page)
    const judulPanggung = stage.locator('#iv-wishes h2')
    await expect(judulPanggung).toHaveText('Doa kalian')
    const ukuranTema = await judulPanggung.evaluate(el => getComputedStyle(el).fontSize)
    expect(ukuranTema).not.toBe('40px')
    await kePengaturan()

    // Ukuran ditulis saat `change` (Tab); tebal langsung saat diklik — keduanya satu langkah undo.
    await ukuran.fill('40')
    await ukuran.press('Tab')
    await tebal.click()
    await expect(tebal).toHaveAttribute('aria-pressed', 'true')
    await expect(gaya).toContainText('diubah')
    await expect(page.locator('#editor-save-state')).toHaveText('Ada perubahan yang belum tersimpan')
    await openPreview(page)
    await expect(judulPanggung).toHaveCSS('font-size', '40px')
    await expect(judulPanggung).toHaveCSS('font-weight', '700')
    await kePengaturan()
    await saveDraft(page)

    await page.reload()
    await hydrated(page)
    await openSection(page, 'wishes')
    await expect(judul).toHaveValue('Doa kalian')
    await expect(ukuran).toHaveValue('40')
    await expect(tebal).toHaveAttribute('aria-pressed', 'true')
    await expect((await openPreview(page)).locator('#iv-wishes h2')).toHaveCSS('font-size', '40px')
    await kePengaturan()

    // Reset gaya hanya menyentuh gayanya; teksnya tetap milik pasangan.
    await gaya.click()
    await reset.click()
    await expect(reset).toHaveCount(0)
    await expect(judul).toHaveValue('Doa kalian')
    await expect((await openPreview(page)).locator('#iv-wishes h2')).toHaveCSS('font-size', ukuranTema)
    await kePengaturan()

    // Ornamen di bagian ini (fase 71, kini tab Ornamen): Mempelai hanya memuat keping yang ia
    // render, dan Ganti membuka Studio pada slot itu — nilainya tetap yang global.
    await openSection(page, 'couple')
    await page.locator('#editor-inspector-ornamen').click()
    const bagianIni = page.locator('#editor-inspector-panel-ornamen > div').filter({ has: page.getByRole('heading', { name: 'Ornamen di bagian ini' }) })
    await expect(bagianIni.locator('#ornament-ganti-floral')).toBeVisible()
    await expect(bagianIni.locator('#ornament-ganti-frame')).toHaveCount(0)
    await expect(bagianIni.locator('#ornament-kembalikan-semua')).toHaveCount(0)
    await bagianIni.locator('#ornament-ganti-floral').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()

    await page.locator('#editor-inspector-bagian').click()
    await saveDraft(page)
  })
})

/*
 * Gerak per undangan (fase 69): dua pilihan terenumerasi, kini di tab Global. Yang diukur di sini
 * adalah penulisannya — "Sedang"/"Ikut tema" menghapus kuncinya (dokumen kembali identik dengan
 * preset), pilihan lain tersimpan dan bertahan setelah muat ulang. Temponya sendiri diukur di
 * `motion-envelope.spec.ts`.
 *
 * Fase 72 menambah gerak **per bagian** di form bagiannya: pilihannya dipancarkan renderer sebagai
 * `data-iv-entrance` pada elemen bagian di panggung, dan "Ikut tema" mencabut atributnya lagi.
 */
test.describe('gerak undangan', () => {
  test('memilih tempo amplop dan gaya masuk, bertahan setelah muat ulang, kembali ke tema', async ({ page }) => {
    test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await pastikanTersimpan(page)
    await page.locator('#editor-inspector-global').click()

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
    await page.locator('#editor-inspector-global').click()
    await expect(page.locator('#editor-motion-amplop')).toHaveValue('pelan')
    await expect(page.locator('#editor-motion-masuk')).toHaveValue('iris')

    await page.locator('#editor-motion-amplop').selectOption('sedang')
    await page.locator('#editor-motion-masuk').selectOption('tema')
    await saveDraft(page)

    // Gerak per bagian: Ucapan masuk dengan "Iris", sisanya tetap ikut tema.
    await page.locator('#editor-inspector-bagian').click()
    await openSection(page, 'wishes')
    const gerakUcapan = page.locator('#editor-motion-wishes')
    await expect(gerakUcapan).toHaveValue('tema')
    await gerakUcapan.selectOption('iris')
    const stage = await openPreview(page)
    await expect(stage.locator('#iv-wishes')).toHaveAttribute('data-iv-entrance', 'iris')
    await expect(stage.locator('#iv-closing')).not.toHaveAttribute('data-iv-entrance', /./)
    if (!(await page.evaluate(() => matchMedia('(min-width: 80rem)').matches))) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
    await gerakUcapan.selectOption('tema')
    await expect(page.locator('#iv-wishes')).not.toHaveAttribute('data-iv-entrance', /./)
    await expect(page.locator('#editor-save-state')).toHaveText('Semua perubahan tersimpan')
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
    await pastikanTersimpan(page)
    await bukaTabOrnamen(page)

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

/*
 * Tab Kartu (fase 72.7): gaya kartu bagikan (WhatsApp/Open Graph) disunting di inspektor dan
 * pratinjaunya **menggantikan panggung** — bukan ditumpuk di atasnya. Tiga hal yang diuji:
 * pratinjau kartu benar-benar mengambil tempat panggung, pilihannya tersimpan di `shareCard`
 * (bukan `tokens`, jadi tidak terkunci add-on) dan bertahan setelah muat ulang, dan memilih
 * bagian di rail mengembalikan tab Bagian beserta panggungnya — tanpa itu pasangan mengklik rail
 * dan tidak melihat apa pun berubah.
 */
/*
 * Google Picker (fase 75) dipasang di belakang env, dan tes ini menjaga sisi GELAPnya — yang
 * justru lebih sering salah. Tanpa kunci, tombolnya tidak boleh ada sama sekali dan kalimat
 * "belum aktif" harus berdiri: tombol yang terlihat hidup lalu gagal dengan galat Google jauh
 * lebih membingungkan daripada tombol yang memang tidak ada.
 */
test('tanpa kunci Google, tombol Sheets tidak dirender dan kalimatnya jujur', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/guests`)
  await hydrated(page)
  await page.locator('#guest-import-file-toggle').click()

  await expect(page.locator('#guest-import-file')).toBeAttached()
  await expect(page.locator('#guest-import-sheets')).toHaveCount(0)
  await expect(page.getByText('belum aktif di lingkungan ini')).toBeVisible()
})

/*
 * Riwayat versi (fase 75). Sampai fase ini tombol jam hanya membuka `alert()` yang menjanjikan
 * fiturnya menyusul, padahal `PublishedRevision` sudah menyimpan snapshot tiap terbit.
 */
test('tombol riwayat membuka daftar versi terbit, bukan kotak penjelasan', async ({ page }) => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
  await signIn(page)
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  // `hydrated` wajib: tanpanya kliknya mendarat sebelum Vue terpasang dan diam-diam tidak
  // melakukan apa-apa — jebakan yang sudah tercatat sejak fase 16, dan yang membuat tes ini
  // lulus sendirian lalu merah begitu dijalankan bersama project lain.
  await hydrated(page)
  await expect(page.locator('#editor-save')).toBeVisible()

  await page.locator('#editor-riwayat').click()
  await expect(page.getByRole('heading', { name: 'Riwayat versi', exact: true })).toBeVisible()

  // Undangan QA sudah diterbitkan `pnpm test:integration`, jadi daftarnya berisi — dan tepat satu
  // barisnya bertanda "Sedang tayang".
  await expect(page.locator('#editor-riwayat-daftar')).toBeVisible()
  await expect(page.locator('#editor-riwayat-kosong')).toHaveCount(0)
  await expect(page.locator('#editor-riwayat-daftar li')).not.toHaveCount(0)
  await expect(page.getByText('Sedang tayang', { exact: true })).toHaveCount(1)

  await page.locator('#editor-riwayat-close').click()
  await expect(page.getByRole('heading', { name: 'Riwayat versi', exact: true })).toBeHidden()
})

test.describe('kartu bagikan', () => {
  /*
   * Diisi oleh tes pertama, dipakai tes kedua. Tesnya dipisah karena yang kedua tidak menyentuh
   * browser sama sekali — ia satu permintaan HTTP — dan menaruhnya di tes pertama berarti
   * menjalankannya empat kali di empat project untuk menguji satu jawaban server yang sama.
   */
  let kartuUnduhUrl = ''

  test('tab Kartu mengganti panggung dengan pratinjau kartu, menyimpan gayanya, dan kembali ke Bagian dari rail', async ({ page }) => {
    test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await pastikanTersimpan(page)
    const berdampingan = () => page.evaluate(() => matchMedia('(min-width: 80rem)').matches)

    await page.locator('#editor-inspector-kartu').click()
    // Bersih-bersih: gaya kartu yang tertinggal dari putaran sebelumnya.
    const resetKartu = page.locator('#editor-kartu-reset')
    if (await resetKartu.isEnabled()) { await resetKartu.click(); await saveDraft(page) }
    await expect(resetKartu).toBeDisabled()

    // Pratinjau kartu berdiri di tempat panggung; di ponsel ia di balik tab Pratinjau seperti panggung.
    if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pratinjau', exact: true }).click()
    await expect(page.locator('#editor-kartu-preview')).toBeVisible()
    await expect(page.locator('[data-preview-stage]')).toHaveCount(0)
    await expect(page.locator('#editor-kartu-unduh')).toHaveAttribute('href', /\/public\/share-card\/.+\.png/)
    kartuUnduhUrl = (await page.locator('#editor-kartu-unduh').getAttribute('href')) ?? ''
    if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()

    await page.locator('#editor-kartu-gaya-minimal').click()
    await expect(page.locator('#editor-kartu-gaya-minimal')).toHaveAttribute('aria-checked', 'true')
    await page.locator('#editor-kartu-rata-left').click()
    await expect(page.locator('#editor-kartu-rata-left')).toHaveAttribute('aria-checked', 'true')
    // Sakelarnya checkbox `sr-only` di balik label; yang diklik labelnya, seperti pasangan.
    await page.locator('label', { has: page.locator('#editor-kartu-showDate') }).click()
    await expect(page.locator('#editor-kartu-showDate')).toBeChecked()
    await expect(resetKartu).toBeEnabled()
    await expect(page.locator('#editor-save-state')).toHaveText('Ada perubahan yang belum tersimpan')
    await saveDraft(page)

    await page.reload()
    await hydrated(page)
    await expect(page.locator('#editor-inspector-kartu')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#editor-kartu-gaya-minimal')).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('#editor-kartu-rata-left')).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('#editor-kartu-showDate')).toBeChecked()

    // Rail → Bagian: panggung kembali, tab Kartu ditinggalkan.
    await openSection(page, 'couple')
    await expect(page.locator('#editor-inspector-bagian')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('[data-preview-stage]')).toBeAttached()
    await expect(page.locator('#editor-kartu-preview')).toHaveCount(0)

    // Reset mengosongkan `shareCard` sepenuhnya, dan dokumen kembali identik dengan simpanan sebelum tes ini.
    await page.locator('#editor-inspector-kartu').click()
    await resetKartu.click()
    await expect(resetKartu).toBeDisabled()
    await expect(page.locator('#editor-kartu-gaya-template')).toHaveAttribute('aria-checked', 'true')
    await saveDraft(page)
    await page.locator('#editor-inspector-bagian').click()
  })

  /*
   * Sampai fase 75 suite ini berhenti di `href`-nya: tidak satu pun byte PNG pernah menyeberang,
   * jadi satori dan resvg tidak pernah berjalan di sini. Di situlah kartu hitam bisa hidup lama —
   * `og:image` yang 500 atau yang kosong terlihat persis sama dari sisi editor.
   *
   * Hanya `desktop`: yang diuji jawaban server, dan mengulangnya di empat project berarti empat
   * render 1200x630 untuk satu jawaban yang sama.
   */
  // `@desktop`: yang diuji jawaban server, bukan tata letak — cukup satu project.
  test('URL kartu bagikan benar-benar menjawab PNG', { tag: '@desktop' }, async ({ request, baseURL }) => {
    test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')
    test.skip(!kartuUnduhUrl, 'Tes tab Kartu belum sempat mengambil href-nya.')

    const response = await request.get(new URL(kartuUnduhUrl, baseURL ?? undefined).toString())
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')

    const body = await response.body()
    // Tanda tangan PNG, lalu IHDR: 1200x630 dibaca big-endian dari offset 16 dan 20.
    expect(body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true)
    expect([body.readUInt32BE(16), body.readUInt32BE(20)]).toEqual([1200, 630])
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

/**
 * Panggung yang bisa disentuh (fase 76).
 *
 * Tiga keluhan pemilik yang semuanya berbentuk sama: sesuatu yang terlihat bisa dipakai tapi
 * tidak menjawab saat disentuh. Ketiganya hanya bisa dibuktikan di browser sungguhan — yang
 * diuji bukan nilai di dalam komponen melainkan apakah klik dan gulir benar-benar mendarat.
 */
test.describe('panggung editor bisa disentuh', () => {
  test.skip(!account, 'Run pnpm test:integration first to create an isolated QA account.')

  /*
   * Fase 76 menjanjikan "seluruh badan amplop adalah tombol buka" — untuk panggung DAN tamu. Fase 81
   * (keputusan pemilik) memisahkan keduanya: di panggung klik badan amplop MEMILIH kepingnya
   * (kantong, flap, segel bisa diganti dari kanvas), dan di halaman tamu janji fase 76 tetap utuh.
   */
  test('badan amplop: di panggung memilih kepingnya, di halaman tamu membuka', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await expect(page.locator('#editor-save')).toBeVisible()
    const panggung = await openPreview(page)

    // Sudut kiri atas amplop, jauh dari segel — titik tengahnya justru mendarat di segel.
    const amplop = panggung.locator('[data-gate-envelope]')
    await expect(amplop).toBeVisible()
    await amplop.click({ position: { x: 16, y: 16 } })
    await page.waitForTimeout(500)
    await expect(panggung.locator('.iv-gate[data-gate-opened]')).toHaveCount(0)

    await page.goto('/i/demo')
    await hydrated(page)
    await page.waitForLoadState('networkidle')
    await page.locator('[data-gate-envelope]').click({ position: { x: 16, y: 16 } })
    await expect(page.locator('.iv-gate')).toHaveCount(0, { timeout: 10_000 })
  })

  test('callout "Klik di sini untuk membuka" akhirnya menepati kalimatnya', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await expect(page.locator('#editor-save')).toBeVisible()
    const panggung = await openPreview(page)

    const callout = panggung.locator('[data-gate-callout]')
    await expect(callout).toBeVisible()
    /*
     * `force`, dan alasannya diukur bukan ditebak: callout berdenyut lewat `iv-gate-pulse` yang
     * `infinite`, jadi pemeriksaan "elemen stabil" milik Playwright tidak akan pernah lulus —
     * bukan karena halamannya belum tenang, melainkan karena memang tidak dirancang tenang.
     * Denyut itu ditegaskan di baris berikutnya supaya `force` tidak diam-diam menutupi
     * ketidakstabilan jenis lain kalau kelak animasinya dicabut.
     */
    expect(await callout.evaluate(el => getComputedStyle(el).animationIterationCount)).toBe('infinite')
    await callout.click({ force: true })
    await terbuka(panggung)
  })

  test('gulir panggung menandai bagiannya di rail tanpa merebut form, dan rail tetap bisa memerintah balik', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await expect(page.locator('#editor-save')).toBeVisible()
    const berdampingan = () => page.evaluate(() => matchMedia('(min-width: 80rem)').matches)
    const panggung = await openPreview(page)
    await bukaAmplop(panggung)

    /*
     * Gulir datang dari luar Vue — persis seperti roda tetikus pasangan, bukan lewat rail.
     *
     * Selisih rect dibagi skalanya dulu, dengan alasan yang sama seperti `stageScrollTop()`:
     * wadah gulirnya adalah elemen yang di-`scale()` itu sendiri, jadi rect menjawab piksel layar
     * sedangkan `scrollTop` hidup di koordinat render. Versi pertama tes ini lupa membaginya dan
     * mendarat 648px terlalu tinggi — lalu menuduh scroll-spy-nya yang salah.
     */
    await panggung.evaluate((el) => {
      const target = el.querySelector<HTMLElement>('#iv-wishes')!
      const skala = el.getBoundingClientRect().width / el.offsetWidth || 1
      el.scrollTop += (target.getBoundingClientRect().top - el.getBoundingClientRect().top) / skala
    })
    if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
    await expect(page.locator('#editor-section-wishes')).toHaveAttribute('data-terlihat', 'true')
    // Fase 80: gulir hanya menandai, tidak memilih — form Inspector tidak ikut berpindah.
    await expect(page.locator('#editor-section-wishes')).not.toHaveAttribute('aria-current', 'true')

    /*
     * Arah lama tidak boleh rusak: rail tetap memerintah panggung.
     */
    await page.locator('#editor-section-hero').click()
    if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pratinjau', exact: true }).click()
    await expect.poll(() => panggung.evaluate((el) => {
      const kotak = el.getBoundingClientRect()
      const skala = kotak.width / (el as HTMLElement).offsetWidth || 1
      return Math.abs((el.querySelector('#iv-hero')!.getBoundingClientRect().top - kotak.top) / skala)
    })).toBeLessThan(32)
  })

  // Fase 81: klik keping memilihnya dan membuka tab Elemen — nilainya per tempat, bukan global.
  test('klik ornamen di kanvas memilihnya dan membuka tab Elemen', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await expect(page.locator('#editor-save')).toBeVisible()
    const berdampingan = () => page.evaluate(() => matchMedia('(min-width: 80rem)').matches)
    const panggung = await openPreview(page)
    await bukaAmplop(panggung)

    const keping = panggung.locator('#iv-countdown [data-iv-slot="divider"]').first()
    /*
     * Ke TENGAH panggung, bukan `scrollIntoViewIfNeeded`: WebKit menaruhnya di tepi bawah, tepat di
     * bawah dock undangan yang sticky, dan dock itulah yang menerima klik (terukur di project safari).
     */
    /*
     * Ke tengah LAYAR PANGGUNG, bukan ke tengah jendela: `scrollIntoView` memusatkan terhadap jendela,
     * dan di WebKit titik itu masih jatuh di bawah dock undangan yang sticky di dasar layar panggung.
     */
    await keping.evaluate((el) => {
      const layar = el.closest<HTMLElement>('[data-preview-stage]')!
      const kotak = layar.getBoundingClientRect()
      const skala = kotak.width / layar.offsetWidth || 1
      layar.scrollTop += (el.getBoundingClientRect().top - kotak.top) / skala - layar.clientHeight / 2
      layar.scrollIntoView({ block: 'nearest' })
    })
    await expect(keping).toBeVisible()
    await expect.poll(() => keping.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const kena = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return kena === el || el.contains(kena)
    }), { message: 'pemisah tertutup elemen lain di titik kliknya' }).toBe(true)
    // Klik tetikus di posisinya, bukan `locator.click()`: pemeriksaan aksi Playwright menggulirnya
    // lagi di WebKit sampai tertutup dock atau toolbar panggung.
    const kotak = (await keping.boundingBox())!
    await page.mouse.click(kotak.x + kotak.width / 2, kotak.y + kotak.height / 2)

    if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
    await expect(page.locator('#editor-inspector-elemen')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#editor-inspector-panel-elemen')).toBeVisible()
    await expect(page.locator('#elemen-judul')).toHaveText(/^Pemisah/)
    await expect(page.locator('#elemen-ganti')).toBeVisible()
  })

  test('segel di panggung memilih kepingnya; callout berikon yang membuka amplop', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await expect(page.locator('#editor-save')).toBeVisible()
    const panggung = await openPreview(page)

    /*
     * Fase 81, keputusan pemilik: sampai fase 80 segel adalah SATU-SATUNYA aksi klik di amplop
     * panggung (membuka), jadi ia tidak pernah bisa diganti dari kanvas. Sekarang klik segel
     * memilih kepingnya, dan amplop dibuka lewat callout berikon di bawahnya.
     */
    await panggung.locator('[data-gate-seal]').click()
    await page.waitForTimeout(500)
    await expect(panggung.locator('.iv-gate[data-gate-opened]')).toHaveCount(0)
    await expect(page.locator('#editor-inspector-elemen')).toHaveAttribute('aria-selected', 'true')
    await bukaAmplop(panggung)
  })

  /*
   * Keluhan pemilik yang paling mahal di fase 76, dan yang paling mudah pulang.
   *
   * Gerbang amplop dulu `absolute inset-0` menindih seluruh undangan, jadi satu-satunya cara agar
   * gulir tidak menampakkan gerbang tanpa ujung adalah menguncinya — `overflow-y: hidden` pada
   * layar panggung selama amplop belum dibuka. Akibatnya roda tetikus di panggung tidak melakukan
   * apa pun, dan tidak ada satu pun isyarat bahwa amplopnya harus dibuka lebih dulu. Pemilik
   * membacanya, dengan benar, sebagai pratinjau yang rusak.
   */
  test('panggung bisa digulir sebelum amplopnya dibuka', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await expect(page.locator('#editor-save')).toBeVisible()
    const panggung = await openPreview(page)

    // Gerbangnya masih berdiri — inilah keadaan yang dulu mengunci.
    await expect(panggung.locator('.iv-gate')).toHaveCount(1)
    expect(await panggung.evaluate(el => getComputedStyle(el).overflowY)).toBe('auto')

    await panggung.hover()
    await page.mouse.wheel(0, 600)
    await expect.poll(() => panggung.evaluate(el => el.scrollTop)).toBeGreaterThan(0)

    // Dan gerbangnya cuma setinggi satu layar, bukan sepanjang undangan: di bawahnya ada isinya.
    expect(await panggung.evaluate(el => el.querySelector('.iv-gate')!.getBoundingClientRect().height
      <= el.getBoundingClientRect().height + 1)).toBe(true)
  })

  /*
   * Keluhan pemilik sesudah fase 77: amplop yang sudah dibuka tidak bisa ditemukan lagi.
   *
   * Sampai fase 77 gerbangnya melepas diri dari DOM begitu animasinya tuntas — bentuk yang benar
   * untuk tamu (undangan terbit yang jadi acuan pun mendarat di Hero saat digulir balik ke puncak)
   * dan salah untuk pasangan. Di panggung, amplop punya entri sendiri di rail dan `id` sendiri:
   * ia BAGIAN, dan bagian tidak boleh jadi satu-satunya yang cuma bisa dikunjungi sekali. Yang
   * terjadi dulu: menggulir mentok ke atas mendarat di Hero, dan satu-satunya cara melihat lagi
   * hasil suntingan sendiri adalah memuat ulang pratinjau.
   */
  test('amplop yang sudah dibuka masih menunggu di puncak panggung', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await expect(page.locator('#editor-save')).toBeVisible()
    const panggung = await openPreview(page)
    await bukaAmplop(panggung)

    await panggung.evaluate((el) => { el.scrollTop = 0 })

    /*
     * Utuh, bukan sekadar hadir: animasinya berakhir pada `opacity: 0`, jadi gerbang yang tetap
     * di DOM tanpa disegel ulang akan berwujud satu layar kosong di puncak — kegagalan yang
     * terbaca persis sama seperti gerbang yang hilang.
     */
    const gerbang = panggung.locator('#iv-opening-envelope')
    await expect(gerbang).toHaveCount(1)
    await expect.poll(() => gerbang.evaluate(el => getComputedStyle(el).opacity)).toBe('1')

    // Dan sungguh-sungguh hidup: pembukanya menerima klik kedua, bukan sisa animasi yang membeku.
    const callout = panggung.locator('[data-gate-callout]')
    await expect(callout).toBeEnabled()
    await callout.click({ force: true })
    await expect.poll(() => panggung.evaluate(el => el.scrollTop), { timeout: 10_000 }).toBeGreaterThan(0)
  })

  test('kembali ke puncak menandai Opening Envelope, yang tidak punya section sendiri', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await expect(page.locator('#editor-save')).toBeVisible()
    const berdampingan = () => page.evaluate(() => matchMedia('(min-width: 80rem)').matches)
    const panggung = await openPreview(page)

    /*
     * `opening-envelope` headless — ia gerbang, bukan bagian di aliran — jadi sampai fase 76 ia
     * satu-satunya entri rail yang tidak punya elemen untuk dituju maupun disorot. Gerbangnya kini
     * membawa `id="iv-opening-envelope"`, jadi ia ikut dihitung persis seperti bagian lain.
     */
    await panggung.evaluate((el) => { el.scrollTop = el.scrollHeight * 0.5 })
    await page.waitForTimeout(400)
    await panggung.evaluate((el) => { el.scrollTop = 0 })
    if (!(await berdampingan())) await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
    await expect(page.locator('#editor-section-opening-envelope')).toHaveAttribute('data-terlihat', 'true')
  })

  /*
   * Pemutar musik di PANGGUNG, jalur yang sampai fase 77 tidak punya satu pun tes.
   *
   * Dua tes musik yang ada semuanya menguji halaman tamu, dan keduanya memanggil `pilihLagu()`
   * lebih dulu — jadi tidak ada satu pun yang pernah menanyakan apa yang dilihat pasangan pada
   * undangan yang baru dibuat. Jawabannya, selama ini: tidak ada tombol sama sekali, karena
   * `settings.musicUrl` lahir kosong dan `Renderer` tidak merender pemutar tanpa lagu.
   */
  test('pemutar musik berdiri di panggung dan tombolnya berpindah', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await expect(page.locator('#editor-save')).toBeVisible()
    const panggung = await openPreview(page)

    /*
     * Pemutarnya sudah berdiri sebelum amplop dibuka — harus, karena `arm()` dipanggil sinkron di
     * dalam klik gerbang dan butuh sasaran yang sudah ter-mount.
     */
    const putar = panggung.locator('[aria-label="Putar musik"]')
    await expect(putar).toBeVisible()

    /*
     * Tapi belum bisa DITEKAN, dan itu benar: sejak fase 77 gerbang ikut aliran setinggi satu
     * layar dengan `z-50`, sementara pemutar `sticky z-30` di bawahnya. Amplop dibuka dulu, persis
     * seperti tamu. Ketahuan di WebKit — flap amplopnya yang menangkap klik, dan Chromium
     * kebetulan meloloskannya karena posisi keduanya sedikit berbeda di sana.
     */
    await bukaAmplop(panggung)

    /*
     * Sesudah gerbang dibuka, label tombolnya **tidak bisa ditebak**: `onGateOpen` memanggil
     * `arm()` sinkron di dalam klik, dan apakah pemutarnya benar-benar berbunyi tergantung
     * kebijakan autoplay mesinnya — WebKit mengizinkannya, Chromium headless tidak. Menuntut
     * "Putar musik" di sini membuat tes hijau di satu project dan merah di project lain tanpa ada
     * yang rusak. Yang diuji seharusnya bukan labelnya, melainkan bahwa menekannya **membalik**.
     */
    const tombol = panggung.locator('button[aria-label="Putar musik"], button[aria-label="Jeda musik"]')
    await expect(tombol).toHaveCount(1)
    const sebelum = await tombol.getAttribute('aria-label')
    await tombol.click()
    await expect(panggung.locator(`button[aria-label="${sebelum === 'Jeda musik' ? 'Putar musik' : 'Jeda musik'}"]`)).toBeVisible()

    // Dan kalimat yang dulu menggantikannya sudah tidak ada.
    await expect(panggung.getByText('Undangan ini memutar musik saat dibuka.')).toHaveCount(0)
  })

  /*
   * Tiga lebar, tiga tata letak — bukan tiga angka (fase 77).
   *
   * Sebelum fase ini `tokens.layout: 'kartu'` mengunci undangan jadi kartu 480px di tiap container
   * ≥48rem, jadi ketiga pilihan perangkat menampilkan hal yang sama dan pemilik membacanya, dengan
   * benar, sebagai pratinjau yang tidak responsif.
   */
  test('tiap lebar perangkat menyalakan tata letak yang berbeda', async ({ page }) => {
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await expect(page.locator('#editor-save')).toBeVisible()
    const panggung = await openPreview(page)

    const ukur = async () => panggung.evaluate((el) => {
      const kolom = el.querySelector('.iv-column') as HTMLElement
      const sisi = el.querySelector('.iv-aside') as HTMLElement | null
      const skala = el.getBoundingClientRect().width / (el as HTMLElement).offsetWidth || 1
      return {
        kolom: Math.round(kolom.getBoundingClientRect().width / skala),
        sisi: sisi ? getComputedStyle(sisi).display : 'absen',
      }
    })

    await page.locator('#editor-preview-ponsel').click()
    await expect.poll(ukur).toEqual({ kolom: 390, sisi: 'none' })
    await page.locator('#editor-preview-tablet').click()
    await expect.poll(ukur).toEqual({ kolom: 640, sisi: 'none' })
    await page.locator('#editor-preview-laptop').click()
    await expect.poll(ukur).toEqual({ kolom: 480, sisi: 'block' })
    await page.locator('#editor-preview-ponsel').click()
  })

  test('afordansnya tidak ikut menyeberang ke halaman tamu', async ({ page }) => {
    await page.goto(`/i/${account!.slug}`)
    await expect(page.locator('.iv-root')).toBeVisible()
    // `.iv-root--stage` yang menggerbangi seluruh CSS kotak putus-putus; absennya = absennya afordans.
    expect(await page.locator('.iv-root--stage').count()).toBe(0)
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.iv-field')!).pointerEvents)).toBe('none')
  })
})
