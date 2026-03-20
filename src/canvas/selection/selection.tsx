import type { Arrow, Node, Point } from '../model/types'
import { getArrowPoints, getNodeCenter, getNodeCorners } from '../model/geometry'
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

const RotationHandle = ({ center, targetId }: { center: Point; targetId: string }) => (
  <circle
    cx={center.x}
    cy={center.y - 30}
    r={6}
    fill="#fff"
    stroke="#6b3cff"
    strokeWidth={2}
    data-handle="rotate"
    data-id={targetId}
    data-ui="true"
  />
)

const NodeSelection = ({ node }: { node: Node }) => {
  const corners = getNodeCorners(node)
  const center = getNodeCenter(node)
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
      <RotationHandle center={center} targetId={node.id} />
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

export const SelectionLayer = ({ state }: { state: CanvasState }) => {
  const { id } = state.selection
  if (!id) return null
  const node = state.scene.nodes.find((item) => item.id === id)
  if (node) return <NodeSelection node={node} />
  const arrow = state.scene.arrows.find((item) => item.id === id)
  if (arrow) return <ArrowSelection arrow={arrow} state={state} />
  return null
}
