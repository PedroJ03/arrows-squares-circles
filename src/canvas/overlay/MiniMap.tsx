import { useRef, useLayoutEffect } from 'react'
import type { CanvasStore } from '../store/canvasStore'
import { getSceneBounds, getObjectBounds } from '../model/geometry'
import { useCanvasState } from '../../App'


interface MiniMapProps {
  store: CanvasStore
  containerRef: React.RefObject<HTMLDivElement | null>
}

export const MiniMap = ({ store, containerRef }: MiniMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const state = useCanvasState(store)

  if (!state.overlay.minimap.visible) return <div style={{ display: 'none' }} />

  // Draw shapes as bounds rectangles + viewport rect on canvas
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = state.overlay.minimap
    const sceneBounds = getSceneBounds(state.scene)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    if (!sceneBounds || state.scene.order.length === 0) return

    const padding = 8
    const availW = width - padding * 2
    const availH = height - padding * 2
    const scaleX = availW / sceneBounds.width
    const scaleY = availH / sceneBounds.height
    const scale = Math.min(scaleX, scaleY, 0.2)

    const offsetX = padding - sceneBounds.x * scale
    const offsetY = padding - sceneBounds.y * scale

    // Draw shape bounds
    for (const id of state.scene.order) {
      const obj = state.scene.byId[id]
      if (!obj) continue
      const bounds = getObjectBounds(obj, state.scene)
      const rx = bounds.x * scale + offsetX
      const ry = bounds.y * scale + offsetY
      const rw = bounds.width * scale
      const rh = bounds.height * scale

      // Color by type
      if (obj.type === 'rectangle') {
        ctx.fillStyle = '#4a9eff'
        ctx.strokeStyle = '#6b3cff'
      } else if (obj.type === 'ellipse') {
        ctx.fillStyle = '#ff7b54'
        ctx.strokeStyle = '#ff595e'
      } else if (obj.type === 'arrow') {
        ctx.fillStyle = 'transparent'
        ctx.strokeStyle = '#ffca3a'
      } else {
        ctx.fillStyle = '#8ac926'
        ctx.strokeStyle = '#8ac926'
      }

      ctx.lineWidth = 0.5
      ctx.fillRect(rx, ry, rw, rh)
      ctx.strokeRect(rx, ry, rw, rh)
    }

    // Draw viewport rectangle (the visible area)
    const vw = containerRef.current?.clientWidth ?? width
    const vh = containerRef.current?.clientHeight ?? height
    const { pan, zoom } = state.view

    // Convert canvas-space viewport corners to minimap canvas-space
    const viewLeft = -pan.x / zoom
    const viewTop = -pan.y / zoom
    const viewRight = (vw - pan.x) / zoom
    const viewBottom = (vh - pan.y) / zoom

    const vrx = viewLeft * scale + offsetX
    const vry = viewTop * scale + offsetY
    const vrw = (viewRight - viewLeft) * scale
    const vrh = (viewBottom - viewTop) * scale

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(vrx, vry, vrw, vrh)
  }, [state.scene, state.scene.order, state.view, state.overlay.minimap])

  const { width, height } = state.overlay.minimap

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const sceneBounds = getSceneBounds(state.scene)
    if (!sceneBounds) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    const padding = 8
    const availW = width - padding * 2
    const availH = height - padding * 2
    const scaleX = availW / sceneBounds.width
    const scaleY = availH / sceneBounds.height
    const scale = Math.min(scaleX, scaleY, 0.2)
    const canvasX = (clickX - padding) / scale + sceneBounds.x
    const canvasY = (clickY - padding) / scale + sceneBounds.y

    const localContainerRect = containerRef.current?.getBoundingClientRect()
    if (localContainerRect) {
      const currentView = store.getState().view
      const newPanX = -(canvasX * currentView.zoom) + localContainerRect.width / 2
      const newPanY = -(canvasY * currentView.zoom) + localContainerRect.height / 2
      store.dispatch({ type: 'view/pan', dx: newPanX - currentView.pan.x, dy: newPanY - currentView.pan.y }, { history: false })
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      store.dispatch({ type: 'view/pan', dx, dy }, { history: false })
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className="minimap" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
