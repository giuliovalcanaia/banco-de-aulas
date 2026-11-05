import { describe, expect, it } from 'vitest'
import type { User } from 'firebase/auth'
import {
  authErrorMessage,
  isSessionExpired,
  SESSION_MAX_AGE_MS,
} from './auth'

function makeUser(authTimeSeconds: number): User {
  return {
    getIdTokenResult: async () => ({
      claims: { auth_time: authTimeSeconds },
    }),
    metadata: {
      lastSignInTime: new Date(authTimeSeconds * 1000).toUTCString(),
    },
  } as unknown as User
}

describe('auth', () => {
  it('considera a sessão válida antes de 30 dias', async () => {
    const now = Date.now()
    const user = makeUser(Math.floor((now - SESSION_MAX_AGE_MS + 60_000) / 1000))

    await expect(isSessionExpired(user, now)).resolves.toBe(false)
  })

  it('considera a sessão expirada depois de 30 dias', async () => {
    const now = Date.now()
    const user = makeUser(Math.floor((now - SESSION_MAX_AGE_MS - 60_000) / 1000))

    await expect(isSessionExpired(user, now)).resolves.toBe(true)
  })

  it('usa lastSignInTime quando não consegue ler o token', async () => {
    const now = Date.now()
    const user = {
      getIdTokenResult: async () => {
        throw new Error('offline')
      },
      metadata: {
        lastSignInTime: new Date(
          now - SESSION_MAX_AGE_MS - 60_000,
        ).toUTCString(),
      },
    } as unknown as User

    await expect(isSessionExpired(user, now)).resolves.toBe(true)
  })

  it('traduz os erros mais comuns do Firebase', () => {
    expect(authErrorMessage({ code: 'auth/popup-closed-by-user' })).toBe(
      'Login cancelado.',
    )
    expect(authErrorMessage({ code: 'auth/unauthorized-domain' })).toContain(
      'não está autorizado',
    )
  })
})
