import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
} from 'lexical'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { TOGGLE_LINK_COMMAND, $isLinkNode } from '@lexical/link'
import { cn } from '@/lib/utils'
import { aiApi } from '@/api/ai'
import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

type TextFormatState = {
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  isStrikethrough: boolean
  isCode: boolean
  isLink: boolean
}

type View = 'main' | 'link' | 'ai'
type AIStatus = 'idle' | 'loading' | 'success' | 'error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFormatState(editor: ReturnType<typeof useLexicalComposerContext>[0]): TextFormatState {
  return editor.getEditorState().read(() => {
    const sel = $getSelection()
    if (!$isRangeSelection(sel)) {
      return { isBold: false, isItalic: false, isUnderline: false, isStrikethrough: false, isCode: false, isLink: false }
    }
    const node = sel.anchor.getNode()
    const parent = node.getParent()
    return {
      isBold: sel.hasFormat('bold'),
      isItalic: sel.hasFormat('italic'),
      isUnderline: sel.hasFormat('underline'),
      isStrikethrough: sel.hasFormat('strikethrough'),
      isCode: sel.hasFormat('code'),
      isLink: $isLinkNode(parent) || $isLinkNode(node),
    }
  })
}

function getSelectedText(editor: ReturnType<typeof useLexicalComposerContext>[0]): string {
  return editor.getEditorState().read(() => {
    const sel = $getSelection()
    return $isRangeSelection(sel) ? sel.getTextContent() : ''
  })
}

const SEP = <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />

const AI_ACTIONS = [
  { key: 'rephrase', label: 'Перефразировать' },
  { key: 'expand',   label: 'Расширить' },
  { key: 'summarize', label: 'Сжать' },
] as const

// ─── Main plugin ─────────────────────────────────────────────────────────────

