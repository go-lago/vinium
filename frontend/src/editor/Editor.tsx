import { useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import {
  HEADING,
  QUOTE,
  CODE,
  ORDERED_LIST,
  UNORDERED_LIST,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  INLINE_CODE,
} from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { CodeNode } from '@lexical/code'
import type { EditorState } from 'lexical'
import { AutoFocusPlugin } from './plugins/AutoFocusPlugin'
import { ToolbarPlugin } from './plugins/ToolbarPlugin'
import { SlashCommandPlugin } from './plugins/SlashCommandPlugin'
import { FloatingToolbarPlugin } from './plugins/FloatingToolbarPlugin'
import { DragDropPlugin } from './plugins/DragDropPlugin'

const MD_TRANSFORMERS = [
  HEADING,
  QUOTE,
  CODE,
  ORDERED_LIST,
  UNORDERED_LIST,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  INLINE_CODE,
]

const theme = {
  heading: {
    h1: 'text-2xl font-medium tracking-tight my-5 text-foreground',
    h2: 'text-lg font-medium tracking-tight my-4 text-foreground',
    h3: 'text-base font-medium my-3 text-foreground',
  },
  list: {
    ul: 'list-disc pl-5 my-3',
    ol: 'list-decimal pl-5 my-3',
    listitem: 'my-1',
  },
  quote: 'border-l-2 border-border pl-3.5 italic my-3 text-muted-foreground',
  code: 'block bg-muted/40 border border-border font-mono text-[13px] rounded-lg p-4 my-3 overflow-x-auto leading-relaxed whitespace-pre',
  text: {
    bold: 'font-semibold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-muted font-mono text-[12px] rounded px-1 py-0.5',
  },
  link: 'text-primary underline',
}

interface EditorProps {
  initialContent?: string
  onChange?: (state: string) => void
  editable?: boolean
}

export function Editor({ initialContent, onChange, editable = true }: EditorProps) {
  const [editorContainer, setEditorContainer] = useState<HTMLDivElement | null>(null)
  const isMobile = window.innerWidth < 768

  const initialConfig = {
    namespace: 'ViniumEditor',
    theme,
    editable,
    editorState: initialContent || undefined,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, HorizontalRuleNode],
    onError: (error: Error) => console.error(error),
  }

  const handleChange = (editorState: EditorState) => {
    if (onChange) {
      onChange(JSON.stringify(editorState))
    }
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="flex flex-col">
        {editable && !isMobile && <ToolbarPlugin />}
        <div ref={setEditorContainer} className="relative min-h-[200px] pl-7">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="outline-none min-h-[200px] py-2 text-[15px] leading-relaxed text-foreground/90" />
            }
            placeholder={
              <div className="absolute top-2 left-7 text-muted-foreground pointer-events-none select-none">
                Начни писать...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <HorizontalRulePlugin />
        <LinkPlugin />
        <MarkdownShortcutPlugin transformers={MD_TRANSFORMERS} />
        {editable && <AutoFocusPlugin />}
        {editable && <SlashCommandPlugin />}
        {editable && <FloatingToolbarPlugin />}
        {editable && editorContainer && !isMobile && (
          <DragDropPlugin anchorElem={editorContainer} />
        )}
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  )
}
