import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { userApi } from '@/api/user'
import type { UpdateProfileRequest } from '@/types'

export function useUser() {
  const { user, setAuth, accessToken } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = useCallback(
    async (data: UpdateProfileRequest) => {
      setLoading(true)
      setError(null)
      try {
        const res = await userApi.updateMe(data)
        setAuth(res.data, accessToken!)
      } catch {
        setError('Failed to update profile')
        throw error
      } finally {
        setLoading(false)
      }
    },
    [setAuth, accessToken, error],
  )

  return { user, loading, error, updateProfile }
}
