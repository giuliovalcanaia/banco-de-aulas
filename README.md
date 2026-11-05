# Banco de Aulas

Controle pessoal de banco de horas docentes, medido em **aulas**.

A jornada padrão é de segunda a sexta, das 07:15 às 11:15 e das 13:00 às 17:00
(8 horas = 10 aulas). Só os dias divergentes são lançados: dia sem registro é
dia padrão, com saldo zero. Cada aula equivale a 48 minutos.

O saldo acumulado mostra quantas aulas foram trabalhadas além da jornada (ou
devidas, no caso de folgas) e o equivalente em horas e em dias de folga.

## Como usar

- **Hoje**: o formulário já vem preenchido com a jornada padrão. Altere só o
  que divergiu, use os atalhos ("Saída 12:00", "Saída 17:45", "Folga") e salve.
  O saldo do dia aparece antes de confirmar.
- **Histórico**: mostra apenas os dias lançados, agrupados por mês, com o saldo
  de cada dia e o subtotal do mês. Dá para editar ou excluir cada lançamento.
- **Ajustes**: muda a jornada padrão, a duração da aula e os dias úteis; exporta
  e importa backup em JSON; apaga todos os dados.
- **Contador flutuante**: fica no canto da tela com o saldo em aulas, o
  equivalente em horas e a estimativa em dias de folga.

## Regras de cálculo

```
minutos do dia   = manhã + tarde
saldo do dia     = minutos do dia − jornada padrão (480 min)
saldo em aulas   = saldo do dia ÷ 48
saldo total      = soma dos lançamentos
```

Um dia sem lançamento vale zero, então o total é sempre a soma dos dias
registrados. Folga é um lançamento sem períodos e desconta 10 aulas.

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
