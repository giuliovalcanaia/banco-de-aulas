import { useCallback, useState } from 'react'
import { GraduationCapIcon, ShieldCheckIcon } from 'lucide-react'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Theme } from '@/lib/theme'

type LoginScreenProps = {
  theme: Theme
  onToggleTheme: () => void
  onSignIn: () => Promise<void>
  message?: string | null
}

export function LoginScreen({
  theme,
  onToggleTheme,
  onSignIn,
  message,
}: LoginScreenProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = useCallback(async () => {
    setSubmitting(true)
    setError(null)

    try {
      await onSignIn()
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : 'Não foi possível entrar. Tente de novo.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [onSignIn])

  const shownError = error ?? message ?? null

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex justify-end px-4 pt-3">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-10">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center gap-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCapIcon className="size-6" />
            </div>
            <CardTitle className="text-lg">Banco de Aulas</CardTitle>
            <CardDescription>
              Entre com sua conta Google para acessar seu banco de horas e seus
              lançamentos.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <GoogleSignInButton
              onSignIn={() => void handleSignIn()}
              disabled={submitting}
            />

            {submitting && (
              <p className="text-center text-sm text-muted-foreground">
                Entrando...
              </p>
            )}

            {shownError && (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível entrar</AlertTitle>
                <AlertDescription>{shownError}</AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
              <p>
                Seus lançamentos ficam salvos no Firebase e sincronizam entre
                dispositivos. Cada conta vê apenas os próprios dados. A sessão
                dura 30 dias.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
