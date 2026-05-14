import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { notesApi } from '@/api/notes'
import type { NoteSummary } from '@/types'
import { Button } from '@/components/ui/button'

const SEARCH_DEBOUNCE = 300

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function NoteCard({ note }: { note: NoteSummary }) {
  return (
    <li>
      <Link
        to={`/notes/${note.id}`}
        className="block rounded-lg border p-4 hover:bg-accent transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {note.title || <span className="text-muted-foreground italic">Без названия</span>}
          </span>
          {note.is_pinned && <span className="text-xs text-muted-foreground">📌</span>}
        </div>
        {note.content_plain && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {note.content_plain.slice(0, 120)}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{formatDate(note.updated_at)}</p>
      </Link>
    </li>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
      {label}
    </p>
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
      .then(({ data }) => setNotes(data))
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

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Не удалось загрузить заметки</p>
        <Button variant="ghost" onClick={() => fetchNotes(query)}>Повторить</Button>
      </div>
    )
  }

  const pinned = notes.filter(n => n.is_pinned)
  const recent = notes.filter(n => !n.is_pinned)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Заметки</h1>
        <Button onClick={() => navigate('/notes/new')}>Новая заметка</Button>
      </div>

      <input
        className="w-full mb-6 rounded-md border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        placeholder="Поиск по заметкам..."
        value={query}
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Загрузка...</div>
      ) : notes.length === 0 && !query ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">Пока нет ни одной заметки</p>
          <Button onClick={() => navigate('/notes/new')}>Создать первую</Button>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Ничего не найдено по запросу «{query}»
        </div>
      ) : (
        <>
          {pinned.length > 0 && !query && (
            <div className="mb-6">
              <SectionLabel label="Закреплено" />
              <ul className="flex flex-col gap-2">
                {pinned.map(note => <NoteCard key={note.id} note={note} />)}
              </ul>
            </div>
          )}

          {recent.length > 0 && (
            <div>
              {pinned.length > 0 && !query && <SectionLabel label="Недавние" />}
              <ul className="flex flex-col gap-2">
                {recent.map(note => <NoteCard key={note.id} note={note} />)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
