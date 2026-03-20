import type { CanvasState, SnapGuide } from '../../model/types'

interface GuideOverlayProps {
  state: CanvasState
}

export const GuideOverlay = ({ state }: GuideOverlayProps) => {
  const { visible, guides } = state.overlay.guideLayer
  if (!visible || guides.length === 0) return null

  // Compute view transform for canvas-to-screen conversion
  const { pan, zoom } = state.view

  return (
    <g data-ui="true" style={{ pointerEvents: 'none' }}>
      {guides.map((guide: SnapGuide, i: number) => {
        // Guide lines span the viewport in the guide's axis
        if (guide.axis === 'x') {
          const screenY = guide.value * zoom + pan.y
          return (
            <line
              key={`guide-${i}`}
              x1={0}
              y1={screenY}
              x2={9999}
              y2={screenY}
              stroke="#6b3cff"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.8}
            />
          )
        } else {
          const screenX = guide.value * zoom + pan.x
          return (
            <line
              key={`guide-${i}`}
              x1={screenX}
              y1={0}
              x2={screenX}
              y2={9999}
              stroke="#6b3cff"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.8}
            />
          )
        }
      })}
    </g>
  )
}
