import apiClient from './client'
import type { Project } from '@/types'

export const projectsApi = {
  listByContext: (contextId: string) =>
    apiClient.get<Project[]>(`/contexts/${contextId}/projects`),

  get: (id: string) => apiClient.get<Project>(`/projects/${id}`),

  create: (data: {
    context_id: string
    name: string
    description?: string
    color?: string
    icon?: string
    sort_order?: number
  }) => apiClient.post<Project>('/projects', data),

  update: (
    id: string,
    data: {
      name: string
      description?: string
      status?: 'active' | 'archived'
      color?: string
      icon?: string
    },
  ) => apiClient.put<Project>(`/projects/${id}`, data),

  delete: (id: string) => apiClient.delete(`/projects/${id}`),
}
