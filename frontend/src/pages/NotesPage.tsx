import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notesApi } from '@/api/notes'
import { projectsApi } from '@/api/projects'
import { useContextStore } from '@/store/contextStore'
import type { NoteSummary, Project } from '@/types'
import { formatRelative } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type NoteColumn = 'updated_at' | 'created_at' | 'tags'

const COLUMN_LABELS: Record<NoteColumn, string> = {
  updated_at: 'Изменено',
  created_at: 'Создано',
  tags: 'Теги',
}

const DEFAULT_COLUMNS: NoteColumn[] = ['updated_at', 'tags']

function loadColumns(): Set<NoteColumn> {
  try {
    const raw = localStorage.getItem('vinium:note-columns')
    if (raw) return new Set(JSON.parse(raw) as NoteColumn[])
  } catch { /* ignore */ }
  return new Set(DEFAULT_COLUMNS)
}

function saveColumns(cols: Set<NoteColumn>) {
  localStorage.setItem('vinium:note-columns', JSON.stringify([...cols]))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconNote() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3.5 h-3.5 flex-shrink-0">
      <path d="M3 1.5h8a.5.5 0 01.5.5v10a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V2a.5.5 0 01.5-.5z"/>
      <path d="M4.5 5h5M4.5 8h3.5"/>
    </svg>
  )
}

function IconPin() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3 h-3">
      <path d="M9 1L13 5L9.5 8.5L8 13L5.5 10.5L2 14M9 1L5 5M8 6L2 12"/>
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3 h-3">
      <path d="M2 4h10M5 4V2.5h4V4M3 4l.8 8h6.4L11 4"/>
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3.5 h-3.5">
      <circle cx="6" cy="6" r="4"/>
      <path d="M10 10l2.5 2.5"/>
    </svg>
  )
}

function IconColumns() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3.5 h-3.5">
      <rect x="1.5" y="2" width="4" height="10" rx="0.5"/>
      <rect x="8.5" y="2" width="4" height="10" rx="0.5"/>
    </svg>
  )
}

function IconArrowLeft() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3.5 h-3.5">
      <path d="M8.5 2.5L4 7l4.5 4.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Column Toggle ────────────────────────────────────────────────────────────

