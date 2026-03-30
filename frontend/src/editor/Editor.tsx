import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { CodeNode } from '@lexical/code'
import type { EditorState } from 'lexical'
import { AutoFocusPlugin } from './plugins/AutoFocusPlugin'
import { InitialStatePlugin } from './plugins/InitialStatePlugin'
import { ToolbarPlugin } from './plugins/ToolbarPlugin'

const theme = {
  heading: {
    h1: 'text-3xl font-bold my-4',
    h2: 'text-2xl font-semibold my-3',
    h3: 'text-xl font-semibold my-2',
  },
  list: {
    ul: 'list-disc pl-6 my-2',
    ol: 'list-decimal pl-6 my-2',
    listitem: 'my-1',
  },
  quote: 'border-l-4 border-muted-foreground pl-4 italic my-3 text-muted-foreground',
  code: 'bg-muted font-mono text-sm rounded px-1',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-muted font-mono text-sm rounded px-1',
  },
  link: 'text-primary underline',
}

interface EditorProps {
  initialContent?: string
  onChange?: (state: string) => void
  editable?: boolean
}

export function Editor({ initialContent, onChange, editable = true }: EditorProps) {
  const initialConfig = {
    namespace: 'ViniumEditor',
    theme,
    editable,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode],
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
        {editable && <ToolbarPlugin />}
        <div className="relative min-h-[400px]">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="outline-none min-h-[400px] py-2 text-base leading-relaxed" />
            }
            placeholder={
              <div className="absolute top-2 left-0 text-muted-foreground pointer-events-none select-none">
                Начни писать...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        {editable && <AutoFocusPlugin />}
        {initialContent && <InitialStatePlugin content={initialContent} />}
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  )
}
