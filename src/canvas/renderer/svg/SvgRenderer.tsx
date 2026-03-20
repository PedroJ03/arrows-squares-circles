import { SelectionLayer } from '../../selection/selection'
import { GuideOverlay } from './GuideOverlay'
import { getArrowPathPoints, hitTestScene } from '../../model/geometry'
import type { CanvasState, TextObject } from '../../model/types'
import type { Renderer, RendererProps } from '../Renderer'

const renderArrowPath = (state: CanvasState, arrowId: string) => {
  const arrow = state.scene.byId[arrowId]
  if (!arrow || arrow.type !== 'arrow') return ''
  const points = getArrowPathPoints(arrow, state.scene)
  return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
}

export const SvgRenderer: Renderer = {
  render: ({ state, svgRef, onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onWheel, onContextMenu }: RendererProps) => {
    const { pan, zoom } = state.view
    const { byId, order } = state.scene
    
    return (
      <svg
        ref={svgRef}
        className="canvas-surface"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onWheel={onWheel}
        onContextMenu={onContextMenu}
        width="100%"
        height="100%"
      >
        <rect width="100%" height="100%" fill="transparent" data-ui="true" />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {/* Render all objects in order */}
          {order.map((id) => {
            const obj = byId[id]
            if (!obj) return null
            
            if (obj.type === 'arrow') {
              return (
                <path
                  key={obj.id}
                  d={renderArrowPath(state, obj.id)}
                  stroke={obj.strokeColor ?? state.defaults.strokeColor}
                  strokeWidth={obj.strokeWidth ?? state.defaults.strokeWidth}
                  strokeDasharray={obj.arrowStyle === 'dashed' ? '6 4' : undefined}
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  data-id={obj.id}
                />
              )
            }
            
            if (obj.type === 'rectangle') {
              return (
                <rect
                  key={obj.id}
                  x={obj.x}
                  y={obj.y}
                  width={obj.width}
                  height={obj.height}
                  rx={10}
                  fill={obj.fillColor ?? state.defaults.fillColor}
                  stroke={obj.strokeColor ?? state.defaults.strokeColor}
                  strokeWidth={obj.strokeWidth ?? state.defaults.strokeWidth}
                  transform={`rotate(${(obj.rotation * 180) / Math.PI}, ${obj.x + obj.width / 2}, ${obj.y + obj.height / 2})`}
                  data-id={obj.id}
                />
              )
            }
            
            if (obj.type === 'ellipse') {
              return (
                <ellipse
                  key={obj.id}
                  cx={obj.x + obj.width / 2}
                  cy={obj.y + obj.height / 2}
                  rx={obj.width / 2}
                  ry={obj.height / 2}
                  fill={obj.fillColor ?? state.defaults.fillColor}
                  stroke={obj.strokeColor ?? state.defaults.strokeColor}
                  strokeWidth={obj.strokeWidth ?? state.defaults.strokeWidth}
                  transform={`rotate(${(obj.rotation * 180) / Math.PI}, ${obj.x + obj.width / 2}, ${obj.y + obj.height / 2})`}
                  data-id={obj.id}
                />
              )
            }
            
            if (obj.type === 'text') {
              const textObj = obj as TextObject
              return (
                <text
                  key={obj.id}
                  x={textObj.x}
                  y={textObj.y}
                  fill={textObj.strokeColor ?? state.defaults.strokeColor}
                  fontSize={textObj.fontSize ?? 24}
                  transform={textObj.rotation !== 0 ? `rotate(${(textObj.rotation * 180) / Math.PI}, ${textObj.x}, ${textObj.y})` : undefined}
                  data-id={obj.id}
                  data-ui="text"
                >
                  {textObj.content}
                </text>
              )
            }
            
            return null
          })}
          <SelectionLayer state={state} />
          <GuideOverlay state={state} />
        </g>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="context-stroke" />
          </marker>
        </defs>
      </svg>
    )
  },
  hitTest: (point, state) => {
    return hitTestScene(point, state.scene)
  },
}
