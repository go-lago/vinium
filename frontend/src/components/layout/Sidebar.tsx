import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useContextStore } from '@/store/contextStore'
import { contextsApi } from '@/api/contexts'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import type { Context } from '@/types'
import { Button } from '@/components/ui/button'

function IconNotes() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4 flex-shrink-0">
      <path d="M3.5 1.5h9a1 1 0 011 1v11a1 1 0 01-1 1h-9a1 1 0 01-1-1v-11a1 1 0 011-1z"/>
      <path d="M5 6h6M5 9.5h4"/>
    </svg>
  )
}

function IconHome() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4 flex-shrink-0">
      <path d="M2 7L8 2l6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z"/>
      <path d="M6 15v-5h4v5"/>
    </svg>
  )
}

function IconSun() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5 flex-shrink-0">
      <circle cx="8" cy="8" r="3"/>
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"/>
    </svg>
  )
}

function IconTasks() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4 flex-shrink-0">
      <path d="M2.5 4.5h2M2.5 8h2M2.5 11.5h2"/>
      <circle cx="2.5" cy="4.5" r="0.1" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="2.5" cy="8" r="0.1" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="2.5" cy="11.5" r="0.1" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5.5 4.5h8M5.5 8h6M5.5 11.5h7" strokeLinecap="round"/>
    </svg>
  )
}

function IconProjects() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4 flex-shrink-0">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"/>
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1"/>
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1"/>
      <rect x="9" y="9" width="5.5" height="5.5" rx="1"/>
    </svg>
  )
}

function IconMoon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5 flex-shrink-0">
      <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z"/>
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5 flex-shrink-0">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10.5 11l3-3-3-3M13.5 8H6"/>
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5 flex-shrink-0">
      <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5 flex-shrink-0">
      <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const navItems = [
  { icon: <IconHome />, to: '/', label: 'Главная', end: true },
  { icon: <IconNotes />, to: '/notes', label: 'Заметки', end: false },
  { icon: <IconTasks />, to: '/tasks', label: 'Задачи', end: false },
  { icon: <IconProjects />, to: '/projects', label: 'Проекты', end: false },
]

const CONTEXT_COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6']

