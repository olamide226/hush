import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Inbox,
  Link2,
  Loader2,
  Lock,
  Send,
  Sparkles,
} from 'lucide-react'
import { Ambient } from '../components/Ambient'
import { Brand } from '../components/Brand'
import { CopyButton } from '../components/CopyButton'
import { Footer } from '../components/Footer'
import { useToast } from '../lib/toast'
import { ApiClientError, createEvent } from '../lib/api'
import { formatDate } from '../lib/format'
import {
  listMyEvents,
  rememberAdminKey,
  saveMyEvent,
} from '../lib/storage'

export function Home() {
  const navigate = useNavigate()
  const { push } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const myEvents = listMyEvents()
  const origin = window.location.origin

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setError(null)
    setSubmitting(true)

    try {
      const result = await createEvent({
        title,
        description,
        website,
      })

      saveMyEvent(result.event, result.adminKey)
      rememberAdminKey(result.event.id, result.adminKey)
      sessionStorage.setItem(`hush.newEvent.${result.event.id}`, '1')

      navigate(`/admin/${result.event.id}`)
    } catch (caught) {
      const message =
        caught instanceof ApiClientError
          ? caught.message
          : 'Could not create your room. Please try again.'
      setError(message)
      push(message, 'error')
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <Ambient />

      <header className="site-header container">
        <Brand />
        <nav className="site-nav" aria-label="Main navigation">
          <a className="nav-link" href="#how">
            How it works
          </a>
          <a className="button button-small button-outline" href="#create">
            Create a room
          </a>
        </nav>
      </header>

      <main>
        <section className="hero container">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="pulse-dot" />
              Anonymous audience Q&amp;A
            </span>

            <h1>
              Ask anything.
              <br />
              Stay <em>anonymous.</em>
            </h1>

            <p className="lede">
              A quiet place for honest questions. Share one link, collect
              anonymous questions, and keep the conversation moving — no
              accounts, no awkwardness.
            </p>

            <div className="trust-row">
              <span>
                <Lock size={15} /> No sign-in
              </span>
              <span>
                <span className="trust-dot" /> Questions stay private
              </span>
              <span>
                <Link2 size={15} /> Unlisted links
              </span>
            </div>

            <div className="hero-questions" aria-hidden="true">
              <div className="floating-question floating-question-one">
                <span className="anon-dot" />
                Why do we still have three weekly syncs?
              </div>
              <div className="floating-question floating-question-two">
                <span className="anon-dot anon-dot-warm" />
                What is one thing we could simplify this quarter?
              </div>
            </div>
          </div>

          <div className="create-card" id="create">
            <span className="card-kicker">
              <Sparkles size={14} /> Create a room
            </span>
            <h2>Start your Q&amp;A</h2>
            <p className="card-description">
              Name it, share the link, and watch the questions come in.
            </p>

            <form className="create-form" onSubmit={handleSubmit}>
              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="event-title">Event name</label>
                  <span className="char-count">{title.length}/80</span>
                </div>
                <input
                  id="event-title"
                  name="title"
                  type="text"
                  placeholder="e.g. All-hands, October"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={80}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="event-description">
                    A little context <span>optional</span>
                  </label>
                  <span className="char-count">
                    {description.length}/240
                  </span>
                </div>
                <textarea
                  id="event-description"
                  name="description"
                  rows={3}
                  placeholder="What should people ask about?"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={240}
                />
              </div>

              <div className="hp-field" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="button button-primary button-full"
                disabled={submitting || title.trim().length < 3}
              >
                {submitting ? (
                  <>
                    <Loader2 className="spin" size={17} /> Creating room…
                  </>
                ) : (
                  <>
                    Create room <ArrowRight size={17} />
                  </>
                )}
              </button>

              <p className="form-note">
                <Lock size={13} /> Your host link is saved in this browser only.
              </p>
            </form>
          </div>
        </section>

        {myEvents.length > 0 && (
          <section className="my-events container" aria-labelledby="my-rooms">
            <div className="section-heading">
              <div>
                <span className="section-kicker">On this device</span>
                <h2 id="my-rooms">Your rooms</h2>
              </div>
              <p>Only you can see these. The links stay unlisted.</p>
            </div>

            <div className="event-grid">
              {myEvents.map((item) => (
                <article className="event-card" key={item.id}>
                  <div className="event-card-top">
                    <span className="event-card-date">
                      Created {formatDate(item.createdAt)}
                    </span>
                    <span className="status-pill status-open">
                      <span /> Open
                    </span>
                  </div>

                  <h3>{item.title}</h3>
                  <p className="event-card-link">/e/{item.id}</p>

                  <div className="event-card-actions">
                    <Link
                      className="button button-small button-primary"
                      to={`/admin/${item.id}`}
                    >
                      Open dashboard <ArrowUpRight size={15} />
                    </Link>
                    <CopyButton
                      value={`${origin}/e/${item.id}`}
                      label="Ask link"
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="how container" id="how" aria-labelledby="how-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Three quiet steps</span>
              <h2 id="how-title">How hush works</h2>
            </div>
            <p>
              No attendee accounts. No email addresses. No visible question
              feed.
            </p>
          </div>

          <div className="how-grid">
            <article className="how-card">
              <div className="how-card-top">
                <span className="how-icon">
                  <Sparkles size={19} />
                </span>
                <span className="how-number">01</span>
              </div>
              <h3>Create a room</h3>
              <p>
                Give your event a name. We instantly generate an unlisted
                audience link and a private host link.
              </p>
            </article>

            <article className="how-card">
              <div className="how-card-top">
                <span className="how-icon how-icon-lime">
                  <Send size={19} />
                </span>
                <span className="how-number">02</span>
              </div>
              <h3>Share the ask link</h3>
              <p>
                Anyone with the link can submit a question. They only ever see
                a confirmation — never the other questions.
              </p>
            </article>

            <article className="how-card">
              <div className="how-card-top">
                <span className="how-icon how-icon-ink">
                  <Inbox size={19} />
                </span>
                <span className="how-number">03</span>
              </div>
              <h3>Host from one place</h3>
              <p>
                Your private dashboard collects every question in real time.
                Pin, answer, or remove them as the conversation unfolds.
              </p>
            </article>
          </div>
        </section>

        <section className="final-cta container">
          <div className="final-cta-inner">
            <div>
              <span className="final-cta-kicker">No accounts. No friction.</span>
              <h2>Ready to hear what your room is really thinking?</h2>
              <p>
                Create a room in seconds. The links stay unlisted, the questions
                stay anonymous, and the conversation stays honest.
              </p>
            </div>
            <a className="button button-primary" href="#create">
              Create your room <ArrowRight size={17} />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
