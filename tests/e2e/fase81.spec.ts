import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

/*
 * Fase 81 — kanvas bebas, pratinjau perangkat yang bisa direview, gerak masuk yang terlihat, dan
 * semua ornamen bisa dipegang tanpa kecuali.
 *
 * Semua tes di sini membaca PANGGUNG editor, dan semuanya `@desktop`: kanvas bebas butuh tetikus
 * (di pointer kasar ketukan hanya memilih), dan pratinjau Tablet/Desktop yang diukur adalah
 * pratinjau di layar kerja 1440. Tiap tes yang menulis dokumen QA mengembalikannya sendiri.
 */

const fixturePath = '.data/qa-account.json'
const account = existsSync(fixturePath)
  ? JSON.parse(readFileSync(fixturePath, 'utf8')) as { email: string; password: string; invitationId: string }
  : null

async function hydrated(page: Page) {
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__))
}

async function bukaEditor(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account!.email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(account!.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  // Preferensi editor tersimpan dari tes sebelumnya (Fokus, zoom, perangkat) tidak boleh ikut.
  await page.evaluate(() => { localStorage.removeItem('aruna:editor:prefs'); localStorage.removeItem('aruna:dashboard:prefs') })
  await page.goto(`/dashboard/${account!.invitationId}/editor`)
  await hydrated(page)
  await page.waitForLoadState('networkidle')
}

/** Skala pratinjau yang sungguh berlaku: lebar kotak di layar ÷ lebar render. */
const skalaPratinjau = (page: Page) => page.evaluate(() => {
  const layar = document.querySelector<HTMLElement>('[data-preview-stage]')!
  return layar.getBoundingClientRect().width / layar.offsetWidth
})

async function pilihBagian(page: Page, id: string) {
  const baris = page.locator(`#editor-section-${id}`)
  await baris.scrollIntoViewIfNeeded()
  await baris.click()
  // Pendaratan gulir panggung punya ekor koreksi sampai 2,4 s (fase 80).
  await page.waitForTimeout(1200)
}

/** Pusat keping di layar, sesudah panggung berhenti bergulir. */
async function pusat(page: Page, kunci: string, bagian: string) {
  const kotak = await page.locator(`[data-iv-el="${kunci}"][data-iv-bagian="${bagian}"]`).first().boundingBox()
  expect(kotak, `${kunci} tidak terlihat`).not.toBeNull()
  return { x: kotak!.x + kotak!.width / 2, y: kotak!.y + kotak!.height / 2, w: kotak!.width, h: kotak!.height }
}

const gayaKeping = (page: Page, kunci: string, bagian: string) => page.evaluate(([k, b]) => {
  const el = document.querySelector<HTMLElement>(`[data-iv-el="${k}"][data-iv-bagian="${b}"]`)!
  return { translate: el.style.translate, scale: el.style.scale, rotate: el.style.rotate, zIndex: el.style.zIndex, glyph: el.dataset.ivGlyph ?? null }
}, [kunci, bagian] as const)

test.describe('fase 81 · panggung editor', () => {
  test.beforeEach(({ page: _page }) => {
    test.skip(!account, 'Jalankan `pnpm test:integration` dulu untuk membuat akun QA terisolasi.')
  })

  test('@desktop tablet dan desktop tidak lagi kartu pos; ZOOM dan Fokus mengubah skala', async ({ page }) => {
    test.slow()
    await bukaEditor(page)

    /*
     * Sebelum fase 81 bingkai mengukur pembungkus `w-fit`-nya sendiri, jadi sesudah Ponsel skala
     * tersangkut: Tablet 0,43 dan Desktop 0,26 di jendela yang sama, dan ZOOM tidak mengubah apa pun.
     */
    await page.locator('#editor-preview-ponsel').click()
    await page.locator('#editor-preview-tablet').click()
    await expect.poll(() => skalaPratinjau(page)).toBeGreaterThan(0.58)
    await page.locator('#editor-preview-laptop').click()
    await expect.poll(() => skalaPratinjau(page)).toBeGreaterThan(0.35)
    const pas = await skalaPratinjau(page)

    // Bingkai tablet/desktop mengisi tinggi panggung, bukan kotak 205px di tengah ruang kosong.
    const tinggi = await page.locator('[data-preview-stage]').evaluate(el => el.getBoundingClientRect().height)
    expect(tinggi).toBeGreaterThan(500)

    await page.locator('#editor-zoom-in').click()
    await expect.poll(() => skalaPratinjau(page)).toBeGreaterThan(pas * 1.05)
    await page.locator('#editor-zoom-reset').click()
    await page.locator('#editor-zoom-out').click()
    await expect.poll(() => skalaPratinjau(page)).toBeLessThan(pas * 0.95)
    await page.locator('#editor-zoom-reset').click()

    await page.locator('#editor-preview-fokus').click()
    await expect.poll(() => skalaPratinjau(page), { timeout: 5000 }).toBeGreaterThan(0.85)
    await page.locator('#editor-preview-fokus').click()
    await expect.poll(() => skalaPratinjau(page), { timeout: 5000 }).toBeLessThan(0.5)
    await page.locator('#editor-preview-ponsel').click()
  })

  test('@desktop mengganti Gerak masuk langsung memutar bagian itu — Siluet di tema bawaan, tanpa foto', async ({ page }) => {
    test.slow()
    await bukaEditor(page)
    await pilihBagian(page, 'event')
    await page.locator('#editor-inspector-bagian').click()

    const pilih = page.locator('#editor-motion-event')
    const semula = await pilih.inputValue()
    /*
     * Direkam di halaman, satu `evaluate`: timeline dibangun sekali saat mount sampai fase 80,
     * jadi mengganti pilihan tidak memutar apa pun — dan tema Bloom tidak pernah memanggil
     * `silhouette()` sama sekali. Yang dicari: judul bagian ini MULAI gelap tanpa warna, lalu
     * kembali normal, tanpa panggungnya digulir.
     */
    const jejak = await page.evaluate(async () => {
      const select = document.querySelector<HTMLSelectElement>('#editor-motion-event')!
      select.value = 'silhouette'
      select.dispatchEvent(new Event('change', { bubbles: true }))
      const judul = () => document.querySelector<HTMLElement>('#iv-event [data-iv-lead]')!
      const sampel: string[] = []
      const t0 = performance.now()
      while (performance.now() - t0 < 3500) {
        sampel.push(getComputedStyle(judul()).filter)
        await new Promise(r => setTimeout(r, 40))
      }
      return sampel
    })
    expect(jejak.some(f => f.includes('grayscale(1)')), 'siluet tidak pernah menggelapkan judul').toBe(true)
    expect(jejak.at(-1), 'judul tidak kembali normal').toBe('none')

    // ▶ di sebelah select memutarnya lagi tanpa mengganti apa pun.
    const lagi = await page.evaluate(async () => {
      document.querySelector<HTMLButtonElement>('[id="editor-motion-putar-event"]')!.click()
      const judul = () => document.querySelector<HTMLElement>('#iv-event [data-iv-lead]')!
      const t0 = performance.now()
      while (performance.now() - t0 < 1500) {
        if (getComputedStyle(judul()).filter.includes('grayscale(1)')) return true
        await new Promise(r => setTimeout(r, 30))
      }
      return false
    })
    expect(lagi, '▶ tidak memutar ulang').toBe(true)

    await pilih.selectOption(semula)
  })

  test('@desktop semua keping bisa ditunjuk di panggung, tanpa kecuali', async ({ page }) => {
    test.slow()
    await bukaEditor(page)
    /*
     * Diukur dengan `elementFromPoint`, bukan dengan membaca atribut: fase 76–80 menjaga
     * `data-iv-slot` di markup, dan justru karena itu lima pembawa sudut, segel, flap, kantong,
     * dan kelopak RSVP lolos — atributnya ada, kliknya tidak pernah sampai.
     */
    const hasil = await page.evaluate(async () => {
      const layar = document.querySelector<HTMLElement>('[data-preview-stage]')!
      const bingkai = layar.getBoundingClientRect()
      const diperiksa = new Set<string>()
      const gagal = new Set<string>()
      for (let y = 0; y <= layar.scrollHeight; y += Math.round(layar.clientHeight * 0.6)) {
        layar.scrollTop = y
        await new Promise(r => setTimeout(r, 120))
        for (const el of layar.querySelectorAll<HTMLElement>('[data-iv-el]')) {
          if (el.closest('[data-gate-card]')) continue
          const r = el.getBoundingClientRect()
          if (!r.width || !r.height || r.top < bingkai.top + 4 || r.bottom > bingkai.bottom - 4) continue
          const nama = `${el.dataset.ivBagian}/${el.dataset.ivEl}`
          const titik = [[0.5, 0.5], [0.3, 0.3], [0.7, 0.7], [0.3, 0.7], [0.7, 0.3]]
          const kena = titik.some(([fx, fy]) => {
            const hit = document.elementFromPoint(r.left + r.width * fx!, r.top + r.height * fy!)
            return hit === el || el.contains(hit)
          })
          diperiksa.add(nama)
          if (kena) gagal.delete(nama)
          else if (!diperiksa.has(`${nama}#ok`)) gagal.add(nama)
          if (kena) diperiksa.add(`${nama}#ok`)
        }
      }
      return { diperiksa: [...diperiksa].filter(n => !n.endsWith('#ok')).length, gagal: [...gagal] }
    })
    expect(hasil.gagal).toEqual([])
    expect(hasil.diperiksa).toBeGreaterThan(30)
  })

  test('@desktop segel dipilih di panggung; callout berikon yang membuka amplop', async ({ page }) => {
    await bukaEditor(page)
    const segel = await pusat(page, 'o:seal:segel', 'opening-envelope')
    await page.mouse.click(segel.x, segel.y)
    await expect(page.locator('#elemen-judul')).toHaveText('Segel')
    await expect(page.locator('[data-kanvas-pilih]')).toBeVisible()
    await page.waitForTimeout(600)
    await expect(page.locator('.iv-gate[data-gate-opened]')).toHaveCount(0)

    await expect(page.locator('[data-gate-callout] svg')).toBeVisible()
    // Callout berdenyut tanpa henti (`iv-gate-pulse`), jadi ia tidak pernah "stabil" bagi Playwright.
    await expect(page.locator('[data-gate-callout]')).toBeEnabled()
    await page.locator('[data-gate-callout]').click({ force: true })
    await expect(page.locator('.iv-gate[data-gate-opened]')).toHaveCount(1)
  })

  test('@desktop seret sudut Hero: satu langkah undo, tersimpan, dan kembali lewat "Kembalikan"', async ({ page }) => {
    test.slow()
    await bukaEditor(page)
    await pilihBagian(page, 'hero')
    const awal = await pusat(page, 'o:corner:tl', 'hero')

    await page.mouse.move(awal.x, awal.y)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(awal.x + i * 8, awal.y + i * 5)
    await page.mouse.up()

    const sesudah = await pusat(page, 'o:corner:tl', 'hero')
    expect(Math.abs(sesudah.x - awal.x - 48)).toBeLessThan(2)
    expect(Math.abs(sesudah.y - awal.y - 30)).toBeLessThan(2)
    await expect(page.locator('#elemen-x')).not.toHaveValue('0')

    // Satu seretan = satu langkah undo.
    await page.locator('#editor-undo').click()
    expect((await gayaKeping(page, 'o:corner:tl', 'hero')).translate).toBe('')
    await page.locator('#editor-redo').click()
    const digeser = (await gayaKeping(page, 'o:corner:tl', 'hero')).translate
    expect(digeser).toMatch(/cqw/)

    await page.locator('#editor-save').click()
    await expect(page.locator('#editor-save')).toBeDisabled()
    await page.reload()
    await hydrated(page)
    await pilihBagian(page, 'hero')
    expect((await gayaKeping(page, 'o:corner:tl', 'hero')).translate).toBe(digeser)

    // Rapikan dokumen QA.
    const lagi = await pusat(page, 'o:corner:tl', 'hero')
    await page.mouse.click(lagi.x, lagi.y)
    await page.locator('#elemen-kembalikan').click()
    expect((await gayaKeping(page, 'o:corner:tl', 'hero')).translate).toBe('')
    await page.locator('#editor-save').click()
    await expect(page.locator('#editor-save')).toBeDisabled()
  })

  test('@desktop Shift mengunci rasio; kunci menahan seret di panggung, form tetap bisa', async ({ page }) => {
    test.slow()
    await bukaEditor(page)
    await pilihBagian(page, 'hero')
    const sudut = await pusat(page, 'o:corner:tl', 'hero')
    await page.mouse.click(sudut.x, sudut.y)

    const pegangan = await page.locator('[data-pegangan="se"]').boundingBox()
    await page.keyboard.down('Shift')
    await page.mouse.move(pegangan!.x + 5, pegangan!.y + 5)
    await page.mouse.down()
    for (let i = 1; i <= 5; i++) await page.mouse.move(pegangan!.x + 5 + i * 10, pegangan!.y + 5 + i * 2)
    await page.mouse.up()
    await page.keyboard.up('Shift')
    const besar = await pusat(page, 'o:corner:tl', 'hero')
    expect(Math.abs(besar.w / besar.h - sudut.w / sudut.h)).toBeLessThan(0.01)
    expect(besar.w).toBeGreaterThan(sudut.w * 1.5)

    // Kunci: seretan berikutnya tidak memindahkan apa pun, dan pesannya menunjuk ke form.
    await page.locator('#elemen-kunci').click()
    await expect(page.locator('.kanvas-gembok')).toBeVisible()
    const terkunci = await gayaKeping(page, 'o:corner:tl', 'hero')
    await page.mouse.move(besar.x, besar.y)
    await page.mouse.down()
    for (let i = 1; i <= 5; i++) await page.mouse.move(besar.x + i * 10, besar.y)
    await page.mouse.up()
    expect(await gayaKeping(page, 'o:corner:tl', 'hero')).toEqual(terkunci)
    await expect(page.getByRole('status').filter({ hasText: 'Sunting lewat form' })).toBeVisible()

    // Form tetap menyunting keping yang terkunci.
    await page.locator('#elemen-putar').fill('30')
    await page.locator('#elemen-putar').press('Enter')
    await expect.poll(async () => (await gayaKeping(page, 'o:corner:tl', 'hero')).rotate).toBe('30deg')

    // Rapikan: batalkan semua langkah sesi ini.
    while (await page.locator('#editor-undo').isEnabled()) await page.locator('#editor-undo').click()
  })

  test('@desktop klik dua kali teks menyuntingnya di tempat', async ({ page }) => {
    await bukaEditor(page)
    await pilihBagian(page, 'hero')
    const judul = page.locator('[data-iv-el="t:title"][data-iv-bagian="hero"]')
    const semula = await judul.textContent()
    await judul.dblclick()
    await expect(judul).toHaveAttribute('contenteditable', /plaintext-only|true/)
    await page.keyboard.type('Nama Di Kanvas')
    await page.keyboard.press('Enter')
    await expect(judul).toHaveText('Nama Di Kanvas')
    await expect(judul).not.toHaveAttribute('contenteditable', /.+/)
    await expect(page.locator('#elemen-teks')).toHaveValue('Nama Di Kanvas')
    await page.locator('#editor-undo').click()
    await expect(judul).toHaveText(semula ?? '')
  })

  test('@desktop klik kanan: menu kanvas, dan bawa ke depan menulis z-index', async ({ page }) => {
    await bukaEditor(page)
    await pilihBagian(page, 'hero')
    const simbol = await pusat(page, 'o:symbol:atas', 'hero')
    await page.mouse.click(simbol.x, simbol.y, { button: 'right' })
    const menu = page.locator('[data-kanvas-menu]')
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('Kunci posisi')
    await page.locator('#kanvas-menu-depan').click()
    await expect.poll(async () => Number((await gayaKeping(page, 'o:symbol:atas', 'hero')).zIndex)).toBeGreaterThan(0)
    await page.locator('#editor-undo').click()
  })

  test('@desktop ganti sudut di satu tempat saja, lengkap dengan arahnya', async ({ page }) => {
    test.slow()
    await bukaEditor(page)
    await pilihBagian(page, 'hero')
    const kananBawah = (await gayaKeping(page, 'o:corner:br', 'hero')).glyph
    const sudut = await pusat(page, 'o:corner:tl', 'hero')
    await page.mouse.dblclick(sudut.x, sudut.y)
    await expect(page.getByRole('dialog')).toContainText('Hanya mengganti keping di tempat ini')

    const ubin = page.locator('#studio-grid [role="radio"][aria-checked="false"]').nth(3)
    await ubin.click()
    await page.locator('#studio-arah-kanan-atas').click()
    await page.locator('#studio-selesai').click()

    const kiriAtas = await gayaKeping(page, 'o:corner:tl', 'hero')
    expect(kiriAtas.rotate).toBe('90deg')
    expect((await gayaKeping(page, 'o:corner:br', 'hero')).glyph).toBe(kananBawah)
    expect(kiriAtas.glyph).not.toBe(kananBawah)
    while (await page.locator('#editor-undo').isEnabled()) await page.locator('#editor-undo').click()
  })

  test('@desktop tambah ornamen: muncul di bagian, bisa digeser, dan terbawa ke pratinjau tamu', async ({ page }) => {
    test.slow()
    await bukaEditor(page)
    await pilihBagian(page, 'quote')
    const tambahan = page.locator('[data-iv-el^="a:"][data-iv-bagian="quote"]')
    const sebelum = await tambahan.evaluateAll(els => els.map(el => el.getAttribute('data-iv-el')))
    await page.locator('#editor-inspector-elemen').click()
    await page.locator('#elemen-tambah').click()
    await expect(page.getByRole('dialog')).toContainText('Tambah ornamen')
    await page.locator('#studio-kategori-corner').click()
    await page.locator('#studio-grid [role="radio"]').first().click()
    await page.locator('#studio-selesai').click()

    await expect(tambahan).toHaveCount(sebelum.length + 1)
    await expect(page.locator('#elemen-judul')).toHaveText('Ornamen tambahan')
    const kunci = (await tambahan.evaluateAll(els => els.map(el => el.getAttribute('data-iv-el')))).find(k => !sebelum.includes(k))!
    const awal = await pusat(page, kunci, 'quote')
    // ⌘ ditahan: yang diukur geseran bebas, bukan smart guide (itu diuji tersendiri di bawah).
    await page.keyboard.down('Meta')
    await page.mouse.move(awal.x, awal.y)
    await page.mouse.down()
    for (let i = 1; i <= 4; i++) await page.mouse.move(awal.x - i * 10, awal.y)
    await page.mouse.up()
    await page.keyboard.up('Meta')
    const sesudah = await pusat(page, kunci, 'quote')
    expect(Math.abs(sesudah.x - (awal.x - 40))).toBeLessThan(2)

    await page.locator('#editor-save').click()
    await expect(page.locator('#editor-save')).toBeDisabled()
    await page.goto(`/dashboard/${account!.invitationId}/preview`)
    await hydrated(page)
    await expect(page.locator(`[data-iv-el="${kunci}"]`)).toHaveCount(1)

    // Rapikan: hapus SEMUA tambahan di bagian ini (termasuk sisa run yang gagal) lalu simpan.
    await page.goto(`/dashboard/${account!.invitationId}/editor`)
    await hydrated(page)
    await pilihBagian(page, 'quote')
    while (await tambahan.count()) {
      const titik = await pusat(page, (await tambahan.first().getAttribute('data-iv-el'))!, 'quote')
      await page.mouse.click(titik.x, titik.y)
      await page.keyboard.press('Delete')
      await page.waitForTimeout(150)
    }
    await page.locator('#editor-save').click()
    await expect(page.locator('#editor-save')).toBeDisabled()
  })

  test('@desktop Shift mengunci seret ke satu sumbu, seperti Figma', async ({ page }) => {
    await bukaEditor(page)
    await pilihBagian(page, 'hero')
    const awal = await pusat(page, 'o:corner:tl', 'hero')
    await page.keyboard.down('Shift')
    await page.mouse.move(awal.x, awal.y)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(awal.x + i * 10, awal.y + i * 1.5)
    await page.mouse.up()
    await page.keyboard.up('Shift')
    const sesudah = await pusat(page, 'o:corner:tl', 'hero')
    expect(Math.abs(sesudah.y - awal.y), 'Shift tidak mengunci sumbu tegak').toBeLessThan(0.6)
    expect(sesudah.x - awal.x).toBeGreaterThan(50)
    await page.locator('#editor-undo').click()
  })

  test('@desktop smart guide menempelkan tepi ke objek sekitar; ⌘ mematikannya', async ({ page }) => {
    await bukaEditor(page)
    await pilihBagian(page, 'hero')
    const tepiKiri = (kunci: string) => page.locator(`[data-iv-el="${kunci}"][data-iv-bagian="hero"]`).first().evaluate(el => el.getBoundingClientRect().left)

    const seretKe = async (kunci: string, selisih: number, tanpaTempel: boolean) => {
      const awal = await pusat(page, kunci, 'hero')
      const target = await tepiKiri('o:monogram:utama')
      const dx = target - (await tepiKiri(kunci)) + selisih
      if (tanpaTempel) await page.keyboard.down('Meta')
      await page.mouse.move(awal.x, awal.y)
      await page.mouse.down()
      for (let i = 1; i <= 8; i++) await page.mouse.move(awal.x + (dx * i) / 8, awal.y + (60 * i) / 8)
      const panduan = await page.locator('.kanvas-panduan').count()
      await page.mouse.up()
      if (tanpaTempel) await page.keyboard.up('Meta')
      return { panduan, selisihAkhir: (await tepiKiri(kunci)) - target }
    }

    const tempel = await seretKe('o:corner:tl', 2, false)
    expect(Math.abs(tempel.selisihAkhir), 'tepi kiri tidak menempel ke tepi kiri monogram').toBeLessThan(0.6)
    expect(tempel.panduan).toBeGreaterThan(0)
    await page.locator('#editor-undo').click()

    const bebas = await seretKe('o:corner:tl', 2, true)
    expect(Math.abs(bebas.selisihAkhir - 2), '⌘ tidak mematikan tempel').toBeLessThan(0.6)
    expect(bebas.panduan).toBe(0)
    await page.locator('#editor-undo').click()
  })

  test('@desktop fase 82: tepi yang ditarik saat mengubah ukuran menempel; ⌘ mematikannya', async ({ page }) => {
    await bukaEditor(page)
    await pilihBagian(page, 'hero')
    const tepi = (kunci: string) => page.locator(`[data-iv-el="${kunci}"][data-iv-bagian="hero"]`).first().evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { kiri: r.left, kanan: r.right }
    })

    const tarikKe = async (selisih: number, tanpaTempel: boolean) => {
      const sudut = await pusat(page, 'o:corner:tl', 'hero')
      await page.mouse.click(sudut.x, sudut.y)
      const pegangan = (await page.locator('[data-pegangan="e"]').boundingBox())!
      const target = (await tepi('o:monogram:utama')).kiri
      const awalKiri = (await tepi('o:corner:tl')).kiri
      const dx = target - (await tepi('o:corner:tl')).kanan + selisih
      const x0 = pegangan.x + pegangan.width / 2
      const y0 = pegangan.y + pegangan.height / 2
      if (tanpaTempel) await page.keyboard.down('Meta')
      await page.mouse.move(x0, y0)
      await page.mouse.down()
      for (let i = 1; i <= 8; i++) await page.mouse.move(x0 + (dx * i) / 8, y0)
      const panduan = await page.locator('.kanvas-panduan').count()
      await page.mouse.up()
      if (tanpaTempel) await page.keyboard.up('Meta')
      const akhir = await tepi('o:corner:tl')
      return { panduan, selisihAkhir: akhir.kanan - target, geserKiri: akhir.kiri - awalKiri }
    }

    const tempel = await tarikKe(2, false)
    expect(Math.abs(tempel.selisihAkhir), 'tepi kanan tidak menempel ke tepi kiri monogram').toBeLessThan(0.6)
    expect(Math.abs(tempel.geserKiri), 'tepi seberang ikut bergeser').toBeLessThan(0.6)
    expect(tempel.panduan).toBeGreaterThan(0)
    await page.locator('#editor-undo').click()

    const bebas = await tarikKe(2, true)
    expect(Math.abs(bebas.selisihAkhir - 2), '⌘ tidak mematikan tempel').toBeLessThan(0.6)
    expect(bebas.panduan).toBe(0)
    await page.locator('#editor-undo').click()
  })

  test('@desktop fase 82: pratinjau Lapisan menghadap seperti di kanvas (Simbol · bawah terbalik)', async ({ page }) => {
    await bukaEditor(page)
    await pilihBagian(page, 'hero')
    await page.locator('#editor-inspector-elemen').click()
    const baris = page.locator('button', { hasText: 'Simbol · bawah' }).first()
    await expect(baris).toBeVisible()
    const arah = await baris.locator('[data-lapis-pratinjau] > *').first().evaluate(el => getComputedStyle(el).transform)
    expect(arah).toMatch(/^matrix\(-1, 0, 0, -1, 0, 0\)$/)
  })

  test('@desktop daftar Lapisan bergambar: tiap ornamen punya pratinjau kecil', async ({ page }) => {
    await bukaEditor(page)
    await pilihBagian(page, 'hero')
    await page.locator('#editor-inspector-elemen').click()
    const baris = page.locator('[data-lapis-pratinjau]')
    await expect.poll(() => baris.count()).toBeGreaterThan(5)
    const tanpaGambar = await baris.evaluateAll(els => els
      .filter(el => el.closest('button')?.textContent?.match(/^(Sudut|Simbol|Monogram|Ladang|Bingkai)/))
      .filter(el => !el.querySelector('svg, img')).length)
    expect(tanpaGambar).toBe(0)
  })
})
