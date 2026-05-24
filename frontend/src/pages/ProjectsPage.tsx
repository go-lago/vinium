import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useContextStore } from '@/store/contextStore'
import { projectsApi } from '@/api/projects'
import type { Project } from '@/types'
import { Button } from '@/components/ui/button'

function IconPlus() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-md p-6">
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
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" size="sm" disabled={loading || !name.trim()}>
              Создать
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectRow({ project, onArchiveToggle }: { project: Project; onArchiveToggle: (id: string) => void }) {
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
      onArchiveToggle(project.id)
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="group flex items-center gap-3 px-5 py-3 hover:bg-card cursor-pointer transition-colors border-b last:border-b-0"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: project.color + '22' }}
      >
        {project.icon || '📁'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.name}</p>
        {project.description && (
          <p className="text-xs text-muted-foreground truncate">{project.description}</p>
        )}
      </div>
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
        style={{
          background: project.status === 'active' ? '#22c55e22' : '#94a3b822',
          color: project.status === 'active' ? '#16a34a' : '#64748b',
        }}
      >
        {project.status === 'active' ? 'Активный' : 'Архив'}
      </span>
      <Button
        variant="ghost"
        size="xs"
        onClick={handleArchive}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground text-[11px]"
      >
        {project.status === 'active' ? 'В архив' : 'Восстановить'}
      </Button>
    </div>
  )
}

export function ProjectsPage() {
  const { contexts, activeContextId } = useContextStore()
  const location = useLocation()
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

  useEffect(() => {
    if (location.state?.autoCreate && activeContextId) {
      setShowCreate(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state, activeContextId])

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
      <div className="flex flex-col border-b shrink-0">
        <div className="flex items-center gap-3 px-4 md:px-5 h-12">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[15px] font-semibold">Проекты</span>
            {activeCtx && (
              <span className="text-xs text-muted-foreground truncate">{activeCtx.icon} {activeCtx.name}</span>
            )}
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} disabled={!activeContextId}>
            <IconPlus />
            <span className="hidden sm:inline">Новый</span>
          </Button>
        </div>
        <div className="flex items-center gap-1 px-4 md:px-5 pb-2">
          {(['active', 'archived', 'all'] as const).map((f) => (
            <Button
              key={f}
              size="xs"
              variant={filter === f ? 'secondary' : 'ghost'}
              onClick={() => setFilter(f)}
            >
              {f === 'active' ? 'Активные' : f === 'archived' ? 'Архив' : 'Все'}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
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
            <Button variant="link" size="sm" onClick={() => setShowCreate(true)} className="mt-3">
              Создать первый проект
            </Button>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="flex flex-col">
            {filtered.map((p) => (
              <ProjectRow key={p.id} project={p} onArchiveToggle={handleArchiveToggle} />
            ))}
          </div>
        )}
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
