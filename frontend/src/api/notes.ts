import apiClient from './client'
import type { Note, NoteSummary } from '@/types'

export const notesApi = {
  list: (page = 1, perPage = 50) =>
    apiClient.get<NoteSummary[]>('/notes', { params: { page, per_page: perPage } }),

  get: (id: string) => apiClient.get<Note>(`/notes/${id}`),

  create: (data: { title: string; content: string; tags?: string[] }) =>
    apiClient.post<Note>('/notes', data),

  update: (id: string, data: { title: string; content: string; is_pinned: boolean; tags?: string[] }) =>
    apiClient.put<Note>(`/notes/${id}`, data),

  delete: (id: string) => apiClient.delete(`/notes/${id}`),
}
