import apiClient from './client'
import type { User, UpdateProfileRequest } from '@/types'

export const userApi = {
  getMe: () =>
    apiClient.get<User>('/me'),

  updateMe: (data: UpdateProfileRequest) =>
    apiClient.put<User>('/me', data),
}
