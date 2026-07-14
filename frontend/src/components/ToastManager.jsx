import { useState, useCallback, useEffect, useRef } from 'react'

// ── Toast Context ─────────────────────────────────────────────
import { createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

let _addToast = null
export function toast(message, type = 'info') {
  _addToast?.(message, type)
}

// ── ToastManager Provider ─────────────────────────────────────
export default function ToastManager({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  useEffect(() => { _addToast = addToast }, [addToast])

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: '📊' }
  const COLORS = {
    success: 'var(--green)',
    error:   'var(--red)',
    warning: 'var(--amber)',
    info:    'var(--blue)',
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div
            key={t.id}
            className="toast"
            style={{ borderLeft: `3px solid ${COLORS[t.type] || COLORS.info}` }}
            onClick={() => removeToast(t.id)}
          >
            <span className="toast-icon">{ICONS[t.type] || ICONS.info}</span>
            <span className="toast-message">{t.message}</span>
            <span className="toast-close">×</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
