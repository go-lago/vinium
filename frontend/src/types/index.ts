export interface User {
  id: string
  email: string
  name: string
  avatar_url: string
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access_token: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface UpdateProfileRequest {
  name?: string
  avatar_url?: string
}

export interface ApiError {
  message: string
  code?: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  content_plain: string
  content_version: number
  type: string
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export type NoteSummary = Omit<Note, 'content'>