function ColumnToggle({ columns, onChange }: { columns: Set<NoteColumn>; onChange: (c: Set<NoteColumn>) => void }) {
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

  const toggle = (col: NoteColumn) => {
    const next = new Set(columns)
    next.has(col) ? next.delete(col) : next.add(col)
    onChange(next)
    saveColumns(next)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono transition-colors',
          open ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
        )}
        title="Настройка колонок"
      >
        <IconColumns />
        <span>Поля</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-md py-1 min-w-[140px]">
          {(Object.keys(COLUMN_LABELS) as NoteColumn[]).map(col => (
            <label key={col} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent/50 select-none">
              <input
                type="checkbox"
                checked={columns.has(col)}
                onChange={() => toggle(col)}
                className="w-3 h-3 rounded accent-primary"
              />
              <span className="font-mono text-[11px] text-foreground">{COLUMN_LABELS[col]}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Note Row ─────────────────────────────────────────────────────────────────

interface NoteRowProps {
  note: NoteSummary
  columns: Set<NoteColumn>
  onPin: () => void
  onDelete: () => void
}

function NoteRow({ note, columns, onPin, onDelete }: NoteRowProps) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete()
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const visibleTags = note.tags?.slice(0, 2) ?? []
  const extraTags = (note.tags?.length ?? 0) - visibleTags.length

  return (
    <li
      className="group relative flex items-center gap-2.5 px-5 py-2 cursor-pointer hover:bg-card transition-colors min-h-[40px]"
      onClick={() => navigate(`/notes/${note.id}`)}
    >
      <span className="text-muted-foreground/60 flex-shrink-0 mt-0.5">
        <IconNote />
      </span>

      <div className="flex-1 flex items-baseline gap-2 min-w-0">
        <span className="text-[13px] truncate text-foreground leading-none flex-shrink-0 max-w-[55%]">
          {note.title || <span className="text-muted-foreground italic">Без названия</span>}
        </span>

        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {note.is_pinned && (
            <span className="font-mono text-[10px] text-primary/70 bg-primary/10 px-1 py-0.5 rounded flex-shrink-0">
              закреп
            </span>
          )}
          {columns.has('tags') && visibleTags.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {visibleTags.map(tag => (
                <span key={tag} className="font-mono text-[10px] text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
              {extraTags > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground">+{extraTags}</span>
              )}
            </div>
          )}
          {columns.has('created_at') && (
            <span className="font-mono text-[10px] text-muted-foreground/50 flex-shrink-0 whitespace-nowrap">
              создано {formatDate(note.created_at)}
            </span>
          )}
        </div>
      </div>

      {columns.has('updated_at') && (
        <span className="font-mono text-[10px] text-muted-foreground group-hover:opacity-0 transition-opacity flex-shrink-0">
          {formatRelative(note.updated_at)}
        </span>
      )}

      <div className="absolute right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border p-0.5 rounded-md">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => { e.stopPropagation(); onPin() }}
          title={note.is_pinned ? 'Открепить' : 'Закрепить'}
        >
          <IconPin />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleDelete}
          title={confirmDelete ? 'Нажмите ещё раз для удаления' : 'Удалить'}
          className={confirmDelete ? 'text-destructive bg-destructive/10 hover:bg-destructive/20 hover:text-destructive' : 'text-muted-foreground hover:text-destructive'}
        >
          <IconTrash />
        </Button>
      </div>
    </li>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2">
      <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE = 300

export function NotesPage() {
  const { activeContextId } = useContextStore()
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [columns, setColumns] = useState<Set<NoteColumn>>(loadColumns)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const fetchNotes = useCallback((q: string, projectId: string | null) => {
    setLoading(true)
    setError(false)
    const params: { context_id?: string; project_id?: string } = {}
    if (activeContextId) params.context_id = activeContextId
    if (projectId) params.project_id = projectId
    const req = q ? notesApi.search(q, 1, 50, params) : notesApi.list(1, 50, params)
    req
      .then(({ data }) => setNotes(data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [activeContextId])

  useEffect(() => {
    setSelectedProjectId(null)
    setQuery('')
    setSearchOpen(false)
    fetchNotes('', null)
    if (activeContextId) {
      projectsApi.listByContext(activeContextId)
        .then(({ data }) => setProjects(data))
        .catch(() => setProjects([]))
    } else {
      setProjects([])
    }
  }, [activeContextId, fetchNotes])

  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current) }, [])

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  const handleSearchChange = (value: string) => {
    setQuery(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchNotes(value, selectedProjectId), SEARCH_DEBOUNCE)
  }

  const handleCloseSearch = () => {
    setSearchOpen(false)
    if (query) {
      setQuery('')
      fetchNotes('', selectedProjectId)
    }
  }

  const handleProjectChange = (projectId: string | null) => {
    setSelectedProjectId(projectId)
    fetchNotes(query, projectId)
  }

  const handlePin = async (note: NoteSummary) => {
    await notesApi.update(note.id, {
      title: note.title,
      content: '',
      is_pinned: !note.is_pinned,
    })
    fetchNotes(query, selectedProjectId)
  }

  const handleDelete = async (id: string) => {
    await notesApi.delete(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const pinned = notes.filter(n => n.is_pinned)
  const recent = notes.filter(n => !n.is_pinned)
  const activeProjects = projects.filter(p => p.status === 'active')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background px-5 flex-shrink-0">
        {searchOpen ? (
          /* Search mode */
          <div className="flex items-center gap-2 h-12">
            <button
              onClick={handleCloseSearch}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <IconArrowLeft />
            </button>
            <input
              ref={searchInputRef}
              className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground"
              placeholder="Поиск заметок..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') handleCloseSearch() }}
            />
            {query && (
              <button
                onClick={() => handleSearchChange('')}
                className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                Сбросить
              </button>
            )}
          </div>
        ) : (
          /* Normal mode */
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-2.5">
              <h1
                className="text-[15px] font-semibold tracking-tight leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Заметки
              </h1>
              <span className="font-mono text-[10px] text-muted-foreground/50">
                {notes.length}
              </span>
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                title="Поиск (⌘K)"
              >
                <IconSearch />
              </button>
              <ColumnToggle columns={columns} onChange={setColumns} />
              <Button size="sm" onClick={() => navigate('/notes/new')}>
                + Новая
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 font-mono text-[11px] text-muted-foreground">
            Загрузка...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-[13px] text-muted-foreground">Не удалось загрузить заметки</p>
            <Button variant="link" size="sm" onClick={() => fetchNotes(query, selectedProjectId)}>
              Повторить
            </Button>
          </div>
        ) : notes.length === 0 && !query ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-[13px] text-muted-foreground">Пока нет ни одной заметки</p>
            <Button size="sm" onClick={() => navigate('/notes/new')}>
              Создать первую
            </Button>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex items-center justify-center py-16 font-mono text-[11px] text-muted-foreground">
            Ничего не найдено по запросу «{query}»
          </div>
        ) : (
          <ul>
            {pinned.length > 0 && !query && (
              <>
                <SectionHeader label="Закреплено" />
                {pinned.map(note => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    columns={columns}
                    onPin={() => handlePin(note)}
                    onDelete={() => handleDelete(note.id)}
                  />
                ))}
              </>
            )}
            {recent.length > 0 && (
              <>
                {pinned.length > 0 && !query && <SectionHeader label="Недавние" />}
                {recent.map(note => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    columns={columns}
                    onPin={() => handlePin(note)}
                    onDelete={() => handleDelete(note.id)}
                  />
                ))}
              </>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
