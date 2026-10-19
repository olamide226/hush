import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  EyeOff,
  Loader2,
  Lock,
  MessageCircleQuestion,
  ShieldCheck,
} from 'lucide-react'
import { Ambient } from '../components/Ambient'
import { Brand } from '../components/Brand'
import { Footer } from '../components/Footer'
import { useToast } from '../lib/toast'
import { ApiClientError, askQuestion, getPublicEvent } from '../lib/api'
import type { HushEvent } from '../../shared/types'

export function Ask({ eventId }: { eventId: string }) {
  const { push } = useToast()

  const [event, setEvent] = useState<HushEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [body, setBody] = useState('')
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let active = true

    getPublicEvent(eventId)
      .then(({ event: loaded }) => {
        if (active) setEvent(loaded)
      })
      .catch((caught) => {
        if (!active) return
        setLoadError(
          caught instanceof ApiClientError
            ? caught.status === 404
              ? 'This room does not exist, or the link is incomplete.'
              : caught.message
            : 'Could not load this room.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [eventId])

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    if (submitting || body.trim().length < 2) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await askQuestion(eventId, body, website)
      setBody('')
      setSubmitted(true)
    } catch (caught) {
      const message =
        caught instanceof ApiClientError
          ? caught.message
          : 'Could not send your question. Please try again.'
      setSubmitError(message)
      push(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page ask-page">
      <Ambient />

      <header className="site-header container">
        <Brand />
        <Link className="nav-link" to="/">
          Hosting your own? <ArrowUpRight size={14} />
        </Link>
      </header>

      <main className="ask-main container">
        {loading ? (
          <div className="ask-card ask-skeleton" aria-label="Loading room">
            <span className="skeleton skeleton-line skeleton-short" />
            <span className="skeleton skeleton-title" />
            <span className="skeleton skeleton-line" />
            <span className="skeleton skeleton-block" />
            <span className="skeleton skeleton-button" />
          </div>
        ) : loadError ? (
          <div className="ask-card status-card">
            <span className="status-icon status-icon-muted">
              <MessageCircleQuestion size={24} />
            </span>
            <h1>Room not found</h1>
            <p>{loadError}</p>
            <Link className="button button-primary" to="/">
              Go to hush <ArrowRight size={16} />
            </Link>
          </div>
        ) : submitted ? (
          <div className="ask-card success-card">
            <span className="success-icon" aria-hidden="true">
              <Check size={30} strokeWidth={2.4} />
            </span>
            <span className="success-kicker">Delivered privately</span>
            <h1>Question sent.</h1>
            <p>
              Your question is with the host of{' '}
              <strong>{event?.title}</strong>. No one else can see it — and your
              name was never collected.
            </p>
            <div className="success-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => setSubmitted(false)}
              >
                Ask another question
              </button>
              <Link className="button button-ghost" to="/">
                Create your own room
              </Link>
            </div>
            <p className="form-note">
              <EyeOff size={13} /> You will never see other people's questions.
            </p>
          </div>
        ) : event?.status === 'closed' ? (
          <div className="ask-card status-card">
            <span className="status-icon status-icon-muted">
              <Lock size={24} />
            </span>
            <span className="status-kicker">This room is closed</span>
            <h1>Questions are paused.</h1>
            <p>
              The host of <strong>{event.title}</strong> is no longer accepting
              new questions. Thanks for stopping by.
            </p>
            <Link className="button button-ghost" to="/">
              Create your own room <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="ask-card">
            <div className="ask-meta">
              <span className="live-badge">
                <span className="pulse-dot" /> Open for questions
              </span>
              <span className="ask-meta-note">
                <ShieldCheck size={14} /> Anonymous
              </span>
            </div>

            <h1>{event?.title}</h1>
            {event?.description && (
              <p className="ask-description">{event.description}</p>
            )}

            <form className="ask-form" onSubmit={handleSubmit}>
              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="question-body">Your question</label>
                  <span className="char-count">{body.length}/1000</span>
                </div>
                <textarea
                  id="question-body"
                  name="body"
                  className="question-input"
                  rows={5}
                  placeholder="What's on your mind? Ask it without your name attached."
                  value={body}
                  onChange={(changeEvent) => setBody(changeEvent.target.value)}
                  onKeyDown={(keyEvent) => {
                    if (
                      keyEvent.key === 'Enter' &&
                      (keyEvent.metaKey || keyEvent.ctrlKey)
                    ) {
                      keyEvent.preventDefault()
                      keyEvent.currentTarget.form?.requestSubmit()
                    }
                  }}
                  maxLength={1000}
                  autoFocus
                  required
                />
              </div>

              <div className="hp-field" aria-hidden="true">
                <label htmlFor="question-website">Website</label>
                <input
                  id="question-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(changeEvent) =>
                    setWebsite(changeEvent.target.value)
                  }
                />
              </div>

              {submitError && (
                <p className="form-error" role="alert">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                className="button button-primary button-full"
                disabled={submitting || body.trim().length < 2}
              >
                {submitting ? (
                  <>
                    <Loader2 className="spin" size={17} /> Sending…
                  </>
                ) : (
                  <>
                    Send anonymously <ArrowRight size={17} />
                  </>
                )}
              </button>

              <p className="form-note">
                <Lock size={13} /> No name, email, or account needed. The host
                cannot see who asked.
              </p>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
