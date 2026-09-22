import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Port 3000 sering sudah dipakai proyek lain di mesin yang sama; `E2E_BASE_URL`
  // membuat suite ini bisa diarahkan ke server dev mana pun tanpa mengubah berkas.
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  /*
   * `grepInvert: /@desktop/` pada tiga project sempit, bukan `test.skip(project !== 'desktop')`
   * di dalam tesnya.
   *
   * Keduanya sama-sama tidak menjalankan tes itu, tapi hanya yang pertama tidak menghitungnya.
   * `test.skip` menandai eksekusinya *skipped*, dan gerbang e2e di ci.yml menolak `skipped` bukan
   * nol -- justru karena skip yang menyelinap pernah menyembunyikan 44 eksekusi. Tes yang memang
   * tidak berlaku di 360px bukan cakupan yang hilang, jadi ia dikeluarkan dari daftar, bukan
   * dijalankan lalu dibuang. Dengan begini `skipped === 0` tetap berarti apa yang ia katakan.
   */
  projects: [
    { name: 'mobile', grepInvert: /@desktop/, use: { viewport: { width: 360, height: 800 } } },
    { name: 'tablet', grepInvert: /@desktop/, use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    /*
     * Ketiga project di atas semuanya Chromium dengan lebar berbeda — "lebar layar ponsel",
     * bukan mesin ponsel. Undangan dibagikan lewat WhatsApp dan dibuka di iPhone, dan setiap
     * browser di iOS memakai WebKit, jadi tanpa baris ini klaim "jalan di iOS" tidak pernah
     * punya bukti. Bug `Range` yang ditemukan lewat trace seharusnya tertangkap di sini.
     */
    { name: 'safari', grepInvert: /@desktop/, use: { browserName: 'webkit', viewport: { width: 390, height: 844 } } },
  ],
})
