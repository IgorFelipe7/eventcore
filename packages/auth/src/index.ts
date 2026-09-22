import { randomUUID } from 'node:crypto'
import {
  type JWTPayload,
  type JWTVerifyGetKey,
  SignJWT,
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors,
  jwtVerify,
} from 'jose'

export const DEMO_SUBJECT_PREFIX = 'demo|'
export const MIN_DEMO_SECRET_LENGTH = 32

export interface VerifiedIdentity {
  readonly subject: string
  readonly displayName: string
  readonly source: 'demo' | 'provider'
}

export interface TokenVerifierConfig {
  readonly issuer: string
  readonly audience: string
  readonly jwksUrl?: string | undefined
  readonly demoSecret?: string | undefined
  readonly clockToleranceSeconds?: number
}

export class TokenRejectedError extends Error {
  override readonly name = 'TokenRejectedError'
}

export type TokenVerifier = (token: string) => Promise<VerifiedIdentity>

const encodeSecret = (secret: string): Uint8Array => {
  if (secret.length < MIN_DEMO_SECRET_LENGTH) {
    throw new Error(`The demo signing secret must have at least ${MIN_DEMO_SECRET_LENGTH} characters.`)
  }
  return new TextEncoder().encode(secret)
}

const displayNameOf = (payload: JWTPayload): string => {
  const name = payload['name']
  return typeof name === 'string' && name.trim().length > 0 ? name.trim().slice(0, 80) : 'Participant'
}

export const createTokenVerifier = (config: TokenVerifierConfig): TokenVerifier => {
  const demoKey = config.demoSecret ? encodeSecret(config.demoSecret) : null
  const providerKeys: JWTVerifyGetKey | null = config.jwksUrl
    ? createRemoteJWKSet(new URL(config.jwksUrl))
    : null
  const options = {
    issuer: config.issuer,
    audience: config.audience,
    clockTolerance: config.clockToleranceSeconds ?? 5,
    requiredClaims: ['sub', 'exp', 'iat'],
  }

  return async (token) => {
    try {
      const { alg } = decodeProtectedHeader(token)

      if (alg === 'HS256' && demoKey) {
        const { payload } = await jwtVerify(token, demoKey, { ...options, algorithms: ['HS256'] })
        if (!payload.sub?.startsWith(DEMO_SUBJECT_PREFIX)) {
          throw new TokenRejectedError('Demo tokens may only represent demo personas.')
        }
        return { subject: payload.sub, displayName: displayNameOf(payload), source: 'demo' }
      }

      if (providerKeys && alg !== 'HS256') {
        const { payload } = await jwtVerify(token, providerKeys, {
          ...options,
          algorithms: ['RS256', 'ES256', 'EdDSA'],
        })
        if (!payload.sub || payload.sub.startsWith(DEMO_SUBJECT_PREFIX)) {
          throw new TokenRejectedError('Provider tokens cannot claim a demo subject.')
        }
        return { subject: payload.sub, displayName: displayNameOf(payload), source: 'provider' }
      }

      throw new TokenRejectedError(`Tokens signed with ${alg ?? 'no algorithm'} are not accepted.`)
    } catch (error) {
      if (error instanceof TokenRejectedError) throw error
      if (error instanceof errors.JOSEError) throw new TokenRejectedError(error.code)
      throw new TokenRejectedError('The token could not be verified.')
    }
  }
}

export interface DemoTokenInput {
  readonly secret: string
  readonly issuer: string
  readonly audience: string
  readonly subject: string
  readonly displayName: string
  readonly ttlSeconds?: number
}

export const signDemoToken = async (input: DemoTokenInput): Promise<string> => {
  if (!input.subject.startsWith(DEMO_SUBJECT_PREFIX)) {
    throw new Error('Demo tokens may only be issued for demo personas.')
  }
  return new SignJWT({ name: input.displayName })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(input.subject)
    .setIssuer(input.issuer)
    .setAudience(input.audience)
    .setIssuedAt()
    .setExpirationTime(`${input.ttlSeconds ?? 3_600}s`)
    .setJti(randomUUID())
    .sign(encodeSecret(input.secret))
}
