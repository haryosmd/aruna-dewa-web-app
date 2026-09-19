import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { catalog, templates } from '../../packages/contracts/src/index'

/** Cermin `apps/web/utils/format.ts`, supaya tes tidak perlu mengimpor util Nuxt. */
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const formatRupiah = (value: number) => rupiah.format(value).replace(/\s/g, '')

const HEADLINE = 'Hari yang kalian tunggu bersama. Undangannya jangan seadanya.'

/*
 * `scrollWidth` di-poll, bukan dibaca sekali.
 *
 * Baris carousel tema memang lebih lebar dari layar — itu memang yang digeser — dan
 * dikurung kontainer ber-`overflow-hidden` miliknya. Tapi sesaat sebelum hidrasi selesai,
 * pengukuran masih menangkap baris itu apa adanya, jadi pembacaan tunggal tepat setelah
 * heading muncul menguji layout yang belum jadi. Aturannya tidak dilonggarkan: yang
 * diperiksa tetap `scrollWidth <= innerWidth`, hanya diukur setelah layout tenang.
 */
const fitsViewport = (page: import('@playwright/test').Page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { timeout: 5000 }).toBe(true)

/*
 * Buka gerbang sampul, lalu **tunggu ia benar-benar pergi** sebelum menyentuh apa pun di
 * belakangnya.
 *
 * Mengklik "Buka Undangan" hanya memulai animasi amplop selama ~2,5 detik. Sepanjang itu
 * `CoverGate` masih `fixed inset-0 z-50` — ia mencegat setiap klik — dan `document.body`
 * masih `overflow: hidden`, jadi `scrollIntoViewIfNeeded` tidak bisa menggerakkan apa pun.
 * Keduanya baru dilepas di `finish()`.
 *
 * Tes yang langsung lanjut setelah klik karena itu berlomba dengan animasi: di mesin cepat
 * gerbangnya kebetulan sudah pergi, di runner CI yang sibuk belum. Yang terjadi bukan galat
 * yang jelas melainkan klik yang mendarat entah di mana lalu tidak melakukan apa-apa —
 * `wishes wall paginates five at a time` gagal begitu di safari, dua kali dari beberapa run,
 * dengan trace berisi belasan "iv-gate intercepts pointer events" dan "element is not stable"
 * sebelum kliknya akhirnya dilepas ke halaman yang sedang bergeser.
 *
 * Penantiannya bukan angka tebakan melainkan dua sinyal yang memang menandai selesainya:
 * gerbangnya hilang dari DOM, dan kunci gulirnya dilepas.
 */
async function bukaGerbang(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Buka Undangan' }).click()
  await expect(page.locator('.iv-gate')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden')
}

test('landing, guest greeting and responsive layout', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: HEADLINE })).toBeVisible()
  await fitsViewport(page)
  await page.getByLabel('Tulis nama tamu (opsional)', { exact: true }).fill('dr. Yosi Susanti, Sp.OG')
  await page.getByRole('button', { name: 'Buka demo', exact: true }).click()
  await expect(page).toHaveURL(/to=dr\.\+Yosi\+Susanti/)
  await expect(page.getByText('Kepada Yth. dr. Yosi Susanti, Sp.OG', { exact: true })).toBeVisible()
  await fitsViewport(page)
  await page.screenshot({ path: `docs/features/landing-order/verification/demo-${testInfo.project.name}.png`, fullPage: true })
  expect(errors).toEqual([])
})

/*
 * Contrast is audited with reduced motion on. Scroll-reveal tweens park off-screen
 * elements at opacity 0 until they scroll in, and axe reads those intermediate values
 * as contrast failures; the reduced-motion tree is the authored, resting design.
 */
test('landing keyboard navigation and accessibility', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Tutup menu' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused()
  }
  await page.getByText('Bisakah undangan diedit setelah dibuat?', { exact: true }).click()
  await expect(page.locator('details[open]')).toHaveCount(1)
  const scan = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(scan.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) }))).toEqual([])
  await page.screenshot({ path: `docs/features/landing-order/verification/landing-${testInfo.project.name}.png`, fullPage: true })
})

