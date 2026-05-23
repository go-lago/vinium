import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { userApi } from '@/api/user'
import axios from 'axios'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const { setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      navigate('/login', { replace: true })
      return
    }

    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
    axios
      .get<{ access_token: string }>(`${base}/api/v1/auth/google/exchange?code=${code}`)
      .then(({ data }) => {
        useAuthStore.setState({ accessToken: data.access_token })
        return userApi.getMe().then((res) => {
          setAuth(res.data, data.access_token)
          navigate('/', { replace: true })
        })
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
