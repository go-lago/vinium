import apiClient from './client'
import type { AuthTokens, LoginRequest, RegisterRequest } from '@/types'

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthTokens>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthTokens>('/auth/register', data),

  logout: () =>
    apiClient.post('/auth/logout'),

  refresh: () =>
    apiClient.post<AuthTokens>('/auth/refresh'),

  googleLogin: () => {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
    window.location.href = `${base}/api/v1/auth/google`
  },
}
