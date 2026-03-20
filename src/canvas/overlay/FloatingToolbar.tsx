import type { CanvasStore } from '../store/canvasStore'
import { useCanvasState } from '../../App'

interface FloatingToolbarProps {
  store: CanvasStore
  containerRef: React.RefObject<HTMLDivElement | null>
}

export const FloatingToolbar = ({ store, containerRef }: FloatingToolbarProps) => {
  const state = useCanvasState(store)
  const { visible, anchorBounds } = state.overlay.floatingToolbar
  if (!visible || !anchorBounds) return <div style={{ display: 'none' }} />

  const { pan, zoom } = state.view

  const screenX = anchorBounds.x * zoom + pan.x
  const screenY = anchorBounds.y * zoom + pan.y - 48

  const containerRect = containerRef.current?.getBoundingClientRect()
  const toolbarW = 200
  const clampedX = containerRect
    ? Math.min(Math.max(screenX, 8), containerRect.width - toolbarW - 8)
    : Math.max(screenX, 8)
  const clampedY = Math.max(screenY, 8)

  const dispatch = (action: Parameters<typeof store.dispatch>[0]) => {
    store.dispatch(action)
  }

  return (
    <div className="floating-toolbar" style={{ left: clampedX, top: clampedY }}>
      <button type="button" className="toolbar-btn" title="Bring to Front"
        onClick={() => dispatch({ type: 'scene/reorder', ids: state.selection.ids, direction: 'front' })}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="17 11 12 6 7 11" />
          <polyline points="17 18 12 13 7 18" />
        </svg>
      </button>
      <button type="button" className="toolbar-btn" title="Bring Forward"
        onClick={() => dispatch({ type: 'scene/reorder', ids: state.selection.ids, direction: 'forward' })}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button type="button" className="toolbar-btn" title="Send Backward"
        onClick={() => dispatch({ type: 'scene/reorder', ids: state.selection.ids, direction: 'backward' })}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <button type="button" className="toolbar-btn" title="Send to Back"
        onClick={() => dispatch({ type: 'scene/reorder', ids: state.selection.ids, direction: 'back' })}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="7 13 12 18 17 13" />
          <polyline points="7 6 12 11 17 6" />
        </svg>
      </button>
      <div className="toolbar-sep" />
      <button type="button" className="toolbar-btn" title="Duplicate (Cmd+Shift+D)"
        onClick={() => {
          const { selection, scene } = store.getState()
          if (selection.ids.length === 0) return
          store.startHistory()
          const idMap = new Map<string, string>()
          const newIds: string[] = []
          for (const id of selection.ids) {
            const newId = crypto.randomUUID()
            idMap.set(id, newId)
            newIds.push(newId)
          }
          for (const id of selection.ids) {
            const obj = scene.byId[id]
            if (!obj) continue
            let clone = { ...obj, id: idMap.get(id)! } as typeof obj
            if (clone.type === 'rectangle' || clone.type === 'ellipse') {
              (clone as any).x += 20; (clone as any).y += 20
            } else if (clone.type === 'arrow') {
              const a = clone as any
              const start = a.start.kind === 'attached'
                ? { kind: 'attached', targetId: idMap.get(a.start.targetId) ?? a.start.targetId, anchor: a.start.anchor }
                : { kind: 'free', x: a.start.x + 20, y: a.start.y + 20 }
              const end = a.end.kind === 'attached'
                ? { kind: 'attached', targetId: idMap.get(a.end.targetId) ?? a.end.targetId, anchor: a.end.anchor }
                : { kind: 'free', x: a.end.x + 20, y: a.end.y + 20 }
              clone = { ...clone, start, end } as typeof obj
            } else if (clone.type === 'text') {
              (clone as any).x += 20; (clone as any).y += 20
            }
            store.dispatch({ type: 'object/add', object: clone as any }, { history: false })
          }
          for (const id of scene.order) {
            const obj = scene.byId[id]
            if (!obj || obj.type !== 'arrow') continue
            const arrow = obj as any
            const newStart = arrow.start.kind === 'attached' && idMap.has(arrow.start.targetId)
              ? { ...arrow.start, targetId: idMap.get(arrow.start.targetId)! }
              : arrow.start
            const newEnd = arrow.end.kind === 'attached' && idMap.has(arrow.end.targetId)
              ? { ...arrow.end, targetId: idMap.get(arrow.end.targetId)! }
              : arrow.end
            if (newStart !== arrow.start || newEnd !== arrow.end) {
              store.dispatch({ type: 'object/update', id: arrow.id, patch: { start: newStart, end: newEnd } }, { history: false })
            }
          }
          store.dispatch({ type: 'selection/setMany', ids: newIds }, { history: false })
          store.commitHistory()
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
      <button type="button" className="toolbar-btn toolbar-btn-danger" title="Delete (Del)"
        onClick={() => {
          const { selection } = store.getState()
          if (selection.ids.length > 0) store.dispatch({ type: 'objects/deleteMany', ids: selection.ids })
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  )
}
