import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clearedSessionCookie } from '../server/session'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  res.setHeader('Set-Cookie', clearedSessionCookie())
  res.status(200).json({ ok: true })
}
