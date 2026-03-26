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
    window.location.href = '/api/v1/auth/google'
  },
}
