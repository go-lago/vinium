import apiClient from './client'
import type { Note } from '@/types'

export const notesApi = {
  list: () => apiClient.get<Note[]>('/notes'),

  get: (id: string) => apiClient.get<Note>(`/notes/${id}`),

  create: (data: { title: string; content: string }) =>
    apiClient.post<Note>('/notes', data),

  update: (id: string, data: { title: string; content: string; is_pinned: boolean }) =>
    apiClient.put<Note>(`/notes/${id}`, data),

  delete: (id: string) => apiClient.delete(`/notes/${id}`),
}
