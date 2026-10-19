import { CheckCircle2, Circle, Loader2, Pin, Trash2 } from 'lucide-react'
import type { Question } from '../../shared/types'
import { formatDate, timeAgo } from '../lib/format'

interface QuestionCardProps {
  question: Question
  busy: boolean
  onToggleAnswered: (question: Question) => void
  onTogglePinned: (question: Question) => void
  onDelete: (question: Question) => void
}

export function QuestionCard({
  question,
  busy,
  onToggleAnswered,
  onTogglePinned,
  onDelete,
}: QuestionCardProps) {
  return (
    <article
      className={`question-card ${question.isAnswered ? 'is-answered' : ''} ${
        question.isPinned ? 'is-pinned' : ''
      }`}
    >
      <span className="question-avatar" aria-hidden="true">
        ?
      </span>

      <div className="question-content">
        <div className="question-meta">
          {question.isPinned && <span className="tag tag-pinned">Pinned</span>}
          {question.isAnswered && (
            <span className="tag tag-answered">Answered</span>
          )}
          <span className="question-time" title={formatDate(question.createdAt)}>
            {timeAgo(question.createdAt)}
          </span>
        </div>

        <p className="question-body">{question.body}</p>

        <div className="question-actions">
          <button
            type="button"
            className={`mini-action ${question.isAnswered ? 'is-active' : ''}`}
            onClick={() => onToggleAnswered(question)}
            disabled={busy}
            aria-pressed={question.isAnswered}
          >
            {busy ? (
              <Loader2 className="spin" size={15} />
            ) : question.isAnswered ? (
              <CheckCircle2 size={15} />
            ) : (
              <Circle size={15} />
            )}
            {question.isAnswered ? 'Answered' : 'Mark answered'}
          </button>

          <button
            type="button"
            className={`mini-action ${question.isPinned ? 'is-active' : ''}`}
            onClick={() => onTogglePinned(question)}
            disabled={busy}
            aria-pressed={question.isPinned}
          >
            <Pin size={14} />
            {question.isPinned ? 'Unpin' : 'Pin'}
          </button>

          <button
            type="button"
            className="mini-action mini-action-danger"
            onClick={() => onDelete(question)}
            disabled={busy}
            aria-label="Delete question"
            title="Delete question"
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </article>
  )
}
