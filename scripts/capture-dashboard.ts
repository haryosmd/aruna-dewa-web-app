/**
 * Memotret dasbor yang sungguhan untuk case-study di landing.
 *
 * Landing sebelumnya memakai tiruan dasbor yang digambar tangan. Tiruan selalu berbohong
 * pelan-pelan: ia tidak ikut berubah saat dasbornya berubah, dan calon pembeli mengambil
 * keputusan berdasarkan layar yang tidak pernah ada. Skrip ini memakai ulang alur login QA
 * dari `tests/e2e/dashboard.spec.ts` — akun dan undangannya dari `.data/qa-account.json`,
 * yang dibuat `pnpm test:integration`.
 *
 * Jalankan: `pnpm capture:dashboard`
 * Prasyarat: server web berjalan (`pnpm dev`) dan API-nya hidup.
 *
 * WAJIB dijalankan ulang setiap kali dasbor berubah. Prosedur lengkap ada di
 * `docs/features/landing-order/DASHBOARD-SHOWCASE.md`.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { chromium, type Page } from '@playwright/test'
import { PrismaClient } from '@aruna/database'

const FIXTURE = '.data/qa-account.json'
const OUT = 'apps/web/public/dashboard'
const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'

type Account = { email: string; password: string; invitationId: string; slug: string }

/** Lima layar yang benar-benar dipakai pasangan, berurutan seperti pekerjaannya sendiri. */
const screens = [
  { id: 'ringkasan', path: (a: Account) => `/dashboard/${a.invitationId}`, wait: 'Publikasi' },
  { id: 'editor', path: (a: Account) => `/dashboard/${a.invitationId}/editor`, wait: 'Simpan draft' },
  { id: 'tamu', path: (a: Account) => `/dashboard/${a.invitationId}/guests`, wait: 'Cari tamu' },
  { id: 'rsvp', path: (a: Account) => `/dashboard/${a.invitationId}/rsvps`, wait: 'Konfirmasi terbaru' },
  { id: 'pesanan', path: (a: Account) => `/dashboard/${a.invitationId}/orders`, wait: '' },
] as const

const viewports = [
  { id: 'desktop', width: 1440, height: 900 },
  { id: 'mobile', width: 390, height: 844 },
] as const

async function signIn(page: Page, account: Account) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Email', { exact: true }).fill(account.email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await page.waitForURL(/dashboard/, { timeout: 15_000 })
}

/**
 * `api-smoke.ts` menamai undangannya `QA Aruna & Dewa` dengan slug `qa-<acak>`. Awalan itu
 * berguna untuk isolasi tes, tapi keduanya ikut terbaca di potret yang dipakai berjualan
 * di landing — pengunjung melihat `/i/qa-f914c822` dan menyimpulkan produknya setengah jadi.
 *
 * Dirapikan di sini, bukan di smoke test-nya, supaya tes tetap menandai datanya sendiri.
 * Judul dan slug adalah kolom `Invitation`, bukan bagian `document`, dan tidak punya
 * endpoint update — jadi ditulis langsung. Skrip ini memang hanya untuk mesin pengembang.
 *
 * Fixture ikut ditulis ulang supaya `.data/qa-account.json` tidak menyimpan slug basi.
 */
async function presentableIdentity(account: Account) {
  const slug = 'aruna-dan-dewa'
  const prisma = new PrismaClient()
  try {
    const clash = await prisma.invitation.findUnique({ where: { slug }, select: { id: true } })
    const next = !clash || clash.id === account.invitationId ? slug : account.slug
    await prisma.invitation.update({
      where: { id: account.invitationId },
      data: { title: 'Aruna & Dewa', slug: next },
    })
    if (next !== account.slug) {
      writeFileSync(FIXTURE, `${JSON.stringify({ ...account, slug: next }, null, 2)}\n`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Playwright hanya bisa menulis PNG atau JPEG. PNG untuk tangkapan UI berukuran ~1,4 MB
 * untuk sepuluh berkas ini — dimuat di landing, jadi berat itu ditanggung tiap pengunjung
 * pertama. WebP lossless memang tetap besar untuk gambar UI; `quality: 84` di mode lossy
 * menahan teks dasbor tetap tajam pada `deviceScaleFactor` 1,5 sambil memotong sekitar
 * tiga perempatnya. `effort: 6` dipilih karena ini skrip yang jarang dijalankan — waktu
 * encode tidak berarti apa-apa dibanding berkas yang dimuat ribuan kali.
 *
 * Sebelumnya langkah ini ditulis sebagai perintah `cwebp` opsional di akhir skrip, yang
 * tidak pernah dijalankan karena `cwebp` tidak terpasang. Sekarang tidak ada langkah manual.
 */
async function toWebp(png: Buffer, destination: string): Promise<number> {
  const out = await sharp(png).webp({ quality: 84, effort: 6 }).toBuffer()
  writeFileSync(destination, out)
  return out.byteLength
}

async function main() {
  if (!existsSync(FIXTURE)) {
    throw new Error(`${FIXTURE} tidak ada. Jalankan \`pnpm test:integration\` dulu untuk membuat akun QA terisolasi.`)
  }
  const account = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Account
  await presentableIdentity(account)

  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch()
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        /*
         * 1,5 — bukan 2. Potret dasbor ditampilkan selebar ±900px di landing, jadi 2×
         * hanya menghasilkan berkas 600 KB+ yang harus diunduh setiap pengunjung sebelum
         * mereka sempat memutuskan apa pun. 1,5× masih tajam di layar retina.
         */
        deviceScaleFactor: 1.5,
        // Gerak dimatikan supaya tiap potret menangkap keadaan istirahat yang sama,
        // bukan satu frame acak di tengah reveal.
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      await signIn(page, account)

      for (const screen of screens) {
        await page.goto(`${BASE}${screen.path(account)}`)
        if (screen.wait) await page.getByText(screen.wait, { exact: false }).first().waitFor({ timeout: 15_000 })
        await page.waitForTimeout(700)
        const shot = await page.screenshot({ fullPage: false })
        const bytes = await toWebp(shot, `${OUT}/${screen.id}-${viewport.id}.webp`)
        console.log(`  ✓ ${screen.id}-${viewport.id}.webp — ${Math.round(bytes / 1024)} KB`)
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }

  console.log(`\nSelesai. ${screens.length * viewports.length} berkas WebP di ${OUT}/`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
