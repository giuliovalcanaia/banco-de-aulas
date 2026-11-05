#!/usr/bin/env node
/**
 * Dispara uma notificação falsa no desktop (Linux) para testar a aparência.
 * Uso: npm run test:notif
 */
import { spawnSync } from 'node:child_process'

const title = process.argv[2] ?? 'Banco de Aulas'
const body =
  process.argv[3] ??
  'Notificação de teste: se você está vendo isso, está tudo funcionando.'

const result = spawnSync(
  'notify-send',
  [
    '--app-name=Banco de Aulas',
    '--icon=dialog-information',
    '--urgency=normal',
    '--expire-time=8000',
    '--category=test',
    title,
    body,
  ],
  { stdio: 'inherit' },
)

if (result.error) {
  console.error('Não foi possível executar notify-send:', result.error.message)
  console.error('Instale o pacote libnotify (ex.: sudo pacman -S libnotify).')
  process.exit(1)
}

process.exit(result.status ?? 1)
