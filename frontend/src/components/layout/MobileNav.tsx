import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

function IconHome() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinejoin="round"/>
      <path d="M7.5 18v-6h5v6"/>
    </svg>
  )
}

function IconNotes() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M4.5 2.5h11a1 1 0 011 1v13a1 1 0 01-1 1h-11a1 1 0 01-1-1v-13a1 1 0 011-1z"/>
      <path d="M6.5 7.5h7M6.5 11h5"/>
    </svg>
  )
}

function IconTasks() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M4 6.5h2M4 10h2M4 13.5h2" strokeLinecap="round"/>
      <circle cx="4" cy="6.5" r="0.2" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="4" cy="10" r="0.2" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="4" cy="13.5" r="0.2" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7.5 6.5h8.5M7.5 10h7M7.5 13.5h8" strokeLinecap="round"/>
    </svg>
  )
}

function IconProjects() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5"/>
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5"/>
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5"/>
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.5"/>
    </svg>
  )
}

function IconMore() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <circle cx="4" cy="10" r="1.5"/>
      <circle cx="10" cy="10" r="1.5"/>
      <circle cx="16" cy="10" r="1.5"/>
    </svg>
  )
}

function IconSun() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4.5 h-4.5">
      <circle cx="10" cy="10" r="3.5"/>
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" strokeLinecap="round"/>
    </svg>
  )
}

function IconMoon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4.5 h-4.5">
      <path d="M17 13A7 7 0 018 4a7 7 0 100 12 7 7 0 009-3z"/>
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4.5 h-4.5">
      <path d="M7.5 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3.5M13 14l3.5-4L13 6M16.5 10H8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const navItems = [
  { to: '/',         label: 'Главная',  icon: <IconHome />,     end: true  },
  { to: '/notes',    label: 'Заметки',  icon: <IconNotes />,    end: false },
  { to: '/tasks',    label: 'Задачи',   icon: <IconTasks />,    end: false },
  { to: '/projects', label: 'Проекты',  icon: <IconProjects />, end: false },
]

export function MobileNav() {
  const { logout } = useAuth()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <>
      {/* More sheet */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="absolute left-0 right-0 bg-background border-t rounded-t-2xl shadow-xl py-2"
            style={{ bottom: 56 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-8 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-3" />

            <button
              onClick={() => { toggleTheme(); setSheetOpen(false) }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-foreground hover:bg-accent transition-colors"
            >
              {dark ? <IconSun /> : <IconMoon />}
              <span>{dark ? 'Светлая тема' : 'Тёмная тема'}</span>
            </button>

            <button
              onClick={() => { logout(); setSheetOpen(false) }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-destructive hover:bg-accent transition-colors"
            >
              <IconLogout />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t bg-background"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center h-14 gap-0.5 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {item.icon}
            <span className="font-mono text-[9px] tracking-wide">{item.label}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setSheetOpen(v => !v)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center h-14 gap-0.5 transition-colors',
            sheetOpen ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <IconMore />
          <span className="font-mono text-[9px] tracking-wide">Ещё</span>
        </button>
      </nav>
    </>
  )
}
