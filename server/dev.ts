import 'dotenv/config'
import { createServer as createHttpServer, type IncomingMessage } from 'node:http'
import { createServer as createViteServer } from 'vite'
import { handleApi } from '../api/_lib/api'

const port = Number(process.env.PORT ?? 5173)
const MAX_BODY_BYTES = 64 * 1024

class BodyError extends Error {}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length

    if (size > MAX_BODY_BYTES) {
      throw new BodyError('Request body is too large.')
    }

    chunks.push(buffer)
  }

  if (chunks.length === 0) return undefined

  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return undefined

  const contentType = String(request.headers['content-type'] ?? '')
  if (!contentType.includes('application/json')) return raw

  try {
    return JSON.parse(raw) as unknown
  } catch {
    throw new BodyError('Request body must be valid JSON.')
  }
}

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa',
})

const server = createHttpServer(async (request, response) => {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  )

  if (url.pathname.startsWith('/api')) {
    try {
      const body =
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : await readBody(request)

      const result = await handleApi({
        method: request.method ?? 'GET',
        path: url.pathname,
        headers: request.headers,
        body,
      })

      response.statusCode = result.status

      for (const [key, value] of Object.entries(result.headers ?? {})) {
        response.setHeader(key, value)
      }

      if (result.body === undefined) {
        response.end()
        return
      }

      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify(result.body))
    } catch (error) {
      const status = error instanceof BodyError ? 400 : 500
      const message =
        error instanceof BodyError
          ? error.message
          : 'Something went wrong on our side. Please try again.'

      if (!(error instanceof BodyError)) {
        console.error('[hush dev api]', error)
      }

      response.statusCode = status
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(
        JSON.stringify({ error: { code: 'request_error', message } }),
      )
    }

    return
  }

  vite.middlewares(request, response, () => {
    response.statusCode = 404
    response.end('Not found')
  })
})

server.listen(port, () => {
  console.log(`\n  hush is running at http://localhost:${port}\n`)
})
