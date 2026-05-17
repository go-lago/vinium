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

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'none' | 'low' | 'medium' | 'high'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  note_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  note_id?: string | null
}

export interface UpdateTaskRequest {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  note_id: string | null
}

export interface Context {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  is_default: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  context_id: string
  user_id: string
  name: string
  description: string
  status: 'active' | 'archived'
  color: string
  icon: string
  sort_order: number
  created_at: string
  updated_at: string
}
