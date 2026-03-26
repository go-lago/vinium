import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { userApi } from '@/api/user'
import type { LoginRequest, RegisterRequest } from '@/types'

export function useAuth() {
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } =
    useAuthStore()
  const navigate = useNavigate()

  const login = useCallback(
    async (data: LoginRequest) => {
      const res = await authApi.login(data)
      const meRes = await userApi.getMe()
      setAuth(meRes.data, res.data.access_token)
      navigate('/')
    },
    [setAuth, navigate],
  )

  const register = useCallback(
    async (data: RegisterRequest) => {
      const res = await authApi.register(data)
      const meRes = await userApi.getMe()
      setAuth(meRes.data, res.data.access_token)
      navigate('/')
    },
    [setAuth, navigate],
  )

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {})
    clearAuth()
    navigate('/login')
  }, [clearAuth, navigate])

  return { user, accessToken, isAuthenticated, login, register, logout }
}
