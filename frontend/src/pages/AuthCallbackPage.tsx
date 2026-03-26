import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { userApi } from '@/api/user'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const { setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    // Временно кладём токен в store чтобы userApi.getMe() мог его использовать
    useAuthStore.setState({ accessToken: token })

    userApi
      .getMe()
      .then((res) => {
        setAuth(res.data, token)
        navigate('/', { replace: true })
      })
      .catch(() => {
        clearAuth()
        navigate('/login', { replace: true })
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Входим...</p>
    </div>
  )
}
