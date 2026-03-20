import type React from 'react'
import type { ReactElement } from 'react'
import type { CanvasState, Point, ShapeId } from '../model/types'

export type RendererProps = {
  state: CanvasState
  svgRef: React.RefObject<SVGSVGElement | null>
  onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void
  onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void
  onPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void
  onPointerLeave: (event: React.PointerEvent<SVGSVGElement>) => void
  onWheel: (event: React.WheelEvent<SVGSVGElement>) => void
  onContextMenu: (event: React.MouseEvent<SVGSVGElement>) => void
}

export type Renderer = {
  render: (props: RendererProps) => ReactElement
  hitTest: (point: Point, state: CanvasState) => ShapeId | null
}