/**
 * Sapuan yang SENGAJA menatap toast — satu-satunya di suite ini.
 *
 * Fase 60 mengganti `vue-sonner` karena markup-nya menaruh `role="status"` pada `<li>` di dalam
 * `<ol>`, dan aturan `list` axe menilai itu `serious`. Yang membuatnya lolos bertahun-tahun bukan
 * kebersihan melainkan waktu: cabang yang gagal hanya dimasuki anak yang terlihat pembaca layar,
 * jadi selama tidak ada toast di layar wadahnya kosong dan aturannya lulus. Setiap sapuan lain di
 * repo ini berjalan tepat setelah navigasi, saat tidak ada satu pun toast. Tanpa tes ini,
 * kemunduran yang sama akan sunyi persis dengan cara yang sama.
 *
 * Dua hal di bawah ini yang membuatnya berarti, dan keduanya berasal dari kegagalan sungguhan
 * saat tes ini ditulis:
 *
 * 1. **Clipboard dimatikan supaya cabang GAGAL yang terpakai.** Bukan untuk menguji kegagalannya,
 *    melainkan karena cabang itu memasang `duration: 10000` sementara toast biasa pergi setelah
 *    4 detik. Toast yang kedaluwarsa di tengah sapuan tidak membuat tes ini merah — ia membuatnya
 *    HIJAU tanpa memeriksa apa pun, dan lubang itu persis jenis yang sedang ditutup di sini.
 * 2. **Halaman dikembalikan ke puncak sebelum disapu.** Mengklik tombol salin menggulir ke seksi
 *    demo yang gelap, dan di sana header lengket berlatar `bg-surface/85` sedang di tengah
 *    transisi 300ms-nya; axe membaca warna campuran itu dan melaporkan `color-contrast` pada
 *    wordmark. Diukur: pada posisi diam yang sama, setelah transisinya selesai, sapuannya nol
 *    pelanggaran — jadi yang dilaporkan tadi memang artefak transisi, bukan cacat desain.
 */
test('landing stays clean with a toast on screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  })
  await page.goto('/')

  const copy = page.locator('#landing-demo-copy')
  await expect(copy).toBeEnabled()
  await copy.click()

  const toast = page.locator('[data-aruna-toast]')
  await expect(toast).toHaveCount(1)

  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

  const scan = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(scan.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) }))).toEqual([])

  // Toast-nya harus MASIH ada: kalau ia sudah pergi, sapuan di atas memeriksa halaman kosong.
  await expect(toast).toHaveCount(1)
})

test('theme carousel previews every published template', async ({ page }) => {
  await page.goto('/')
  const themes = page.getByRole('region', { name: 'Tema undangan' })
  /*
   * Satu kartu per tema HIDUP. Diukur terhadap `templates`, bukan `templateIds`: yang kedua
   * ikut memuat id pensiun yang sengaja tidak punya kartu, jadi memakainya di sini membuat
   * tes ini menuntut kartu untuk tema yang memang sudah dihapus.
   */
  await expect(themes.getByRole('article')).toHaveCount(templates.length)
  for (const template of templates) {
    await expect(themes.getByRole('link', { name: `Buka tema ini — ${template.name}` })).toHaveAttribute('href', `/i/demo?tema=${template.id}`)
  }
})

/*
 * Jalur kritis landing: satu gambar yang diutamakan, sisanya menunggu giliran.
 *
 * Sebelum ini keenam gambar landing (~1,1 MB) dimuat eager, dan foto hero — yang justru
 * elemen LCP — ikut antre di prioritas rendah di belakang puluhan chunk JS dan berkas font.
 * Terukur di produksi pada 2026-09-16: request hero baru dikirim 2436 ms setelah gambarnya
 * ditemukan parser, dan LCP-nya 17,3 detik.
 *
 * Regresi yang paling mungkin bukan seseorang mencabut atributnya dengan sengaja, tapi
 * menambah tema baru sambil menyalin `cover` lama yang menunjuk berkas asli, atau menulis
 * ulang Hero.vue tanpa membawa serta dua atribut yang tidak kelihatan pengaruhnya.
 */
