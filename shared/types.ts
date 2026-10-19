export type EventStatus = 'open' | 'closed'

export interface HushEvent {
  id: string
  title: string
  description: string
  status: EventStatus
  createdAt: string
}

export interface Question {
  id: string
  eventId: string
  body: string
  isAnswered: boolean
  isPinned: boolean
  createdAt: string
}

export interface AdminEventPayload {
  event: HushEvent
  questions: Question[]
}

export interface CreateEventPayload {
  event: HushEvent
  adminKey: string
}

export interface ApiErrorPayload {
  error: {
    code: string
    message: string
  }
}
