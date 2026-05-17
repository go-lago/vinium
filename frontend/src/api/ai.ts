import apiClient from './client'

export const aiApi = {
  action: (action: string, content: string, signal?: AbortSignal) =>
    apiClient.post<{ result: string }>('/ai/action', { action, content }, { signal }),
}
