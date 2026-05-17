import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin'

interface DragDropPluginProps {
  anchorElem?: HTMLElement
}

export function DragDropPlugin({ anchorElem = document.body }: DragDropPluginProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const targetLineRef = useRef<HTMLDivElement>(null)

  return createPortal(
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      menuRef={menuRef}
      targetLineRef={targetLineRef}
      menuComponent={
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            opacity: 0,
            cursor: 'grab',
            padding: '2px 6px',
            color: 'var(--muted-foreground)',
            fontSize: '14px',
            borderRadius: '4px',
            userSelect: 'none',
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
            height: '2px',
            background: 'hsl(var(--primary))',
            opacity: 0,
            left: 0,
            right: 0,
            pointerEvents: 'none',
            borderRadius: '2px',
          }}
        />
      }
      isOnMenu={(element) => menuRef.current?.contains(element) ?? false}
    />,
    anchorElem,
  )
}
