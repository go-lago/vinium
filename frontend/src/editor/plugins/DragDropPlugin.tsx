import { useRef } from 'react'
import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin'

export function DragDropPlugin({ anchorElem }: { anchorElem: HTMLElement }) {
  const menuRef = useRef<HTMLDivElement>(null)
  const targetLineRef = useRef<HTMLDivElement>(null)

  return (
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      menuRef={menuRef}
      targetLineRef={targetLineRef}
      menuComponent={
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            opacity: 0,
            cursor: 'grab',
            padding: '2px 4px',
            borderRadius: '4px',
            color: 'var(--muted-foreground)',
            fontSize: '14px',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ⠿
        </div>
      }
      targetLineComponent={
        <div
          ref={targetLineRef}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '2px',
            background: 'hsl(var(--primary))',
            opacity: 0,
            pointerEvents: 'none',
            borderRadius: '2px',
          }}
        />
      }
      isOnMenu={(element) => menuRef.current?.contains(element) ?? false}
    />
  )
}
