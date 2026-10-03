import { fileURLToPath } from 'node:url'
import { loadEnvConfig } from '@next/env'
import { type NextConfig } from 'next'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))
loadEnvConfig(repositoryRoot)

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const config: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  poweredByHeader: false,
  transpilePackages: ['@eventcore/contracts', '@eventcore/domain', '@eventcore/auth'],
  outputFileTracingRoot: repositoryRoot,
  outputFileTracingIncludes: { '/architecture': ['../../docs/**/*.md'] },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default config
