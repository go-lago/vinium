import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { notesApi } from '@/api/notes'
import type { Note } from '@/types'
import { Editor } from '@/editor/Editor'
import { Button } from '@/components/ui/button'

const AUTOSAVE_DELAY = 1500

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef('')
  const titleRef = useRef('')

  useEffect(() => {
    if (!id) return
    notesApi
      .get(id)
      .then(({ data }) => {
        setNote(data)
        setTitle(data.title)
        titleRef.current = data.title
        contentRef.current = data.content
      })
      .catch(() => navigate('/notes'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  // Clean up timers on unmount to prevent saving after navigation
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  const save = async (newTitle: string, newContent: string) => {
    if (!id || !note) return
    setSaveStatus('saving')
    try {
      await notesApi.update(id, {
        title: newTitle,
        content: newContent,
        is_pinned: note.is_pinned,
      })
      setSaveStatus('saved')
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  // Schedule save reading refs at fire time, not at schedule time
  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(
      () => save(titleRef.current, contentRef.current),
      AUTOSAVE_DELAY,
    )
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    titleRef.current = value
    scheduleSave()
  }

  const handleContentChange = (state: string) => {
    contentRef.current = state
    scheduleSave()
  }

  const handleDelete = async () => {
    if (!id) return
    await notesApi.delete(id)
    navigate('/notes')
  }

  const handleTogglePin = async () => {
    if (!id || !note) return
    const updated = { title: titleRef.current, content: contentRef.current, is_pinned: !note.is_pinned }
    const { data } = await notesApi.update(id, updated)
    setNote(data)
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Загрузка...</div>
  }

  const saveStatusText =
    saveStatus === 'saving' ? 'Сохранение...' :
    saveStatus === 'saved' ? 'Сохранено' :
    saveStatus === 'error' ? 'Не сохранено' : ''

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/notes')}>
          ← Заметки
        </Button>
        <div className="flex items-center gap-2">
          {saveStatus === 'error' ? (
            <button
              className="text-sm text-destructive underline cursor-pointer"
              onClick={() => save(titleRef.current, contentRef.current)}
            >
              Не сохранено — повторить
            </button>
          ) : (
            <span className={`text-sm transition-opacity duration-500 ${saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'} text-muted-foreground`}>
              {saveStatusText}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleTogglePin}>
            {note?.is_pinned ? '📌 Открепить' : '📌 Закрепить'}
          </Button>
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Удалить навсегда?</span>
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>
                Отмена
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Удалить
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)}>
              Удалить
            </Button>
          )}
        </div>
      </div>

      <input
        className="w-full text-3xl font-bold bg-transparent outline-none placeholder:text-muted-foreground mb-4"
        placeholder="Название"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
      />

      {note !== null && (
        <Editor
          initialContent={note.content}
          onChange={handleContentChange}
        />
      )}
    </div>
  )
}
