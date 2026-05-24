import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Task, TaskStatus, TaskPriority, Project } from '@/types'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoardColumn {
  status: TaskStatus
  label: string
}

const BOARD_COLUMNS: BoardColumn[] = [
  { status: 'inbox', label: 'Входящие' },
  { status: 'todo', label: 'К выполнению' },
  { status: 'in_progress', label: 'В работе' },
  { status: 'done', label: 'Выполнено' },
]

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  none: 'bg-muted-foreground/30',
  low: 'bg-blue-400',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCircleStatus({ status }: { status: TaskStatus }) {
  if (status === 'done') {
    return (
      <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 flex-shrink-0 text-primary">
        <circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M4.5 7.5l1.8 1.8 3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    )
  }
  if (status === 'in_progress') {
    return (
      <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 flex-shrink-0 text-amber-500">
        <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="7" cy="7" r="3" fill="currentColor"/>
      </svg>
    )
  }
  if (status === 'inbox') {
    return (
      <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 flex-shrink-0 text-primary/60">
        <path d="M2 9h3l1 2h2l1-2h3V3H2v6z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/60">
      <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

// ─── Draggable Card ───────────────────────────────────────────────────────────

function DraggableCard({
  task,
  projects,
  onClick,
}: {
  task: Task
  projects: Project[]
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'group px-3 py-2.5 rounded-lg border border-border bg-background cursor-grab active:cursor-grabbing',
        'hover:border-primary/40 transition-colors select-none',
        isDragging && 'opacity-30',
      )}
    >
      <CardContent task={task} projects={projects} />
    </div>
  )
}

function CardContent({ task, projects }: { task: Task; projects: Project[] }) {
  const project = projects.find(p => p.id === task.project_id)
  const hasDue = !!task.due_date
  const isOverdue = hasDue && new Date(task.due_date!) < new Date()

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-1.5">
        <IconCircleStatus status={task.status} />
        <span className={cn(
          'text-[12px] leading-tight flex-1',
          task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground',
        )}>
          {task.title || <span className="italic text-muted-foreground/60">Без названия</span>}
        </span>
      </div>

      {(project || task.priority !== 'none' || hasDue) && (
        <div className="flex items-center gap-2 flex-wrap">
          {project && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color || 'var(--primary)' }}
              />
              {project.name}
            </span>
          )}
          {task.priority !== 'none' && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground capitalize">
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_COLOR[task.priority])} />
              {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
            </span>
          )}
          {hasDue && (
            <span className={cn('font-mono text-[10px]', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
              {new Date(task.due_date!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Inline Create ────────────────────────────────────────────────────────────

function BoardInlineCreate({ onConfirm }: { onConfirm: (title: string) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')

  const confirm = () => {
    if (title.trim()) onConfirm(title.trim())
    setTitle('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen(true) }}
        className="w-full text-left px-3 py-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors rounded-lg hover:bg-accent/50"
      >
        + Добавить задачу
      </button>
    )
  }

  return (
    <div className="px-3 py-2.5 rounded-lg border border-primary/40 bg-background">
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
        className="w-full bg-transparent outline-none text-[12px] placeholder:text-muted-foreground/60"
      />
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function BoardColumnComponent({
  column,
  tasks,
  projects,
  onTaskClick,
  onAddTask,
}: {
  column: BoardColumn
  tasks: Task[]
  projects: Project[]
  onTaskClick: (task: Task) => void
  onAddTask: (title: string, status: TaskStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status })

  return (
    <div className="flex flex-col w-[260px] flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {column.label}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/50">{tasks.length}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-1.5 rounded-xl p-2 flex-1 overflow-y-auto transition-colors',
          'bg-muted/30',
          isOver && 'bg-primary/5 ring-1 ring-primary/30',
        )}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {tasks.map(task => (
          <DraggableCard
            key={task.id}
            task={task}
            projects={projects}
            onClick={() => onTaskClick(task)}
          />
        ))}
        <BoardInlineCreate onConfirm={title => onAddTask(title, column.status)} />
      </div>
    </div>
  )
}

// ─── Drag Overlay Card ────────────────────────────────────────────────────────

function DragOverlayCard({ task, projects }: { task: Task; projects: Project[] }) {
  return (
    <div className="px-3 py-2.5 rounded-lg border border-primary/60 bg-background shadow-lg cursor-grabbing opacity-95">
      <CardContent task={task} projects={projects} />
    </div>
  )
}

// ─── Board View ───────────────────────────────────────────────────────────────

interface TaskBoardViewProps {
  tasks: Task[]
  projects: Project[]
  showDone: boolean
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onTaskClick: (task: Task) => void
  onCreateTask: (title: string, status: TaskStatus) => void
}

export function TaskBoardView({
  tasks,
  projects,
  showDone,
  onStatusChange,
  onTaskClick,
  onCreateTask,
}: TaskBoardViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks.find(t => t.id === active.id) ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over) return

    const task = tasks.find(t => t.id === active.id)
    if (!task) return

    const overId = over.id as string
    const validStatuses: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'done', 'cancelled']
    const targetStatus = validStatuses.includes(overId as TaskStatus) ? (overId as TaskStatus) : null

    if (!targetStatus || task.status === targetStatus) return
    onStatusChange(task.id, targetStatus)
  }

  const visibleColumns = showDone
    ? BOARD_COLUMNS
    : BOARD_COLUMNS.filter(c => c.status !== 'done')

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 h-full overflow-x-auto px-4 py-4">
        {visibleColumns.map(col => (
          <BoardColumnComponent
            key={col.status}
            column={col}
            tasks={tasks.filter(t => t.status === col.status)}
            projects={projects}
            onTaskClick={onTaskClick}
            onAddTask={onCreateTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div style={{ width: 260 }}>
            <DragOverlayCard task={activeTask} projects={projects} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
