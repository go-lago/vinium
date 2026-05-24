import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { MobileNav } from './MobileNav'
import { CommandPalette } from '@/components/CommandPalette'

export function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* pt-12 accounts for fixed MobileHeader height on mobile */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 pt-12 md:pt-0 pb-14 md:pb-0">
          <Outlet />
        </main>
        <div className="hidden md:flex h-7 border-t items-center px-5 gap-4 font-mono text-[10px] text-muted-foreground flex-shrink-0">
          <span>Vinium</span>
        </div>
      </div>
      <MobileHeader onOpenPalette={() => setPaletteOpen(true)} />
      <MobileNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
