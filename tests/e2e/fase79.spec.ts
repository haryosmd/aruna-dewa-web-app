import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

/*
 * Fase 79 — empat bagian ekstra berhenti jadi lubang.
 *
 * Yang dijaga di sini adalah hal yang tidak bisa dijaga suite unit: bahwa kolom yang diketik
 * pasangan di editor benar-benar berubah di panggung. `apps/web/test/section-fields-render.spec.ts`
 * membuktikan komponennya MEMBACA `section.data`; berkas ini membuktikan jalurnya utuh dari
 * kotak isian sampai piksel.
 */

const fixturePath = '.data/qa-account.json'
const account = existsSync(fixturePath)
  ? JSON.parse(readFileSync(fixturePath, 'utf8')) as { email: string; password: string; invitationId: string; slug: string }
  : null

if (!account && process.env.CI) {
  throw new Error('.data/qa-account.json tidak ada. `pnpm test:integration` harus berhasil sebelum `playwright test` di CI.')
}

async function hydrated(page: Page) {
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__))
}

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account!.email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(account!.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
}

/**
 * Membuka bagian di rail, menyalakannya kalau ia masih tersembunyi.
 *
 * `aria-pressed` di sakelar itu **terbalik dari dugaan pertama**: `SectionRail.vue` menulis
 * `:aria-pressed="!section.enabled"`, jadi `true` berarti bagiannya SEDANG TERSEMBUNYI dan
 * tombolnya menawarkan "Tampilkan". Keempat bagian ekstra lahir mati, jadi tanpa klik ini
 * panggungnya memang tidak pernah memuat `#iv-story` dan kawan-kawan.
 */
async function bukaBagian(page: Page, tipe: string) {
  await hydrated(page)
  /*
   * Tab Inspector DIPILIH eksplisit, tidak diandaikan.
   *
   * `useEditorPrefs` menyimpan tab terakhir, jadi tes lain di project yang sama bisa
   * meninggalkannya di "Global" atau "Ornamen" — dan kolom bagian yang dicari di bawah tidak
   * pernah muncul. Kegagalannya menunjuk ke `#editor-field-…` yang "tidak ada", bukan ke tab
   * yang salah, jadi ia menyesatkan persis sejauh mungkin dari sebabnya. `dashboard.spec.ts`
   * sudah memilih tabnya sendiri untuk alasan yang sama.
   */
  await page.locator('#editor-inspector-bagian').click()
  const sakelar = page.locator(`#editor-section-toggle-${tipe}`)
  if ((await sakelar.getAttribute('aria-pressed')) === 'true') await sakelar.click()
  await expect(sakelar).toHaveAttribute('aria-pressed', 'false')

  /*
   * Pemilihannya DIVERIFIKASI, dan kalau perlu diulang.
   *
   * Barisnya hidup di dalam rail yang bisa digulir, ditapis, diciutkan, dan diurutkan ulang oleh
   * tes lain di project yang sama — dan sebuah klik yang mendarat saat rail sedang menggambar
   * ulang hilang tanpa galat. Akibatnya baru terasa jauh di hilir: Inspector tetap menampilkan
   * bagian sebelumnya, dan yang dilaporkan Playwright adalah kolom form yang "tidak pernah
   * muncul" — sembilan puluh detik menunggu elemen yang memang tidak seharusnya ada di situ.
   *
   * `scrollIntoViewIfNeeded` lebih dulu, lalu `aria-current` sebagai buktinya. Dua percobaan,
   * karena satu klik yang hilang adalah kebetulan dan dua berturut-turut adalah cacat.
   */
  const baris = page.locator(`#editor-section-${tipe}`)
  for (let percobaan = 0; percobaan < 2; percobaan++) {
    await baris.scrollIntoViewIfNeeded()
    await baris.click()
    if (await baris.getAttribute('aria-current') === 'true') break
  }
  await expect(baris, `bagian ${tipe} tidak terpilih di rail — Inspector menampilkan bagian lain`)
    .toHaveAttribute('aria-current', 'true')
}

/**
 * Mengisi satu kolom **dan melepas fokusnya**.
 *
 * `TextStyleField` dan kolom `url` menulis ke dokumen pada `@change`, bukan `@input` — jadi
 * panggung berubah ketika pasangan meninggalkan kotaknya, bukan pada tiap ketukan. `fill()`
 * Playwright tidak memicu `change`, jadi tanpa `blur()` di bawah tes ini akan mengukur nilai
 * yang belum pernah sampai ke dokumen dan menyalahkan renderer untuk itu.
 */
async function isiKolom(page: Page, tipe: string, key: string, nilai: string) {
  const kolom = page.locator(`#editor-field-${tipe}-${key}`)
  await kolom.fill(nilai)
  await kolom.blur()
}

