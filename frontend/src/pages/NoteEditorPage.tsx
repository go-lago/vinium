import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { notesApi } from '@/api/notes'
import { useContextStore } from '@/store/contextStore'
import type { Note } from '@/types'
import { Editor } from '@/editor/Editor'
import { formatDate } from '@/lib/format'
import { AIPanel } from '@/components/AIPanel'
import { Button } from '@/components/ui/button'

const AUTOSAVE_DELAY = 1500

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

function IconClock() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-3 h-3">
      <circle cx="6" cy="6" r="5"/>
      <path d="M6 3.5V6l1.5 1.5"/>
    </svg>
  )
}

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeContextId } = useContextStore()
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
  const justCreatedRef = useRef<Note | null>(null)

  useEffect(() => {
    if (isDraft) return

    if (justCreatedRef.current?.id === id) {
      const n = justCreatedRef.current!
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
        const { data: newNote } = await notesApi.create({
          title: newTitle,
          content: newContent,
          context_id: activeContextId ?? undefined,
        })
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
      await notesApi.update(id, { title: newTitle, content: newContent, is_pinned: note.is_pinned })
      markSaved()
    } catch {
      setSaveStatus('error')
    }
  }

  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(titleRef.current, contentRef.current), AUTOSAVE_DELAY)
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
    const { data } = await notesApi.update(id, {
      title: titleRef.current,
      content: contentRef.current,
      is_pinned: !note.is_pinned,
    })
    setNote(data)
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Editor header / breadcrumb */}
      <div className="flex items-center gap-2 px-5 h-10 border-b bg-background flex-shrink-0">
        <nav className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <button
            onClick={() => navigate('/notes')}
            className="hover:text-foreground transition-colors"
          >
            Заметки
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
              onClick={() => save(titleRef.current, contentRef.current)}
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

          {!isDraft && (
            <Button
              variant="ghost"
              size="xs"
              className="font-mono text-[10px]"
              onClick={handleTogglePin}
              title={note?.is_pinned ? 'Открепить' : 'Закрепить'}
            >
              {note?.is_pinned ? 'Открепить' : 'Закрепить'}
            </Button>
          )}

          {!isDraft && (
            deleteConfirm ? (
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
            )
          )}
        </div>
      </div>

      {/* Body: main editor + right sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main editor area */}
        <div className="flex-1 overflow-y-auto px-10 py-9">
          <div className="max-w-2xl mx-auto">
          <input
            className="w-full text-[28px] font-medium leading-tight tracking-tight bg-transparent outline-none placeholder:text-muted-foreground mb-3.5"
            style={{ fontFamily: 'var(--font-display)' }}
            placeholder="Название"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            autoFocus={isDraft}
          />

          {/* Doc meta row */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {note && (
              <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                <IconCalendar />
                {formatDate(note.created_at)}
              </span>
            )}
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: 'var(--primary)', background: 'rgba(43,115,196,.12)' }}
            >
              заметка
            </span>
          </div>

          {/* Lexical editor */}
          <Editor
            key={note?.id ?? 'draft'}
            initialContent={note?.content ?? ''}
            onChange={handleContentChange}
          />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-[216px] flex-shrink-0 border-l overflow-y-auto p-4 bg-background">
          {/* Metadata panel */}
          <div className="mb-5">
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
              Метаданные
            </p>
            {note ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-muted-foreground">
                  <IconCalendar />
                  <span>Создано: {formatDate(note.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-muted-foreground">
                  <IconClock />
                  <span>Изменено: {formatDate(note.updated_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-muted-foreground">
                  <span className="w-3 h-3 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </span>
                  <span>{note.is_pinned ? 'Закреплено' : 'Не закреплено'}</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground px-1.5">Новая заметка</p>
            )}
          </div>

          <AIPanel isDraft={isDraft} contentRef={contentRef} />
        </div>
      </div>
    </div>
  )
}
