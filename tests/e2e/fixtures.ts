import { test as base, expect } from '@playwright/test'

/**
 * `test` untuk seluruh suite e2e, dengan gulir halus dipadamkan.
 *
 * `main.css:144` menyetel `html { scroll-behavior: smooth }` dan itu keputusan produk yang benar
 * — ia hanya dimatikan di bawah `prefers-reduced-motion`. Yang tidak tahan terhadapnya adalah
 * pemeriksaan aksionabilitas Playwright: sebelum mengklik, ia menggulir elemennya ke tampak lalu
 * memastikan titik kliknya benar-benar mengenai elemen itu. Dengan gulir beranimasi, hit-test itu
 * jatuh di tengah animasi dan mengenai apa pun yang sedang lewat — lalu kliknya diulang, digulir
 * lagi, dan seterusnya sampai tesnya kehabisan waktu.
 *
 * Terbukti dari log aksi Playwright sendiri di run 35709298804: `done scrolling` berulang, dan
 * tiga percobaan berturut-turut melaporkan tiga pencegat yang BERBEDA — `header` sticky z-20,
 * `nav "Navigasi undangan"` fixed bottom-0 z-30, lalu `aside "Pengaturan"`. Tiga elemen berbeda
 * di satu titik yang sama hanya mungkin kalau halamannya masih bergerak.
 *
 * Kenapa hanya WebKit CI: di Chromium gulirnya selesai sebelum pemeriksaan berikutnya, dan di
 * mesin pengembang WebKit pun cukup cepat — suite penuh lulus 247/247 secara lokal. Yang
 * dibutuhkan untuk membukanya adalah runner yang lambat, dan itu tidak bisa dipanggil sesuka hati.
 *
 * Yang dipadamkan HANYA `scroll-behavior`, bukan animasi. `reducedMotion: 'reduce'` di config akan
 * memadamkan keduanya, dan suite ini justru punya lima tes yang mengukur gerak — termasuk yang
 * memeriksa perilaku di bawah reduced motion, yang akan jadi benar dengan sendirinya dan berhenti
 * menguji apa pun.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const gaya = document.createElement('style')
      gaya.textContent = 'html { scroll-behavior: auto !important; }'
      const pasang = () => document.head?.appendChild(gaya)
      if (document.head) pasang()
      else document.addEventListener('DOMContentLoaded', pasang, { once: true })
    })
    await use(page)
  },
})

export { expect }
