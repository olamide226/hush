import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  EyeOff,
  Inbox,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import type { AdminEventPayload, Question } from '../../shared/types'
import { Ambient } from '../components/Ambient'
import { Brand } from '../components/Brand'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CopyButton } from '../components/CopyButton'
import { Footer } from '../components/Footer'
import { QuestionCard } from '../components/QuestionCard'
import { useToast } from '../lib/toast'
import {
  ApiClientError,
  deleteQuestion,
  getAdminEvent,
  setEventStatus,
  updateQuestion,
} from '../lib/api'
import { formatClock } from '../lib/format'
import {
  forgetAdminKey,
  getStoredAdminKey,
  parseAdminKey,
  rememberAdminKey,
} from '../lib/storage'

type Filter = 'all' | 'unanswered' | 'answered'

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unanswered', label: 'Waiting' },
  { key: 'answered', label: 'Answered' },
]

function messageFor(error: unknown): string {
  return error instanceof ApiClientError
    ? error.message
    : 'Something went wrong. Please try again.'
}

function resolveInitialKey(eventId: string): string | null {
  const hash = window.location.hash

  if (hash.includes('k=')) {
    const parsed = parseAdminKey(hash)
    if (parsed) {
      rememberAdminKey(eventId, parsed)
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      )
      return parsed
    }
  }

  return getStoredAdminKey(eventId)
}