function ContextSwitcher({ expanded }: { expanded: boolean }) {
  const { contexts, activeContextId, setContexts, setActiveContext } = useContextStore()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(CONTEXT_COLORS[0])
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const reload = () => contextsApi.list().then((r) => setContexts(r.data)).catch(() => {})

  useEffect(() => { reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setNewName('')
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const active = contexts.find((c) => c.id === activeContextId)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await contextsApi.create({ name: newName.trim(), color: newColor, icon: '🌐' })
      await reload()
      setActiveContext(res.data.id)
      setCreating(false)
      setNewName('')
      setOpen(false)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={ref} className={cn('relative', expanded && 'w-full')}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={active?.name ?? 'Контекст'}
        className={cn(
          'flex items-center gap-2 rounded-md text-xs font-semibold hover:bg-accent transition-colors select-none',
          expanded
            ? 'w-full h-9 px-3 justify-start'
            : 'w-7 h-7 justify-center',
        )}
        style={{ background: active ? active.color + '33' : undefined, color: active?.color }}
      >
        <span className="flex-shrink-0">{active?.icon ?? '🌐'}</span>
        {expanded && (
          <span className="truncate flex-1 text-left text-xs font-normal text-foreground">
            {active?.name ?? 'Контекст'}
          </span>
        )}
      </button>
      {open && (
        <div className={cn(
          'absolute z-50 min-w-[190px] rounded-lg border bg-popover shadow-lg p-1',
          expanded ? 'left-0 bottom-10' : 'left-9 bottom-0',
        )}>
          {contexts.map((c: Context) => (
            <button
              key={c.id}
              onClick={() => { setActiveContext(c.id); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors',
                c.id === activeContextId
                  ? 'bg-accent text-foreground'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: c.color + '33' }}
              >
                {c.icon}
              </span>
              <span className="truncate flex-1">{c.name}</span>
              {c.is_default && (
                <span className="text-[9px] text-muted-foreground">по умолч.</span>
              )}
            </button>
          ))}
          <div className="border-t mt-1 pt-1">
            {creating ? (
              <form onSubmit={handleCreate} className="px-1 pb-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Название"
                  className="w-full rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 ring-primary mb-1.5"
                />
                <div className="flex gap-1 mb-1.5">
                  {CONTEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className="w-4 h-4 rounded-full transition-transform"
                      style={{
                        background: c,
                        outline: c === newColor ? `2px solid ${c}` : 'none',
                        outlineOffset: '1px',
                        transform: c === newColor ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="flex-1"
                    onClick={() => { setCreating(false); setNewName('') }}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    size="xs"
                    className="flex-1"
                    disabled={saving || !newName.trim()}
                  >
                    Создать
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setCreating(true)}
              >
                <span className="text-base leading-none">+</span>
                <span>Новый контекст</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { logout } = useAuth()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [expanded, setExpanded] = useState(() => localStorage.getItem('vinium-sidebar-expanded') === 'true')

  const toggleExpanded = () => {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem('vinium-sidebar-expanded', String(next))
  }

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <aside className={cn(
      'flex-shrink-0 border-r bg-background flex-col py-2 z-10 transition-[width] duration-200',
      'hidden md:flex',
      expanded ? 'w-[200px]' : 'w-12',
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center mb-2',
        expanded ? 'px-3 h-9' : 'justify-center',
      )}>
        <div
          className="w-7 h-7 border rounded-md flex items-center justify-center font-semibold text-[13px] cursor-pointer hover:border-primary transition-colors select-none flex-shrink-0"
          style={{ fontFamily: 'var(--font-display)' }}
          title="Vinium"
        >
          V
        </div>
        {expanded && (
          <span className="ml-2 text-sm font-semibold tracking-tight">Vinium</span>
        )}
      </div>

      {/* Nav */}
      <nav className={cn(
        'flex flex-col gap-0.5 w-full mt-1',
        expanded ? 'px-2' : 'items-center',
      )}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            className={({ isActive }) => cn(
              'relative flex items-center rounded-md transition-colors',
              expanded ? 'w-full gap-2 px-3 h-9' : 'w-9 h-9 justify-center',
              isActive
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-[-1px] w-0.5 h-5 bg-primary rounded-r" />
                )}
                {item.icon}
                {expanded && (
                  <span className="text-[13px]">{item.label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Bottom controls */}
      <div className={cn(
        'flex flex-col gap-0.5',
        expanded ? 'px-2' : 'items-center',
      )}>
        <ContextSwitcher expanded={expanded} />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title={dark ? 'Светлая тема' : 'Тёмная тема'}
          className={cn(
            'mt-1 text-muted-foreground hover:text-foreground',
            expanded && 'w-full justify-start gap-2 px-3',
          )}
        >
          {dark ? <IconSun /> : <IconMoon />}
          {expanded && <span className="text-xs">{dark ? 'Светлая тема' : 'Тёмная тема'}</span>}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={logout}
          title="Выйти"
          className={cn(
            'text-muted-foreground hover:text-foreground',
            expanded && 'w-full justify-start gap-2 px-3',
          )}
        >
          <IconLogout />
          {expanded && <span className="text-xs">Выйти</span>}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleExpanded}
          title={expanded ? 'Свернуть' : 'Развернуть'}
          className={cn(
            'mb-1 text-muted-foreground hover:text-foreground',
            expanded && 'w-full justify-start gap-2 px-3',
          )}
        >
          {expanded ? <IconChevronLeft /> : <IconChevronRight />}
          {expanded && <span className="text-xs">Свернуть</span>}
        </Button>
      </div>
    </aside>
  )
}
