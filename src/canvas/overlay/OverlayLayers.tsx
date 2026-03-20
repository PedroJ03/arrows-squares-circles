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
  // NOTE: Children (FloatingToolbar, ZoomControls, MiniMap) have pointer-events: auto in their CSS.
  // The container has pointer-events: none so it doesn't block canvas interactions.
  return (
    <div className="overlay-layers" style={{ pointerEvents: 'none' }}>
      <FloatingToolbar store={store} containerRef={containerRef} />
      <ZoomControls store={store} />
      <MiniMap store={store} containerRef={containerRef} />
    </div>
  )
}
