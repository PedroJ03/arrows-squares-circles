import { useEffect, useRef, useState } from 'react'
import type { CanvasState, TextObject } from '../model/types'

type TextEditorOverlayProps = {
  editingTextId: string | null
  objects: CanvasState['scene']['byId']
  view: CanvasState['view']
  onCommit: (id: string, content: string) => void
  onCancel: () => void
}

export const TextEditorOverlay = ({
  editingTextId,
  objects,
  view,
  onCommit,
  onCancel,
}: TextEditorOverlayProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [fontSize, setFontSize] = useState(24)

  useEffect(() => {
    if (editingTextId) {
      const obj = objects[editingTextId]
      if (obj && obj.type === 'text') {
        const textObj = obj as TextObject
        setValue(textObj.content)
        setFontSize(textObj.fontSize ?? 24)
        
        // Calculate position in screen coordinates
        const screenX = textObj.x * view.zoom + view.pan.x
        const screenY = textObj.y * view.zoom + view.pan.y
        setPosition({ x: screenX, y: screenY })
        
        // Focus the textarea
        setTimeout(() => {
          textareaRef.current?.focus()
          textareaRef.current?.select()
        }, 0)
      }
    }
  }, [editingTextId, objects, view])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCommit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleCommit = () => {
    if (editingTextId) {
      onCommit(editingTextId, value)
    }
  }

  if (!editingTextId) {
    return null
  }

  return (
    <div
      className="text-editor-overlay"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 100,
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        style={{
          fontSize: fontSize * view.zoom,
          color: objects[editingTextId]?.strokeColor ?? '#2b2d42',
          minWidth: '100px',
          minHeight: `${fontSize * view.zoom * 1.5}px`,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid #6b3cff',
          borderRadius: '4px',
          padding: '4px 8px',
          outline: 'none',
          resize: 'none',
          fontFamily: 'var(--sans)',
          lineHeight: 1.4,
        }}
        rows={1}
        data-ui="text-editor"
      />
    </div>
  )
}
