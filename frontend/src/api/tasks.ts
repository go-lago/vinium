import apiClient from './client'
import type { Task, CreateTaskRequest, UpdateTaskRequest } from '@/types'

export const tasksApi = {
  list: (params?: { status?: string; priority?: string; context_id?: string; project_id?: string }) =>
    apiClient.get<Task[]>('/tasks', { params }),

  get: (id: string) =>
    apiClient.get<Task>(`/tasks/${id}`),

  create: (data: CreateTaskRequest) =>
    apiClient.post<Task>('/tasks', data),

  update: (id: string, data: UpdateTaskRequest) =>
    apiClient.put<Task>(`/tasks/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/tasks/${id}`),
}
