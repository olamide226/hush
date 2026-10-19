import { useEffect } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <span className="dialog-icon" aria-hidden="true">
          <Trash2 size={20} />
        </span>
        <h2 id="dialog-title">{title}</h2>
        <p>{description}</p>
        <div className="dialog-actions">
          <button
            type="button"
            className="button button-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 className="spin" size={16} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
