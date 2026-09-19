import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['{packages,apps,tests}/**/vitest.config.ts', '!**/node_modules/**'],
  },
})
