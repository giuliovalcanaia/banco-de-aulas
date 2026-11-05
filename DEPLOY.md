# Deploy no Firebase

Arquitetura atual:

```
PWA (Vite/React)
  ├── Firebase Auth (Google)
  ├── Firestore (cache offline + sincronização em tempo real)
  └── Firebase Hosting
        └── https://banco-de-dados-7a088.web.app
```

Projeto Firebase: **`banco-de-dados-7a088`** (“banco-de-horas”).
Firestore: **`southamerica-east1`** (São Paulo), plano Spark.

Não há mais Vercel Functions, Apps Script nem token de planilha no caminho do app.

---

## 1. O que já está configurado

- Firestore criado e com as Security Rules aplicadas.
- Firebase Auth com provedor **Google** habilitado.
- App web registrado como **Banco de Aulas**.
- Hosting publicado em `https://banco-de-dados-7a088.web.app`.
- Domínios autorizados no Auth:
  - `localhost`
  - `banco-de-dados-7a088.web.app`
  - `banco-de-dados-7a088.firebaseapp.com`
- Sessão de **30 dias**, aplicada no cliente e nas Security Rules via `auth_time`.

> Se o Google exibir “app não verificado” ou bloquear o acesso, abra **Google
> Cloud → APIs & Services → OAuth consent screen** e publique o app ou adicione
> `giuliovalcanaia@gmail.com` como usuário de teste. Com os escopos
> `openid email profile` não há verificação paga.

---

## 2. Desenvolvimento local

```bash
npm install
npm run dev
```

O `.env.local` contém a configuração pública do app web Firebase. Esses valores
não são segredos; a proteção real está nas Security Rules.

Para usar os emuladores:

```bash
npm run emulators
# em outro terminal:
VITE_USE_FIREBASE_EMULATOR=true npm run dev
```

O emulador de Auth permite criar usuários de teste na interface
`http://127.0.0.1:4000`. O emulador de Firestore exige Java.

### Testes

```bash
npm test          # testes unitários
npm run test:rules # Security Rules no emulador do Firestore
npm run lint
npm run build
```

---

## 3. Security Rules

Arquivo: `firestore.rules`.

- Só o e-mail `giuliovalcanaia@gmail.com`, verificado, acessa os dados.
- Cada usuário só acessa `users/{uid}/...`.
- O ID do documento de entrada é a data (`YYYY-MM-DD`).
- Horários, observação e ajustes são validados.
- `sessionValid()` exige `auth_time` com menos de 30 dias. Depois disso, leituras
  e escritas são negadas até um novo login.
- Qualquer outra subcoleção é negada.

Para alterar as regras:

```bash
npx firebase-tools deploy --only firestore:rules --project banco-de-dados-7a088
```

Ou valide antes:

```bash
npx firebase-tools deploy --only firestore:rules --project banco-de-dados-7a088 --dry-run
```

---

## 4. Deploy automático (GitHub Actions)

Arquivo: `.github/workflows/firebase-deploy.yml`.

- Roda **somente** em push para `main`.
- A branch `dev` não publica.
- Executa lint, testes, build e depois:
  - Firebase Hosting;
  - Firestore Rules.

### Configuração necessária no GitHub

1. Crie uma service account no Google Cloud do projeto:
   - Console → IAM & Admin → Service Accounts → Create.
   - Permissões mínimas:
     - **Firebase Hosting Admin**
     - **Firebase Rules Admin**
   - Gere uma chave JSON.
2. No GitHub, em **Settings → Secrets and variables → Actions**, crie o secret:
   - `FIREBASE_SERVICE_ACCOUNT`: conteúdo do JSON.
3. Faça push/merge na `main`.

As variáveis `VITE_FIREBASE_*` estão em `.env.production`, que é versionado. A
configuração do Firebase é pública; não há segredo nela.

### Deploy manual

```bash
npm run build
npx firebase-tools deploy --only hosting,firestore:rules --project banco-de-dados-7a088
```

Se mudar provedores de login:

```bash
npx firebase-tools deploy --only auth --project banco-de-dados-7a088
```

---

## 5. Migração dos dados da planilha

O app antigo (Vercel + Sheets) continua sendo a fonte histórica até a migração
ser concluída.

1. Abra o app antigo e confirme que os dados carregaram.
2. **Ajustes → Exportar JSON**.
3. Abra o app novo em `https://banco-de-dados-7a088.web.app`.
4. Entre com `giuliovalcanaia@gmail.com`.
5. **Ajustes → Importar JSON** e selecione o arquivo.
6. Confira:
   - quantidade de lançamentos;
   - saldo total;
   - folgas e observações;
   - ajustes da jornada.
