import { useState } from 'react'
import { GraduationCapIcon, LogOutIcon } from 'lucide-react'
import { toast } from 'sonner'
import { BalanceCounter, BalancePill } from '@/components/BalanceCounter'
import { DayForm } from '@/components/DayForm'
import { HistoryList } from '@/components/HistoryList'
import { LoginScreen } from '@/components/LoginScreen'
import { MobileNav, type TabValue } from '@/components/MobileNav'
import { SettingsPanel } from '@/components/SettingsPanel'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/hooks/useStore'
import { useTheme } from '@/hooks/useTheme'
import { totalDeltaMinutes } from '@/lib/balance'
import { todayISO } from '@/lib/date'
import { errorMessage } from '@/lib/errors'
import { exportData } from '@/lib/storage'
import type { DayEntry, StoreData } from '@/lib/types'

const TABS: TabValue[] = ['hoje', 'historico', 'ajustes']

export default function App() {
  const auth = useAuth()
  const [tab, setTab] = useState<TabValue>('hoje')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const store = useStore(auth.signedIn, auth.user?.uid ?? null)
  const { theme, toggle: toggleTheme } = useTheme()

  const syncLabel =
    store.syncState === 'offline'
      ? 'Sem conexão — usando os dados salvos neste dispositivo.'
      : store.syncState === 'error'
        ? 'Falha na sincronização.'
        : 'Tudo sincronizado.'

  const handleTabChange = (value: string) => {
    if (!TABS.includes(value as TabValue)) return
    setTab(value as TabValue)
    if (value !== 'hoje') setEditingEntryId(null)
    window.scrollTo({ top: 0 })
  }

  const handleEdit = (entry: DayEntry) => {
    setSelectedDate(entry.date)
    setEditingEntryId(entry.id)
    setTab('hoje')
    window.scrollTo({ top: 0 })
  }

  const handleDelete = async (entry: DayEntry) => {
    try {
      await store.deleteEntry(entry.id)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const handleExport = () => {
    if (!store.data) return
    exportData(store.data)
  }

  const handleImport = async (data: StoreData) => {
    await store.replaceData(data)
  }

  const handleReset = async () => {
    await store.resetData()
  }

  const handleSignOut = () => {
    void auth.signOut()
  }

  if (auth.initializing) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Verificando sessão...
            </p>
          </CardContent>
        </Card>
        <Toaster position="top-center" richColors theme={theme} />
      </div>
    )
  }

  if (!auth.signedIn) {
    return (
      <>
        <LoginScreen
          theme={theme}
          onToggleTheme={toggleTheme}
          onSignIn={auth.signIn}
          message={auth.message}
        />
        <Toaster position="top-center" richColors theme={theme} />
      </>
    )
  }

  if (!store.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            {store.loading || !store.error ? (
              <>
                <div className="mx-auto size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Conectando aos seus dados...
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">Não foi possível carregar os dados.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {store.error}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={store.refresh}>
                    Tentar de novo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSignOut}
                  >
                    Sair da conta
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Toaster position="top-center" richColors theme={theme} />
      </div>
    )
  }

  const totalMinutes = totalDeltaMinutes(store.data.entries, store.data.settings)

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCapIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight">
                Banco de Aulas
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Saldo de horas em aulas
              </p>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <BalancePill
              totalMinutes={totalMinutes}
              settings={store.data.settings}
              className="sm:hidden"
            />
            <Badge variant="outline" className="hidden sm:inline-flex">
              {store.data.entries.length}{' '}
              {store.data.entries.length === 1 ? 'lançamento' : 'lançamentos'}
            </Badge>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden size-8 sm:inline-flex"
              onClick={handleSignOut}
              aria-label="Sair da conta"
              title="Sair da conta"
            >
              <LogOutIcon />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:pb-40 sm:pt-6">
        {store.error ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span>Não foi possível sincronizar: {store.error}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={store.refresh}
            >
              Tentar de novo
            </Button>
          </div>
        ) : store.syncState === 'offline' ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <span>
              Sem conexão. As alterações serão enviadas quando a internet
              voltar.
            </span>
          </div>
        ) : null}

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="hidden w-full grid-cols-3 sm:grid">
            <TabsTrigger value="hoje" data-tab="hoje">
              Hoje
            </TabsTrigger>
            <TabsTrigger value="historico" data-tab="historico">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="ajustes" data-tab="ajustes">
              Ajustes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hoje" className="mt-4">
            {store.data.entries.length === 0 && (
              <Alert className="mb-4">
                <AlertTitle>Bem-vindo ao Banco de Aulas</AlertTitle>
                <AlertDescription>
                  Seu banco de horas começa zerado. O formulário abaixo já vem
                  preenchido com a jornada padrão (07:15–11:15 e 13:00–17:00);
                  ajuste o que divergir e salve. Você pode personalizar a
                  jornada e os dias úteis na aba <strong>Ajustes</strong>.
                </AlertDescription>
              </Alert>
            )}
            <DayForm
              settings={store.data.settings}
              entriesByDate={store.entriesByDate}
              initialDate={selectedDate}
              editingEntryId={editingEntryId}
              onFinishEdit={(date) => {
                if (date) setSelectedDate(date)
                setEditingEntryId(null)
              }}
              onCancelEdit={(date) => {
                if (date) setSelectedDate(date)
                setEditingEntryId(null)
              }}
              onSave={store.upsertEntry}
              onDelete={store.deleteEntry}
            />
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <HistoryList
              entries={store.data.entries}
              settings={store.data.settings}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="ajustes" className="mt-4">
            <SettingsPanel
              settings={store.data.settings}
              entryCount={store.data.entries.length}
              email={auth.email}
              syncLabel={syncLabel}
              onSave={store.updateSettings}
              onRefresh={store.refresh}
              onSignOut={handleSignOut}
              onExport={handleExport}
              onImport={handleImport}
              onReset={handleReset}
            />
          </TabsContent>
        </Tabs>
      </main>

      <BalanceCounter
        totalMinutes={totalMinutes}
        settings={store.data.settings}
      />

      <MobileNav value={tab} onChange={handleTabChange} />

      <Toaster position="top-center" richColors theme={theme} />
    </div>
  )
}
