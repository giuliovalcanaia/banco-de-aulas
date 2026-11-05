import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SheetsConfig } from '@/lib/sheetsConfig'

type SetupScreenProps = {
  onConnect: (config: SheetsConfig) => void
}

export function SetupScreen({ onConnect }: SetupScreenProps) {
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanUrl = url.trim()
    const cleanToken = token.trim()

    if (!cleanUrl.startsWith('https://')) {
      toast.error('Cole a URL do Web App, começando com https://.')
      return
    }
    if (!cleanToken) {
      toast.error('Cole o token gerado no Apps Script.')
      return
    }

    onConnect({ url: cleanUrl, token: cleanToken })
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Conectar à planilha</CardTitle>
          <CardDescription>
            Os dados do Banco de Aulas ficam em uma planilha do Google. A conexão
            precisa ser feita uma vez por navegador.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Crie uma planilha e abra Extensões → Apps Script.</li>
            <li>
              Cole o arquivo <code>google-apps-script/Code.gs</code> do projeto.
            </li>
            <li>
              Execute a função <code>setup</code> e copie o token exibido nos
              registros.
            </li>
            <li>
              Implante como Web App com acesso “qualquer pessoa” e copie a URL
              terminada em <code>/exec</code>.
            </li>
          </ol>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sheets-url">URL do Web App</Label>
              <Input
                id="sheets-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sheets-token">Token</Label>
              <Input
                id="sheets-token"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Token gerado no Apps Script"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <Button type="submit" className="w-full">
              Conectar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
