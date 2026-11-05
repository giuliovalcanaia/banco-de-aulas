import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAllowedAction, callSheets } from '../server/sheets'
import {
  readCookie,
  readSessionToken,
  SESSION_COOKIE,
} from '../server/session'

function readBody(req: VercelRequest): Record<string, unknown> {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>
  }
  return {}
}

function isSameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin
  if (!origin) return true

  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const currentHost = Array.isArray(host) ? host[0] : host

  try {
    return Boolean(currentHost) && new URL(origin).host === currentHost
  } catch {
    return false
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  if (!isSameOrigin(req)) {
    res.status(403).json({ error: 'Origem não permitida.' })
    return
  }

  const token = readCookie(req.headers.cookie, SESSION_COOKIE)
  const session = await readSessionToken(token)
  if (!session) {
    res.status(401).json({ error: 'Sessão expirada.' })
    return
  }

  const body = readBody(req)
  const action = body.action
  if (!isAllowedAction(action)) {
    res.status(400).json({ error: 'Ação inválida.' })
    return
  }

  try {
    const data = await callSheets(action, body.payload ?? {})
    res.status(200).json({ ok: true, data })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao falar com a planilha.'
    console.error('[sheets]', message)
    res.status(502).json({ error: message })
  }
}
