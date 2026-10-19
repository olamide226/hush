import { Link } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import { Ambient } from '../components/Ambient'
import { Brand } from '../components/Brand'
import { Footer } from '../components/Footer'

export function NotFound() {
  return (
    <div className="page">
      <Ambient />
      <header className="site-header container">
        <Brand />
      </header>

      <main className="ask-main container">
        <div className="ask-card status-card">
          <span className="status-icon status-icon-muted">
            <Compass size={24} />
          </span>
          <span className="status-kicker">404</span>
          <h1>Nothing here.</h1>
          <p>
            This page does not exist. If you were looking for a room, check the
            link you were given.
          </p>
          <Link className="button button-primary" to="/">
            Go to hush <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