export function FloatingToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [fmt, setFmt] = useState<TextFormatState>({
    isBold: false, isItalic: false, isUnderline: false, isStrikethrough: false, isCode: false, isLink: false,
  })
  const [view, setView] = useState<View>('main')
  const [linkUrl, setLinkUrl] = useState('')

  // AI state
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle')
  const [aiResult, setAiResult] = useState('')
  const [aiError, setAiError] = useState('')
  const [lastAiAction, setLastAiAction] = useState('')
  const [, setSelectedText] = useState('')
  const [aiCopied, setAiCopied] = useState(false)

  const resetAI = () => { setAiStatus('idle'); setAiResult(''); setAiError('') }

  const hide = useCallback(() => {
    setPosition(null)
    setView('main')
    resetAI()
    setLinkUrl('')
  }, [])

  const updatePosition = useCallback(() => {
    const domSelection = window.getSelection()
    if (!domSelection || domSelection.isCollapsed || domSelection.rangeCount === 0) {
      setPosition(null)
      return
    }
    const rootElem = editor.getRootElement()
    if (!rootElem) { setPosition(null); return }
    const anchorNode = domSelection.anchorNode
    if (!anchorNode || !rootElem.contains(anchorNode)) { setPosition(null); return }
    const range = domSelection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) { setPosition(null); return }
    setPosition({ top: rect.top - 44, left: rect.left + rect.width / 2 })
    setFmt(readFormatState(editor))
  }, [editor])

  useEffect(() => {
    document.addEventListener('selectionchange', updatePosition)
    return () => document.removeEventListener('selectionchange', updatePosition)
  }, [updatePosition])

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) hide()
    }
    document.addEventListener('mousedown', onMouseDown)
    window.addEventListener('scroll', hide, { passive: true, capture: true })
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('scroll', hide, { capture: true })
    }
  }, [hide])

  // ── Buttons ─────────────────────────────────────────────────────────────────

  const Btn = ({ active, onClick, title, children }: {
    active: boolean; onClick: () => void; title: string; children: React.ReactNode
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={cn(
        'px-2 py-0.5 rounded text-xs transition-colors',
        active ? 'bg-accent text-accent-foreground font-semibold' : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground',
      )}
    >{children}</button>
  )

  // ── Link handlers ────────────────────────────────────────────────────────────

  const openLinkView = () => {
    const existing = editor.getEditorState().read(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return ''
      const node = sel.anchor.getNode()
      const parent = node.getParent()
      if ($isLinkNode(parent)) return parent.getURL()
      if ($isLinkNode(node)) return (node as ReturnType<typeof $isLinkNode> extends true ? never : typeof node & { getURL(): string }).getURL?.() ?? ''
      return ''
    })
    setLinkUrl(existing)
    setView('link')
    setTimeout(() => linkInputRef.current?.focus(), 0)
  }

  const confirmLink = () => {
    const url = linkUrl.trim()
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url ? { url } : null)
    setView('main')
    setLinkUrl('')
  }

  const removeLink = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    setView('main')
  }

  // ── AI handlers ───────────────────────────────────────────────────────────────

  const runAI = async (action: string) => {
    const text = getSelectedText(editor)
    if (!text.trim()) return

    setSelectedText(text)
    setLastAiAction(action)
    setAiStatus('loading')
    setAiResult('')
    setAiError('')
    setView('ai')

    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const { data } = await aiApi.action(action, text, ctrl.signal)
      setAiResult(data.result)
      setAiStatus('success')
    } catch (err) {
      if (axios.isCancel(err)) return
      let msg = 'Что-то пошло не так'
      if (axios.isAxiosError(err)) {
        const s = err.response?.status
        if (s === 429) msg = 'Превышен лимит запросов'
        else if (s === 504) msg = 'AI не ответил за 30 сек'
        else if (s === 400) msg = 'Текст пуст'
      }
      setAiError(msg)
      setAiStatus('error')
    }
  }

  const insertAIResult = () => {
    editor.update(() => {
      const sel = $getSelection()
      if ($isRangeSelection(sel)) sel.insertText(aiResult)
    })
    hide()
  }

  const copyAIResult = async () => {
    await navigator.clipboard.writeText(aiResult)
    setAiCopied(true)
    setTimeout(() => setAiCopied(false), 2000)
  }

  if (!position) return null

  // ── Toolbar width adapts to view ──────────────────────────────────────────

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    top: position.top,
    left: position.left,
    transform: 'translateX(-50%)',
    zIndex: 50,
  }

  // ── Link view ─────────────────────────────────────────────────────────────

  if (view === 'link') {
    return createPortal(
      <div ref={toolbarRef} style={baseStyle}
        className="flex items-center gap-1 rounded-lg border border-border bg-popover shadow-lg px-2 py-1"
      >
        <input
          ref={linkInputRef}
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); confirmLink() }
            if (e.key === 'Escape') { e.preventDefault(); setView('main') }
          }}
          placeholder="https://..."
          className="bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground w-48"
        />
        <button onMouseDown={(e) => { e.preventDefault(); confirmLink() }}
          className="px-2 py-0.5 rounded text-xs text-primary hover:bg-accent/60 transition-colors">
          ✓
        </button>
        {fmt.isLink && (
          <button onMouseDown={(e) => { e.preventDefault(); removeLink() }}
            className="px-2 py-0.5 rounded text-xs text-destructive hover:bg-accent/60 transition-colors">
            Убрать
          </button>
        )}
        <button onMouseDown={(e) => { e.preventDefault(); setView('main') }}
          className="px-2 py-0.5 rounded text-xs text-muted-foreground hover:bg-accent/60 transition-colors">
          ×
        </button>
      </div>,
      document.body,
    )
  }

  // ── AI view ───────────────────────────────────────────────────────────────

  if (view === 'ai') {
    return createPortal(
      <div ref={toolbarRef} style={{ ...baseStyle, top: position.top - 8 }}
        className="rounded-lg border border-border bg-popover shadow-lg px-3 py-2 w-72"
      >
        {aiStatus === 'loading' && (
          <div className="space-y-1.5 py-1">
            {[80, 65, 45].map(w => (
              <div key={w} className="h-1.5 rounded bg-muted animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {aiStatus === 'success' && (
          <>
            <p className="text-[12px] leading-relaxed text-foreground max-h-32 overflow-y-auto mb-2 whitespace-pre-wrap">
              {aiResult}
            </p>
            <div className="flex gap-1.5">
              <button onMouseDown={(e) => { e.preventDefault(); insertAIResult() }}
                className="px-2 py-0.5 rounded border border-primary text-primary font-mono text-[10px] hover:bg-primary/10 transition-colors">
                Вставить
              </button>
              <button onMouseDown={(e) => { e.preventDefault(); copyAIResult() }}
                className="px-2 py-0.5 rounded border border-border font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                {aiCopied ? '✓' : 'Копировать'}
              </button>
              <button onMouseDown={(e) => { e.preventDefault(); hide() }}
                className="px-2 py-0.5 rounded border border-border font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-auto">
                ×
              </button>
            </div>
          </>
        )}
        {aiStatus === 'error' && (
          <>
            <p className="text-[11px] text-destructive mb-2">{aiError}</p>
            <div className="flex gap-1.5">
              <button onMouseDown={(e) => { e.preventDefault(); runAI(lastAiAction) }}
                className="px-2 py-0.5 rounded border border-border font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                Повторить
              </button>
              <button onMouseDown={(e) => { e.preventDefault(); setView('main') }}
                className="px-2 py-0.5 rounded border border-border font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                ←
              </button>
            </div>
          </>
        )}
      </div>,
      document.body,
    )
  }

  // ── Main toolbar ──────────────────────────────────────────────────────────

  const setHeading = (tag: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createHeadingNode(tag))
    })
  }

  const setQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createQuoteNode())
    })
  }

  return createPortal(
    <div ref={toolbarRef} style={baseStyle}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-popover shadow-lg px-1.5 py-1"
    >
      <Btn active={fmt.isBold} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} title="Жирный">
        <span className="font-bold">B</span>
      </Btn>
      <Btn active={fmt.isItalic} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} title="Курсив">
        <span className="italic font-serif">I</span>
      </Btn>
      <Btn active={fmt.isUnderline} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} title="Подчёркнутый">
        <span className="underline">U</span>
      </Btn>
      <Btn active={fmt.isStrikethrough} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')} title="Зачёркнутый">
        <span className="line-through">S</span>
      </Btn>
      <Btn active={fmt.isCode} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} title="Инлайн код">
        <span className="font-mono">`</span>
      </Btn>
      <Btn active={fmt.isLink} onClick={openLinkView} title="Ссылка">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3 h-3">
          <path d="M5.5 8.5a3 3 0 004.24 0l1.5-1.5a3 3 0 00-4.24-4.24L6 3.76" strokeLinecap="round"/>
          <path d="M8.5 5.5a3 3 0 00-4.24 0L2.76 7a3 3 0 004.24 4.24L8 10.24" strokeLinecap="round"/>
        </svg>
      </Btn>
      {SEP}
      <Btn active={false} onClick={() => setHeading('h1')} title="Заголовок 1">H1</Btn>
      <Btn active={false} onClick={() => setHeading('h2')} title="Заголовок 2">H2</Btn>
      <Btn active={false} onClick={() => setHeading('h3')} title="Заголовок 3">H3</Btn>
      <Btn active={false} onClick={setQuote} title="Цитата">"</Btn>
      {SEP}
      {AI_ACTIONS.map(({ key, label }) => (
        <Btn key={key} active={false} onClick={() => runAI(key)} title={label}>
          <span className="font-mono text-[10px]">{label === 'Перефразировать' ? '↺' : label === 'Расширить' ? '↕' : '⇥'}</span>
        </Btn>
      ))}
    </div>,
    document.body,
  )
}
