import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import { TokenRejectedError, createTokenVerifier, signDemoToken } from '../src'

const config = {
  issuer: 'https://auth.eventcore.test',
  audience: 'eventcore-api',
  demoSecret: 'a-very-long-demo-secret-used-only-in-tests',
}

const verify = createTokenVerifier(config)

const demoToken = (overrides: Partial<Parameters<typeof signDemoToken>[0]> = {}) =>
  signDemoToken({
    secret: config.demoSecret,
    issuer: config.issuer,
    audience: config.audience,
    subject: 'demo|participant-rio',
    displayName: 'Rio (demo participant)',
    ...overrides,
  })

describe('token verifier', () => {
  it('accepts a demo token for a demo persona', async () => {
    await expect(verify(await demoToken())).resolves.toEqual({
      subject: 'demo|participant-rio',
      displayName: 'Rio (demo participant)',
      source: 'demo',
    })
  })

  it.each([
    ['another issuer', { issuer: 'https://evil.example' }],
    ['another audience', { audience: 'someone-else' }],
    ['a different secret', { secret: 'a-different-but-equally-long-secret-value' }],
    ['an expired token', { ttlSeconds: -60 }],
  ])('rejects a token signed for %s', async (_label, overrides) => {
    await expect(verify(await demoToken(overrides))).rejects.toBeInstanceOf(TokenRejectedError)
  })

  it('refuses to let the demo secret mint tokens for non-demo subjects', async () => {
    const forged = await new SignJWT({ name: 'Admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('auth0|real-user')
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(config.demoSecret))
    await expect(verify(forged)).rejects.toThrowError('Demo tokens may only represent demo personas.')
  })

  it('rejects HS256 tokens entirely when no demo secret is configured', async () => {
    const providerOnly = createTokenVerifier({ issuer: config.issuer, audience: config.audience })
    await expect(providerOnly(await demoToken())).rejects.toBeInstanceOf(TokenRejectedError)
  })

  it('rejects malformed input without leaking parser details', async () => {
    await expect(verify('not-a-jwt')).rejects.toBeInstanceOf(TokenRejectedError)
  })
})
