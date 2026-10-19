import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { ToastContext, type ToastTone } from '../lib/toast'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const push = useCallback((message: string, tone: ToastTone = 'default') => {
    const id = nextId.current
    nextId.current += 1

    setToasts((current) => [...current.slice(-2), { id, message, tone }])

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3200)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.tone}`} key={toast.id}>
            {toast.tone === 'success' ? (
              <CheckCircle2 size={17} />
            ) : toast.tone === 'error' ? (
              <AlertCircle size={17} />
            ) : (
              <Info size={17} />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
