import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { exclude: ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.output/**', 'tests/e2e/**'], testTimeout: 10_000 } })