7. Teste criar, editar, mudar a data e excluir.
8. Teste offline e em um segundo dispositivo.

O `replaceAll` do app grava tudo em batches e substitui os dados atuais. Se
precisar refazer a importação, basta repetir o processo.

### Rollback

Enquanto o app antigo estiver disponível:

1. Exporte o JSON do app novo.
2. Importe no app antigo (Vercel).
3. Volte a usar a Vercel/planilha.

Depois da validação, o app antigo pode ser desligado.

---

## 6. Sessão de 30 dias

- O Firebase mantém a sessão localmente e renova o ID token a cada hora.
- O horário do login fica em `auth_time`.
- O cliente verifica a cada minuto e ao voltar para a aba; depois de 30 dias,
  faz logout e mostra “Sua sessão de 30 dias expirou”.
- As Security Rules também verificam `auth_time`. Mesmo que o cliente seja
  burlado, o Firestore nega leituras/escritas depois de 30 dias.

Para encerrar todas as sessões antes do prazo, troque a senha/revogue o acesso
da conta Google ou remova o usuário no Firebase Auth.

---

## 7. Offline e PWA

- O Firestore usa cache persistente (`persistentLocalCache`) com suporte a
  múltiplas abas.
- Criar, editar e excluir offline entram numa fila e sincronizam ao voltar.
- O service worker guarda apenas o shell e os assets; não intercepta Firestore
  nem Auth.
- Após logout, o app limpa o cache local do Firestore e recarrega.
- Instalação:
  - Android/Chrome: menu → **Instalar app**.
  - iPhone/Safari: **Compartilhar → Adicionar à Tela de Início**.
- No iOS, o login pode abrir o Safari. Depois de autenticar, o Firebase mantém a
  sessão ao voltar para o PWA.

---

## 8. Checklist de validação

- [ ] Login com `giuliovalcanaia@gmail.com`.
- [ ] Outra conta Google recebe “Esta conta não tem acesso”.
- [ ] Recarregar mantém a sessão.
- [ ] Importar JSON antigo e conferir saldo.
- [ ] Criar, editar, mover data e excluir lançamento.
- [ ] Offline: editar, fechar, voltar online e confirmar sincronização.
- [ ] Dois dispositivos sincronizam em tempo real.
- [ ] PWA instalado no Android e no iPhone.
- [ ] `https://banco-de-dados-7a088.web.app/manifest.webmanifest` responde 200.
- [ ] Console sem erros de CSP.
- [ ] Push na `main` dispara o GitHub Actions; push na `dev` não publica.
- [ ] Regras de 30 dias testadas (`npm run test:rules`).

---

## 9. Descomissionamento do sistema antigo

Depois de validar por alguns dias:

1. Remover `api/`, `server/`, `vercel.json`, `tsconfig.server.json`.
2. Remover as dependências `google-auth-library`, `jose` e `@vercel/node`
   (o cliente da planilha já foi removido).
3. Arquivar `google-apps-script/` (ou manter apenas como histórico).
4. Arquivar/apagar o projeto na Vercel.
5. Arquivar a implantação do Apps Script e revogar o token.
6. Remover o OAuth Client antigo, se não for reutilizado.
7. Manter a planilha antiga como backup somente leitura por algumas semanas.
8. Atualizar este documento e o README.

O PWA instalado na origem antiga (`vercel.app`) não migra sozinho. É preciso
desinstalar e instalar de novo a partir de `https://banco-de-dados-7a088.web.app`.

---

## 10. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| “Firebase não configurado” | `.env.local`/`.env.production` sem as variáveis `VITE_FIREBASE_*` |
| “Este domínio não está autorizado” | Domínio fora de Auth → Settings → Authorized domains |
| “Esta conta não tem acesso” | E-mail diferente de `AUTHORIZED_EMAIL` / Rules |
| Login abre e fecha no iPhone | Popup bloqueado; o app cai para redirect em PWA standalone |
| Dados não sincronizam | Offline ou regras negando; conferir console e `npm run test:rules` |
| Sessão expira antes de 30 dias | Relógio do dispositivo adiantado ou `auth_time` antigo |
| GitHub Actions falha | Secret `FIREBASE_SERVICE_ACCOUNT` ausente ou sem permissão |