export function Admin({ eventId }: { eventId: string }) {
  const { push } = useToast()

  const [adminKey, setAdminKey] = useState<string | null>(() =>
    eventId ? resolveInitialKey(eventId) : null,
  )
  const [keyDraft, setKeyDraft] = useState('')
  const [keyError, setKeyError] = useState<string | null>(null)

  const [data, setData] = useState<AdminEventPayload | null>(null)
  const [loading, setLoading] = useState(Boolean(adminKey))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [filter, setFilter] = useState<Filter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [justCreated] = useState(() => {
    if (!eventId) return false
    return sessionStorage.getItem(`hush.newEvent.${eventId}`) === '1'
  })

  const hasDataRef = useRef(false)
  const inFlightRef = useRef(false)

  const load = useCallback(
    async (quiet = false) => {
      if (!eventId || !adminKey || inFlightRef.current) return

      inFlightRef.current = true
      if (!quiet && !hasDataRef.current) setLoading(true)
      if (!quiet) setRefreshing(true)

      try {
        const payload = await getAdminEvent(eventId, adminKey)
        hasDataRef.current = true
        setData(payload)
        setError(null)
        setKeyError(null)
        setLastUpdated(new Date())
      } catch (caught) {
        if (caught instanceof ApiClientError && caught.status === 401) {
          forgetAdminKey(eventId)
          hasDataRef.current = false
          setData(null)
          setAdminKey(null)
          setKeyError(
            'That host link did not work. Paste a valid host link to continue.',
          )
        } else {
          setError(messageFor(caught))
        }
      } finally {
        inFlightRef.current = false
        setLoading(false)
        setRefreshing(false)
      }
    },
    [adminKey, eventId],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!adminKey) return

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, 8000)

    return () => window.clearInterval(timer)
  }, [adminKey, load])

  useEffect(() => {
    if (!justCreated) return
    sessionStorage.removeItem(`hush.newEvent.${eventId}`)
  }, [eventId, justCreated])

  const questions = useMemo(() => data?.questions ?? [], [data])

  const counts = useMemo(() => {
    const answered = questions.filter((question) => question.isAnswered).length
    return {
      all: questions.length,
      answered,
      unanswered: questions.length - answered,
    }
  }, [questions])

  const filteredQuestions = useMemo(() => {
    if (filter === 'answered') {
      return questions.filter((question) => question.isAnswered)
    }
    if (filter === 'unanswered') {
      return questions.filter((question) => !question.isAnswered)
    }
    return questions
  }, [filter, questions])

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseAdminKey(keyDraft)

    if (!parsed) {
      setKeyError('That does not look like a host link or admin key.')
      return
    }

    rememberAdminKey(eventId, parsed)
    setKeyError(null)
    setKeyDraft('')
    setLoading(true)
    setAdminKey(parsed)
  }

  async function toggleAnswered(question: Question) {
    if (!adminKey || busyId) return
    setBusyId(question.id)

    try {
      const { question: updated } = await updateQuestion(
        question.id,
        adminKey,
        { isAnswered: !question.isAnswered },
      )

      setData((current) =>
        current
          ? {
              ...current,
              questions: current.questions.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      )
      push(
        updated.isAnswered ? 'Marked as answered' : 'Moved to waiting',
        'success',
      )
    } catch (caught) {
      push(messageFor(caught), 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function togglePinned(question: Question) {
    if (!adminKey || busyId) return
    setBusyId(question.id)

    try {
      const { question: updated } = await updateQuestion(
        question.id,
        adminKey,
        { isPinned: !question.isPinned },
      )

      setData((current) =>
        current
          ? {
              ...current,
              questions: current.questions
                .map((item) => (item.id === updated.id ? updated : item))
                .sort((a, b) => {
                  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
                  return b.createdAt.localeCompare(a.createdAt)
                }),
            }
          : current,
      )
      push(updated.isPinned ? 'Question pinned' : 'Question unpinned', 'success')
    } catch (caught) {
      push(messageFor(caught), 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!adminKey || !pendingDelete) return
    setDeleting(true)

    try {
      await deleteQuestion(pendingDelete.id, adminKey)
      setData((current) =>
        current
          ? {
              ...current,
              questions: current.questions.filter(
                (question) => question.id !== pendingDelete.id,
              ),
            }
          : current,
      )
      push('Question deleted', 'success')
      setPendingDelete(null)
    } catch (caught) {
      push(messageFor(caught), 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function toggleStatus() {
    if (!adminKey || !data || statusBusy) return
    const nextStatus = data.event.status === 'open' ? 'closed' : 'open'
    setStatusBusy(true)

    try {
      const { event: updated } = await setEventStatus(
        data.event.id,
        adminKey,
        nextStatus,
      )
      setData((current) => (current ? { ...current, event: updated } : current))
      push(
        updated.status === 'closed'
          ? 'Room closed — new questions are paused'
          : 'Room reopened — questions are live',
        'success',
      )
    } catch (caught) {
      push(messageFor(caught), 'error')
    } finally {
      setStatusBusy(false)
    }
  }

  if (!adminKey) {
    return (
      <div className="page admin-page">
        <Ambient />
        <header className="site-header container">
          <Brand />
          <Link className="nav-link" to="/">
            Back home
          </Link>
        </header>

        <main className="ask-main container">
          <div className="ask-card status-card key-gate">
            <span className="status-icon status-icon-lock">
              <Lock size={24} />
            </span>
            <span className="status-kicker">Host access</span>
            <h1>Open your dashboard</h1>
            <p>
              Paste the private host link you got when you created this room.
              It contains the only key that can reveal the questions.
            </p>

            <form className="key-form" onSubmit={unlock}>
              <div className="field">
                <label htmlFor="admin-key">Host link or admin key</label>
                <input
                  id="admin-key"
                  name="adminKey"
                  type="text"
                  placeholder="https://…/admin/…&#35;k=…"
                  value={keyDraft}
                  onChange={(event) => setKeyDraft(event.target.value)}
                  autoComplete="off"
                  autoFocus
                  required
                />
              </div>

              {keyError && (
                <p className="form-error" role="alert">
                  {keyError}
                </p>
              )}

              <button type="submit" className="button button-primary button-full">
                Open dashboard <ArrowRight size={17} />
              </button>
            </form>

            <p className="form-note">
              <EyeOff size={13} /> Host links are saved on this device after the
              first visit.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="page admin-page">
        <Ambient />
        <header className="admin-header">
          <div className="container admin-header-inner">
            <Brand />
            <span className="status-pill status-open">
              <span /> Loading
            </span>
          </div>
        </header>
        <main className="container admin-main">
          <div className="admin-heading">
            <div>
              <span className="skeleton skeleton-line skeleton-short" />
              <span className="skeleton skeleton-title" />
            </div>
          </div>
          <div className="admin-grid">
            <div className="question-list">
              <span className="skeleton skeleton-card" />
              <span className="skeleton skeleton-card" />
              <span className="skeleton skeleton-card" />
            </div>
            <aside className="admin-sidebar">
              <span className="skeleton skeleton-side" />
              <span className="skeleton skeleton-side" />
            </aside>
          </div>
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page admin-page">
        <Ambient />
        <header className="site-header container">
          <Brand />
          <Link className="nav-link" to="/">
            Back home
          </Link>
        </header>
        <main className="ask-main container">
          <div className="ask-card status-card">
            <span className="status-icon status-icon-muted">
              <Inbox size={24} />
            </span>
            <h1>Could not load this room</h1>
            <p>{error ?? 'This event may have been removed or the link is incomplete.'}</p>
            <div className="success-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => void load(false)}
              >
                Try again
              </button>
              <Link className="button button-ghost" to="/">
                Back home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const { event } = data
  const isOpen = event.status === 'open'
  const origin = window.location.origin
  const askUrl = `${origin}/e/${event.id}`
  const hostUrl = `${origin}/admin/${event.id}#k=${adminKey}`

  return (
    <div className="page admin-page">
      <Ambient />

      <header className="admin-header">
        <div className="container admin-header-inner">
          <Brand />
          <div className="admin-header-actions">
            <span
              className={`status-pill ${isOpen ? 'status-open' : 'status-closed'}`}
            >
              <span /> {isOpen ? 'Accepting questions' : 'Questions closed'}
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={() => void load(false)}
              disabled={refreshing}
              title="Refresh questions"
              aria-label="Refresh questions"
            >
              {refreshing ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <RefreshCw size={17} />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container admin-main">
        {justCreated && (
          <div className="created-banner">
            <span className="created-banner-icon" aria-hidden="true">
              <Sparkles size={19} />
            </span>
            <div>
              <strong>Your room is live.</strong>
              <p>
                Share the audience link — anyone with it can ask anonymously.
              </p>
            </div>
            <CopyButton value={askUrl} label="Copy ask link" />
          </div>
        )}

        <section className="admin-heading">
          <div className="admin-heading-main">
            <Link className="back-link" to="/">
              <ArrowLeft size={14} /> All rooms
            </Link>
            <h1>{event.title}</h1>
            {event.description && (
              <p className="admin-description">{event.description}</p>
            )}
          </div>

          <div className="admin-heading-actions">
            <a
              className="button button-outline button-small"
              href={askUrl}
              target="_blank"
              rel="noreferrer"
            >
              View ask page <ArrowUpRight size={15} />
            </a>
            <button
              type="button"
              className={`button button-small ${
                isOpen ? 'button-ghost' : 'button-primary'
              }`}
              onClick={() => void toggleStatus()}
              disabled={statusBusy}
            >
              {statusBusy && <Loader2 className="spin" size={15} />}
              {isOpen ? 'Close Q&A' : 'Reopen Q&A'}
            </button>
          </div>
        </section>

        {error && (
          <div className="connection-banner" role="status">
            <RefreshCw size={14} /> {error} Retrying automatically…
          </div>
        )}

        <div className="admin-grid">
          <section className="questions-panel" aria-label="Questions">
            <div className="questions-toolbar">
              <div className="filter-tabs" role="tablist" aria-label="Filter questions">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === item.key}
                    className={`filter-tab ${
                      filter === item.key ? 'is-active' : ''
                    }`}
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}
                    <span>{counts[item.key]}</span>
                  </button>
                ))}
              </div>

              <span className="live-indicator">
                <span className="live-dot" />
                {lastUpdated ? `Live · ${formatClock(lastUpdated)}` : 'Live'}
              </span>
            </div>

            {!isOpen && (
              <div className="closed-banner">
                <Lock size={16} />
                <span>
                  This room is closed. The audience can no longer submit
                  questions.
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void toggleStatus()}
                  disabled={statusBusy}
                >
                  Reopen
                </button>
              </div>
            )}

            {filteredQuestions.length > 0 ? (
              <div className="question-list">
                {filteredQuestions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    busy={busyId === question.id}
                    onToggleAnswered={toggleAnswered}
                    onTogglePinned={togglePinned}
                    onDelete={setPendingDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  {filter === 'answered' ? (
                    <Check size={22} />
                  ) : filter === 'unanswered' ? (
                    <Check size={22} />
                  ) : (
                    <Inbox size={22} />
                  )}
                </span>
                <h2>
                  {filter === 'answered'
                    ? 'Nothing answered yet'
                    : filter === 'unanswered'
                      ? 'No questions waiting'
                      : 'No questions yet'}
                </h2>
                <p>
                  {filter === 'all'
                    ? 'Share the audience link to start collecting anonymous questions.'
                    : 'Questions will appear here as you mark them.'}
                </p>
                {filter === 'all' && (
                  <CopyButton value={askUrl} label="Copy audience link" />
                )}
              </div>
            )}

            <div className="host-tips">
              <span className="host-tips-icon" aria-hidden="true">
                <Sparkles size={16} />
              </span>
              <div>
                <strong>Host notes</strong>
                <p>
                  Pin the questions you will answer first, mark them answered as
                  you go, and close the room when the session ends.
                </p>
              </div>
            </div>
          </section>

          <aside className="admin-sidebar">
            <div className="side-card">
              <div className="side-card-heading">
                <span className="side-icon">
                  <Link2 size={17} />
                </span>
                <h2>Share your room</h2>
              </div>

              <div className="link-row">
                <div className="link-row-labels">
                  <span>Audience link</span>
                  <span className="link-hint">For asking questions</span>
                </div>
                <div className="link-row-value">
                  <code>{askUrl}</code>
                  <CopyButton value={askUrl} compact label="Copy audience link" />
                  <a
                    className="icon-button icon-button-small"
                    href={askUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open audience page"
                    title="Open audience page"
                  >
                    <ArrowUpRight size={15} />
                  </a>
                </div>
              </div>

              <div className="link-row">
                <div className="link-row-labels">
                  <span>
                    Host link <span className="private-tag">Private</span>
                  </span>
                  <span className="link-hint">Manage and view questions</span>
                </div>
                <div className="link-row-value">
                  <code>{hostUrl}</code>
                  <CopyButton value={hostUrl} compact label="Copy host link" />
                </div>
              </div>

              <p className="side-note">
                <EyeOff size={13} /> Keep the host link to yourself. Anyone with
                it can read and manage these questions.
              </p>
            </div>

            <div className="side-card">
              <div className="side-card-heading">
                <span className="side-icon side-icon-lime">
                  <Sparkles size={17} />
                </span>
                <h2>At a glance</h2>
              </div>

              <div className="stats-grid">
                <div className="stat">
                  <strong>{counts.all}</strong>
                  <span>Total</span>
                </div>
                <div className="stat">
                  <strong>{counts.unanswered}</strong>
                  <span>Waiting</span>
                </div>
                <div className="stat stat-answered">
                  <strong>{counts.answered}</strong>
                  <span>Answered</span>
                </div>
              </div>
            </div>

            <div className="side-card privacy-card">
              <span className="side-icon side-icon-ink">
                <Lock size={17} />
              </span>
              <div>
                <h2>Private by design</h2>
                <p>
                  The audience only ever sees a confirmation. The question list
                  lives behind this host link.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this question?"
        description="It will disappear for everyone with the host link. This cannot be undone."
        confirmLabel="Delete question"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
