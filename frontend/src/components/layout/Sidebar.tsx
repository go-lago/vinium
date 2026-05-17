import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useState } from 'react'

function IconNotes() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <path d="M3.5 1.5h9a1 1 0 011 1v11a1 1 0 01-1 1h-9a1 1 0 01-1-1v-11a1 1 0 011-1z"/>
      <path d="M5 6h6M5 9.5h4"/>
    </svg>
  )
}

function IconHome() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <path d="M2 7L8 2l6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z"/>
      <path d="M6 15v-5h4v5"/>
    </svg>
  )
}

function IconSun() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
      <circle cx="8" cy="8" r="3"/>
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"/>
    </svg>
  )
}

function IconTasks() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <path d="M2.5 4.5h2M2.5 8h2M2.5 11.5h2"/>
      <circle cx="2.5" cy="4.5" r="0.1" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="2.5" cy="8" r="0.1" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="2.5" cy="11.5" r="0.1" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5.5 4.5h8M5.5 8h6M5.5 11.5h7" strokeLinecap="round"/>
    </svg>
  )
}

function IconMoon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
      <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z"/>
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10.5 11l3-3-3-3M13.5 8H6"/>
    </svg>
  )
}

const navItems = [
  { icon: <IconHome />, to: '/', label: 'Dashboard', end: true },
  { icon: <IconNotes />, to: '/notes', label: 'Заметки', end: false },
  { icon: <IconTasks />, to: '/tasks', label: 'Задачи', end: false },
]

export function Sidebar() {
  const { logout } = useAuth()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <aside className="w-12 flex-shrink-0 border-r bg-background flex flex-col items-center py-2 z-10">
      <div
        className="w-7 h-7 border rounded-md flex items-center justify-center font-semibold text-[13px] cursor-pointer mb-2 hover:border-primary transition-colors select-none"
        style={{ fontFamily: 'var(--font-display)' }}
        title="Vinium"
      >
        V
      </div>

      <nav className="flex flex-col items-center gap-0.5 w-full mt-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            className={({ isActive }) => cn(
              'relative w-9 h-9 flex items-center justify-center rounded-md transition-colors',
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
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      <button
        onClick={toggleTheme}
        title={dark ? 'Светлая тема' : 'Тёмная тема'}
        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mb-1"
      >
        {dark ? <IconSun /> : <IconMoon />}
      </button>

      <button
        onClick={logout}
        title="Выйти"
        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mb-1"
      >
        <IconLogout />
      </button>
    </aside>
  )
}
