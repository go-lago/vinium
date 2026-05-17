import { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  $createParagraphNode,
} from 'lexical'
import { $isHeadingNode, $createHeadingNode, $isQuoteNode, $createQuoteNode } from '@lexical/rich-text'
import type { HeadingTagType } from '@lexical/rich-text'
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@lexical/list'
import { $isCodeNode, $createCodeNode } from '@lexical/code'
import { $setBlocksType } from '@lexical/selection'
import { cn } from '@/lib/utils'

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'quote' | 'code'

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [blockType, setBlockType] = useState<BlockType>('paragraph')

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return

    setIsBold(selection.hasFormat('bold'))
    setIsItalic(selection.hasFormat('italic'))
    setIsUnderline(selection.hasFormat('underline'))
    setIsStrikethrough(selection.hasFormat('strikethrough'))

    const anchor = selection.anchor.getNode()
    const element = anchor.getKey() === 'root' ? anchor : anchor.getTopLevelElementOrThrow()

    if ($isHeadingNode(element)) {
      setBlockType(element.getTag() as BlockType)
    } else if ($isListNode(element)) {
      setBlockType(element.getListType() === 'bullet' ? 'ul' : 'ol')
    } else if ($isQuoteNode(element)) {
      setBlockType('quote')
    } else if ($isCodeNode(element)) {
      setBlockType('code')
    } else {
      setBlockType('paragraph')
    }
  }, [])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => { updateToolbar(); return false },
      COMMAND_PRIORITY_CRITICAL,
    )
  }, [editor, updateToolbar])

  const setHeading = (tag: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      if (blockType === tag) {
        $setBlocksType(selection, () => $createParagraphNode())
      } else {
        $setBlocksType(selection, () => $createHeadingNode(tag))
      }
    })
  }

  const setQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      if (blockType === 'quote') {
        $setBlocksType(selection, () => $createParagraphNode())
      } else {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  const setCode = () => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      if (blockType === 'code') {
        $setBlocksType(selection, () => $createParagraphNode())
      } else {
        $setBlocksType(selection, () => $createCodeNode())
      }
    })
  }

  const toggleList = (type: 'ul' | 'ol') => {
    if (blockType === type) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    } else if (type === 'ul') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    }
  }

  const Btn = ({ active, onClick, children, title }: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
    title?: string
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={cn(
        'px-2 py-1 rounded text-sm transition-colors',
        active
          ? 'bg-accent text-accent-foreground font-semibold'
          : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )

  const Sep = () => <div className="w-px h-5 bg-border mx-1" />

  const IconBulletList = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="2.5" cy="4.5" r="1.25" fill="currentColor" />
      <line x1="5.5" y1="4.5" x2="14" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="2.5" cy="8" r="1.25" fill="currentColor" />
      <line x1="5.5" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="2.5" cy="11.5" r="1.25" fill="currentColor" />
      <line x1="5.5" y1="11.5" x2="14" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )

  const IconOrderedList = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <text x="1" y="6" fontSize="5" fontWeight="700" fill="currentColor" fontFamily="monospace">1.</text>
      <line x1="6" y1="4.5" x2="14" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <text x="1" y="9.5" fontSize="5" fontWeight="700" fill="currentColor" fontFamily="monospace">2.</text>
      <line x1="6" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <text x="1" y="13" fontSize="5" fontWeight="700" fill="currentColor" fontFamily="monospace">3.</text>
      <line x1="6" y1="11.5" x2="14" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )

  const IconBlockquote = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="2.5" height="11" rx="1.25" fill="currentColor" />
      <line x1="6.5" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6.5" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6.5" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b pb-2 mb-4">
      <Btn active={isBold} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} title="Жирный"><span className="font-bold">B</span></Btn>
      <Btn active={isItalic} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} title="Курсив"><span className="italic font-serif">I</span></Btn>
      <Btn active={isUnderline} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} title="Подчёркнутый"><span className="underline">U</span></Btn>
      <Btn active={isStrikethrough} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')} title="Зачёркнутый"><span className="line-through">S</span></Btn>
      <Sep />
      <Btn active={blockType === 'h1'} onClick={() => setHeading('h1')}>H1</Btn>
      <Btn active={blockType === 'h2'} onClick={() => setHeading('h2')}>H2</Btn>
      <Btn active={blockType === 'h3'} onClick={() => setHeading('h3')}>H3</Btn>
      <Sep />
      <Btn active={blockType === 'quote'} onClick={setQuote} title="Цитата"><IconBlockquote /></Btn>
      <Btn active={blockType === 'code'} onClick={setCode} title="Блок кода">&lt;/&gt;</Btn>
      <Sep />
      <Btn active={blockType === 'ul'} onClick={() => toggleList('ul')} title="Маркированный список"><IconBulletList /></Btn>
      <Btn active={blockType === 'ol'} onClick={() => toggleList('ol')} title="Нумерованный список"><IconOrderedList /></Btn>
    </div>
  )
}
