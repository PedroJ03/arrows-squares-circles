import type { CanvasStore } from '../store/canvasStore'
import { useCanvasState } from '../../App'

interface ZoomControlsProps {
  store: CanvasStore
}

export const ZoomControls = ({ store }: ZoomControlsProps) => {
  const state = useCanvasState(store)

  if (!state.overlay.zoomControls.visible) return <div style={{ display: 'none' }} />

  const dispatch = (action: Parameters<typeof store.dispatch>[0]) => {
    store.dispatch(action)
  }

  const zoomPercent = Math.round(state.view.zoom * 100)

  return (
    <div className="zoom-controls">
      <button
        type="button"
        className="zoom-btn"
        title="Zoom Out (Cmd+-)"
        onClick={() => dispatch({ type: 'view/zoom', scale: 0.8, anchor: { x: 0, y: 0 } })}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>
      <span className="zoom-percent">{zoomPercent}%</span>
      <button
        type="button"
        className="zoom-btn"
        title="Zoom In (Cmd++)"
        onClick={() => dispatch({ type: 'view/zoom', scale: 1.25, anchor: { x: 0, y: 0 } })}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>
      <button
        type="button"
        className="zoom-btn"
        title="Fit to Canvas (Cmd+1)"
        onClick={() => dispatch({ type: 'view/fit' })}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>
    </div>
  )
}
