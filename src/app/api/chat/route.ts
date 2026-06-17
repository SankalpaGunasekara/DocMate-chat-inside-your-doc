import { NextRequest } from 'next/server'

export const runtime = 'edge'

interface ChatBody {
  provider: 'openrouter' | 'nims'
  apiKey: string
  model: string
  baseUrl?: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
}

function resolveBaseUrl(provider: string, baseUrl?: string): string {
  if (baseUrl && baseUrl.trim().length > 0) return baseUrl.replace(/\/$/, '')
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1'
  if (provider === 'nims') return 'https://integrate.api.nvidia.com/v1'
  return 'https://openrouter.ai/api/v1'
}

export async function POST(req: NextRequest) {
  let body: ChatBody
  try {
    body = (await req.json()) as ChatBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { provider, apiKey, model, messages } = body
  if (!apiKey || !model || !messages || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing apiKey, model, or messages' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const baseUrl = resolveBaseUrl(provider, body.baseUrl)
  const url = `${baseUrl}/chat/completions`

  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  if (provider === 'openrouter') {
    upstreamHeaders['HTTP-Referer'] = 'https://docmate.local'
    upstreamHeaders['X-Title'] = 'DocMate'
  }

  const upstreamBody = JSON.stringify({
    model,
    messages,
    stream: true,
    temperature: 0.7,
  })

  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: upstreamHeaders,
      body: upstreamBody,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: `Failed to reach ${provider}: ${(err as Error).message}`,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    return new Response(
      JSON.stringify({
        error: `Upstream ${provider} error ${upstream.status}: ${text.slice(0, 500)}`,
      }),
      {
        status: upstream.status || 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  // Re-encode as SSE for the client: parse OpenAI-style chunks and emit "data: {json}\n\n"
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader()
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const raw of lines) {
            const line = raw.trim()
            if (!line || !line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (payload === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              continue
            }
            try {
              const json = JSON.parse(payload)
              const delta = json?.choices?.[0]?.delta?.content ?? ''
              if (delta) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ delta })}\n\n`,
                  ),
                )
              }
            } catch {
              // ignore malformed chunk
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: `Stream error: ${(err as Error).message}`,
            })}\n\n`,
          ),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
