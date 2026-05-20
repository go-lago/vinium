import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tasksApi } from '@/api/tasks'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import { Editor } from '@/editor/Editor'
import { Button } from '@/components/ui/button'

const AUTOSAVE_DELAY = 1500

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

function IconChevron() {
  return (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-2.5 h-2.5">
      <path d="M3 2l4 3-4 3"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-3 h-3">
      <rect x="1" y="2" width="10" height="9" rx="1.5"/>
      <path d="M1 5.5h10M4 1v2M8 1v2"/>
    </svg>
  )
}

export function TaskEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [task, setTask] = useState<Task | null>(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('none')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef('')
  const descriptionRef = useRef('')
  const statusRef = useRef<TaskStatus>('todo')
  const priorityRef = useRef<TaskPriority>('none')
  const dueDateRef = useRef<string | null>(null)

  useEffect(() => {
    if (!id) return
    tasksApi.get(id)
      .then(({ data }) => {
        setTask(data)
        setTitle(data.title)
        setStatus(data.status)
        setPriority(data.priority)
        setDueDate(toLocalDateInput(data.due_date))
        titleRef.current = data.title
        descriptionRef.current = data.description
        statusRef.current = data.status
        priorityRef.current = data.priority
        dueDateRef.current = data.due_date
      })
      .catch(() => navigate('/tasks'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  const markSaved = () => {
    setSaveStatus('saved')
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const save = async () => {
    if (!id || !task) return
    setSaveStatus('saving')
    try {
      const { data } = await tasksApi.update(id, {
        title: titleRef.current,
        description: descriptionRef.current,
        status: statusRef.current,
        priority: priorityRef.current,
        due_date: dueDateRef.current,
        note_id: task.note_id,
      })
      setTask(data)
      markSaved()
    } catch {
      setSaveStatus('error')
    }
  }

  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(save, AUTOSAVE_DELAY)
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

  const handleDueDate = (v: string) => {
    setDueDate(v)
    dueDateRef.current = fromDateInput(v)
    scheduleSave()
  }

  const handleDelete = async () => {
    if (!id) return
    await tasksApi.delete(id)
    navigate('/tasks')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-[11px] text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  const saveLabel =
    saveStatus === 'saving' ? 'Сохранение...' :
    saveStatus === 'saved'  ? 'Сохранено'     :
    saveStatus === 'error'  ? 'Не сохранено'  : ''

  const legacyDescription = task && !isLexicalContent(task.description) && task.description

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 h-10 border-b bg-background flex-shrink-0">
        <nav className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <button
            onClick={() => navigate('/tasks')}
            className="hover:text-foreground transition-colors"
          >
            Задачи
          </button>
          <IconChevron />
          <span className="text-foreground truncate max-w-[300px]">
            {title || 'Без названия'}
          </span>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {saveStatus === 'error' ? (
            <Button
              variant="link"
              size="xs"
              className="font-mono text-[10px] text-destructive"
              onClick={save}
            >
              Не сохранено — повторить
            </Button>
          ) : (
            <span
              className={`font-mono text-[10px] text-muted-foreground transition-opacity duration-500 ${
                saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {saveLabel}
            </span>
          )}

          {deleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">Удалить навсегда?</span>
              <Button
                variant="ghost"
                size="xs"
                className="font-mono text-[10px]"
                onClick={() => setDeleteConfirm(false)}
              >
                Отмена
              </Button>
              <Button
                variant="link"
                size="xs"
                className="font-mono text-[10px] text-destructive"
                onClick={handleDelete}
              >
                Удалить
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              className="font-mono text-[10px] text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteConfirm(true)}
            >
              Удалить
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main editor area */}
        <div className="flex-1 overflow-y-auto px-10 py-9">
          <div className="max-w-2xl mx-auto">
          <input
            className="w-full text-[28px] font-medium leading-tight tracking-tight bg-transparent outline-none placeholder:text-muted-foreground mb-3.5"
            style={{ fontFamily: 'var(--font-display)' }}
            placeholder="Название задачи"
            value={title}
            onChange={(e) => handleTitle(e.target.value)}
          />

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: 'var(--primary)', background: 'rgba(43,115,196,.12)' }}
            >
              задача
            </span>
          </div>

          {legacyDescription && (
            <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-md px-3 py-2.5 mb-4">
              <span className="font-mono uppercase text-[10px] tracking-widest block mb-1">Прошлое описание</span>
              <p className="whitespace-pre-wrap">{legacyDescription}</p>
            </div>
          )}
          <Editor
            key={task?.id ?? 'task-editor'}
            initialContent={isLexicalContent(task?.description ?? '') ? task!.description : undefined}
            onChange={handleDescription}
          />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-[216px] flex-shrink-0 border-l overflow-y-auto p-4 bg-background">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
            Свойства
          </p>

          <div className="space-y-1">
            <div className="flex items-center gap-2 px-1.5 py-1 rounded text-[11px] text-muted-foreground">
              <span className="w-16 flex-shrink-0">Статус</span>
              <select
                value={status}
                onChange={e => handleStatus(e.target.value as TaskStatus)}
                className="bg-transparent outline-none text-foreground text-[11px] cursor-pointer flex-1"
              >
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-1.5 py-1 rounded text-[11px] text-muted-foreground">
              <span className="w-16 flex-shrink-0">Приоритет</span>
              <select
                value={priority}
                onChange={e => handlePriority(e.target.value as TaskPriority)}
                className="bg-transparent outline-none text-foreground text-[11px] cursor-pointer flex-1"
              >
                {(['none', 'low', 'medium', 'high'] as TaskPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-1.5 py-1 rounded text-[11px] text-muted-foreground">
              <span className="w-16 flex-shrink-0 flex items-center gap-1">
                <IconCalendar />
                Дедлайн
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={e => handleDueDate(e.target.value)}
                className="bg-transparent outline-none text-foreground text-[11px] cursor-pointer flex-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
