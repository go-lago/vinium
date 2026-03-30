import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { notesApi } from '@/api/notes'
import type { Note } from '@/types'
import { Button } from '@/components/ui/button'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    notesApi
      .list()
      .then(({ data }) => setNotes(data))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    const { data } = await notesApi.create({ title: '', content: '' })
    navigate(`/notes/${data.id}`)
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Загрузка...</div>
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Заметки</h1>
        <Button onClick={handleCreate}>Новая заметка</Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">Пока нет ни одной заметки</p>
          <Button onClick={handleCreate}>Создать первую</Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                to={`/notes/${note.id}`}
                className="block rounded-lg border p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {note.title || <span className="text-muted-foreground italic">Без названия</span>}
                  </span>
                  {note.is_pinned && (
                    <span className="text-xs text-muted-foreground">📌</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(note.updated_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