test('only the hero image is on the landing critical path', async ({ page }) => {
  await page.goto('/')

  const hero = page.locator('img[data-hero-photo]')
  await expect(hero).toHaveAttribute('fetchpriority', 'high')
  await expect(hero).toHaveAttribute('src', '/images/hero-landing.webp')
  // Hero TIDAK boleh lazy: ia satu-satunya yang memang harus dimuat lebih dulu.
  await expect(hero).not.toHaveAttribute('loading', 'lazy')

  // Preload-nya harus menunjuk berkas yang sama persis; kalau meleset, ia justru menambah
  // satu unduhan yang tidak pernah terpakai.
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute('href', '/images/hero-landing.webp')

  const covers = page.getByRole('region', { name: 'Tema undangan' }).locator('img')
  await expect(covers).toHaveCount(templates.length)
  for (const cover of await covers.all()) {
    await expect(cover).toHaveAttribute('loading', 'lazy')
    // Varian kecil dari `pnpm images:optimize`, bukan berkas asli yang dipakai undangan demo.
    await expect(cover).toHaveAttribute('src', /^\/images\/card\//)
  }

  await expect(page.locator('img[data-cta-photo]')).toHaveAttribute('loading', 'lazy')
})

/** CTA utama pernah mati total karena `as="NuxtLink"` merender elemen `<nuxtlink>`. */
test('primary calls to action are real links', async ({ page }) => {
  await page.goto('/')
  expect(await page.locator('nuxtlink').count()).toBe(0)
  await expect(page.getByRole('link', { name: 'Mulai buat undangan' }).first()).toHaveAttribute('href', '/order')
  await page.getByRole('link', { name: 'Mulai buat undangan' }).first().click()
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)order/)
})

test('pricing shows every package with its catalog price', async ({ page }) => {
  await page.goto('/#harga')
  for (const pack of catalog.packages) {
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: pack.name, exact: true }) })
    await expect(card).toHaveCount(1)
    await expect(card).toContainText(formatRupiah(pack.price))
  }
})

test('invitation opens through the cover gate and keeps the theme palette', async ({ page }) => {
  await page.goto(`/i/demo?tema=${templates[0]!.id}`)
  const gate = page.getByRole('button', { name: 'Buka Undangan' })
  await expect(gate).toBeVisible()
  await gate.click()
  await expect(gate).toBeHidden()
  // Scroll must be released once the gate is gone.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden')
  await expect(page.getByRole('heading', { name: 'Akad & Resepsi' })).toBeVisible()
  await fitsViewport(page)
})

/*
 * Dipindai per tema. Sebelumnya hanya tema default yang diperiksa, dan itulah yang
 * menyembunyikan primary lumine yang kontrasnya hanya 3,6:1 selama berbulan-bulan.
 */
for (const template of templates) {
  test(`invitation accessibility after opening — ${template.id}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/i/demo?tema=${template.id}`)
    await bukaGerbang(page)
    const scan = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(scan.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) }))).toEqual([])
  })
}

/*
 * Aturan "tanpa JS halaman tetap terbaca penuh" belum pernah diuji langsung. Galeri adalah
 * tempat paling mudah melanggarnya, dan layout `rail` adalah satu-satunya yang bisa membuat
 * halaman ikut menggeser ke samping.
 *
 * Disapu per tema, bukan pada satu tema yang dipilih tangan. Versi lama menunjuk
 * `aruna-gonjong` justru karena galerinya `rail`; tema itu dipensiunkan di fase 48, dan tes
 * yang menyebut satu id akan diam-diam pindah menguji layout lain sambil komentarnya tetap
 * menyebut rail. Menyapu semuanya membuat layout mana pun yang ada selalu ikut teruji.
 */
