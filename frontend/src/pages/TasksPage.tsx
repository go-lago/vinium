import { useCallback, useEffect, useRef, useState } from 'react'
import { tasksApi } from '@/api/tasks'
import { projectsApi } from '@/api/projects'
import { useContextStore } from '@/store/contextStore'
import type { Task, TaskStatus, TaskPriority, UpdateTaskRequest, Project } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TaskDetailModal } from '@/components/TaskDetailModal'

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconCircle({ status }: { status: TaskStatus }) {
  if (status === 'done') {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 text-primary">
        <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 8.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    )
  }
  if (status === 'in_progress') {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 text-amber-500">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="8" r="3.5" fill="currentColor" />
      </svg>
    )
  }
  if (status === 'cancelled') {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 text-muted-foreground">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 text-muted-foreground">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function IconPriority({ priority }: { priority: TaskPriority }) {
  const color =
    priority === 'high' ? 'text-red-500' :
    priority === 'medium' ? 'text-amber-500' :
    priority === 'low' ? 'text-blue-400' : 'text-muted-foreground/40'
  if (priority === 'none') {
    return <span className={cn('w-3 h-3 flex-shrink-0', color)}>—</span>
  }
  const bars = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1
  return (
    <svg viewBox="0 0 12 12" className={cn('w-3 h-3 flex-shrink-0', color)}>
      {[0, 1, 2].map(i => (
        <rect key={i} x={i * 4} y={12 - (i < bars ? (i + 1) * 4 : 4)} width="3" height={i < bars ? (i + 1) * 4 : 4}
          rx="0.5" fill="currentColor" opacity={i < bars ? 1 : 0.25} />
      ))}
    </svg>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled']
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Выполнено',
  cancelled: 'Отменено',
}
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
  cancelled: 'todo',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDue(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / 86400000)
  if (days < 0) return { label: 'Просрочено', overdue: true }
  if (days === 0) return { label: 'Сегодня', overdue: false }
  if (days === 1) return { label: 'Завтра', overdue: false }
  return { label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), overdue: false }
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, selected, onClick, onStatusToggle }: {
  task: Task
  selected: boolean
  onClick: () => void
  onStatusToggle: (t: Task) => void
}) {
  const due = formatDue(task.due_date)
  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm',
        selected ? 'bg-accent' : 'hover:bg-accent/50',
        task.status === 'done' || task.status === 'cancelled' ? 'opacity-60' : '',
      )}
    >
      <button
        type="button"
        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
        onClick={(e) => { e.stopPropagation(); onStatusToggle(task) }}
        className="flex-shrink-0 hover:scale-110 transition-transform"
      >
        <IconCircle status={task.status} />
      </button>

      <IconPriority priority={task.priority} />

      <span className={cn(
        'flex-1 truncate',
        task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground',
      )}>
        {task.title || <span className="italic text-muted-foreground">Без названия</span>}
      </span>

      {due && (
        <span className={cn(
          'font-mono text-[10px] flex-shrink-0',
          due.overdue ? 'text-destructive' : 'text-muted-foreground',
        )}>
          {due.label}
        </span>
      )}
    </div>
  )
}

// ─── Inline Create ────────────────────────────────────────────────────────────

function InlineCreate({ onConfirm }: { onConfirm: (title: string) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const confirm = () => {
    if (title.trim()) onConfirm(title.trim())
    setTitle('')
    setOpen(false)
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground font-normal"
        onMouseDown={(e) => { e.preventDefault(); setOpen(true) }}
      >
        <span className="text-base leading-none">+</span> Добавить задачу
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <div className="w-4 h-4 flex-shrink-0 rounded-full border border-muted-foreground/40" />
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') confirm()
          if (e.key === 'Escape') { setTitle(''); setOpen(false) }
        }}
        onBlur={() => { setTimeout(() => { if (!title.trim()) setOpen(false) }, 100) }}
        placeholder="Название задачи..."
        className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
      />
      {title.trim() && (
        <Button variant="link" size="xs" onMouseDown={(e) => { e.preventDefault(); confirm() }}>Добавить</Button>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TasksPage() {
  const { activeContextId } = useContextStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Task | null>(null)

  const fetchTasks = useCallback((projectId: string | null) => {
    setLoading(true)
    const params: { context_id?: string; project_id?: string } = {}
    if (activeContextId) params.context_id = activeContextId
    if (projectId) params.project_id = projectId
    tasksApi.list(params)
      .then(({ data }) => setTasks(data))
      .finally(() => setLoading(false))
  }, [activeContextId])

  useEffect(() => {
    setSelectedProjectId(null)
    setSelected(null)
    fetchTasks(null)
    if (activeContextId) {
      projectsApi.listByContext(activeContextId)
        .then(({ data }) => setProjects(data))
        .catch(() => setProjects([]))
    } else {
      setProjects([])
    }
  }, [activeContextId, fetchTasks])

  const handleProjectChange = (projectId: string | null) => {
    setSelectedProjectId(projectId)
    setSelected(null)
    fetchTasks(projectId)
  }

  const handleCreate = async (title: string, status: TaskStatus = 'todo') => {
    const { data } = await tasksApi.create({
      title,
      status,
      context_id: activeContextId ?? undefined,
      project_id: selectedProjectId ?? undefined,
    })
    setTasks(prev => [data, ...prev])
    setSelected(data)
  }

  const handleSave = async (id: string, req: UpdateTaskRequest) => {
    const { data } = await tasksApi.update(id, req)
    setTasks(prev => prev.map(t => t.id === id ? data : t))
    setSelected(prev => prev?.id === id ? data : prev)
  }

  const handleStatusToggle = async (task: Task) => {
    const next = NEXT_STATUS[task.status]
    await handleSave(task.id, {
      title: task.title,
      description: task.description,
      status: next,
      priority: task.priority,
      due_date: task.due_date,
      note_id: task.note_id,
    })
  }

  const handleDelete = async (id: string) => {
    await tasksApi.delete(id)
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelected(null)
  }

  const grouped = STATUS_ORDER.map(s => ({
    status: s,
    items: tasks.filter(t => t.status === s),
  })).filter(g => g.items.length > 0 || g.status === 'todo')

  const activeProjects = projects.filter(p => p.status === 'active')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-[11px] text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Page header */}
        <div className="flex items-center justify-between px-5 h-10 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Задачи</span>
            {activeProjects.length > 0 && (
              <select
                value={selectedProjectId ?? ''}
                onChange={e => handleProjectChange(e.target.value || null)}
                className="text-[11px] text-muted-foreground bg-background outline-none border border-border rounded-md px-2 py-0.5 cursor-pointer hover:border-primary transition-colors"
              >
                <option value="">Все проекты</option>
                {activeProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{tasks.length} задач</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {grouped.map(({ status, items }) => (
            <div key={status}>
              <div className="flex items-center gap-2 px-3 mb-1">
                <IconCircle status={status} />
                <span className="font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {STATUS_LABELS[status]}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/60">{items.length}</span>
              </div>

              {items.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  selected={selected?.id === task.id}
                  onClick={() => setSelected(task)}
                  onStatusToggle={handleStatusToggle}
                />
              ))}

              {status === 'todo' && (
                <InlineCreate onConfirm={title => handleCreate(title, 'todo')} />
              )}
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground text-sm mb-1">Задач пока нет</p>
              <p className="text-muted-foreground/60 text-xs">Нажмите «Добавить задачу» ниже</p>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <TaskDetailModal
          task={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
