#!/usr/bin/env node
/**
 * Verifikasi demo pack Ronce Melati di browser sungguhan.
 *
 * Yang diperiksa, dan kenapa masing-masing:
 *   - 360/768/1440: overflow horizontal, semua SVG terpasang, tanpa galat konsol, tanpa
 *     id DOM ganda (59 penyisipan SVG membuat ini bukan formalitas).
 *   - axe wcag2a/wcag2aa/wcag21aa. Dijalankan dengan `reducedMotion: 'reduce'` —
 *     tanpa itu elemen yang masih di-tween GSAP terbaca axe sebagai gagal kontras.
 *   - reduced motion: tombol jeda mengumumkan dirinya nonaktif, teks tetap utuh.
 *   - tanpa JavaScript: halaman tetap lengkap dan terbaca.
 *   - jeda offscreen: tween ambient berhenti ketika adegannya tidak terlihat.
 *
 * Butuh server statis yang sudah jalan:
 *   python3 -m http.server 4179 --bind 127.0.0.1 --directory docs/features/ornament-builder
 *   rtk proxy node docs/features/ornament-builder/originals/melati/verify.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', '..', 'verification')
const URL = process.env.DEMO_URL || 'http://127.0.0.1:4179/originals/melati/demo/index.html'

mkdirSync(OUT, { recursive: true })

const results = []
const browser = await chromium.launch()

async function probe(page) {
  return page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id)
    const svgs = [...document.querySelectorAll('.orn svg')]
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      svgCount: svgs.length,
      /** Sebuah SVG yang tidak pernah punya tinggi adalah SVG yang tidak terlihat. */
      collapsedSvgs: svgs.filter((s) => s.getBoundingClientRect().height < 2).length,
      duplicateIds: ids.length - new Set(ids).size,
      headingVisible: getComputedStyle(document.querySelector('h1')).opacity === '1',
      toggleLabel: document.querySelector('#motion-toggle')?.textContent?.trim() ?? null,
      toggleHidden: document.querySelector('#motion-toggle')?.hidden ?? null,
    }
  })
}

for (const width of [360, 768, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  results.push({
    width,
    ...(await probe(page)),
    axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    errors,
  })
  await page.screenshot({ path: join(OUT, `melati-${width}.png`), fullPage: width !== 1440 })
  await context.close()
}

// Reduced motion: tombolnya harus mengumumkan dirinya, bukan diam-diam tidak melakukan apa-apa.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('#motion-toggle')?.disabled === true)
  results.push({ mode: 'reduced-motion', ...(await probe(page)) })
  await page.screenshot({ path: join(OUT, 'melati-reduced-motion.png') })
  await context.close()
}

// Tanpa JavaScript.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  // Diperiksa lewat locator, bukan `page.evaluate`: Playwright menjalankan `evaluate` di
  // dunia terisolasi yang tetap hidup meski skrip halaman dimatikan, jadi hasilnya tidak
  // membuktikan apa pun tentang halaman tanpa JS.
  const heading = await page.locator('h1').innerText()
  const svgCount = await page.locator('.orn svg').count()
  const toggleHidden = await page.locator('#motion-toggle').isHidden()
  const bodyText = await page.locator('main').innerText()
  results.push({
    mode: 'no-javascript',
    headingText: heading.replace(/\s+/g, ' ').trim(),
    svgCount,
    toggleHidden,
    mainTextLength: bodyText.trim().length,
  })
  await page.screenshot({ path: join(OUT, 'melati-no-javascript.png') })
  await context.close()
}

// Jeda offscreen: tween ambient tidak boleh terus berjalan di adegan yang tidak terlihat.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  /**
   * Syaratnya harus menyebut **tween berulang yang tidak terjeda**, bukan sekadar "ada anak
   * di globalTimeline". Versi pertama memakai syarat longgar itu dan lolos hanya karena
   * kebetulan: begitu halaman jadi lebih berat, ia resolve pada tween reveal yang dibuat
   * lebih dulu, diukur sebelum IntersectionObserver sempat melepas jeda sway, lalu melaporkan
   * "0 berjalan" untuk halaman yang sebenarnya baik-baik saja.
   */
  await page.waitForFunction(
    () => window.gsap && gsap.globalTimeline.getChildren(true, true, true)
      .some((t) => t.repeat && t.repeat() === -1 && !t.paused()),
    null,
    { timeout: 10_000 },
  )
  const running = () => page.evaluate(() =>
    gsap.globalTimeline.getChildren(true, true, true).filter((t) => t.repeat && t.repeat() === -1 && !t.paused()).length)
  const atTop = await running()
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(400)
  const atBottom = await running()
  results.push({ mode: 'offscreen-pause', ambientRunningAtTop: atTop, ambientRunningAtBottom: atBottom })
  await context.close()
}

await browser.close()

const payload = { verifiedAt: new Date().toISOString(), url: URL, results }
writeFileSync(join(OUT, 'melati-browser.json'), `${JSON.stringify(payload, null, 2)}\n`)
console.log(JSON.stringify(payload, null, 2))
