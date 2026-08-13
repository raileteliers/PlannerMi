import { defineConfig } from 'vitest/config'

/**
 * Tests cover `src/logic` and `src/lib` only — the pure half of the app, which
 * has no React Native in it and runs in plain node. The UI is checked on a
 * real phone, not here.
 */
export default defineConfig({
  test: {
    include: ['src/{logic,lib}/**/*.test.ts'],
    environment: 'node',
  },
})
