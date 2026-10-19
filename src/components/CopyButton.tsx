import { useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useToast } from '../lib/toast'

interface CopyButtonProps {
  value: string
  label?: string
  compact?: boolean
  className?: string
}

async function writeToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!copied) throw new Error('Copy failed')
}

export function CopyButton({
  value,
  label = 'Copy link',
  compact = false,
  className = '',
}: CopyButtonProps) {
  const { push } = useToast()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  async function handleCopy() {
    try {
      await writeToClipboard(value)
      setCopied(true)
      push('Copied to clipboard', 'success')

      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      push('Could not copy. Select the link manually instead.', 'error')
    }
  }

  return (
    <button
      type="button"
      className={`copy-button ${compact ? 'copy-button-compact' : ''} ${className}`.trim()}
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {!compact && <span>{copied ? 'Copied' : label}</span>}
    </button>
  )
}
