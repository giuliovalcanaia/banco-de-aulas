import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearedSessionCookie,
  createSessionToken,
  readCookie,
  readSessionToken,
  sessionCookie,
  SESSION_COOKIE,
} from './session'

describe('server/session', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres'
    process.env.NODE_ENV = 'test'
    delete process.env.VERCEL_ENV
  })

  it('cria e valida uma sessão', async () => {
    const token = await createSessionToken('giuliovalcanaia@gmail.com')
    const session = await readSessionToken(token)

    expect(session).toEqual({ email: 'giuliovalcanaia@gmail.com' })
  })

  it('rejeita token ausente, inválido ou adulterado', async () => {
    const token = await createSessionToken('giuliovalcanaia@gmail.com')
    const tampered = `${token.slice(0, -2)}xx`

    expect(await readSessionToken(undefined)).toBeNull()
    expect(await readSessionToken('não-é-um-jwt')).toBeNull()
    expect(await readSessionToken(tampered)).toBeNull()
  })

  it('rejeita token assinado com outro segredo', async () => {
    const token = await createSessionToken('giuliovalcanaia@gmail.com')
    process.env.SESSION_SECRET = 'outro-segredo-de-teste'

    expect(await readSessionToken(token)).toBeNull()
  })

  it('gera cookie HttpOnly com SameSite Lax', () => {
    const cookie = sessionCookie('token-de-teste')

    expect(cookie).toContain(`${SESSION_COOKIE}=token-de-teste`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')
    expect(clearedSessionCookie()).toContain('Max-Age=0')
  })

  it('lê o cookie do header', () => {
    const header = `outro=1; ${SESSION_COOKIE}=abc%3D123; mais=2`

    expect(readCookie(header, SESSION_COOKIE)).toBe('abc=123')
    expect(readCookie(header, 'inexistente')).toBeUndefined()
    expect(readCookie(undefined, SESSION_COOKIE)).toBeUndefined()
  })
})
