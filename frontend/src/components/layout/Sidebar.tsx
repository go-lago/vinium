import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', to: '/' },
]

export function Sidebar() {
  return (
    <aside className="w-56 border-r min-h-screen p-4">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              cn(
                'px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
