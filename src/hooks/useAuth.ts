import { useCallback, useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import {
  authErrorCode,
  authErrorMessage,
  isSessionExpired,
} from '@/lib/auth'
import { clearLocalPersistence } from '@/lib/db'
import { auth, isFirebaseConfigured, missingFirebaseConfig } from '@/lib/firebase'

type AuthStatus = 'loading' | 'signedOut' | 'signedIn'

const SESSION_EXPIRED_MESSAGE =
  'Sua sessão de 30 dias expirou. Entre novamente para continuar.'

function isStandalonePwa(): boolean {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean
  }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    navigatorWithStandalone.standalone === true
  )
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function shouldRedirectInsteadOfPopup(): boolean {
  return isIOS() && isStandalonePwa()
}

function shouldFallbackToRedirect(error: unknown): boolean {
  const code = authErrorCode(error)
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment'
  )
}

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setStatus('signedOut')
      setMessage(
        `Firebase não configurado. Defina ${missingFirebaseConfig.join(', ')}.`,
      )
      return
    }

    let active = true

    void getRedirectResult(auth).catch((error: unknown) => {
      if (!active) return
      if (authErrorCode(error) === 'auth/no-auth-event') return
      setMessage(authErrorMessage(error))
    })

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return

      if (!nextUser) {
        setUser(null)
        setStatus('signedOut')
        return
      }

      if (await isSessionExpired(nextUser)) {
        await firebaseSignOut(auth)
        if (!active) return
        setUser(null)
        setStatus('signedOut')
        setMessage(SESSION_EXPIRED_MESSAGE)
        return
      }

      setUser(nextUser)
      setStatus('signedIn')
      setMessage(null)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (status !== 'signedIn' || !user) return

    const check = async () => {
      if (await isSessionExpired(user)) {
        setMessage(SESSION_EXPIRED_MESSAGE)
        await firebaseSignOut(auth)
      }
    }

    const interval = window.setInterval(check, 60_000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void check()
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [status, user])

  const signIn = useCallback(async () => {
    if (!isFirebaseConfigured) {
      throw new Error(
        `Firebase não configurado. Defina ${missingFirebaseConfig.join(', ')}.`,
      )
    }

    setMessage(null)

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    try {
      if (shouldRedirectInsteadOfPopup()) {
        await signInWithRedirect(auth, provider)
        return
      }

      await signInWithPopup(auth, provider)
    } catch (error) {
      if (shouldFallbackToRedirect(error)) {
        await signInWithRedirect(auth, provider)
        return
      }
      throw new Error(authErrorMessage(error))
    }
  }, [])

  const signOut = useCallback(async () => {
    setStatus('loading')
    await firebaseSignOut(auth)
    await clearLocalPersistence()
    window.location.reload()
  }, [])

  return {
    status,
    initializing: status === 'loading',
    signedIn: status === 'signedIn',
    user,
    email: user?.email ?? null,
    message,
    signIn,
    signOut,
  }
}
