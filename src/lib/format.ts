export function timeAgo(iso: string): string {
  const timestamp = new Date(iso).getTime()

  if (Number.isNaN(timestamp)) return 'just now'

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))

  if (seconds < 45) return 'just now'
  if (seconds < 90) return '1 min ago'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

  const days = Math.round(hours / 24)
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`

  return formatDate(iso)
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown date'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}
