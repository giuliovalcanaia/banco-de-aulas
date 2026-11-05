import { SignJWT, jwtVerify } from 'jose'
import { requireEnv } from './env'

export const SESSION_COOKIE = 'ba_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export type Session = {
  email: string
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(requireEnv('SESSION_SECRET'))
}

export async function createSessionToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey())
}

export async function readSessionToken(
  token: string | undefined,
): Promise<Session | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
    })
    const email =
      typeof payload.email === 'string' ? payload.email : payload.sub
    return typeof email === 'string' && email ? { email } : null
  } catch {
    return null
  }
}

function usesSecureCookie(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production'
  )
}

export function sessionCookie(token: string): string {
  const secure = usesSecureCookie() ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`
}

export function clearedSessionCookie(): string {
  const secure = usesSecureCookie() ? '; Secure' : ''
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

/** Lê um cookie do header, sem depender de frameworks. */
export function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined

  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue

    const key = part.slice(0, separator).trim()
    if (key !== name) continue

    try {
      return decodeURIComponent(part.slice(separator + 1).trim())
    } catch {
      return part.slice(separator + 1).trim()
    }
  }

  return undefined
}
