import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { projectsApi } from '@/api/projects'
import type { Project } from '@/types'
import { Button } from '@/components/ui/button'

const AUTOSAVE_DELAY = 1500

function IconBack() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconChevron() {
  return (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-2.5 h-2.5">
      <path d="M3 2l4 3-4 3"/>
    </svg>
  )
}

const PROJECT_COLORS = [
  '#6366f1', '#0ea5e9', '#22c55e', '#f59e0b',
  '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6',
]

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [icon, setIcon] = useState('📁')
  const [status, setStatus] = useState<'active' | 'archived'>('active')
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const nameRef = useRef('')
  const descriptionRef = useRef('')
  const colorRef = useRef('#6366f1')
  const iconRef = useRef('📁')
  const statusRef = useRef<'active' | 'archived'>('active')
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    projectsApi.get(id)
      .then(({ data }) => {
        setProject(data)
        setName(data.name)
        setDescription(data.description)
        setColor(data.color)
        setIcon(data.icon || '📁')
        setStatus(data.status)
        nameRef.current = data.name
        descriptionRef.current = data.description
        colorRef.current = data.color
        iconRef.current = data.icon || '📁'
        statusRef.current = data.status
      })
      .catch(() => navigate('/projects'))
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
    if (!id) return
    setSaveStatus('saving')
    try {
      const { data } = await projectsApi.update(id, {
        name: nameRef.current,
        description: descriptionRef.current,
        color: colorRef.current,
        icon: iconRef.current,
        status: statusRef.current,
      })
      setProject(data)
      markSaved()
    } catch {
      setSaveStatus('error')
    }
  }

  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(save, AUTOSAVE_DELAY)
  }

  const handleName = (v: string) => {
    setName(v)
    nameRef.current = v
    scheduleSave()
  }

  const handleDescription = (v: string) => {
    setDescription(v)
    descriptionRef.current = v
    scheduleSave()
  }

  const handleColor = (v: string) => {
    setColor(v)
    colorRef.current = v
    scheduleSave()
  }

  const handleIcon = (v: string) => {
    setIcon(v)
    iconRef.current = v
    scheduleSave()
  }

  const handleStatusToggle = () => {
    const next = status === 'active' ? 'archived' : 'active'
    setStatus(next)
    statusRef.current = next
    scheduleSave()
  }

  const handleDelete = async () => {
    if (!id) return
    await projectsApi.delete(id)
    navigate('/projects')
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

  const saveLabel =
    saveStatus === 'saving' ? 'Сохранение...' :
    saveStatus === 'saved'  ? 'Сохранено'     :
    saveStatus === 'error'  ? 'Не сохранено'  : ''

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 h-10 border-b bg-background flex-shrink-0">
        <nav className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <button
            onClick={() => navigate('/projects')}
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <IconBack />
            Проекты
          </button>
          <IconChevron />
          <span className="text-foreground truncate max-w-[300px]">{name || 'Без названия'}</span>
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
      <div className="flex-1 overflow-y-auto px-10 py-9 max-w-2xl">
        {/* Icon + Title row */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative group">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl cursor-pointer"
              style={{ background: color + '22' }}
            >
              {icon}
            </div>
            <input
              value={icon}
              onChange={e => handleIcon(e.target.value)}
              maxLength={2}
              className="absolute inset-0 opacity-0 cursor-pointer text-center bg-transparent outline-none"
              title="Нажмите для смены иконки"
            />
          </div>
          <div className="flex-1 pt-1">
            <input
              className="w-full text-[28px] font-medium leading-tight tracking-tight bg-transparent outline-none placeholder:text-muted-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
              placeholder="Название проекта"
              value={name}
              onChange={e => handleName(e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={e => handleDescription(e.target.value)}
          placeholder="Описание проекта..."
          rows={4}
          className="w-full text-[15px] bg-transparent outline-none placeholder:text-muted-foreground resize-none mb-8 leading-relaxed text-foreground/80"
        />

        {/* Properties */}
        <div className="space-y-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Свойства
          </p>

          {/* Status */}
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-muted-foreground w-20">Статус</span>
            <button
              onClick={handleStatusToggle}
              className="text-[12px] px-2.5 py-1 rounded-full transition-colors"
              style={{
                background: status === 'active' ? '#22c55e22' : '#94a3b822',
                color: status === 'active' ? '#16a34a' : '#64748b',
              }}
            >
              {status === 'active' ? 'Активный' : 'В архиве'} — нажмите для смены
            </button>
          </div>

          {/* Color */}
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-muted-foreground w-20">Цвет</span>
            <div className="flex items-center gap-1.5">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => handleColor(c)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: c === color ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    transform: c === color ? 'scale(1.2)' : 'scale(1)',
                  }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => handleColor(e.target.value)}
                className="w-5 h-5 rounded border cursor-pointer opacity-60 hover:opacity-100"
                title="Произвольный цвет"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
