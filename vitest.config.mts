import { defineConfig } from 'vitest/config'

/**
 * Tests cover `src/logic`, `src/lib` and `src/db` — the half of the app that
 * runs in plain node, with no React Native in it. `src/db` qualifies because
 * the storage contract is exercised against the in-memory implementation; the
 * SQLite and Supabase ones are checked on a real phone and against a real
 * project, not here. The UI is checked on a real phone too.
 */
export default defineConfig({
  test: {
    include: ['src/{logic,lib,db}/**/*.test.ts'],
    environment: 'node',
  },
})
