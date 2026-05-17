import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin'
import type { MenuRenderFn } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { $getSelection, $isRangeSelection, $createParagraphNode } from 'lexical'
import type { TextNode } from 'lexical'
import type { RefObject } from 'react'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createCodeNode } from '@lexical/code'
import { $setBlocksType } from '@lexical/selection'
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode'
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list'
import type { LexicalEditor, ElementNode } from 'lexical'

type TransformAction = {
  kind: 'transform'
  create: () => ElementNode
}

type CommandAction = {
  kind: 'command'
  dispatch: (editor: LexicalEditor) => void
}

type SlashAction = TransformAction | CommandAction

type SlashCommandDef = {
  key: string
  icon: string
  label: string
  description: string
  keywords: string[]
  action: SlashAction
}

const SLASH_COMMANDS: SlashCommandDef[] = [
  {
    key: 'paragraph',
    icon: 'T',
    label: 'Текст',
    description: 'Обычный абзац',
    keywords: ['text', 'paragraph', 'plain'],
    action: { kind: 'transform', create: () => $createParagraphNode() },
  },
  {
    key: 'h1',
    icon: 'H1',
    label: 'Заголовок 1',
    description: 'Большой заголовок',
    keywords: ['heading', 'h1', 'title'],
    action: { kind: 'transform', create: () => $createHeadingNode('h1') },
  },
  {
    key: 'h2',
    icon: 'H2',
    label: 'Заголовок 2',
    description: 'Средний заголовок',
    keywords: ['heading', 'h2', 'subtitle'],
    action: { kind: 'transform', create: () => $createHeadingNode('h2') },
  },
  {
    key: 'h3',
    icon: 'H3',
    label: 'Заголовок 3',
    description: 'Малый заголовок',
    keywords: ['heading', 'h3'],
    action: { kind: 'transform', create: () => $createHeadingNode('h3') },
  },
  {
    key: 'quote',
    icon: '"',
    label: 'Цитата',
    description: 'Блок цитирования',
    keywords: ['quote', 'blockquote', 'citation'],
    action: { kind: 'transform', create: () => $createQuoteNode() },
  },
  {
    key: 'code',
    icon: '</>',
    label: 'Код',
    description: 'Блок кода',
    keywords: ['code', 'codeblock', 'snippet'],
    action: { kind: 'transform', create: () => $createCodeNode() },
  },
  {
    key: 'divider',
    icon: '—',
    label: 'Разделитель',
    description: 'Горизонтальная линия',
    keywords: ['divider', 'hr', 'rule', 'separator'],
    action: {
      kind: 'command',
      dispatch: (editor) => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
    },
  },
  {
    key: 'ul',
    icon: '•',
    label: 'Маркированный список',
    description: 'Список с точками',
    keywords: ['bullet', 'list', 'ul', 'unordered'],
    action: {
      kind: 'command',
      dispatch: (editor) => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    },
  },
  {
    key: 'ol',
    icon: '1.',
    label: 'Нумерованный список',
    description: 'Список с цифрами',
    keywords: ['ordered', 'list', 'ol', 'numbered'],
    action: {
      kind: 'command',
      dispatch: (editor) => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
    },
  },
]

class SlashCommandOption extends MenuOption {
  def: SlashCommandDef

  constructor(def: SlashCommandDef) {
    super(def.key)
    this.def = def
  }
}

function SlashMenu({
  anchorElementRef,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
  options,
}: {
  anchorElementRef: RefObject<HTMLElement | null>
  selectedIndex: number | null
  selectOptionAndCleanUp: (option: SlashCommandOption) => void
  setHighlightedIndex: (index: number) => void
  options: SlashCommandOption[]
}) {
  if (!anchorElementRef.current || options.length === 0) return null

  return createPortal(
    <div className="min-w-[220px] rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
      {options.map((option, i) => (
        <div
          key={option.key}
          className={[
            'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
            selectedIndex === i ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
          ].join(' ')}
          onMouseEnter={() => setHighlightedIndex(i)}
          onMouseDown={(e) => {
            e.preventDefault()
            selectOptionAndCleanUp(option)
          }}
        >
          <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-muted font-mono text-xs font-medium text-foreground">
            {option.def.icon}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium leading-tight">{option.def.label}</span>
            <span className="text-xs text-muted-foreground leading-tight">{option.def.description}</span>
          </div>
        </div>
      ))}
    </div>,
    anchorElementRef.current,
  )
}

export function SlashCommandPlugin() {
  const [editor] = useLexicalComposerContext()
  const [queryString, setQueryString] = useState<string | null>(null)

  const triggerFn = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
    maxLength: 20,
    allowWhitespace: false,
  })

  const options = useMemo<SlashCommandOption[]>(() => {
    const q = queryString?.toLowerCase() ?? ''
    return SLASH_COMMANDS.filter(
      (cmd) =>
        q === '' ||
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q)),
    ).map((cmd) => new SlashCommandOption(cmd))
  }, [queryString])

  const onSelectOption = useCallback(
    (
      option: SlashCommandOption,
      textNodeContainingQuery: TextNode | null,
      closeMenu: () => void,
    ) => {
      const { action } = option.def

      editor.update(() => {
        textNodeContainingQuery?.remove()
        if (action.kind === 'transform') {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, action.create)
          }
        }
      })

      if (action.kind === 'command') {
        action.dispatch(editor)
      }

      closeMenu()
    },
    [editor],
  )

  const menuRenderFn: MenuRenderFn<SlashCommandOption> = useCallback(
    (anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex, options: opts }) => (
      <SlashMenu
        anchorElementRef={anchorElementRef}
        selectedIndex={selectedIndex}
        selectOptionAndCleanUp={selectOptionAndCleanUp}
        setHighlightedIndex={setHighlightedIndex}
        options={opts}
      />
    ),
    [],
  )

  return (
    <LexicalTypeaheadMenuPlugin<SlashCommandOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      options={options}
      menuRenderFn={menuRenderFn}
    />
  )
}
