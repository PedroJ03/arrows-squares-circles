import type { Arrow, Point, Shape } from '../model/types'
import { getArrowPoints, getNodeCorners, getObjectBounds, getRotateHandlePoint } from '../model/geometry'
import type { CanvasState } from '../model/types'

type HandleProps = {
  point: Point
  handle: string
  targetId: string
}

const Handle = ({ point, handle, targetId }: HandleProps) => (
  <circle
    cx={point.x}
    cy={point.y}
    r={5}
    fill="#fff"
    stroke="#6b3cff"
    strokeWidth={2}
    data-handle={handle}
    data-id={targetId}
    data-ui="true"
  />
)

const RotationHandle = ({ point, targetId }: { point: Point; targetId: string }) => (
  <circle
    cx={point.x}
    cy={point.y}
    r={6}
    fill="#fff"
    stroke="#6b3cff"
    strokeWidth={2}
    data-handle="rotate"
    data-id={targetId}
    data-ui="true"
  />
)

const TextEditHandle = ({ point, targetId }: { point: Point; targetId: string }) => (
  <g data-ui="true">
    <circle
      cx={point.x}
      cy={point.y}
      r={8}
      fill="#6b3cff"
      data-handle="text-edit"
      data-id={targetId}
      data-ui="true"
    />
    <text
      x={point.x}
      y={point.y + 4}
      textAnchor="middle"
      fill="#fff"
      fontSize="12"
      data-handle="text-edit"
      data-id={targetId}
      data-ui="true"
    >
      T
    </text>
  </g>
)

const NodeSelection = ({ node }: { node: Shape }) => {
  const corners = getNodeCorners(node)
  const rotatePoint = getRotateHandlePoint(node)
  return (
    <g data-ui="true">
      <polygon
        points={corners.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#6b3cff"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        data-ui="true"
      />
      <Handle point={corners[0]} handle="resize-nw" targetId={node.id} />
      <Handle point={corners[1]} handle="resize-ne" targetId={node.id} />
      <Handle point={corners[2]} handle="resize-se" targetId={node.id} />
      <Handle point={corners[3]} handle="resize-sw" targetId={node.id} />
      <RotationHandle point={rotatePoint} targetId={node.id} />
    </g>
  )
}

const ArrowSelection = ({ arrow, state }: { arrow: Arrow; state: CanvasState }) => {
  const { start, end } = getArrowPoints(arrow, state.scene)
  return (
    <g data-ui="true">
      <circle
        cx={start.x}
        cy={start.y}
        r={6}
        fill="#fff"
        stroke="#6b3cff"
        strokeWidth={2}
        data-handle="endpoint-start"
        data-id={arrow.id}
        data-ui="true"
      />
      <circle
        cx={end.x}
        cy={end.y}
        r={6}
        fill="#fff"
        stroke="#6b3cff"
        strokeWidth={2}
        data-handle="endpoint-end"
        data-id={arrow.id}
        data-ui="true"
      />
    </g>
  )
}

const TextSelection = ({ textId, state }: { textId: string; state: CanvasState }) => {
  const textObj = state.scene.byId[textId]
  if (!textObj || textObj.type !== 'text') return null
  const bounds = getObjectBounds(textObj, state.scene)
  const handlePoint = { x: bounds.x + bounds.width + 10, y: bounds.y }
  return (
    <g data-ui="true">
      <rect
        x={bounds.x - 4}
        y={bounds.y - 4}
        width={bounds.width + 8}
        height={bounds.height + 8}
        fill="none"
        stroke="#6b3cff"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        data-ui="true"
      />
      <TextEditHandle point={handlePoint} targetId={textId} />
    </g>
  )
}

const MarqueeRect = ({ bounds }: { bounds: { x: number; y: number; width: number; height: number } }) => (
  <rect
    x={bounds.x}
    y={bounds.y}
    width={bounds.width}
    height={bounds.height}
    fill="rgba(107, 60, 255, 0.1)"
    stroke="#6b3cff"
    strokeWidth={1}
    strokeDasharray="4 4"
    data-ui="true"
  />
)

const MultiSelectBounds = ({ ids, state }: { ids: string[]; state: CanvasState }) => {
  if (ids.length < 2) return null
  
  // Compute group bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const id of ids) {
    const obj = state.scene.byId[id]
    if (!obj) continue
    const bounds = getObjectBounds(obj, state.scene)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  }
  
  if (!isFinite(minX)) return null
  
  return (
    <rect
      x={minX - 4}
      y={minY - 4}
      width={maxX - minX + 8}
      height={maxY - minY + 8}
      fill="none"
      stroke="#6b3cff"
      strokeWidth={1.5}
      strokeDasharray="6 4"
      data-ui="true"
    />
  )
}

export const SelectionLayer = ({ state }: { state: CanvasState }) => {
  const { ids, marquee } = state.selection
  
  // Show marquee rect
  if (marquee) {
    return <MarqueeRect bounds={marquee} />
  }
  
  // No selection
  if (ids.length === 0) return null
  
  // Single selection - show full handles
  if (ids.length === 1) {
    const id = ids[0]
    const obj = state.scene.byId[id]
    if (!obj) return null
    
    if (obj.type === 'rectangle' || obj.type === 'ellipse') {
      return <NodeSelection node={obj} />
    }
    if (obj.type === 'arrow') {
      return <ArrowSelection arrow={obj} state={state} />
    }
    if (obj.type === 'text') {
      return <TextSelection textId={id} state={state} />
    }
  }
  
  // Multi-selection - show group bounds (no rotate handle)
  return <MultiSelectBounds ids={ids} state={state} />
}
