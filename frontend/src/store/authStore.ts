import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  setAuth: (user: User, accessToken: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  setInitialized: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),

  setAccessToken: (token) =>
    set({ accessToken: token }),

  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),

  setInitialized: () =>
    set({ isInitialized: true }),
}))
