import { createClient, type Client, type InValue } from '@libsql/client'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { EventStatus, HushEvent, Question } from '../../shared/types'

const ID_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

let client: Client | null = null
let schemaPromise: Promise<void> | null = null

function getDb(): Client {
  if (client) return client

  const url = process.env.TURSO_DATABASE_URL?.trim()
  const token = process.env.TURSO_AUTH_TOKEN?.trim()

  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL is not configured. Add it to .env for local development or to your Vercel environment variables.',
    )
  }

  client = createClient({
    url,
    authToken: token || undefined,
  })

  return client
}

async function execute(sql: string, args: InValue[] = []) {
  await ensureSchema()
  return getDb().execute({ sql, args })
}

export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null
      throw error
    })
  }
  return schemaPromise
}

async function createSchema(): Promise<void> {
  const db = getDb()

  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS hush_events (
        id TEXT PRIMARY KEY,
        admin_key_hash TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS hush_questions (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES hush_events(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        is_answered INTEGER NOT NULL DEFAULT 0 CHECK (is_answered IN (0, 1)),
        is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
        created_at TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_hush_questions_event
        ON hush_questions (event_id, created_at DESC);`,
    ],
    'write',
  )
}

export function randomId(length: number): string {
  const bytes = randomBytes(length)
  let result = ''

  for (let i = 0; i < length; i += 1) {
    result += ID_ALPHABET[bytes[i] % ID_ALPHABET.length]
  }

  return result
}

export function hashAdminKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function adminKeyMatches(key: string, storedHash: string): boolean {
  if (!key || !storedHash) return false

  const given = Buffer.from(hashAdminKey(key), 'hex')
  const stored = Buffer.from(storedHash, 'hex')

  return given.length === stored.length && timingSafeEqual(given, stored)
}

function toIso(value: string): string {
  if (!value) return new Date().toISOString()
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

type EventRow = {
  id: string
  admin_key_hash: string
  title: string
  description: string
  status: string
  created_at: string
}

type QuestionRow = {
  id: string
  event_id: string
  body: string
  is_answered: number
  is_pinned: number
  created_at: string
}

function mapEvent(row: EventRow): HushEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status === 'closed' ? 'closed' : 'open',
    createdAt: toIso(row.created_at),
  }
}

function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    eventId: row.event_id,
    body: row.body,
    isAnswered: Number(row.is_answered) === 1,
    isPinned: Number(row.is_pinned) === 1,
    createdAt: toIso(row.created_at),
  }
}

export interface EventRecord {
  event: HushEvent
  adminKeyHash: string
}

export async function createEvent(input: {
  title: string
  description: string
  adminKeyHash: string
}): Promise<HushEvent> {
  const id = randomId(12)
  const createdAt = new Date().toISOString()

  await execute(
    `INSERT INTO hush_events (id, admin_key_hash, title, description, status, created_at)
     VALUES (?, ?, ?, ?, 'open', ?)`,
    [id, input.adminKeyHash, input.title, input.description, createdAt],
  )

  return {
    id,
    title: input.title,
    description: input.description,
    status: 'open',
    createdAt,
  }
}

export async function getEventRecord(id: string): Promise<EventRecord | null> {
  const result = await execute(
    `SELECT id, admin_key_hash, title, description, status, created_at
     FROM hush_events WHERE id = ? LIMIT 1`,
    [id],
  )

  const row = result.rows[0] as unknown as EventRow | undefined
  if (!row) return null

  return {
    event: mapEvent(row),
    adminKeyHash: row.admin_key_hash,
  }
}

export async function getQuestions(eventId: string): Promise<Question[]> {
  const result = await execute(
    `SELECT id, event_id, body, is_answered, is_pinned, created_at
     FROM hush_questions
     WHERE event_id = ?
     ORDER BY is_pinned DESC, created_at DESC`,
    [eventId],
  )

  return (result.rows as unknown as QuestionRow[]).map(mapQuestion)
}

export async function createQuestion(
  eventId: string,
  body: string,
): Promise<Question> {
  const id = randomId(14)
  const createdAt = new Date().toISOString()

  await execute(
    `INSERT INTO hush_questions (id, event_id, body, is_answered, is_pinned, created_at)
     VALUES (?, ?, ?, 0, 0, ?)`,
    [id, eventId, body, createdAt],
  )

  return {
    id,
    eventId,
    body,
    isAnswered: false,
    isPinned: false,
    createdAt,
  }
}

export async function getQuestionRecord(
  id: string,
): Promise<Question | null> {
  const result = await execute(
    `SELECT id, event_id, body, is_answered, is_pinned, created_at
     FROM hush_questions WHERE id = ? LIMIT 1`,
    [id],
  )

  const row = result.rows[0] as unknown as QuestionRow | undefined
  return row ? mapQuestion(row) : null
}

export async function updateQuestion(
  id: string,
  eventId: string,
  patch: { isAnswered?: boolean; isPinned?: boolean },
): Promise<Question | null> {
  const assignments: string[] = []
  const args: InValue[] = []

  if (typeof patch.isAnswered === 'boolean') {
    assignments.push('is_answered = ?')
    args.push(patch.isAnswered ? 1 : 0)
  }

  if (typeof patch.isPinned === 'boolean') {
    assignments.push('is_pinned = ?')
    args.push(patch.isPinned ? 1 : 0)
  }

  if (assignments.length > 0) {
    args.push(id, eventId)
    await execute(
      `UPDATE hush_questions SET ${assignments.join(', ')}
       WHERE id = ? AND event_id = ?`,
      args,
    )
  }

  return getQuestionRecord(id)
}

export async function deleteQuestion(
  id: string,
  eventId: string,
): Promise<boolean> {
  const result = await execute(
    'DELETE FROM hush_questions WHERE id = ? AND event_id = ?',
    [id, eventId],
  )

  return result.rowsAffected > 0
}

export async function setEventStatus(
  id: string,
  status: EventStatus,
): Promise<HushEvent | null> {
  await execute('UPDATE hush_events SET status = ? WHERE id = ?', [status, id])
  const record = await getEventRecord(id)
  return record?.event ?? null
}

export async function checkHealth(): Promise<void> {
  await ensureSchema()
  await getDb().execute('SELECT 1')
}
