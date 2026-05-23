import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { PrivateRoute } from '@/components/PrivateRoute'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { NotesPage } from '@/pages/NotesPage'
import { NoteEditorPage } from '@/pages/NoteEditorPage'
import { TasksPage } from '@/pages/TasksPage'
import { TaskEditorPage } from '@/pages/TaskEditorPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { authApi } from '@/api/auth'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/store/authStore'

function App() {
  useEffect(() => {
    authApi
      .refresh()
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.access_token)
        return userApi.getMe()
      })
      .then(({ data }) => {
        useAuthStore.getState().setAuth(data, useAuthStore.getState().accessToken!)
      })
      .catch(() => {
        useAuthStore.getState().clearAuth()
      })
      .finally(() => {
        useAuthStore.getState().setInitialized()
      })
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Navigate to="/notes" replace />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NoteEditorPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/:id" element={<TaskEditorPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
