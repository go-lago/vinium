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
import { cn } from '@/lib/utils'

type TextFormatState = {
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  isStrikethrough: boolean
  isCode: boolean
}

function readFormatState(editor: ReturnType<typeof useLexicalComposerContext>[0]): TextFormatState {
  return editor.getEditorState().read(() => {
    const sel = $getSelection()
    if (!$isRangeSelection(sel)) {
      return { isBold: false, isItalic: false, isUnderline: false, isStrikethrough: false, isCode: false }
    }
    return {
      isBold: sel.hasFormat('bold'),
      isItalic: sel.hasFormat('italic'),
      isUnderline: sel.hasFormat('underline'),
      isStrikethrough: sel.hasFormat('strikethrough'),
      isCode: sel.hasFormat('code'),
    }
  })
}

const SEP = <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />

export function FloatingToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [fmt, setFmt] = useState<TextFormatState>({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrikethrough: false,
    isCode: false,
  })

  const updatePosition = useCallback(() => {
    const domSelection = window.getSelection()
    if (!domSelection || domSelection.isCollapsed || domSelection.rangeCount === 0) {
      setPosition(null)
      return
    }

    const rootElem = editor.getRootElement()
    if (!rootElem) {
      setPosition(null)
      return
    }

    const anchorNode = domSelection.anchorNode
    if (!anchorNode || !rootElem.contains(anchorNode)) {
      setPosition(null)
      return
    }

    const range = domSelection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      setPosition(null)
      return
    }

    setPosition({
      top: rect.top - 44,
      left: rect.left + rect.width / 2,
    })
    setFmt(readFormatState(editor))
  }, [editor])

  useEffect(() => {
    document.addEventListener('selectionchange', updatePosition)
    return () => document.removeEventListener('selectionchange', updatePosition)
  }, [updatePosition])

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setPosition(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const Btn = ({
    active,
    onClick,
    title,
    children,
  }: {
    active: boolean
    onClick: () => void
    title: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={cn(
        'px-2 py-0.5 rounded text-xs transition-colors',
        active
          ? 'bg-accent text-accent-foreground font-semibold'
          : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )

  const setHeading = (tag: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag))
      }
    })
  }

  const setQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  if (!position) return null

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}
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
      <Btn active={fmt.isCode} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} title="Код">
        <span className="font-mono">`</span>
      </Btn>
      {SEP}
      <Btn active={false} onClick={() => setHeading('h1')} title="Заголовок 1">H1</Btn>
      <Btn active={false} onClick={() => setHeading('h2')} title="Заголовок 2">H2</Btn>
      <Btn active={false} onClick={() => setHeading('h3')} title="Заголовок 3">H3</Btn>
      <Btn active={false} onClick={setQuote} title="Цитата">"</Btn>
    </div>,
    document.body,
  )
}
