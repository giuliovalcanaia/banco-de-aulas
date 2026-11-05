# Banco de Aulas

Controle pessoal de banco de horas docentes, medido em **aulas**.

A jornada padrão é de segunda a sexta, das 07:15 às 11:15 e das 13:00 às 17:00
(8 horas = 10 aulas). Só os dias divergentes são lançados: dia sem registro é
dia padrão, com saldo zero. Cada aula equivale a 48 minutos.

O saldo acumulado mostra quantas aulas foram trabalhadas além da jornada (ou
devidas, no caso de folgas) e o equivalente em horas e em dias de folga.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- shadcn/ui (Radix)
- Dados no `localStorage` do navegador, com exportação/importação em JSON

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
```

## Privacidade

Não há servidor, login ou analytics. Os registros ficam apenas no navegador do
dispositivo. Use o backup em JSON para guardar uma cópia ou levar os dados para
outra máquina.

## Estrutura

```
src/
├── components/
│   └── ui/        # componentes shadcn/ui
├── lib/           # regras de cálculo, armazenamento e utilitários
└── App.tsx
```
