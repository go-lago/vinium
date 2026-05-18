import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { projectsApi } from '@/api/projects'
import { notesApi } from '@/api/notes'
import { tasksApi } from '@/api/tasks'
import type { Project, NoteSummary, Task, TaskStatus } from '@/types'
import { Button } from '@/components/ui/button'

type Tab = 'notes' | 'tasks'

function IconBack() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
    </svg>
  )
}

function StatusDot({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    todo: 'border-muted-foreground',
    in_progress: 'border-amber-400 bg-amber-400/30',
    done: 'bg-primary border-primary',
    cancelled: 'border-muted-foreground/40',
  }
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full border-2 flex-shrink-0 ${colors[status]}`}
    />
  )
}

function NoteRow({ note }: { note: NoteSummary }) {
  return (
    <Link
      to={`/notes/${note.id}`}
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors group"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0">
        <path d="M3.5 1.5h9a1 1 0 011 1v11a1 1 0 01-1 1h-9a1 1 0 01-1-1v-11a1 1 0 011-1z"/>
        <path d="M5 6h6M5 9.5h4"/>
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate group-hover:text-foreground">
          {note.title || <span className="italic text-muted-foreground">Без названия</span>}
        </p>
        {note.content_plain && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{note.content_plain}</p>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap self-center">
        {new Date(note.updated_at).toLocaleDateString('ru')}
      </span>
    </Link>
  )
}

function TaskRow({
  task,
  onStatusChange,
}: {
  task: Task
  onStatusChange: (id: string, status: TaskStatus) => void
}) {
  const NEXT: Record<TaskStatus, TaskStatus> = {
    todo: 'in_progress',
    in_progress: 'done',
    done: 'todo',
    cancelled: 'todo',
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    const next = NEXT[task.status]
    onStatusChange(task.id, next)
    try {
      await tasksApi.update(task.id, {
        title: task.title,
        description: task.description,
        status: next,
        priority: task.priority,
        due_date: task.due_date,
        note_id: task.note_id,
      })
    } catch {
      onStatusChange(task.id, task.status) // rollback
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
      <button onMouseDown={handleToggle} className="flex-shrink-0">
        <StatusDot status={task.status} />
      </button>
      <span
        className={`text-sm flex-1 truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}
      >
        {task.title || <span className="italic text-muted-foreground">Без названия</span>}
      </span>
      {task.priority !== 'none' && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            background:
              task.priority === 'high'
                ? '#ef444422'
                : task.priority === 'medium'
                  ? '#f59e0b22'
                  : '#64748b22',
            color:
              task.priority === 'high'
                ? '#ef4444'
                : task.priority === 'medium'
                  ? '#f59e0b'
                  : '#64748b',
          }}
        >
          {task.priority}
        </span>
      )}
    </div>
  )
}

function QuickCreateNote({
  projectId,
  onCreated,
}: {
  projectId: string
  onCreated: (note: NoteSummary) => void
}) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await notesApi.create({ title: title.trim(), content: '', project_id: projectId })
      navigate(`/notes/${res.data.id}`)
    } catch {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 px-3 py-2 border-t">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название заметки…"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <Button type="submit" size="sm" disabled={saving || !title.trim()}>
        <IconPlus />
        Создать
      </Button>
    </form>
  )
}

function QuickCreateTask({
  projectId,
  onCreated,
}: {
  projectId: string
  onCreated: (task: Task) => void
}) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await tasksApi.create({ title: title.trim(), project_id: projectId })
      onCreated(res.data)
      setTitle('')
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 px-3 py-2 border-t">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название задачи…"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <Button type="submit" size="sm" disabled={saving || !title.trim()}>
        <IconPlus />
        Создать
      </Button>
    </form>
  )
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tab, setTab] = useState<Tab>('notes')
  const [loading, setLoading] = useState(true)

  const loadProject = useCallback(async () => {
    if (!id) return
    try {
      const [pRes, nRes, tRes] = await Promise.all([
        projectsApi.get(id),
        notesApi.list(1, 100, { project_id: id }),
        tasksApi.list({ project_id: id }),
      ])
      setProject(pRes.data)
      setNotes(nRes.data)
      setTasks(tRes.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadProject() }, [loadProject])

  const handleTaskStatusChange = (taskId: string, status: TaskStatus) => {
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status } : t)))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Загрузка…
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Проект не найден</p>
          <Link to="/projects" className="text-xs text-primary hover:underline">
            Назад к проектам
          </Link>
        </div>
      </div>
    )
  }

  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const totalTasks = tasks.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b flex-shrink-0">
        <Link
          to="/projects"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors w-fit"
        >
          <IconBack />
          Проекты
        </Link>
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: project.color + '22' }}
          >
            {project.icon || '📁'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
            )}
            {totalTasks > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {doneTasks} / {totalTasks} задач выполнено
              </p>
            )}
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full self-start mt-1"
            style={{
              background: project.status === 'active' ? '#22c55e22' : '#94a3b822',
              color: project.status === 'active' ? '#16a34a' : '#64748b',
            }}
          >
            {project.status === 'active' ? 'Активный' : 'Архив'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b flex-shrink-0 px-5">
        <button
          onClick={() => setTab('notes')}
          className={`px-3 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
            tab === 'notes'
              ? 'border-primary text-foreground font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Заметки
          {notes.length > 0 && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground">
              {notes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('tasks')}
          className={`px-3 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
            tab === 'tasks'
              ? 'border-primary text-foreground font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Задачи
          {tasks.length > 0 && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground">
              {tasks.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'notes' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-3">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center mt-16">
                  Нет заметок в этом проекте
                </p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {notes.map((n) => (
                    <NoteRow key={n.id} note={n} />
                  ))}
                </div>
              )}
            </div>
            <QuickCreateNote
              projectId={project.id}
              onCreated={(n) => setNotes((ns) => [n, ...ns])}
            />
          </div>
        )}

        {tab === 'tasks' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-3">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center mt-16">
                  Нет задач в этом проекте
                </p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {tasks.map((t) => (
                    <TaskRow key={t.id} task={t} onStatusChange={handleTaskStatusChange} />
                  ))}
                </div>
              )}
            </div>
            <QuickCreateTask
              projectId={project.id}
              onCreated={(t) => setTasks((ts) => [t, ...ts])}
            />
          </div>
        )}
      </div>
    </div>
  )
}