test.describe('gallery stays visible and contained under reduced motion', () => {
  for (const template of templates) {
    test(template.id, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(`/i/demo?tema=${template.id}`)
      await bukaGerbang(page)
      const tile = page.locator('.iv-gallery img').first()
      await tile.scrollIntoViewIfNeeded()
      await expect(tile).toBeVisible()
      expect(await tile.evaluate(node => getComputedStyle(node).opacity)).toBe('1')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
  }
})

/*
 * Label MEMPELAI PRIA/WANITA sengaja tidak dirender lagi sejak batas rekening naik ke
 * delapan: pada delapan kartu label itu berubah jadi kebisingan, dan nama pemilik
 * rekening sudah ada di kartunya. Field `owner` tetap ada di dokumen.
 */
/*
 * Partitur scroll benar-benar terbaca, bukan sekadar terdeklarasi di tipe.
 *
 * Buktinya sengaja BUKAN `[data-iv-act]`: atribut itu dipasang tanpa syarat di template
 * (`Renderer.vue`), jadi tema tanpa partitur pun menstempelnya — diukur, bloom menstempel dua
 * belas. Yang hanya ada saat partitur terbaca adalah pita `.iv-segue`: `rendered` memberi
 * `segue: null` ke tiap section ketika `themeMotion()` undefined, jadi `<InvitationSegue>`
 * tidak pernah dirender. Menuntut keduanya sekaligus membuat tes ini gagal kalau partiturnya
 * diam-diam berhenti terbaca DAN kalau jalur lama diam-diam ikut merender pita.
 */
test('theme motion scores actually reach the page', async ({ page }) => {
  const berpartitur = []
  const tanpa = []
  for (const template of templates) {
    await page.goto(`/i/demo?tema=${template.id}`)
    await bukaGerbang(page)
    const pita = await page.locator('.iv-segue').count()
    expect(await page.locator('[data-iv-act]').count(), `${template.id} harus menstempel peran section`).toBeGreaterThan(0)
    ;(pita > 0 ? berpartitur : tanpa).push(template.id)
  }
  // Minimal satu tema membuktikan jalur partitur hidup; tanpa ini fase 50 bisa hijau
  // sementara `playScore` tidak pernah sekali pun dipanggil.
  expect(berpartitur.length, `tidak ada tema yang merender pita transisi (tanpa partitur: ${tanpa.join(', ')})`).toBeGreaterThan(0)
})

test('gift section shows every account with its bank and no owner label', async ({ page }) => {
  await page.goto('/i/demo')
  await bukaGerbang(page)
  const gift = page.locator('#iv-gift')
  await gift.scrollIntoViewIfNeeded()
  await expect(gift.getByText('8720 114 556', { exact: true })).toBeVisible()
  await expect(gift.getByText('1370 0099 8877', { exact: true })).toBeVisible()
  await expect(gift.getByRole('button', { name: 'Salin nomor rekening' })).toHaveCount(4)
  await expect(gift.getByText('Mempelai pria', { exact: true })).toHaveCount(0)
  await expect(gift.getByText('Mempelai wanita', { exact: true })).toHaveCount(0)
})

/*
 * Urutan section dulu dipaku di template renderer, jadi tombol naik/turun di editor tidak
 * berpengaruh sama sekali. Tes ini yang menjaga agar urutan dokumen benar-benar yang
 * dilihat tamu — bukan urutan tag di sebuah berkas.
 */
test('section order follows the document', async ({ page }) => {
  await page.goto('/i/demo')
  await bukaGerbang(page)
  // `[data-iv-section]`, bukan `[id^="iv-"]` polos: sejak tiap elemen klik di undangan
  // punya id berawalan sama (`iv-rsvp-yes`, `iv-gallery-tile-1`, …), pemilih lama ikut
  // menangkap kontrol dan bukan lagi daftar section. Yang dijaga tes ini tetap sama —
  // urutan bagian seperti yang dilihat tamu.
  const ids = await page.locator('[data-iv-section][id^="iv-"]').evaluateAll(nodes => nodes.map(node => node.id))
  expect(ids).toEqual([
    'iv-cover', 'iv-couple', 'iv-events', 'iv-countdown', 'iv-gallery', 'iv-story',
    'iv-rundown', 'iv-dresscode', 'iv-gift', 'iv-rsvp', 'iv-wishes', 'iv-closing',
  ])
})

/*
 * Ornamen dulu dirender pada 0,11–0,60px tinta efektif dan praktis tidak terlihat. Yang
 * dijaga di sini bukan selera, melainkan ukuran: sebuah keping ladang wajib punya massa
 * nyata di layar, dan tidak boleh ada yang kembali menyusut jadi hiasan 40px.
 */
test('ornament field renders real mass in every theme', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const template of templates) {
    await page.goto(`/i/demo?tema=${template.id}`)
    await bukaGerbang(page)
    const pieces = page.locator('#iv-couple .iv-field-piece')
    expect(await pieces.count()).toBeGreaterThanOrEqual(2)
    const width = await pieces.first().evaluate(node => node.getBoundingClientRect().width)
    expect(width).toBeGreaterThan(120)
  }
})

/** Dresscode: bundaran warna wajib membawa namanya tertulis, bukan warna saja. */
test('dresscode colours are named, not colour-only', async ({ page }) => {
  await page.goto('/i/demo')
  await bukaGerbang(page)
  const dresscode = page.locator('#iv-dresscode')
  await dresscode.scrollIntoViewIfNeeded()
  for (const name of ['Krem', 'Terakota', 'Sage']) {
    await expect(dresscode.getByText(name, { exact: true })).toBeVisible()
  }
})

