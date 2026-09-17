import { defineConfig } from 'vitest/config'

/**
 * `.claude` dan `.codex` berisi skill agen, dan skillnya membawa skrip sendiri — termasuk
 * `core.test.mjs` yang ditulis untuk `node:test`, bukan vitest. Glob bawaan vitest menjaringnya
 * sebagai berkas tes lalu gagal karena tidak menemukan satu pun suite di dalamnya. Keduanya bukan
 * kode aplikasi dan tidak pernah ikut rilis, jadi tempatnya di luar suite ini.
 */
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.output/**', '**/.claude/**', '**/.codex/**', 'tests/e2e/**'],
    testTimeout: 10_000,
  },
})
