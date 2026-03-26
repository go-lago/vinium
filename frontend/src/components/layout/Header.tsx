import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="h-14 border-b flex items-center justify-between px-6">
      <span className="font-semibold text-lg">Vinium</span>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Выйти
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