/** Demo RSVP berjalan penuh tanpa menyimpan apa pun, dan mengatakannya. */
test('demo rsvp answers and flips to an attendance ticket', async ({ page }) => {
  await page.goto('/i/demo')
  await bukaGerbang(page)
  const rsvp = page.locator('#iv-rsvp')
  await rsvp.scrollIntoViewIfNeeded()
  await rsvp.getByRole('button', { name: /Hadir/ }).click()
  await expect(rsvp.getByRole('button', { name: 'Tambah jumlah kursi' })).toBeVisible()
  await rsvp.getByRole('button', { name: 'Kirim konfirmasi' }).click()
  await expect(rsvp.getByText('Kehadiran dikonfirmasi', { exact: true })).toBeVisible()
  await expect(rsvp.getByText('Ini pratinjau — jawaban tidak tersimpan.')).toBeVisible()
  await rsvp.getByRole('button', { name: 'Ubah jawaban' }).click()
  await expect(rsvp.getByRole('button', { name: /Berhalangan/ })).toBeVisible()
})

/** Dinding ucapan memberi contoh saat kosong, dan memaginasinya lima per halaman. */
test('wishes wall paginates five at a time', async ({ page }) => {
  await page.goto('/i/demo')
  await bukaGerbang(page)
  const wishes = page.locator('#iv-wishes')
  await wishes.scrollIntoViewIfNeeded()
  await expect(wishes.locator('.iv-wish')).toHaveCount(5)
  await expect(wishes.getByText('Halaman 1 dari 3')).toBeVisible()
  await wishes.getByRole('button', { name: 'Halaman ucapan berikutnya' }).click()
  await expect(wishes.getByText('Halaman 2 dari 3')).toBeVisible()
})

/** Galeri sorot memakai ScrollTrigger `pin`; tanpa JS ia wajib runtuh jadi tumpukan terbaca. */
test('spotlight gallery stays readable under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/i/demo?galeri=satu-per-satu')
  await bukaGerbang(page)
  const tile = page.locator('.iv-spotlight-tile img').first()
  await tile.scrollIntoViewIfNeeded()
  await expect(tile).toBeVisible()
  expect(await tile.evaluate(node => getComputedStyle(node).opacity)).toBe('1')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

/*
 * Case-study dasbor memakai tangkapan layar sungguhan dari `apps/web/public/dashboard/`.
 * Berkas itu dibuat `pnpm capture:dashboard` dan **tidak** dihasilkan saat build, jadi
 * tanpa penjaga ini bagian terpenting di landing bisa tayang sebagai lima kotak rusak
 * tanpa ada yang menyadarinya.
 */
test('dashboard case study shows every real screenshot', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#dashboard')
  const shots = page.locator('#dashboard .dash-shot img')
  await expect(shots).toHaveCount(5)
  for (let at = 0; at < 5; at += 1) {
    // Potretnya `loading="lazy"` — digulir dulu, baru ditanya apakah benar-benar termuat.
    await shots.nth(at).scrollIntoViewIfNeeded()
    await expect
      .poll(() => shots.nth(at).evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0), { timeout: 5000 })
      .toBe(true)
  }
  // Tanpa JS mockup tidak dipaku, jadi kelimanya wajib tetap terbaca berurutan.
  await expect(page.getByRole('heading', { name: 'Sunting sambil melihat hasilnya' })).toBeVisible()
})

test('sign-in offers Google with an accessible name', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/login')
  await expect(page.getByRole('link', { name: 'Lanjutkan dengan Google' })).toBeVisible()
  await page.goto('/register')
  await expect(page.getByRole('link', { name: 'Daftar dengan Google' })).toBeVisible()
  const scan = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(scan.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) }))).toEqual([])
})

test('reduced motion keeps content and demo usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: HEADLINE })).toBeVisible()
  await page.getByLabel('Tulis nama tamu (opsional)', { exact: true }).fill('Anne-Marie & Budi')
  await page.getByRole('button', { name: 'Buka demo', exact: true }).click()
  await expect(page.getByText('Kepada Yth. Anne-Marie & Budi', { exact: true })).toBeVisible()
})

/*
 * Fase 69: tombol "Buat tema versi Anda sendiri" di koleksi tema membawa ke /order langsung di
 * langkah Tema dengan add-on Desain tercentang — bukan ke awal wizard.
 */
test('tombol tema sendiri membuka /order di langkah Tema dengan add-on Desain', async ({ page }) => {
  await page.goto('/')
  const tombol = page.locator('#landing-themes-custom')
  await tombol.scrollIntoViewIfNeeded()
  await expect(tombol).toHaveAttribute('href', '/order?langkah=tema&addon=design')
  await tombol.click()
  // Login tetap wajib sebelum /order; yang dijaga di sini: query-nya selamat sampai `?next=`.
  await expect(page).toHaveURL(/langkah=tema/)
})
