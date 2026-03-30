import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface PrivateRouteProps {
  children: React.ReactNode
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  if (!isInitialized) return null

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}
