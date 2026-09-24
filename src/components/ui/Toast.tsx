import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleCheck, Heart, Trophy, Info } from 'lucide-react'
import { cn } from '@/utils/cn'

type ToastIcon = 'check' | 'heart' | 'trophy' | 'info'
interface ToastItem {
  id: number
  message: string
  icon: ToastIcon
}
interface ToastOptions {
  icon?: ToastIcon
  duration?: number
}

const ToastContext = createContext<{ toast: (message: string, opts?: ToastOptions) => void } | null>(null)

const icons = { check: CircleCheck, heart: Heart, trophy: Trophy, info: Info }
const iconColors = { check: 'text-success', heart: 'text-[#ff5c7a]', trophy: 'text-gold', info: 'text-cyan' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const toast = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = nextId.current++
    setItems((prev) => [...prev.slice(-2), { id, message, icon: opts.icon ?? 'check' }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), opts.duration ?? 2800)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+var(--safe-bottom)+12px)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {items.map((item) => {
          const Icon = icons[item.icon]
          return (
            <div
              key={item.id}
              className="flex max-w-sm animate-toast-in items-center gap-2.5 rounded-xl border border-line-strong bg-[#111c30]/95 px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-md"
            >
              <Icon size={17} className={cn('shrink-0', iconColors[item.icon])} aria-hidden fill={item.icon === 'heart' ? 'currentColor' : 'none'} />
              {item.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa de <ToastProvider>')
  return ctx
}
