import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'integration',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', 'e2e/**', 'load/**'],
    globalSetup: ['./support/global-setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
})
