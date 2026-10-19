import type {
  AdminEventPayload,
  CreateEventPayload,
  EventStatus,
  HushEvent,
} from '../../shared/types'
import {
  adminKeyMatches,
  checkHealth,
  createEvent,
  createQuestion,
  deleteQuestion,
  getEventRecord,
  getQuestionRecord,
  getQuestions,
  hashAdminKey,
  randomId,
  setEventStatus,
  updateQuestion,
} from './db.js'

export interface ApiRequest {
  method: string
  path: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

export interface ApiResponse {
  status: number
  body?: unknown
  headers?: Record<string, string>
}

class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function respond(status: number, body?: unknown): ApiResponse {
  return {
    status,
    body,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  }
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string {
  const raw = headers[name] ?? headers[name.toLowerCase()]
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value.trim() : ''
}

function getAdminKey(headers: Record<string, string | string[] | undefined>) {
  const authorization = headerValue(headers, 'authorization')
  if (authorization) {
    return authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : authorization
  }

  return headerValue(headers, 'x-admin-key')
}

function requireAdminKey(headers: Record<string, string | string[] | undefined>) {
  const key = getAdminKey(headers)
  if (!key) {
    throw new ApiError(401, 'missing_admin_key', 'An admin key is required.')
  }
  return key
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'invalid_body', 'Expected a JSON object.')
  }
  return value as Record<string, unknown>
}

function stripControlCharacters(value: string, allowNewlines: boolean) {
  let result = ''

  for (const character of value) {
    const code = character.codePointAt(0) ?? 0

    if (code === 9) {
      result += character
      continue
    }

    if (allowNewlines && (code === 10 || code === 13)) {
      result += character
      continue
    }

    if (code < 32 || code === 127) continue

    result += character
  }

  return result
}

function cleanText(value: unknown, allowNewlines = true): string {
  if (typeof value !== 'string') return ''
  return stripControlCharacters(value, allowNewlines).trim()
}

function requireText(
  value: unknown,
  field: string,
  { min, max, newlines = false }: { min: number; max: number; newlines?: boolean },
): string {
  const text = cleanText(value, newlines)

  if (text.length < min) {
    throw new ApiError(
      400,
      'invalid_' + field,
      `${field === 'title' ? 'Title' : field === 'body' ? 'Question' : 'Description'} must be at least ${min} characters.`,
    )
  }

  if (text.length > max) {
    throw new ApiError(
      400,
      'invalid_' + field,
      `${field === 'title' ? 'Title' : field === 'body' ? 'Question' : 'Description'} must be ${max} characters or fewer.`,
    )
  }

  return text
}

async function requireEvent(id: string) {
  const record = await getEventRecord(id)
  if (!record) {
    throw new ApiError(404, 'event_not_found', 'This event could not be found.')
  }
  return record
}

async function requireAdminEvent(
  id: string,
  headers: Record<string, string | string[] | undefined>,
) {
  const record = await requireEvent(id)
  const key = requireAdminKey(headers)

  if (!adminKeyMatches(key, record.adminKeyHash)) {
    throw new ApiError(401, 'invalid_admin_key', 'That admin key is not valid.')
  }

  return record
}

function isEventStatus(value: unknown): value is EventStatus {
  return value === 'open' || value === 'closed'
}

function splitPath(path: string): string[] {
  const pathname = path.split('?')[0] ?? ''
  const withoutApi = pathname.replace(/^\/api(?=\/|$)/, '')

  return withoutApi
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment)
      } catch {
        return segment
      }
    })
}

export async function handleApi(request: ApiRequest): Promise<ApiResponse> {
  const method = request.method.toUpperCase()
  const segments = splitPath(request.path)

  try {
    if (segments[0] === 'health' && method === 'GET') {
      await checkHealth()
      return respond(200, { ok: true })
    }

    if (segments[0] === 'events') {
      if (segments.length === 1 && method === 'POST') {
        const body = asRecord(request.body)

        if (cleanText(body.website)) {
          throw new ApiError(400, 'invalid_body', 'Invalid submission.')
        }

        const title = requireText(body.title, 'title', { min: 3, max: 80 })
        const description = cleanText(body.description).slice(0, 240)
        const adminKey = randomId(32)

        const event = await createEvent({
          title,
          description,
          adminKeyHash: hashAdminKey(adminKey),
        })

        const payload: CreateEventPayload = { event, adminKey }
        return respond(201, payload)
      }

      const eventId = segments[1]
      if (!eventId) {
        throw new ApiError(404, 'not_found', 'Not found.')
      }

      if (segments.length === 2 && method === 'GET') {
        const { event } = await requireEvent(eventId)
        const payload: { event: HushEvent } = { event }
        return respond(200, payload)
      }

      if (segments.length === 3 && segments[2] === 'admin' && method === 'GET') {
        const { event } = await requireAdminEvent(eventId, request.headers)
        const questions = await getQuestions(eventId)
        const payload: AdminEventPayload = { event, questions }
        return respond(200, payload)
      }

      if (segments.length === 2 && method === 'PATCH') {
        await requireAdminEvent(eventId, request.headers)
        const body = asRecord(request.body)

        if (!isEventStatus(body.status)) {
          throw new ApiError(
            400,
            'invalid_status',
            'Status must be either "open" or "closed".',
          )
        }

        const event = await setEventStatus(eventId, body.status)
        return respond(200, { event })
      }

      if (
        segments.length === 3 &&
        segments[2] === 'questions' &&
        method === 'POST'
      ) {
        const { event } = await requireEvent(eventId)

        if (event.status !== 'open') {
          throw new ApiError(
            403,
            'event_closed',
            'This Q&A is closed and is not accepting new questions.',
          )
        }

        const body = asRecord(request.body)

        if (cleanText(body.website)) {
          return respond(201, { ok: true })
        }

        const questionBody = requireText(body.body, 'body', {
          min: 2,
          max: 1000,
          newlines: true,
        })

        await createQuestion(eventId, questionBody)
        return respond(201, { ok: true })
      }
    }

    if (segments[0] === 'questions' && segments[1]) {
      const questionId = segments[1]
      const question = await getQuestionRecord(questionId)

      if (!question) {
        throw new ApiError(404, 'question_not_found', 'Question not found.')
      }

      await requireAdminEvent(question.eventId, request.headers)

      if (method === 'PATCH') {
        const body = asRecord(request.body)

        if (
          typeof body.isAnswered !== 'boolean' &&
          typeof body.isPinned !== 'boolean'
        ) {
          throw new ApiError(
            400,
            'invalid_body',
            'Provide isAnswered or isPinned as a boolean.',
          )
        }

        const updated = await updateQuestion(questionId, question.eventId, {
          isAnswered:
            typeof body.isAnswered === 'boolean' ? body.isAnswered : undefined,
          isPinned:
            typeof body.isPinned === 'boolean' ? body.isPinned : undefined,
        })

        return respond(200, { question: updated })
      }

      if (method === 'DELETE') {
        await deleteQuestion(questionId, question.eventId)
        return respond(200, { ok: true })
      }
    }

    throw new ApiError(404, 'not_found', 'Not found.')
  } catch (error) {
    if (error instanceof ApiError) {
      return respond(error.status, {
        error: { code: error.code, message: error.message },
      })
    }

    const message = error instanceof Error ? error.message : String(error)
    console.error('[hush api]', message)

    return respond(500, {
      error: {
        code: 'internal_error',
        message: 'Something went wrong on our side. Please try again.',
      },
    })
  }
}
