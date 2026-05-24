import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useContextStore } from '@/store/contextStore'
import type { Context } from '@/types'

function IconSearch() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <circle cx="7" cy="7" r="4.5"/>
      <path d="M11 11l2.5 2.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3 h-3 flex-shrink-0 opacity-50">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ContextDropdown() {
  const { contexts, activeContextId, setActiveContext } = useContextStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const active = contexts.find((c: Context) => c.id === activeContextId)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-8 px-2 rounded-md hover:bg-accent transition-colors max-w-full"
        style={{ color: active?.color }}
      >
        <span className="text-sm flex-shrink-0">{active?.icon ?? '🌐'}</span>
        <span className="text-[13px] font-medium text-foreground truncate">{active?.name ?? 'Контекст'}</span>
        <IconChevronDown />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg py-1.5 min-w-[180px]">
          {contexts.map((c: Context) => (
            <button
              key={c.id}
              onClick={() => { setActiveContext(c.id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-accent"
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0"
                style={{ background: c.color + '33' }}
              >
                {c.icon}
              </span>
              <span className="truncate text-foreground">{c.name}</span>
              {c.id === activeContextId && (
                <span className="ml-auto text-primary text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  onOpenPalette: () => void
}

export function MobileHeader({ onOpenPalette }: Props) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleCreate = () => {
    if (location.pathname.startsWith('/tasks')) {
      navigate('/tasks')
    } else {
      navigate('/notes/new')
    }
  }

  return (
    <div className="flex md:hidden items-center gap-1 px-3 h-12 border-b bg-background flex-shrink-0">
      <ContextDropdown />

      <button
        onClick={onOpenPalette}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        title="Поиск"
      >
        <IconSearch />
      </button>

      <button
        onClick={handleCreate}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground flex-shrink-0"
        title="Создать"
      >
        <IconPlus />
      </button>
    </div>
  )
}
