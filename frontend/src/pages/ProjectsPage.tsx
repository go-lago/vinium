import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContextStore } from '@/store/contextStore'
import { projectsApi } from '@/api/projects'
import type { Project } from '@/types'

function IconPlus() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
    </svg>
  )
}

function IconFolder() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
      <path d="M1.5 4.5A1 1 0 012.5 3.5h3.293a1 1 0 01.707.293L7.914 4.707A1 1 0 008.621 5H13.5a1 1 0 011 1v6.5a1 1 0 01-1 1h-11a1 1 0 01-1-1V4.5z"/>
    </svg>
  )
}

interface CreateModalProps {
  contextId: string
  onClose: () => void
  onCreate: (p: Project) => void
}

function CreateProjectModal({ contextId, onClose, onCreate }: CreateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await projectsApi.create({ context_id: contextId, name: name.trim(), description, color })
      onCreate(res.data)
      onClose()
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card border rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-4">Новый проект</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название проекта"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 ring-primary"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 ring-primary resize-none"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Цвет</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-7 rounded border cursor-pointer"
            />
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-md border hover:bg-accent transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectCard({ project, onArchive }: { project: Project; onArchive: (id: string) => void }) {
  const navigate = useNavigate()

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await projectsApi.update(project.id, {
        name: project.name,
        description: project.description,
        status: project.status === 'active' ? 'archived' : 'active',
        color: project.color,
        icon: project.icon,
      })
      onArchive(project.id)
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="group relative rounded-xl border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 text-xl"
        style={{ background: project.color + '22' }}
      >
        {project.icon || <IconFolder />}
      </div>
      <h3 className="font-medium text-sm truncate">{project.name}</h3>
      {project.description && (
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
      )}
      <div className="flex items-center gap-1.5 mt-3">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{
            background: project.status === 'active' ? '#22c55e22' : '#94a3b822',
            color: project.status === 'active' ? '#16a34a' : '#64748b',
          }}
        >
          {project.status === 'active' ? 'Активный' : 'Архив'}
        </span>
      </div>
      <button
        onClick={handleArchive}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground hover:text-foreground transition-all px-1.5 py-0.5 rounded border"
      >
        {project.status === 'active' ? 'Архивировать' : 'Восстановить'}
      </button>
    </div>
  )
}

export function ProjectsPage() {
  const { contexts, activeContextId } = useContextStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active')

  useEffect(() => {
    if (!activeContextId) return
    setLoading(true)
    projectsApi
      .listByContext(activeContextId)
      .then((r) => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeContextId])

  const activeCtx = contexts.find((c) => c.id === activeContextId)

  const handleArchiveToggle = (id: string) => {
    setProjects((ps) =>
      ps.map((p) =>
        p.id === id ? { ...p, status: p.status === 'active' ? 'archived' : 'active' } : p,
      ),
    )
  }

  const filtered = projects.filter((p) => filter === 'all' || p.status === filter)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0">
        <div className="flex-1">
          <h1 className="text-sm font-semibold">Проекты</h1>
          {activeCtx && (
            <p className="text-xs text-muted-foreground">
              {activeCtx.icon} {activeCtx.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs">
          {(['active', 'archived', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded-md transition-colors ${
                filter === f
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {f === 'active' ? 'Активные' : f === 'archived' ? 'Архив' : 'Все'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!activeContextId}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          <IconPlus />
          Новый
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {!activeContextId && (
          <p className="text-sm text-muted-foreground text-center mt-20">
            Выберите контекст в боковой панели
          </p>
        )}
        {activeContextId && loading && (
          <p className="text-sm text-muted-foreground text-center mt-20">Загрузка…</p>
        )}
        {activeContextId && !loading && filtered.length === 0 && (
          <div className="text-center mt-20">
            <p className="text-sm text-muted-foreground">Проектов пока нет</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Создать первый проект
            </button>
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} onArchive={handleArchiveToggle} />
          ))}
        </div>
      </div>

      {showCreate && activeContextId && (
        <CreateProjectModal
          contextId={activeContextId}
          onClose={() => setShowCreate(false)}
          onCreate={(p) => setProjects((ps) => [p, ...ps])}
        />
      )}
    </div>
  )
}
