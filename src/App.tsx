import { useEffect } from 'react'
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { Admin } from './pages/Admin'
import { Ask } from './pages/Ask'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'

function AskRoute() {
  const { eventId = '' } = useParams()
  return <Ask key={eventId} eventId={eventId} />
}

function AdminRoute() {
  const { eventId = '' } = useParams()
  return <Admin key={eventId} eventId={eventId} />
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/e/:eventId" element={<AskRoute />} />
          <Route path="/admin/:eventId" element={<AdminRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
