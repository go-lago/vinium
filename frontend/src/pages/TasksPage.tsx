import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tasksApi } from '@/api/tasks'
import { projectsApi } from '@/api/projects'
import { useContextStore } from '@/store/contextStore'
import type { Task, TaskStatus, TaskPriority, UpdateTaskRequest, Project } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TaskDetailModal } from '@/components/TaskDetailModal'
import { TaskBoardView } from '@/components/TaskBoardView'

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'board'
type TaskColumn = 'project' | 'priority' | 'due'
type DueRange = 'today' | 'week' | 'overdue'

interface TaskFilter {
  projectId: string | null
  priority: TaskPriority | null
  dueRange: DueRange | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_ORDER: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'done', 'cancelled']

const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: 'Входящие',
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Выполнено',
  cancelled: 'Отменено',
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  inbox: 'todo',
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
  cancelled: 'todo',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: 'Без приоритета',
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

const DUE_RANGE_LABELS: Record<DueRange, string> = {
  today: 'Сегодня',
  week: 'Эта неделя',
  overdue: 'Просрочено',
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  none: 'bg-muted-foreground/30',
  low: 'bg-blue-400',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconList() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3.5 h-3.5">
      <path d="M2 4h10M2 7h10M2 10h6" strokeLinecap="round"/>
    </svg>
  )
}

function IconBoard() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3.5 h-3.5">
      <rect x="1" y="2" width="4" height="10" rx="1"/>
      <rect x="6" y="2" width="4" height="7" rx="1"/>
      <rect x="11" y="2" width="2" height="5" rx="1"/>
    </svg>
  )
}

function IconCircle({ status }: { status: TaskStatus }) {
  if (status === 'done') {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 text-primary">
        <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 8.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    )
  }
  if (status === 'in_progress') {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 text-amber-500">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="8" cy="8" r="3.5" fill="currentColor"/>
      </svg>
    )
  }
  if (status === 'cancelled') {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 text-muted-foreground">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2"/>
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    )
  }
  if (status === 'inbox') {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 text-primary/60">
        <path d="M2 10h4l1 2h2l1-2h4V4H2v6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 text-muted-foreground">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[10px] border border-primary/20">
      {label}
      <button
        onClick={onClear}
        className="ml-0.5 hover:opacity-70 transition-opacity leading-none"
        aria-label="Clear filter"
      >
        ×
      </button>
    </span>
  )
}

interface FilterDropdownProps {
  filter: TaskFilter
  projects: Project[]
  onChange: (f: TaskFilter) => void
}

