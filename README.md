# Banco de Aulas

Controle pessoal de banco de horas docentes, medido em **aulas**.

A jornada padrão é de segunda a sexta, das 07:15 às 11:15 e das 13:00 às 17:00,
com 15 minutos de lanche em cada período (09:30–09:45 e 15:15–15:30). Isso dá
7h30 efetivas = 10 aulas de 45 minutos. Só os dias divergentes são lançados: dia
sem registro é dia padrão, com saldo zero.

Os dados ficam em uma **planilha do Google**, não no navegador. Assim, trocar de
navegador ou limpar o cache não apaga nada.

## Configuração da planilha (uma vez)

1. Crie uma planilha no Google Sheets.
2. Abra **Extensões → Apps Script**.
3. Substitua o conteúdo de `Code.gs` pelo arquivo
   `google-apps-script/Code.gs` deste projeto.
4. Execute a função `setup` e autorize o acesso.
5. Abra **Exibir → Registros** e copie o token exibido.
6. Vá em **Implantar → Nova implantação → App da Web**:
   - Executar como: **eu**
   - Quem tem acesso: **qualquer pessoa**
7. Copie a URL terminada em `/exec`.
8. Abra o app e cole a URL e o token na tela **Conectar à planilha**.

A conexão fica salva no navegador. Em outro navegador ou celular, repita apenas o
passo 8 (ou use as variáveis de ambiente abaixo).

### Variáveis de ambiente (opcional)

Copie `.env.example` para `.env.local` e preencha:

```bash
VITE_SHEETS_API_URL=https://script.google.com/macros/s/SEU_ID/exec
VITE_SHEETS_TOKEN=seu_token
```

Com as duas variáveis preenchidas, o app conecta direto, sem mostrar a tela de
configuração.

## Como usar

- **Hoje**: o formulário já vem preenchido com a jornada padrão. Altere só o
  que divergiu, use os atalhos ("Saída 12:00", "Saída 17:45", "Folga") e salve.
  O saldo do dia aparece antes de confirmar.
- **Histórico**: mostra apenas os dias lançados, agrupados por mês, com o saldo
  de cada dia e o subtotal do mês. Dá para editar ou excluir cada lançamento.
  Ao editar pelo histórico, mudar a data **move** o lançamento para o novo dia
  em vez de criar uma cópia.
- **Ajustes**: muda a jornada padrão, a duração da aula e os dias úteis; exporta
  e importa backup em JSON; apaga todos os dados; recarrega ou desconecta a
  planilha.
- **Contador flutuante**: fica no canto da tela com o saldo em aulas, o
  equivalente em horas e a estimativa em dias de folga.

## Onde os dados ficam

- Aba **Lançamentos**: um registro por dia, com os períodos e a observação.
- Aba **Ajustes**: uma linha com a jornada padrão, minutos por aula e dias úteis.
- O navegador guarda apenas um cache de leitura para abrir a tela mais rápido.
  A fonte de verdade é sempre a planilha.

Para fazer backup:

- **Ajustes → Exportar JSON** gera uma cópia completa.
- O Google Drive mantém o histórico de versões da planilha.
- Também é possível fazer uma cópia da planilha pelo menu **Arquivo**.

## Regras de cálculo

```
minutos do dia   = (manhã − lanche) + (tarde − lanche)
saldo do dia     = minutos do dia − jornada padrão (450 min)
saldo em aulas   = saldo do dia ÷ 45
saldo total      = soma dos lançamentos
```

O lanche da manhã (09:30–09:45) e o da tarde (15:15–15:30) não entram na
contagem. Esses intervalos ficam em `src/lib/schedule.ts`. Um dia sem lançamento
vale zero, então o total é sempre a soma dos dias registrados. Folga é um
lançamento sem períodos e desconta 10 aulas.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- shadcn/ui (Radix)
- Google Apps Script + Google Sheets
- Exportação/importação em JSON

## Como rodar

```bash
npm install
npm run dev
```

Outros scripts:

```bash
npm run build    # build de produção
npm run preview  # pré-visualização do build
npm run lint     # oxlint
npm test         # testes de cálculo
```

O build gera arquivos estáticos em `dist/`; pode ser publicado em qualquer
hospedagem estática, como Vercel ou GitHub Pages.

## Privacidade

Não há servidor próprio, login ou analytics. Os dados ficam na sua conta do
Google, na planilha configurada. A URL do Web App e o token dão acesso à
planilha: não compartilhe o token. Para revogar o acesso, gere outro token ou
arquive a implantação no Apps Script.

## Estrutura

```
src/
├── components/
│   └── ui/        # componentes shadcn/ui
├── hooks/         # estado e sincronização
├── lib/           # cálculo, API da planilha e armazenamento
└── App.tsx
google-apps-script/
└── Code.gs        # API que lê e escreve na planilha
```
