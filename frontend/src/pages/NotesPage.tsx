import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notesApi } from '@/api/notes'
import type { NoteSummary } from '@/types'
import { formatRelative } from '@/lib/format'
import { Button } from '@/components/ui/button'

const SEARCH_DEBOUNCE = 300

function IconNote() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3.5 h-3.5">
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
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3.5 h-3.5 flex-shrink-0">
      <circle cx="6" cy="6" r="4"/>
      <path d="M10 10l2.5 2.5"/>
    </svg>
  )
}

interface NoteRowProps {
  note: NoteSummary
  onPin: () => void
  onDelete: () => void
}

function NoteRow({ note, onPin, onDelete }: NoteRowProps) {
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

  return (
    <li
      className="group relative flex items-center gap-2.5 px-5 h-10 cursor-pointer hover:bg-card transition-colors"
      onClick={() => navigate(`/notes/${note.id}`)}
    >
      <span className="text-muted-foreground flex-shrink-0">
        <IconNote />
      </span>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-[13px] truncate text-foreground leading-none">
          {note.title || <span className="text-muted-foreground italic">Без названия</span>}
        </span>
        {note.is_pinned && (
          <span className="font-mono text-[10px] text-muted-foreground bg-accent px-1 py-0.5 rounded flex-shrink-0">
            закреплено
          </span>
        )}
      </div>

      <span className="font-mono text-[10px] text-muted-foreground group-hover:opacity-0 transition-opacity flex-shrink-0">
        {formatRelative(note.updated_at)}
      </span>

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

export function NotesPage() {
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const fetchNotes = (q = '') => {
    setLoading(true)
    setError(false)
    const req = q ? notesApi.search(q) : notesApi.list()
    req
      .then(({ data }) => setNotes(data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchNotes() }, [])
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current) }, [])

  const handleSearchChange = (value: string) => {
    setQuery(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchNotes(value), SEARCH_DEBOUNCE)
  }

  const handlePin = async (note: NoteSummary) => {
    await notesApi.update(note.id, {
      title: note.title,
      content: '',
      is_pinned: !note.is_pinned,
    })
    fetchNotes(query)
  }

  const handleDelete = async (id: string) => {
    await notesApi.delete(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const pinned = notes.filter(n => n.is_pinned)
  const recent = notes.filter(n => !n.is_pinned)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Workspace header */}
      <div className="border-b bg-background px-5 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1
            className="text-2xl font-medium tracking-tight leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Заметки
          </h1>
          <Button size="sm" onClick={() => navigate('/notes/new')}>
            + Новая
          </Button>
        </div>

        <div className="pb-3">
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-card focus-within:border-primary transition-colors">
            <span className="text-muted-foreground"><IconSearch /></span>
            <input
              className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground"
              placeholder="Поиск заметок..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {!query && (
              <kbd className="font-mono text-[10px] text-muted-foreground">⌘K</kbd>
            )}
          </div>
        </div>
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
            <Button variant="link" size="sm" onClick={() => fetchNotes(query)}>
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
