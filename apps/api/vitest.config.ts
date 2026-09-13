import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['apps/api/test/**/*.spec.ts'], environment: 'node' },
});
