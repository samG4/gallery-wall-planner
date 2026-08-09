import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

// Small non-blocking notices. Replaces alert(), which on mobile is a modal wall.
const Ctx = createContext(() => {})

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const toast = useCallback((message, kind = 'info', ms = 3800) => {
    const id = Math.random().toString(36).slice(2)
    setItems((list) => [...list.slice(-3), { id, message, kind }])
    if (ms) setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), ms)
  }, [])

  const value = useMemo(() => toast, [toast])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span>{t.message}</span>
            <button
              className="toast-x"
              aria-label="Dismiss"
              onClick={() => setItems((list) => list.filter((x) => x.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
