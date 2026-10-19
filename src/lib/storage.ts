import type { HushEvent } from '../../shared/types'

const EVENTS_KEY = 'hush.myEvents.v1'
const ADMIN_KEY_PREFIX = 'hush.adminKey.v1.'

export interface MyEvent {
  id: string
  title: string
  adminKey: string
  createdAt: string
}

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWrite(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function listMyEvents(): MyEvent[] {
  const raw = safeRead(EVENTS_KEY)
  if (!raw) return []

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is MyEvent =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as MyEvent).id === 'string' &&
        typeof (item as MyEvent).title === 'string' &&
        typeof (item as MyEvent).adminKey === 'string',
    )
  } catch {
    return []
  }
}

export function saveMyEvent(event: HushEvent, adminKey: string): void {
  const next: MyEvent = {
    id: event.id,
    title: event.title,
    adminKey,
    createdAt: event.createdAt,
  }

  const existing = listMyEvents().filter((item) => item.id !== event.id)
  safeWrite(EVENTS_KEY, JSON.stringify([next, ...existing].slice(0, 50)))
}

export function removeMyEvent(eventId: string): void {
  const next = listMyEvents().filter((item) => item.id !== eventId)
  safeWrite(EVENTS_KEY, JSON.stringify(next))
}

export function rememberAdminKey(eventId: string, adminKey: string): void {
  safeWrite(`${ADMIN_KEY_PREFIX}${eventId}`, adminKey)
}

export function getStoredAdminKey(eventId: string): string | null {
  return safeRead(`${ADMIN_KEY_PREFIX}${eventId}`)
}

export function forgetAdminKey(eventId: string): void {
  try {
    window.localStorage.removeItem(`${ADMIN_KEY_PREFIX}${eventId}`)
  } catch {
    // Storage can be unavailable in private browsing modes.
  }
}

export function parseAdminKey(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const hashIndex = trimmed.indexOf('#')
  if (hashIndex >= 0) {
    const params = new URLSearchParams(trimmed.slice(hashIndex + 1))
    const key = params.get('k')
    if (key && /^[A-Za-z0-9]{16,64}$/.test(key)) return key
  }

  try {
    const url = new URL(trimmed)
    const key = url.searchParams.get('k')
    if (key && /^[A-Za-z0-9]{16,64}$/.test(key)) return key
  } catch {
    // Not a URL — fall through to a raw key.
  }

  return /^[A-Za-z0-9]{16,64}$/.test(trimmed) ? trimmed : null
}
