#!/usr/bin/env node
/**
 * Verifikasi demo pack Kayon di browser sungguhan.
 *
 * Yang diperiksa, dan kenapa masing-masing:
 *   - 360/768/1440: overflow horizontal, semua SVG terpasang, tanpa galat konsol, tanpa id
 *     DOM ganda (73 penyisipan SVG membuat ini bukan formalitas).
 *   - axe wcag2a/wcag2aa/wcag21aa, dijalankan dengan `reducedMotion: 'reduce'` — tanpa itu
 *     elemen yang masih di-tween GSAP terbaca axe sebagai gagal kontras.
 *   - reduced motion: tidak ada tween sama sekali, tombol jeda mengumumkan dirinya nonaktif.
 *   - tanpa JavaScript: halaman tetap lengkap dan terbaca dalam keadaan akhir.
 *   - jeda offscreen: tween ambient berhenti ketika adegannya tidak terlihat.
 *
 * Butuh server statis yang sudah jalan:
 *   python3 -m http.server 4179 --bind 127.0.0.1 --directory docs/features/ornament-builder
 *   node docs/features/ornament-builder/originals/kayon/verify.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const HERE = dirname(fileURLToPath(import.meta.url))
const URL = process.env.KAYON_URL ?? 'http://127.0.0.1:4179/originals/kayon/demo/index.html'
const catalog = JSON.parse(readFileSync(join(HERE, 'catalog.json'), 'utf8'))
/**
 * Galeri memasang tiap aset sekali. Bungkus menambah delapan keping ber-class .glyph:
 * bidang + bingkai kartu nama, dua sudut bunga, dan dua pasang bidang+rumpun di kaki.
 */
const BUNGKUS_GLYPH = 8
const GLYPH_DIHARAP = catalog.assets.length + BUNGKUS_GLYPH
/** Ditambah tiga ubin di galeri tekstur dan 28 ubin pita (14 di kepala, 14 di kaki). */
const PITA_UBIN = 28
const hasil = { url: URL, checkedAt: new Date().toISOString(), lolos: [], gagal: [] }
const catat = (ok, nama, detail) =>
  (ok ? hasil.lolos : hasil.gagal).push(detail === undefined ? nama : { nama, detail })

async function ukur(page) {
  return page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    svg: document.querySelectorAll('svg').length,
    idGanda: (() => {
      const lihat = new Set(); const ganda = []
      document.querySelectorAll('[id]').forEach((e) => {
        if (lihat.has(e.id)) ganda.push(e.id); lihat.add(e.id)
      })
      return ganda
    })(),
    teksNama: [...document.querySelectorAll('.nm')].map((n) => n.textContent.trim()),
    glyphTakTerlihat: [...document.querySelectorAll('.glyph')]
      .filter((n) => n.getBoundingClientRect().width < 4).length,
  }))
}

const browser = await chromium.launch()

for (const lebar of [360, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: lebar, height: 900 } })
  const page = await ctx.newPage()
  const galat = []
  page.on('console', (m) => m.type() === 'error' && galat.push(m.text()))
  page.on('pageerror', (e) => galat.push(String(e)))
  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  const m = await ukur(page)
  catat(m.scrollW <= m.clientW, `${lebar}: tanpa overflow horizontal`, { scrollW: m.scrollW, clientW: m.clientW })
  catat(m.idGanda.length === 0, `${lebar}: id DOM unik`, m.idGanda.slice(0, 5))
  catat(galat.length === 0, `${lebar}: tanpa galat konsol`, galat.slice(0, 3))
  const svgDiharap = GLYPH_DIHARAP + catalog.tekstur.length + PITA_UBIN
  catat(m.svg === svgDiharap, `${lebar}: semua SVG terpasang`, { svg: m.svg, diharap: svgDiharap })
  catat(m.glyphTakTerlihat === 0, `${lebar}: tidak ada glyph berlebar nol`, { jumlah: m.glyphTakTerlihat })
  await ctx.close()
}

// axe
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  catat(r.violations.length === 0, 'axe wcag2a/2aa/21aa',
    r.violations.map((v) => ({ id: v.id, dampak: v.impact, jumlah: v.nodes.length })))
  await ctx.close()
}

// reduced motion
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForTimeout(900)
  const s = await page.evaluate(() => ({
    tweenAktif: window.gsap ? window.gsap.globalTimeline.getChildren(true, true, true).length : -1,
    tombolMati: document.getElementById('jeda')?.disabled === true,
    status: document.getElementById('status-motion')?.textContent ?? '',
    glyphTransparan: [...document.querySelectorAll('.glyph')]
      .filter((n) => Number(getComputedStyle(n).opacity) < 0.9).length,
  }))
  catat(s.tweenAktif === 0, 'reduced motion: tidak ada tween berjalan', s)
  catat(s.tombolMati, 'reduced motion: tombol jeda nonaktif', s)
  catat(s.glyphTransparan === 0, 'reduced motion: semua glyph terbaca penuh', s)
  await ctx.close()
}

// tanpa JavaScript
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  const s = await page.locator('.glyph').count()
  const nama = await page.locator('.nm').allTextContents()
  const opak = await page.locator('.glyph').first().evaluate((n) => getComputedStyle(n).opacity)
  catat(s === GLYPH_DIHARAP, 'tanpa JS: glyph tetap terpasang', { glyph: s, diharap: GLYPH_DIHARAP })
  catat(nama.join('|') === 'Daniel|Samira', 'tanpa JS: teks tetap utuh', nama)
  catat(Number(opak) >= 0.9, 'tanpa JS: glyph tidak tersembunyi', { opacity: opak })
  await ctx.close()
}

// jeda offscreen
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForTimeout(800)
  const jalan = await page.evaluate(() => document.body.dataset.ambient)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(900)
  const jeda = await page.evaluate(() => document.body.dataset.ambient)
  catat(jalan === 'jalan' && jeda === 'jeda', 'jeda offscreen: ambient berhenti saat adegan keluar layar',
    { saatTerlihat: jalan, saatKeluar: jeda })
  await ctx.close()
}

await browser.close()
writeFileSync(join(HERE, 'verification.json'), JSON.stringify(hasil, null, 2))
console.log(JSON.stringify({ lolos: hasil.lolos.length, gagal: hasil.gagal }, null, 2))
if (hasil.gagal.length) process.exitCode = 1
