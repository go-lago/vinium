import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

interface Props {
  content: string
}

export function InitialStatePlugin({ content }: Props) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!content) return
    try {
      const parsed = editor.parseEditorState(content)
      editor.setEditorState(parsed)
    } catch {
      // content is plain text or invalid JSON — ignore
    }
  }, [editor, content])

  return null
}
