import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSessionToken, SESSION_COOKIE } from './session'
import { isAllowedAction } from './sheets'
import handler from '../api/sheets'

type MockResponse = {
  statusCode: number
  body: unknown
  headers: Record<string, unknown>
  setHeader: (key: string, value: unknown) => MockResponse
  status: (code: number) => MockResponse
  json: (body: unknown) => MockResponse
}

function createResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 0,
    body: undefined,
    headers: {},
    setHeader(key, value) {
      res.headers[key] = value
      return res
    },
    status(code) {
      res.statusCode = code
      return res
    },
    json(body) {
      res.body = body
      return res
    },
  }
  return res
}

function createRequest(options: {
  cookie?: string
  origin?: string
  body?: unknown
}): VercelRequest {
  return {
    method: 'POST',
    headers: {
      host: 'localhost',
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.origin ? { origin: options.origin } : {}),
    },
    body: options.body ?? {},
  } as unknown as VercelRequest
}

async function call(
  req: VercelRequest,
): Promise<MockResponse> {
  const res = createResponse()
  await handler(req, res as unknown as VercelResponse)
  return res
}

describe('api/sheets', () => {
  let token: string

  beforeEach(async () => {
    process.env.SESSION_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres'
    process.env.SHEETS_API_URL = 'https://planilha.teste/exec'
    process.env.SHEETS_TOKEN = 'token-secreto'
    process.env.NODE_ENV = 'test'
    delete process.env.VERCEL_ENV

    token = await createSessionToken('giuliovalcanaia@gmail.com')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exige uma sessão válida', async () => {
    const res = await call(
      createRequest({ body: { action: 'load' } }),
    )

    expect(res.statusCode).toBe(401)
  })

  it('recusa origem diferente da do app', async () => {
    const res = await call(
      createRequest({
        cookie: `${SESSION_COOKIE}=${token}`,
        origin: 'https://malicioso.example',
        body: { action: 'load' },
      }),
    )

    expect(res.statusCode).toBe(403)
  })

  it('recusa ação fora da allowlist', async () => {
    const res = await call(
      createRequest({
        cookie: `${SESSION_COOKIE}=${token}`,
        body: { action: 'executarQualquerCoisa' },
      }),
    )

    expect(res.statusCode).toBe(400)
    expect(isAllowedAction('executarQualquerCoisa')).toBe(false)
  })

  it('encaminha a ação com o token do servidor', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, data: { entries: [], settings: {} } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await call(
      createRequest({
        cookie: `${SESSION_COOKIE}=${token}`,
        body: { action: 'load', payload: {} },
      }),
    )

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      data: { entries: [], settings: {} },
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const forwarded = JSON.parse(String(init.body)) as {
      token: string
      action: string
    }
    expect(forwarded.token).toBe('token-secreto')
    expect(forwarded.action).toBe('load')
  })

  it('repassa erro da planilha como 502', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: 'Token inválido.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    const res = await call(
      createRequest({
        cookie: `${SESSION_COOKIE}=${token}`,
        body: { action: 'load' },
      }),
    )

    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({ error: 'Token inválido.' })
  })
})
