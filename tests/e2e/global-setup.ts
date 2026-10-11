import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export default function globalSetup() {
  execSync('pnpm db:seed', {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    stdio: 'inherit',
  })
}
