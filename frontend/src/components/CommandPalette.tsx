import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { notesApi } from '@/api/notes'
import type { NoteSummary } from '@/types'

const SEARCH_DEBOUNCE = 150

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NoteSummary[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  // Reset and focus when opened
  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    notesApi.list(1, 8).then(({ data }) => setResults(data))
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setSelected(0)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!value) {
      notesApi.list(1, 8).then(({ data }) => setResults(data))
      return
    }
    searchTimer.current = setTimeout(() => {
      notesApi.search(value, 1, 8).then(({ data }) => setResults(data))
    }, SEARCH_DEBOUNCE)
  }

  const totalItems = results.length + 1 // index 0 = "New note"

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelected(i => Math.min(i + 1, totalItems - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelected(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (selected === 0) handleCreate()
        else handleSelect(results[selected - 1]?.id)
        break
    }
  }

  const handleCreate = () => {
    onClose()
    navigate('/notes/new')
  }

  const handleSelect = (id?: string) => {
    if (!id) return
    onClose()
    navigate(`/notes/${id}`)
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[18vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border bg-background shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="w-full px-4 py-3.5 bg-transparent outline-none border-b text-sm placeholder:text-muted-foreground"
          placeholder="Поиск заметок или создать новую..."
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="max-h-80 overflow-y-auto">
          {/* "New note" action — always first */}
          <button
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
              selected === 0 ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
            onClick={handleCreate}
            onMouseEnter={() => setSelected(0)}
          >
            <span className="text-muted-foreground text-base leading-none">+</span>
            <span>Новая заметка</span>
            {!query && <kbd className="ml-auto text-xs text-muted-foreground font-mono">⌘N</kbd>}
          </button>

          {results.length > 0 && (
            <div className="border-t">
              {results.map((note, i) => (
                <button
                  key={note.id}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    selected === i + 1 ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleSelect(note.id)}
                  onMouseEnter={() => setSelected(i + 1)}
                >
                  <div className="flex items-center gap-2">
                    {note.is_pinned && <span className="text-xs shrink-0">📌</span>}
                    <span className="truncate font-medium">
                      {note.title || <span className="text-muted-foreground italic">Без названия</span>}
                    </span>
                  </div>
                  {note.content_plain && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5 pl-4">
                      {note.content_plain.slice(0, 80)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && query && (
            <p className="px-4 py-3 text-sm text-muted-foreground border-t">Ничего не найдено</p>
          )}
        </div>

        <div className="border-t px-4 py-2 flex gap-4 text-xs text-muted-foreground bg-muted/30">
          <span>↑↓ навигация</span>
          <span>↵ выбрать</span>
          <span>ESC закрыть</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