function FilterDropdown({ filter, projects, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [sub, setSub] = useState<'project' | 'priority' | 'due' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSub(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); setSub(null) }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 font-mono text-[10px] transition-colors"
      >
        + Фильтр
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-background border border-border rounded-lg shadow-lg py-1 w-44">
          {sub === null ? (
            <>
              {projects.length > 0 && (
                <button
                  onClick={() => setSub('project')}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-accent transition-colors"
                >
                  Проект
                </button>
              )}
              <button
                onClick={() => setSub('priority')}
                className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-accent transition-colors"
              >
                Приоритет
              </button>
              <button
                onClick={() => setSub('due')}
                className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-accent transition-colors"
              >
                Дедлайн
              </button>
            </>
          ) : sub === 'project' ? (
            <>
              <button
                onClick={() => setSub(null)}
                className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-accent"
              >
                ← Проект
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onChange({ ...filter, projectId: p.id }); setOpen(false); setSub(null) }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-accent flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || 'var(--primary)' }} />
                  {p.name}
                </button>
              ))}
            </>
          ) : sub === 'priority' ? (
            <>
              <button
                onClick={() => setSub(null)}
                className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-accent"
              >
                ← Приоритет
              </button>
              {(['high', 'medium', 'low'] as TaskPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => { onChange({ ...filter, priority: p }); setOpen(false); setSub(null) }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-accent flex items-center gap-2"
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_COLOR[p])} />
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                onClick={() => setSub(null)}
                className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-accent"
              >
                ← Дедлайн
              </button>
              {(['today', 'week', 'overdue'] as DueRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => { onChange({ ...filter, dueRange: r }); setOpen(false); setSub(null) }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-accent"
                >
                  {DUE_RANGE_LABELS[r]}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Column toggle ────────────────────────────────────────────────────────────

function ColumnToggle({
  columns,
  onChange,
}: {
  columns: Set<TaskColumn>
  onChange: (col: TaskColumn) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const OPTIONS: { key: TaskColumn; label: string }[] = [
    { key: 'project', label: 'Проект' },
    { key: 'priority', label: 'Приоритет' },
    { key: 'due', label: 'Дедлайн' },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Колонки
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-20 bg-background border border-border rounded-lg shadow-lg py-1 w-36">
          {OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => onChange(o.key)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-accent"
            >
              <span className={cn('w-3 h-3 border rounded flex-shrink-0 flex items-center justify-center', columns.has(o.key) ? 'border-primary bg-primary' : 'border-border')}>
                {columns.has(o.key) && <span className="text-primary-foreground text-[8px] leading-none">✓</span>}
              </span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  selected,
  projects,
  columns,
  onClick,
  onStatusToggle,
}: {
  task: Task
  selected: boolean
  projects: Project[]
  columns: Set<TaskColumn>
  onClick: () => void
  onStatusToggle: (t: Task) => void
}) {
  const project = projects.find(p => p.id === task.project_id)
  const hasDue = !!task.due_date
  const isOverdue = hasDue && new Date(task.due_date!) < new Date()
  const dueLabel = hasDue
    ? new Date(task.due_date!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : null

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm',
        selected ? 'bg-accent' : 'hover:bg-accent/50',
        (task.status === 'done' || task.status === 'cancelled') ? 'opacity-60' : '',
      )}
    >
      <button
        type="button"
        onMouseDown={e => { e.stopPropagation(); e.preventDefault() }}
        onClick={e => { e.stopPropagation(); onStatusToggle(task) }}
        className="flex-shrink-0 hover:scale-110 transition-transform"
      >
        <IconCircle status={task.status} />
      </button>

      <span className={cn(
        'flex-1 truncate text-[13px]',
        task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground',
      )}>
        {task.title || <span className="italic text-muted-foreground">Без названия</span>}
      </span>

      <div className="flex items-center gap-2 flex-shrink-0">
        {columns.has('project') && project && (
          <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color || 'var(--primary)' }}
            />
            <span className="max-w-[80px] truncate">{project.name}</span>
          </span>
        )}
        {columns.has('priority') && task.priority !== 'none' && (
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_COLOR[task.priority])} />
        )}
        {columns.has('due') && dueLabel && (
          <span className={cn('font-mono text-[10px] flex-shrink-0', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
            {dueLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Inline Create ────────────────────────────────────────────────────────────

function InlineCreate({ status, onConfirm }: { status: TaskStatus; onConfirm: (title: string, status: TaskStatus) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')

  const confirm = () => {
    if (title.trim()) onConfirm(title.trim(), status)
    setTitle('')
    setOpen(false)
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground font-normal text-[12px]"
        onMouseDown={e => { e.preventDefault(); setOpen(true) }}
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
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') confirm()
          if (e.key === 'Escape') { setTitle(''); setOpen(false) }
        }}
        onBlur={() => setTimeout(() => { if (!title.trim()) setOpen(false) }, 100)}
        placeholder="Название задачи..."
        className="flex-1 bg-transparent outline-none text-[12px] placeholder:text-muted-foreground"
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function loadView(): ViewMode {
  try { return (localStorage.getItem('vinium:tasks-view') as ViewMode) ?? 'list' }
  catch { return 'list' }
}

function loadColumns(): Set<TaskColumn> {
  try {
    const s = localStorage.getItem('vinium:task-columns')
    return s ? new Set(JSON.parse(s) as TaskColumn[]) : new Set(['project', 'priority', 'due'] as TaskColumn[])
  } catch { return new Set(['project', 'priority', 'due'] as TaskColumn[]) }
}

function applyDueRange(tasks: Task[], range: DueRange): Task[] {
  const now = new Date()
  if (range === 'overdue') return tasks.filter(t => t.due_date && new Date(t.due_date) < now)
  if (range === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(end.getDate() + 1)
    return tasks.filter(t => t.due_date && new Date(t.due_date) >= start && new Date(t.due_date) < end)
  }
  if (range === 'week') {
    const end = new Date(now); end.setDate(end.getDate() + 7)
    return tasks.filter(t => t.due_date && new Date(t.due_date) <= end)
  }
  return tasks
}

export function TasksPage() {
  const { activeContextId } = useContextStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Task | null>(null)

  const [view, setView] = useState<ViewMode>(loadView)
  const [showDone, setShowDone] = useState(false)
  const [filter, setFilter] = useState<TaskFilter>({ projectId: null, priority: null, dueRange: null })
  const [columns, setColumns] = useState<Set<TaskColumn>>(loadColumns)

  const fetchTasks = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (activeContextId) params.context_id = activeContextId
    tasksApi.list(params)
      .then(({ data }) => setTasks(data))
      .finally(() => setLoading(false))
  }, [activeContextId])

  useEffect(() => {
    setSelected(null)
    setFilter({ projectId: null, priority: null, dueRange: null })
    fetchTasks()
    if (activeContextId) {
      projectsApi.listByContext(activeContextId)
        .then(({ data }) => setProjects(data.filter(p => p.status === 'active')))
        .catch(() => setProjects([]))
    } else {
      setProjects([])
    }
  }, [activeContextId, fetchTasks])

  const visibleTasks = useMemo(() => {
    let result = tasks
    if (filter.projectId) result = result.filter(t => t.project_id === filter.projectId)
    if (filter.priority) result = result.filter(t => t.priority === filter.priority)
    if (filter.dueRange) result = applyDueRange(result, filter.dueRange)
    if (!showDone) result = result.filter(t => t.status !== 'done' && t.status !== 'cancelled')
    return result
  }, [tasks, filter, showDone])

  const hasActiveFilter = !!(filter.projectId || filter.priority || filter.dueRange)

  const handleCreate = async (title: string, status: TaskStatus = 'inbox') => {
    const { data } = await tasksApi.create({
      title,
      status,
      context_id: activeContextId ?? undefined,
      project_id: filter.projectId ?? undefined,
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
      project_id: task.project_id,
      context_id: task.context_id,
    })
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    try {
      const { data } = await tasksApi.update(taskId, {
        title: task.title,
        description: task.description,
        status: newStatus,
        priority: task.priority,
        due_date: task.due_date,
        note_id: task.note_id,
        project_id: task.project_id,
        context_id: task.context_id,
      })
      setTasks(prev => prev.map(t => t.id === taskId ? data : t))
    } catch {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === taskId ? task : t))
    }
  }

  const handleDelete = async (id: string) => {
    await tasksApi.delete(id)
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelected(null)
  }

  const changeView = (v: ViewMode) => {
    setView(v)
    try { localStorage.setItem('vinium:tasks-view', v) } catch { /* ignore */ }
  }

  const toggleColumn = (col: TaskColumn) => {
    setColumns(prev => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      try { localStorage.setItem('vinium:task-columns', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  const clearFilter = (key: keyof TaskFilter) => {
    setFilter(f => ({ ...f, [key]: null }))
  }

  // Grouped for list view
  const listGroups = useMemo(() => {
    const activeStatuses: TaskStatus[] = showDone
      ? STATUS_ORDER
      : ['inbox', 'todo', 'in_progress']
    return activeStatuses
      .map(s => ({ status: s, items: visibleTasks.filter(t => t.status === s) }))
      .filter(g => g.items.length > 0 || g.status === 'inbox' || g.status === 'todo')
  }, [visibleTasks, showDone])

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
          <span className="text-sm font-medium">Задачи</span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground">{visibleTasks.length} задач</span>
            <button
              onClick={() => setShowDone(d => !d)}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDone ? 'Скрыть завершённые' : 'Показать завершённые'}
            </button>

            {/* View switcher */}
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                onClick={() => changeView('list')}
                title="Список"
                className={cn(
                  'flex items-center px-2 py-1 transition-colors',
                  view === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <IconList />
              </button>
              <button
                onClick={() => changeView('board')}
                title="Доска"
                className={cn(
                  'flex items-center px-2 py-1 transition-colors',
                  view === 'board' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <IconBoard />
              </button>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b flex-shrink-0 flex-wrap">
          {filter.projectId && (
            <FilterChip
              label={`Проект: ${projects.find(p => p.id === filter.projectId)?.name ?? '...'}`}
              onClear={() => clearFilter('projectId')}
            />
          )}
          {filter.priority && (
            <FilterChip
              label={PRIORITY_LABELS[filter.priority]}
              onClear={() => clearFilter('priority')}
            />
          )}
          {filter.dueRange && (
            <FilterChip
              label={DUE_RANGE_LABELS[filter.dueRange]}
              onClear={() => clearFilter('dueRange')}
            />
          )}
          <FilterDropdown filter={filter} projects={projects} onChange={setFilter} />
          {view === 'list' && (
            <div className="ml-auto">
              <ColumnToggle columns={columns} onChange={toggleColumn} />
            </div>
          )}
          {hasActiveFilter && (
            <button
              onClick={() => setFilter({ projectId: null, priority: null, dueRange: null })}
              className="font-mono text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Сбросить всё
            </button>
          )}
        </div>

        {/* Content */}
        {view === 'board' ? (
          <TaskBoardView
            tasks={visibleTasks}
            projects={projects}
            showDone={showDone}
            onStatusChange={handleStatusChange}
            onTaskClick={setSelected}
            onCreateTask={handleCreate}
          />
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {listGroups.map(({ status, items }) => (
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
                    projects={projects}
                    columns={columns}
                    onClick={() => setSelected(task)}
                    onStatusToggle={handleStatusToggle}
                  />
                ))}

                {(status === 'inbox' || status === 'todo') && (
                  <InlineCreate status={status} onConfirm={handleCreate} />
                )}
              </div>
            ))}

            {visibleTasks.length === 0 && !hasActiveFilter && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-muted-foreground text-sm mb-1">Задач пока нет</p>
                <p className="text-muted-foreground/60 text-xs">Нажмите «Добавить задачу» ниже</p>
              </div>
            )}
            {visibleTasks.length === 0 && hasActiveFilter && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-muted-foreground text-sm mb-1">Нет задач по фильтру</p>
                <button
                  onClick={() => setFilter({ projectId: null, priority: null, dueRange: null })}
                  className="text-primary text-xs hover:underline"
                >
                  Сбросить фильтры
                </button>
              </div>
            )}
          </div>
        )}
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