/** Simpan yang memaafkan draf yang memang sudah bersih — tes ini berbagi satu undangan QA. */
async function simpan(page: Page) {
  const tombol = page.locator('#editor-save')
  if (await tombol.isEnabled()) await tombol.click()
  await expect(page.locator('#editor-save-state')).toHaveText('Semua perubahan tersimpan')
}

test.describe('kolom bagian ekstra sampai ke panggung', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!account, 'Jalankan `pnpm test:integration` dulu untuk membuat akun QA terisolasi.')
    await signIn(page)
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(page)
  })

  /*
   * Sembilan kolom yang jadi judul fase ini. Sampai fase 79 tiap `fill()` di bawah tidak mengubah
   * satu piksel pun: komponennya membaca `t(...)` dari sistem copy, dan untuk dokumen v2 sistem
   * itu selalu menjawab bawaannya karena migrasi membuang `document.copy`.
   */
  test('@desktop menyunting kolom story, rundown, dresscode, dan video mengubah panggung', async ({ page }) => {
    const panggung = page.locator('[data-preview-stage]')

    await bukaBagian(page, 'story')
    await isiKolom(page, 'story', 'kicker', 'CERITA-79')
    await expect(panggung.locator('#iv-story')).toContainText('CERITA-79')

    await bukaBagian(page, 'rundown')
    await isiKolom(page, 'rundown', 'kicker', 'RUNDOWN-79')
    await isiKolom(page, 'rundown', 'title', 'JUDUL-RUNDOWN-79')
    await expect(panggung.locator('#iv-rundown')).toContainText('RUNDOWN-79')
    await expect(panggung.locator('#iv-rundown')).toContainText('JUDUL-RUNDOWN-79')

    await bukaBagian(page, 'dresscode')
    await isiKolom(page, 'dresscode', 'kicker', 'BUSANA-79')
    await isiKolom(page, 'dresscode', 'title', 'JUDUL-BUSANA-79')
    await isiKolom(page, 'dresscode', 'note', 'CATATAN-79')
    await expect(panggung.locator('#iv-dresscode')).toContainText('JUDUL-BUSANA-79')
    await expect(panggung.locator('#iv-dresscode')).toContainText('CATATAN-79')

    await bukaBagian(page, 'video')
    await isiKolom(page, 'video', 'url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await isiKolom(page, 'video', 'kicker', 'VIDEO-79')
    await isiKolom(page, 'video', 'open', 'TONTON-79')
    await expect(panggung.locator('#iv-video')).toContainText('VIDEO-79')
    await expect(panggung.locator('#iv-video')).toContainText('TONTON-79')

    /*
     * `open` dikosongkan lagi SEBELUM disimpan, dan ini bukan kerapian.
     *
     * Keempat project berbagi satu undangan QA, dan project berikutnya menjalankan
     * `dashboard.spec.ts` yang mencari tautan bernama "Buka siaran" — nama yang datang dari
     * fallback kolom ini. Menyimpan "TONTON-79" di sini membuat tes itu merah satu project
     * kemudian, dengan galat yang tidak menyebut berkas ini sama sekali. Yang dibuktikan di
     * atas sudah cukup: kolomnya sampai ke layar.
     */
    await isiKolom(page, 'video', 'open', '')
    await expect(panggung.locator('#iv-video')).toContainText('Buka siaran')

    // Dan sisanya bertahan lewat simpan, bukan cuma hidup di memori klien.
    await simpan(page)
    await page.reload()
    await hydrated(page)
    await expect(page.locator('[data-preview-stage] #iv-rundown')).toContainText('JUDUL-RUNDOWN-79')
    await expect(page.locator('[data-preview-stage] #iv-dresscode')).toContainText('CATATAN-79')
  })

  /*
   * Kolom pilihan bernilai terbatas — bentuk kolom yang belum pernah ada di `FieldKind` sebelum
   * fase 79. Yang diuji bukan hanya "select-nya ada" tapi bahwa memilih varian mengganti
   * KOMPONEN yang dirender, dan bahwa undo mengembalikannya.
   */
  test('@desktop memilih cara cerita ditampilkan mengganti wajahnya, dan undo mengembalikannya', async ({ page }) => {
    /*
     * Jalur terpadat di berkas ini: masuk, muat editor, nyalakan bagian, tambah satu langkah,
     * lalu LIMA pergantian varian yang masing-masing memuat chunk komponennya sendiri dan
     * menunggu panggung menggambar ulang. Anggaran 30 detik bawaan habis sebelum pergantian
     * pertama — dan gejalanya menyesatkan: Playwright melaporkannya sebagai `#editor-field-
     * story-variant` yang "tidak pernah muncul", padahal elemennya ada sejak detik pertama.
     */
    test.slow()
    const panggung = page.locator('[data-preview-stage]')
    await bukaBagian(page, 'story')

    /*
     * Empat dari lima varian butuh langkah, dan aturan `storyVariantEfektif` menjatuhkan
     * varian tanpa langkah ke `prosa` — itu justru yang membuat dokumen lama tidak berubah
     * tampilannya. Draf QA lahir tanpa langkah, jadi satu langkah ditambahkan di sini supaya
     * yang diuji adalah pemilihnya, bukan aturan jatuhnya.
     */
    if (!(await page.locator('#editor-story-title-1').count())) {
      await page.locator('#editor-story-add').click()
      const judul = page.locator('#editor-story-title-1')
      await judul.fill('LANGKAH-79')
      await judul.blur()
      // Sampai fase 80 bagiannya harus dipilih ULANG di sini: penyorot-gulir rail merebut
      // Inspector ke Rundown begitu cerita memanjang. Dijaga sendiri di `fase80.spec.ts`.
    }

    const pemilih = page.locator('#editor-field-story-variant')
    await expect(pemilih).toBeVisible()

    await pemilih.selectOption('rel')
    await expect(panggung.locator('#iv-story .iv-story-rail')).toHaveCount(1)

    await pemilih.selectOption('tumpuk')
    await expect(panggung.locator('#iv-story .iv-story-rail')).toHaveCount(0)
    await expect(panggung.locator('#iv-story .iv-story-kartu').first()).toBeVisible()

    await pemilih.selectOption('buku')
    await expect(panggung.locator('#iv-story .iv-story-halaman').first()).toBeVisible()

    await pemilih.selectOption('rel-datar')
    await expect(panggung.locator('#iv-story .iv-story-geser')).toHaveCount(1)

    // Tiap tulisan lewat `checkpoint()`; kalau tidak, pemilih ini jadi satu-satunya kontrol
    // editor yang tidak bisa dibatalkan.
    await page.keyboard.press('Control+z')
    await expect(panggung.locator('#iv-story .iv-story-halaman').first()).toBeVisible()
  })
})

