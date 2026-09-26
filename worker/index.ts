import { runLiveInvestigation } from '../domain/live'
import { liveRequestSchema, type LiveResult } from '../domain/live-contract'
export { DailyBudget } from './daily-budget'

type LiveSecrets = { OPENAI_API_KEY: string; ALLOWED_ORIGIN: string }

function isAllowedOrigin(origin: string | null, configured: string): origin is string {
  if (!origin) return false
  if (origin === configured) return true
  try {
    const requested = new URL(origin)
    const allowed = new URL(configured)
    const loopback = new Set(['localhost', '127.0.0.1'])
    return (
      requested.protocol === 'http:' &&
      allowed.protocol === 'http:' &&
      loopback.has(requested.hostname) &&
      loopback.has(allowed.hostname) &&
      requested.port === allowed.port &&
      requested.username === '' &&
      requested.password === '' &&
      requested.pathname === '/' &&
      requested.search === '' &&
      requested.hash === ''
    )
  } catch {
    return false
  }
}

function json(body: object, status: number, origin: string | null) {
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
  }
  return new Response(JSON.stringify(body), { status, headers })
}

function streamInvestigation(
  scenarioId: string,
  apiKey: string,
  question: string | undefined,
  origin: string,
): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  const send = (
    event:
      | { type: 'tool'; tool: LiveResult['tools'][number] }
      | { type: 'complete'; result: LiveResult }
      | { type: 'error'; error: string },
  ) => writer.write(encoder.encode(`${JSON.stringify(event)}\n`))
  const task = (async () => {
    try {
      const result = await runLiveInvestigation(scenarioId, apiKey, fetch, question, (tool) =>
        send({ type: 'tool', tool }),
      )
      await send({ type: 'complete', result })
    } catch {
      try {
        await send({
          type: 'error',
          error:
            'The live model could not produce a verified answer. Try again or explore a guided investigation.',
        })
      } catch {
        // The visitor may have disconnected while the investigation was running.
      }
    } finally {
      try {
        await writer.close()
      } catch {
        // A canceled response stream is already closed.
      }
    }
  })()
  // The response body keeps the Worker active until this task closes its writer.
  void task
  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

async function smallJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader()
  if (!reader) throw new Error('Missing request body')
  const chunks: Uint8Array[] = []
  let bytes = 0
  while (true) {
    const next = await reader.read()
    if (next.done) break
    bytes += next.value.byteLength
    if (bytes > 1024) {
      await reader.cancel()
      throw new Error('Request body exceeds 1024 bytes')
    }
    chunks.push(next.value)
  }
  const body = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(body))
}

export default {
  async fetch(request, env): Promise<Response> {
    const origin = request.headers.get('Origin')
    if (!env.ALLOWED_ORIGIN || !env.OPENAI_API_KEY)
      return json({ error: 'Live investigation is not configured' }, 503, null)
    if (!isAllowedOrigin(origin, env.ALLOWED_ORIGIN))
      return json({ error: 'Origin is not allowed' }, 403, null)
    if (new URL(request.url).pathname !== '/investigate')
      return json({ error: 'Unknown endpoint' }, 404, origin)
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '600',
          Vary: 'Origin',
        },
      })
    if (request.method !== 'POST') return json({ error: 'POST required' }, 405, origin)
    if (!request.headers.get('Content-Type')?.startsWith('application/json'))
      return json({ error: 'JSON required' }, 415, origin)
    let scenarioId: string
    let question: string | undefined
    try {
      const parsed = liveRequestSchema.parse(await smallJson(request))
      scenarioId = parsed.scenarioId
      question = parsed.question
    } catch {
      return json({ error: 'Choose a supported investigation' }, 400, origin)
    }
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    const visitor = await env.PER_VISITOR.limit({ key: ip })
    const location = await env.PER_LOCATION.limit({ key: 'live-investigations' })
    if (!visitor.success || !location.success)
      return json({ error: 'Live investigation limit reached. Try again later.' }, 429, origin)
    if (!(await env.BUDGET.getByName('portfolio-public').reserve()))
      return json(
        { error: 'The daily live investigation limit is reached. Explore a guided investigation.' },
        429,
        origin,
      )
    if (request.headers.get('Accept')?.includes('application/x-ndjson'))
      return streamInvestigation(scenarioId, env.OPENAI_API_KEY, question, origin)
    try {
      return json(
        await runLiveInvestigation(scenarioId, env.OPENAI_API_KEY, fetch, question),
        200,
        origin,
      )
    } catch {
      return json(
        {
          error:
            'The live model could not produce a verified answer. Try again or explore a guided investigation.',
        },
        502,
        origin,
      )
    }
  },
} satisfies ExportedHandler<Env & LiveSecrets>
