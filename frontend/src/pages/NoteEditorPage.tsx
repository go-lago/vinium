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
  const isDraft = id === 'new'

  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(!isDraft)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef('')
  const titleRef = useRef('')
  const isCreatingRef = useRef(false)
  // Holds the note created in draft mode so the next useEffect can skip the fetch
  const justCreatedRef = useRef<Note | null>(null)

  useEffect(() => {
    if (isDraft) return

    // Note was just created in draft mode — skip fetch, use cached data
    if (justCreatedRef.current?.id === id) {
      const n = justCreatedRef.current
      justCreatedRef.current = null
      setNote(n)
      setTitle(n.title)
      titleRef.current = n.title
      contentRef.current = n.content
      setLoading(false)
      return
    }

    notesApi
      .get(id!)
      .then(({ data }) => {
        setNote(data)
        setTitle(data.title)
        titleRef.current = data.title
        contentRef.current = data.content
      })
      .catch(() => navigate('/notes'))
      .finally(() => setLoading(false))
  }, [id, isDraft, navigate])

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

  const save = async (newTitle: string, newContent: string) => {
    if (isDraft) {
      if (!newTitle && !newContent) return
      if (isCreatingRef.current) return
      isCreatingRef.current = true
      setSaveStatus('saving')
      try {
        const { data: newNote } = await notesApi.create({ title: newTitle, content: newContent })
        justCreatedRef.current = newNote
        navigate(`/notes/${newNote.id}`, { replace: true })
        markSaved()
      } catch {
        setSaveStatus('error')
      } finally {
        isCreatingRef.current = false
      }
      return
    }

    if (!id || !note) return
    setSaveStatus('saving')
    try {
      await notesApi.update(id, {
        title: newTitle,
        content: newContent,
        is_pinned: note.is_pinned,
      })
      markSaved()
    } catch {
      setSaveStatus('error')
    }
  }

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
    if (!id || isDraft) return
    await notesApi.delete(id)
    navigate('/notes')
  }

  const handleTogglePin = async () => {
    if (!id || !note || isDraft) return
    const updated = { title: titleRef.current, content: contentRef.current, is_pinned: !note.is_pinned }
    const { data } = await notesApi.update(id, updated)
    setNote(data)
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Загрузка...</div>
  }

  const saveStatusText =
    saveStatus === 'saving' ? 'Сохранение...' :
    saveStatus === 'saved'  ? 'Сохранено'      :
    saveStatus === 'error'  ? 'Не сохранено'   : ''

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

          {!isDraft && (
            <Button variant="ghost" size="sm" onClick={handleTogglePin}>
              {note?.is_pinned ? '📌 Открепить' : '📌 Закрепить'}
            </Button>
          )}

          {!isDraft && (
            deleteConfirm ? (
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
            )
          )}
        </div>
      </div>

      <input
        className="w-full text-3xl font-bold bg-transparent outline-none placeholder:text-muted-foreground mb-4"
        placeholder="Название"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        autoFocus={isDraft}
      />

      <Editor
        initialContent={note?.content ?? ''}
        onChange={handleContentChange}
      />
    </div>
  )
}
