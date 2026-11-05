import { useState } from 'react'
import { GraduationCapIcon } from 'lucide-react'
import { toast } from 'sonner'
import { BalanceCounter } from '@/components/BalanceCounter'
import { DayForm } from '@/components/DayForm'
import { HistoryList } from '@/components/HistoryList'
import { SettingsPanel } from '@/components/SettingsPanel'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { useStore } from '@/hooks/useStore'
import { totalDeltaMinutes } from '@/lib/balance'
import { todayISO } from '@/lib/date'
import { exportData } from '@/lib/storage'
import type { DayEntry, StoreData } from '@/lib/types'

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState('hoje')
  const [selectedDate, setSelectedDate] = useState(todayISO())

  const totalMinutes = totalDeltaMinutes(store.data.entries, store.data.settings)

  const handleEdit = (entry: DayEntry) => {
    setSelectedDate(entry.date)
    setTab('hoje')
  }

  const handleDelete = (entry: DayEntry) => {
    store.deleteEntry(entry.id)
    toast.success('Lançamento excluído.')
  }

  const handleExport = () => {
    exportData(store.data)
    toast.success('Backup exportado.')
  }

  const handleImport = (data: StoreData) => {
    store.replaceData(data)
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCapIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                Banco de Aulas
              </h1>
              <p className="text-xs text-muted-foreground">
                Saldo de horas em aulas
              </p>
            </div>
          </div>

          <Badge variant="outline" className="hidden sm:inline-flex">
            {store.data.entries.length}{' '}
            {store.data.entries.length === 1 ? 'lançamento' : 'lançamentos'}
          </Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-40 pt-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
          </TabsList>

          <TabsContent value="hoje" className="mt-4">
            <DayForm
              settings={store.data.settings}
              entriesByDate={store.entriesByDate}
              initialDate={selectedDate}
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
              onSave={store.updateSettings}
              onExport={handleExport}
              onImport={handleImport}
              onReset={store.resetData}
            />
          </TabsContent>
        </Tabs>
      </main>

      <BalanceCounter
        totalMinutes={totalMinutes}
        settings={store.data.settings}
      />

      <Toaster position="top-center" richColors />
    </div>
  )
}
