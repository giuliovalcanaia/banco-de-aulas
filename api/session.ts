import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  readCookie,
  readSessionToken,
  SESSION_COOKIE,
} from '../server/session'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const token = readCookie(req.headers.cookie, SESSION_COOKIE)
  const session = await readSessionToken(token)

  if (!session) {
    res.status(401).json({ error: 'Sessão expirada.' })
    return
  }

  res.status(200).json({ ok: true, email: session.email })
}
