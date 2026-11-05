import type { VercelRequest, VercelResponse } from '@vercel/node'
import { OAuth2Client } from 'google-auth-library'
import { requireEnv } from '../server/env'
import { createSessionToken, sessionCookie } from '../server/session'

const googleClient = new OAuth2Client()

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const body = readBody(req)
  const credential = body.credential
  if (typeof credential !== 'string' || !credential) {
    res.status(400).json({ error: 'Credencial do Google ausente.' })
    return
  }

  let clientId: string
  let allowedEmail: string
  try {
    clientId = requireEnv('GOOGLE_CLIENT_ID')
    allowedEmail = requireEnv('AUTHORIZED_EMAIL').trim().toLowerCase()
  } catch (error) {
    console.error('[login] configuração ausente', error)
    res.status(500).json({ error: 'Login não configurado no servidor.' })
    return
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    })
    const payload = ticket.getPayload()
    const email = payload?.email?.trim().toLowerCase()

    if (
      !payload ||
      payload.email_verified !== true ||
      !email ||
      email !== allowedEmail
    ) {
      res.status(403).json({ error: 'Esta conta não tem acesso.' })
      return
    }

    let token: string
    try {
      token = await createSessionToken(email)
    } catch (sessionError) {
      console.error('[login] não foi possível criar a sessão', sessionError)
      res.status(500).json({ error: 'Sessão não configurada no servidor.' })
      return
    }

    res.setHeader('Set-Cookie', sessionCookie(token))
    res.status(200).json({ ok: true, email })
  } catch (error) {
    console.error(
      '[login] credencial inválida',
      error instanceof Error ? error.message : error,
    )
    res.status(401).json({ error: 'Não foi possível validar o login. Tente de novo.' })
  }
}
