import type { User } from 'firebase/auth'

export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function authTimeFromClaims(claims: Record<string, unknown>): number | null {
  const value = claims.auth_time
  const seconds =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN

  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null
}

/**
 * A sessão vale por 30 dias a partir do login. O Firebase renova o ID token
 * automaticamente, mas `auth_time` continua sendo o momento do login.
 */
export async function isSessionExpired(
  user: User,
  now = Date.now(),
): Promise<boolean> {
  let authTime: number | null = null

  try {
    const result = await user.getIdTokenResult()
    authTime = authTimeFromClaims(result.claims)
  } catch {
    // Offline: usa o metadado local como fallback.
  }

  if (authTime === null && user.metadata.lastSignInTime) {
    const parsed = Date.parse(user.metadata.lastSignInTime)
    authTime = Number.isNaN(parsed) ? null : parsed
  }

  if (authTime === null) return false
  return now - authTime >= SESSION_MAX_AGE_MS
}

export function authErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string') return code
  }
  return null
}

export function authErrorMessage(error: unknown): string {
  switch (authErrorCode(error)) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Login cancelado.'
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela de login. Tente de novo.'
    case 'auth/network-request-failed':
      return 'Sem conexão com o Google. Verifique a internet e tente de novo.'
    case 'auth/unauthorized-domain':
      return 'Este domínio não está autorizado no Firebase Authentication.'
    case 'auth/operation-not-allowed':
      return 'O login com Google não está habilitado no Firebase.'
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta com este e-mail usando outro método de login.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
    case 'auth/user-disabled':
      return 'Esta conta foi desativada.'
    case 'auth/internal-error':
      return 'O Firebase encontrou um erro interno. Tente de novo.'
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Não foi possível entrar. Tente de novo.'
  }
}
