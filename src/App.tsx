import { useState } from 'react'
import { GraduationCapIcon } from 'lucide-react'
import { toast } from 'sonner'
import { BalanceCounter, BalancePill } from '@/components/BalanceCounter'
import { DayForm } from '@/components/DayForm'
import { HistoryList } from '@/components/HistoryList'
import { MobileNav, type TabValue } from '@/components/MobileNav'
import { SettingsPanel } from '@/components/SettingsPanel'
import { SetupScreen } from '@/components/SetupScreen'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { useStore } from '@/hooks/useStore'
import { useTheme } from '@/hooks/useTheme'
import { totalDeltaMinutes } from '@/lib/balance'
import { todayISO } from '@/lib/date'
import { errorMessage } from '@/lib/errors'
import {
  clearSheetsConfig,
  getSheetsConfig,
  hasEnvConfig,
  saveSheetsConfig,
  type SheetsConfig,
} from '@/lib/sheetsConfig'
import { clearCache, exportData } from '@/lib/storage'
import type { DayEntry, StoreData } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABS: TabValue[] = ['hoje', 'historico', 'ajustes']

export default function App() {
  const [config, setConfig] = useState<SheetsConfig | null>(() =>
    getSheetsConfig(),
  )
  const [tab, setTab] = useState<TabValue>('hoje')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const store = useStore(config)
  const { theme, toggle: toggleTheme } = useTheme()

  const handleConnect = (nextConfig: SheetsConfig) => {
    clearCache()
    saveSheetsConfig(nextConfig)
    setConfig(nextConfig)
  }

  const handleDisconnect = () => {
    clearSheetsConfig()
    clearCache()
    setConfig(null)
  }

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
      toast.success('Lançamento excluído.')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const handleExport = () => {
    if (!store.data) return
    exportData(store.data)
    toast.success('Backup exportado.')
  }

  const handleImport = async (data: StoreData) => {
    await store.replaceData(data)
  }

  const handleReset = async () => {
    await store.resetData()
  }

  if (!config) {
    return (
      <>
        <SetupScreen onConnect={handleConnect} />
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
                  Conectando à planilha...
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
                  {!hasEnvConfig() && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDisconnect}
                    >
                      Configurar conexão
                    </Button>
                  )}
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
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:pb-40 sm:pt-6">
        {(store.loading || store.error) && (
          <div
            className={cn(
              'mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
              store.error
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'bg-muted/50 text-muted-foreground',
            )}
          >
            <span>
              {store.loading
                ? 'Sincronizando com a planilha...'
                : `Sem conexão com a planilha: ${store.error}`}
            </span>
            {!store.loading && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={store.refresh}
              >
                Tentar de novo
              </Button>
            )}
          </div>
        )}

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
              config={config}
              allowDisconnect={!hasEnvConfig()}
              onSave={store.updateSettings}
              onRefresh={store.refresh}
              onDisconnect={handleDisconnect}
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
