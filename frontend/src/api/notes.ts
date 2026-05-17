import apiClient from './client'
import type { Note, NoteSummary } from '@/types'

export const LEXICAL_VERSION = '0.42.0'

export const notesApi = {
  list: (page = 1, perPage = 50, params?: { context_id?: string; project_id?: string }) =>
    apiClient.get<NoteSummary[]>('/notes', { params: { page, per_page: perPage, ...params } }),

  search: (q: string, page = 1, perPage = 50, params?: { context_id?: string; project_id?: string }) =>
    apiClient.get<NoteSummary[]>('/notes', { params: { q, page, per_page: perPage, ...params } }),

  get: (id: string) => apiClient.get<Note>(`/notes/${id}`),

  create: (data: { title: string; content: string; tags?: string[]; context_id?: string; project_id?: string }) =>
    apiClient.post<Note>('/notes', { ...data, lexical_version: LEXICAL_VERSION }),

  update: (id: string, data: { title: string; content: string; is_pinned: boolean; tags?: string[] }) =>
    apiClient.put<Note>(`/notes/${id}`, { ...data, lexical_version: LEXICAL_VERSION }),

  delete: (id: string) => apiClient.delete(`/notes/${id}`),
}
