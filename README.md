# Banco de Aulas

Controle pessoal de banco de horas docentes, medido em **aulas**.

A jornada padrão é de segunda a sexta, das 07:15 às 11:15 e das 13:00 às 17:00,
com 15 minutos de lanche em cada período (09:30–09:45 e 15:15–15:30). Isso dá
7h30 efetivas = 10 aulas de 45 minutos. Só os dias divergentes são lançados: dia
sem registro é dia padrão, com saldo zero.

Os dados ficam no **Cloud Firestore** e o acesso é protegido por **login Google**
via Firebase Auth. Qualquer conta Google pode entrar e gerenciar seu próprio
banco de horas: cada usuário vê **apenas os próprios dados** (`users/{uid}/...`).
O app é um **PWA** e funciona offline.

## Arquitetura

```
PWA (Vite/React)
  ├── Firebase Auth (Google)
  ├── Firestore (cache offline + sincronização em tempo real)
  └── Firebase Hosting
        └── https://banco-de-dados-7a088.web.app
```

- A sessão dura **30 dias**, validada no cliente e nas Security Rules.
- O Firestore guarda os dados por usuário (`users/{uid}/...`).
- O service worker cuida apenas do shell e dos assets.
- O deploy e a configuração estão em **[DEPLOY.md](DEPLOY.md)**.

## Configuração do Firebase

O projeto já está configurado:

- Projeto: `banco-de-dados-7a088`
- Firestore: `southamerica-east1` (São Paulo)
- Auth: Google habilitado
- Hosting: `https://banco-de-dados-7a088.web.app`

A configuração pública fica em `.env.local` (desenvolvimento) e nas **Variables**
do GitHub Actions (build/CI). O `.env.production` não é versionado, para não fixar
o projeto Firebase no repositório. O modelo está em `.env.example`:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=SEU_PROJETO.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=SEU_PROJETO
VITE_FIREBASE_STORAGE_BUCKET=SEU_PROJETO.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Esses valores não são segredos. A autorização e o isolamento entre usuários estão
em `firestore.rules`.

## Como rodar

```bash
npm install
npm run dev
```

Outros scripts:

```bash
npm run build         # typecheck + build de produção
npm run preview       # pré-visualização do build estático
npm run lint          # oxlint
npm test              # testes unitários (Vitest)
npm run test:watch
npm run test:rules    # Security Rules no emulador do Firestore
npm run emulators     # Auth + Firestore + UI locais
```

Para testar contra os emuladores:

```bash
npm run emulators
VITE_USE_FIREBASE_EMULATOR=true npm run dev
```

## Como usar

- **Hoje**: o formulário já vem preenchido com a jornada padrão. Altere só o
  que divergiu (ou remova um período para marcar folga) e salve. A data pode ser
  trocada pelo calendário ou pelo botão **Hoje**.
- **Histórico**: mostra apenas os dias lançados, agrupados por mês, com o saldo
  de cada dia e o subtotal do mês. Dá para editar ou excluir cada lançamento.
  Ao editar pelo histórico, mudar a data **move** o lançamento para o novo dia.
- **Ajustes**: muda a jornada padrão, a duração da aula e os dias úteis; exporta
  e importa backup em JSON; apaga todos os dados; tenta sincronizar e mostra a
  conta logada.
- **Contador de saldo**: no celular aparece como uma pílula no cabeçalho; no
  desktop fica no canto da tela com o saldo em aulas, o equivalente em horas e a
  estimativa em dias de folga.
- **Tema**: o botão de sol/lua alterna entre claro e escuro. A escolha fica
  salva no navegador (`localStorage`); na primeira visita o tema do sistema é
  usado.

### Instalar no celular (PWA)

- **Android/Chrome**: menu ⋮ → **Instalar app**.
- **iPhone/Safari**: **Compartilhar** → **Adicionar à Tela de Início**.

O app abre offline com os últimos dados em cache. Criar, editar e excluir também
funcionam offline; o Firestore envia tudo quando a conexão volta. A instalação
exige HTTPS (o Firebase Hosting fornece).

## Segurança e privacidade

- Login com qualquer conta Google; cada usuário acessa somente `users/{uid}/...`
  (o isolamento é imposto pelas Security Rules, não só pelo cliente).
- O Firebase Auth valida a identidade; o Firestore valida o `uid`, a verificação
  de e-mail e a validade da sessão.
- Sessão de 30 dias aplicada via `auth_time`, no cliente e nas Rules.
- O Firestore usa cache local persistente; ao sair, o app limpa esse cache.
- Não há servidor próprio de dados nem analytics.
- Para revogar o acesso de alguém, remova o usuário no Firebase Auth.

## Onde os dados ficam

```
users/{uid}/entries/{YYYY-MM-DD}
  date, morning, afternoon, note, updatedAt

users/{uid}/settings/main
  defaultMorning, defaultAfternoon, minutesPerAula, workdays, schemaVersion, updatedAt
```

- O ID do documento de entrada é a própria data, o que impede duplicatas.
- O navegador mantém um cache de leitura/escrita offline do Firestore.
- **Ajustes → Exportar JSON** gera uma cópia completa.
- O Firestore no plano Spark não tem backup gerenciado; use a exportação JSON.

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
- Tailwind CSS v4 + shadcn/ui (Radix)
- PWA (manifest + service worker) com ícones gerados a partir do favicon
- Firebase Auth + Cloud Firestore + Firebase Hosting
- Exportação/importação em JSON

## Estrutura

```
src/
├── components/       # UI (inclui shadcn/ui em components/ui)
├── hooks/            # estado, autenticação, sincronização e tema
├── lib/              # cálculo, Firebase, Firestore, armazenamento e auth
└── App.tsx
firestore.rules       # autorização e validação
firebase.json         # Hosting, headers/CSP, Firestore e emuladores
tests/                # testes das Security Rules
.github/workflows/    # deploy automático somente na main
```
