import { Lock } from 'lucide-react'
import { Brand } from './Brand'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <Brand />
        <p className="footer-tagline">Anonymous questions, honestly answered.</p>
        <p className="footer-note">
          <Lock size={13} /> Unlisted links. No accounts. No tracking.
        </p>
      </div>
    </footer>
  )
}
