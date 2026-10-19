import type {
  AdminEventPayload,
  ApiErrorPayload,
  CreateEventPayload,
  EventStatus,
  HushEvent,
  Question,
} from '../../shared/types'

export class ApiClientError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { adminKey?: string } = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.adminKey) {
    headers.set('Authorization', `Bearer ${options.adminKey}`)
  }

  let response: Response

  try {
    response = await fetch(`/api${path}`, { ...options, headers })
  } catch {
    throw new ApiClientError(
      0,
      'network_error',
      'Could not reach the server. Check your connection and try again.',
    )
  }

  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json')
  const payload: unknown = isJson ? await response.json() : null

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null
    throw new ApiClientError(
      response.status,
      errorPayload?.error?.code ?? 'request_failed',
      errorPayload?.error?.message ??
        `The request failed (${response.status}).`,
    )
  }

  return payload as T
}

export function createEvent(input: {
  title: string
  description: string
  website?: string
}): Promise<CreateEventPayload> {
  return request<CreateEventPayload>('/events', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getPublicEvent(
  eventId: string,
): Promise<{ event: HushEvent }> {
  return request<{ event: HushEvent }>(`/events/${encodeURIComponent(eventId)}`)
}

export function getAdminEvent(
  eventId: string,
  adminKey: string,
): Promise<AdminEventPayload> {
  return request<AdminEventPayload>(
    `/events/${encodeURIComponent(eventId)}/admin`,
    { adminKey },
  )
}

export function askQuestion(
  eventId: string,
  body: string,
  website = '',
): Promise<{ ok: true }> {
  return request<{ ok: true }>(
    `/events/${encodeURIComponent(eventId)}/questions`,
    {
      method: 'POST',
      body: JSON.stringify({ body, website }),
    },
  )
}

export function updateQuestion(
  questionId: string,
  adminKey: string,
  patch: { isAnswered?: boolean; isPinned?: boolean },
): Promise<{ question: Question }> {
  return request<{ question: Question }>(
    `/questions/${encodeURIComponent(questionId)}`,
    {
      method: 'PATCH',
      adminKey,
      body: JSON.stringify(patch),
    },
  )
}

export function deleteQuestion(
  questionId: string,
  adminKey: string,
): Promise<{ ok: true }> {
  return request<{ ok: true }>(
    `/questions/${encodeURIComponent(questionId)}`,
    { method: 'DELETE', adminKey },
  )
}

export function setEventStatus(
  eventId: string,
  adminKey: string,
  status: EventStatus,
): Promise<{ event: HushEvent }> {
  return request<{ event: HushEvent }>(
    `/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      adminKey,
      body: JSON.stringify({ status }),
    },
  )
}
