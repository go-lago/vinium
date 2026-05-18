import { useEffect, useRef, useState } from 'react'
import { tasksApi } from '@/api/tasks'
import type { Task, TaskStatus, TaskPriority, UpdateTaskRequest } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
          rx="0.5" fill={i < bars ? 'currentColor' : 'currentColor'} opacity={i < bars ? 1 : 0.25} />
      ))}
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
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
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: 'Без приоритета',
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
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

function toLocalDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function fromDateInput(val: string): string | null {
  if (!val) return null
  return new Date(val + 'T00:00:00').toISOString()
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

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ task, onSave, onDelete, onClose }: {
  task: Task
  onSave: (id: string, data: UpdateTaskRequest) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [dueDate, setDueDate] = useState(toLocalDateInput(task.due_date))
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description)
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(toLocalDateInput(task.due_date))
    setDeleteConfirm(false)
  }, [task.id])

  const scheduleSave = (patch: Partial<UpdateTaskRequest>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave(task.id, {
        title,
        description,
        status,
        priority,
        due_date: fromDateInput(dueDate),
        note_id: task.note_id,
        ...patch,
      })
    }, 600)
  }

  const handleStatus = (v: TaskStatus) => {
    setStatus(v)
    scheduleSave({ status: v })
  }
  const handlePriority = (v: TaskPriority) => {
    setPriority(v)
    scheduleSave({ priority: v })
  }
  const handleDue = (v: string) => {
    setDueDate(v)
    scheduleSave({ due_date: fromDateInput(v) })
  }
  const handleTitle = (v: string) => {
    setTitle(v)
    scheduleSave({ title: v })
  }
  const handleDescription = (v: string) => {
    setDescription(v)
    scheduleSave({ description: v })
  }

  const row = 'flex items-center gap-3 py-1.5'
  const label = 'font-mono text-[10px] uppercase tracking-widest text-muted-foreground w-24 flex-shrink-0'
  const sel = 'bg-transparent outline-none text-sm text-foreground cursor-pointer'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 border-b flex-shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Задача</span>
        <div className="flex items-center gap-2">
          {deleteConfirm ? (
            <>
              <span className="font-mono text-[10px] text-muted-foreground">Удалить?</span>
              <button onClick={() => setDeleteConfirm(false)} className="font-mono text-[10px] text-muted-foreground hover:text-foreground">Отмена</button>
              <button onClick={() => onDelete(task.id)} className="font-mono text-[10px] text-destructive hover:underline">Удалить</button>
            </>
          ) : (
            <button onClick={() => setDeleteConfirm(true)} className="font-mono text-[10px] text-muted-foreground hover:text-destructive transition-colors">Удалить</button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="text-muted-foreground">
            <IconClose />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Title */}
        <input
          value={title}
          onChange={e => handleTitle(e.target.value)}
          placeholder="Название задачи"
          className="w-full text-[18px] font-medium bg-transparent outline-none placeholder:text-muted-foreground mb-3 leading-snug"
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={e => handleDescription(e.target.value)}
          placeholder="Описание..."
          rows={4}
          className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground resize-none mb-5 text-foreground/80 leading-relaxed"
        />

        {/* Properties */}
        <div className="space-y-0.5">
          <div className={row}>
            <span className={label}>Статус</span>
            <select value={status} onChange={e => handleStatus(e.target.value as TaskStatus)} className={sel}>
              {STATUS_ORDER.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className={row}>
            <span className={label}>Приоритет</span>
            <select value={priority} onChange={e => handlePriority(e.target.value as TaskPriority)} className={sel}>
              {(['none', 'low', 'medium', 'high'] as TaskPriority[]).map(p => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div className={row}>
            <span className={label}>Дедлайн</span>
            <input
              type="date"
              value={dueDate}
              onChange={e => handleDue(e.target.value)}
              className="bg-transparent outline-none text-sm text-foreground cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Task | null>(null)

  useEffect(() => {
    tasksApi.list()
      .then(({ data }) => setTasks(data))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (title: string, status: TaskStatus = 'todo') => {
    const { data } = await tasksApi.create({ title, status })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-[11px] text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Task list */}
      <div className={cn('flex flex-col overflow-y-auto transition-all', selected ? 'w-[55%]' : 'flex-1')}>
        {/* Page header */}
        <div className="flex items-center justify-between px-5 h-10 border-b flex-shrink-0">
          <span className="text-sm font-medium">Задачи</span>
          <span className="font-mono text-[10px] text-muted-foreground">{tasks.length} задач</span>
        </div>

        <div className="flex-1 px-3 py-4 space-y-6">
          {grouped.map(({ status, items }) => (
            <div key={status}>
              {/* Group header */}
              <div className="flex items-center gap-2 px-3 mb-1">
                <IconCircle status={status} />
                <span className="font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {STATUS_LABELS[status]}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/60">{items.length}</span>
              </div>

              {/* Task rows */}
              {items.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  selected={selected?.id === task.id}
                  onClick={() => setSelected(task)}
                  onStatusToggle={handleStatusToggle}
                />
              ))}

              {/* Inline create (only for todo) */}
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

      {/* Detail panel */}
      {selected && (
        <div className="border-l flex-1 overflow-hidden">
          <DetailPanel
            task={selected}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  )
}
