import { SelectionLayer } from '../../selection/selection'
import { getArrowPoints, hitTestScene } from '../../model/geometry'
import type { CanvasState } from '../../model/types'
import type { Renderer, RendererProps } from '../Renderer'

const renderArrowPath = (state: CanvasState, arrowId: string) => {
  const arrow = state.scene.arrows.find((item) => item.id === arrowId)
  if (!arrow) return ''
  const { start, end } = getArrowPoints(arrow, state.scene)
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
}

export const SvgRenderer: Renderer = {
  render: ({ state, svgRef, onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onWheel, onContextMenu }: RendererProps) => {
    const { pan, zoom } = state.view
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
          {state.scene.arrows.map((arrow) => (
            <path
              key={arrow.id}
              d={renderArrowPath(state, arrow.id)}
              stroke="#2b2d42"
              strokeWidth={2}
              fill="none"
              markerEnd="url(#arrowhead)"
              data-id={arrow.id}
            />
          ))}
          {state.scene.nodes.map((node) => {
            const commonProps = {
              key: node.id,
              transform: `rotate(${(node.rotation * 180) / Math.PI}, ${node.x + node.width / 2}, ${node.y + node.height / 2})`,
              dataId: node.id,
            }
            if (node.type === 'square') {
              return (
                <rect
                  key={node.id}
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={10}
                  fill="#fff"
                  stroke="#2b2d42"
                  strokeWidth={2}
                  transform={commonProps.transform}
                  data-id={node.id}
                />
              )
            }
            return (
              <ellipse
                key={node.id}
                cx={node.x + node.width / 2}
                cy={node.y + node.height / 2}
                rx={node.width / 2}
                ry={node.height / 2}
                fill="#fff"
                stroke="#2b2d42"
                strokeWidth={2}
                transform={commonProps.transform}
                data-id={node.id}
              />
            )
          })}
          <SelectionLayer state={state} />
        </g>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#2b2d42" />
          </marker>
        </defs>
      </svg>
    )
  },
  hitTest: (point, state) => {
    return hitTestScene(point, state.scene)
  },
}
