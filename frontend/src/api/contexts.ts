import apiClient from './client'
import type { Context } from '@/types'

export const contextsApi = {
  list: () => apiClient.get<Context[]>('/contexts'),

  get: (id: string) => apiClient.get<Context>(`/contexts/${id}`),

  create: (data: { name: string; color?: string; icon?: string; sort_order?: number }) =>
    apiClient.post<Context>('/contexts', data),

  update: (
    id: string,
    data: { name: string; color?: string; icon?: string; sort_order?: number },
  ) => apiClient.put<Context>(`/contexts/${id}`, data),

  delete: (id: string) => apiClient.delete(`/contexts/${id}`),
}