test.describe('video memakai sampul sendiri, bukan iframe yang langsung berbunyi', () => {
  /*
   * Jaringan luar tidak pernah disentuh suite ini — aturan yang sudah dipegang tes musik.
   * Sampul dan sematannya dijawab lokal, jadi yang diuji tetap PERILAKU kita: alamat apa yang
   * diminta, dan kapan.
   */
  test.beforeEach(async ({ page }) => {
    test.skip(!account, 'Jalankan `pnpm test:integration` dulu untuk membuat akun QA terisolasi.')
    await page.route('**://i.ytimg.com/**', route => route.fulfill({
      status: 200,
      contentType: 'image/gif',
      // GIF 1×1 transparan.
      body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
    }))
    await page.route('**://*.youtube-nocookie.com/**', route => route.fulfill({
      status: 200, contentType: 'text/html', body: '<html><body>sematan palsu</body></html>',
    }))
    await signIn(page)
  })

  test('@desktop sampul dulu, iframe hanya sesudah tamu menekannya', async ({ page }) => {
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(page)
    await bukaBagian(page, 'video')
    await isiKolom(page, 'video', 'url', 'https://youtu.be/dQw4w9WgXcQ')
    await simpan(page)

    const panggung = page.locator('[data-preview-stage] #iv-video')
    // Sampul digambar dari id yang di-parse sendiri; nol permintaan ke Google sebelum diklik.
    await expect(panggung.locator('img[src^="https://i.ytimg.com/vi/dQw4w9WgXcQ/"]')).toHaveCount(1)
    await expect(panggung.locator('iframe')).toHaveCount(0)

    await panggung.locator('button.iv-video-tombol').click()
    await expect(panggung.locator('iframe[src^="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toHaveCount(1)
  })

  /*
   * Cabang tautan keluar tidak dibuang fase 79 — gereja dan gedung yang menyiarkan lewat
   * platformnya sendiri lewat pintu ini, dan tanpa tes ini pintu itu bisa hilang tanpa gejala.
   */
  test('@desktop URL non-YouTube tetap jadi tautan keluar, bukan sampul kosong', async ({ page }) => {
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(page)
    await bukaBagian(page, 'video')
    await isiKolom(page, 'video', 'url', 'https://siaran.gerejaku.id/live')

    const panggung = page.locator('[data-preview-stage] #iv-video')
    await expect(panggung.locator('img[src*="ytimg"]')).toHaveCount(0)
    await expect(panggung.locator('a[target="_blank"]')).toHaveCount(1)
  })
})
