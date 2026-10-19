import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleApi } from './api.js'

function normalizeBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as unknown
    } catch {
      return body
    }
  }

  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf8')) as unknown
    } catch {
      return body.toString('utf8')
    }
  }

  return body
}

export function segment(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export async function runApi(
  request: VercelRequest,
  response: VercelResponse,
  path: string,
) {
  try {
    const result = await handleApi({
      method: request.method ?? 'GET',
      path,
      headers: request.headers,
      body: normalizeBody(request.body),
    })

    response.status(result.status)

    for (const [key, value] of Object.entries(result.headers ?? {})) {
      response.setHeader(key, value)
    }

    if (result.body === undefined) {
      response.end()
      return
    }

    response.json(result.body)
  } catch (error) {
    console.error('[hush handler]', error)

    if (!response.headersSent) {
      response.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Something went wrong on our side. Please try again.',
        },
      })
    } else {
      response.end()
    }
  }
}
