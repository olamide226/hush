import { Link } from 'react-router-dom'

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link className="brand" to={to} aria-label="hush home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            d="M16 4.5C9.4 4.5 4 8.9 4 14.3c0 3.1 1.7 5.9 4.5 7.7L7.2 27l5.6-2.2c1 .2 2.1.3 3.2.3 6.6 0 12-4.4 12-9.8S22.6 4.5 16 4.5Z"
            fill="currentColor"
          />
          <circle cx="11.4" cy="14.3" r="1.55" fill="white" />
          <circle cx="16" cy="14.3" r="1.55" fill="white" />
          <circle cx="20.6" cy="14.3" r="1.55" fill="white" />
        </svg>
      </span>
      <span className="brand-word">hush</span>
    </Link>
  )
}
