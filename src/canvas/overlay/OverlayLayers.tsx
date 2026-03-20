import type { CanvasStore } from '../store/canvasStore'
import { FloatingToolbar } from './FloatingToolbar'
import { ZoomControls } from './ZoomControls'
import { MiniMap } from './MiniMap'

interface OverlayLayersProps {
  store: CanvasStore
  containerRef: React.RefObject<HTMLDivElement | null>
}

export const OverlayLayers = ({ store, containerRef }: OverlayLayersProps) => {
  // Children use their own store subscriptions (useSyncExternalStore).
  // Parent (OverlayLayers) does NOT subscribe — avoids mid-render subscription cascades.
  return (
    <div className="overlay-layers" style={{ pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', position: 'absolute', inset: 0 }}>
        <FloatingToolbar store={store} containerRef={containerRef} />
        <ZoomControls store={store} />
        <MiniMap store={store} containerRef={containerRef} />
      </div>
    </div>
  )
}
