import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Editor } from '@/editor/Editor'
import { Button } from '@/components/ui/button'
import type { Task, TaskStatus, TaskPriority, UpdateTaskRequest } from '@/types'

const STATUS_ORDER: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'done', 'cancelled']
const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: 'Входящие',
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

function toLocalDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function fromDateInput(val: string): string | null {
  if (!val) return null
  return new Date(val + 'T00:00:00').toISOString()
}

function isLexicalContent(s: string): boolean {
  if (!s) return false
  try {
    const j = JSON.parse(s)
    return j && typeof j === 'object' && 'root' in j
  } catch {
    return false
  }
}

function IconExpand() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path d="M10 3h3v3M9 7l4-4M6 13H3v-3M7 9l-4 4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"/>
    </svg>
  )
}

interface Props {
  task: Task
  onClose: () => void
  onSave: (id: string, data: UpdateTaskRequest) => void
  onDelete: (id: string) => void
}

export function TaskDetailModal({ task, onClose, onSave, onDelete }: Props) {
  const navigate = useNavigate()

  const [title, setTitle] = useState(task.title)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [dueDate, setDueDate] = useState(toLocalDateInput(task.due_date))
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const titleRef = useRef(task.title)
  const descriptionRef = useRef(task.description)
  const statusRef = useRef<TaskStatus>(task.status)
  const priorityRef = useRef<TaskPriority>(task.priority)
  const dueDateRef = useRef(toLocalDateInput(task.due_date))
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTitle(task.title)
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(toLocalDateInput(task.due_date))
    titleRef.current = task.title
    descriptionRef.current = task.description
    statusRef.current = task.status
    priorityRef.current = task.priority
    dueDateRef.current = toLocalDateInput(task.due_date)
    setDeleteConfirm(false)
  }, [task.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [])

  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave(task.id, {
        title: titleRef.current,
        description: descriptionRef.current,
        status: statusRef.current,
        priority: priorityRef.current,
        due_date: fromDateInput(dueDateRef.current),
        note_id: task.note_id,
        project_id: task.project_id,
        context_id: task.context_id,
      })
    }, 600)
  }

  const handleTitle = (v: string) => {
    setTitle(v)
    titleRef.current = v
    scheduleSave()
  }

  const handleDescription = (v: string) => {
    descriptionRef.current = v
    scheduleSave()
  }

  const handleStatus = (v: TaskStatus) => {
    setStatus(v)
    statusRef.current = v
    scheduleSave()
  }

  const handlePriority = (v: TaskPriority) => {
    setPriority(v)
    priorityRef.current = v
    scheduleSave()
  }

  const handleDue = (v: string) => {
    setDueDate(v)
    dueDateRef.current = v
    scheduleSave()
  }

  const handleDelete = () => {
    onDelete(task.id)
    onClose()
  }

  const row = 'flex items-center gap-3 py-1.5'
  const label = 'font-mono text-[10px] uppercase tracking-widest text-muted-foreground w-24 flex-shrink-0'
  const sel = 'bg-transparent outline-none text-sm text-foreground cursor-pointer'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl max-h-[85vh] flex flex-col bg-background rounded-xl border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-10 border-b flex-shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Задача</span>
          <div className="flex items-center gap-1">
            {deleteConfirm ? (
              <>
                <span className="font-mono text-[10px] text-muted-foreground mr-1">Удалить?</span>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  className="font-mono text-[10px] text-destructive hover:underline ml-2"
                >
                  Удалить
                </button>
              </>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="font-mono text-[10px] text-muted-foreground hover:text-destructive transition-colors mr-2"
              >
                Удалить
              </button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/tasks/${task.id}`)}
              title="Открыть страницу"
              className="text-muted-foreground"
            >
              <IconExpand />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-muted-foreground"
            >
              <IconClose />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <input
            value={title}
            onChange={e => handleTitle(e.target.value)}
            placeholder="Название задачи"
            className="w-full text-[18px] font-medium bg-transparent outline-none placeholder:text-muted-foreground mb-3 leading-snug"
          />

          {/* Properties */}
          <div className="space-y-0.5 mb-5">
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

          {/* Description */}
          <div className="border-t pt-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Описание</p>
            {!isLexicalContent(task.description) && task.description && (
              <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-md px-2.5 py-2 mb-3">
                <span className="font-mono uppercase text-[10px] tracking-widest block mb-0.5">Прошлое описание</span>
                <p className="whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
            <Editor
              key={task.id}
              initialContent={isLexicalContent(task.description) ? task.description : undefined}
              onChange={handleDescription}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
