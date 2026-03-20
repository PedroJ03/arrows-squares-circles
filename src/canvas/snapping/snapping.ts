import type { Point, Scene, Shape, SnapGuide } from '../model/types'
import { SNAP_DISTANCE, getNodeCenter } from '../model/geometry'

export type SnapTarget = { x: number; y: number }

export const getSnapTargets = (scene: Scene, excludeId?: string): SnapTarget[] => {
  const targets: SnapTarget[] = []
  for (const id of scene.order) {
    const obj = scene.byId[id]
    if (!obj || obj.type === 'arrow' || obj.type === 'text') continue
    if (id === excludeId) continue
    const node = obj as Shape
    const center = getNodeCenter(node)
    const xs = [node.x, center.x, node.x + node.width]
    const ys = [node.y, center.y, node.y + node.height]
    xs.forEach((x) => {
      ys.forEach((y) => {
        targets.push({ x, y })
      })
    })
  }
  return targets
}

export const applySnapToPoint = (
  point: Point,
  targets: SnapTarget[],
  threshold: number = SNAP_DISTANCE,
): { point: Point; snapped: boolean } => {
  let best = point
  let bestDist = threshold
  targets.forEach((target) => {
    const dist = Math.hypot(point.x - target.x, point.y - target.y)
    if (dist < bestDist) {
      bestDist = dist
      best = { x: target.x, y: target.y }
    }
  })
  return { point: best, snapped: bestDist < threshold }
}

export const applySnapToNode = (
  node: Shape,
  targets: SnapTarget[],
  threshold: number = SNAP_DISTANCE,
): { node: Shape; guides: SnapGuide[] } => {
  const center = getNodeCenter(node)
  let bestDx = 0
  let bestDy = 0
  let bestXDist = threshold
  let bestYDist = threshold
  let bestXSource = ''
  let bestYSource = ''

  targets.forEach((target) => {
    const edgeValues = [node.x, center.x, node.x + node.width]
    const edgeRefs = ['left', 'centerX', 'right']
    edgeValues.forEach((cx, ci) => {
      const dx = target.x - cx
      const dist = Math.abs(dx)
      if (dist < bestXDist) {
        bestXDist = dist
        bestDx = dx
        bestXSource = edgeRefs[ci]
      }
    })

    const edgeYValues = [node.y, center.y, node.y + node.height]
    const edgeYRefs = ['top', 'centerY', 'bottom']
    edgeYValues.forEach((cy, ci) => {
      const dy = target.y - cy
      const dist = Math.abs(dy)
      if (dist < bestYDist) {
        bestYDist = dist
        bestDy = dy
        bestYSource = edgeYRefs[ci]
      }
    })
  })

  // Build guide metadata for snapping axes that actually snapped
  const guides: SnapGuide[] = []
  const snappedNode = {
    ...node,
    x: node.x + bestDx,
    y: node.y + bestDy,
  }

  // Only emit guides when snapped (distance below threshold)
  if (bestXDist < threshold && bestXSource) {
    const refCenter = getNodeCenter(snappedNode)
    const isCenter = bestXSource === 'centerX'
    guides.push({
      type: isCenter ? 'center' : 'edge',
      axis: 'x',
      value: isCenter ? refCenter.x : snappedNode.x + (bestXSource === 'left' ? 0 : snappedNode.width),
      sourceId: '',
    })
  }
  if (bestYDist < threshold && bestYSource) {
    const refCenter = getNodeCenter(snappedNode)
    const isCenter = bestYSource === 'centerY'
    guides.push({
      type: isCenter ? 'center' : 'edge',
      axis: 'y',
      value: isCenter ? refCenter.y : snappedNode.y + (bestYSource === 'top' ? 0 : snappedNode.height),
      sourceId: '',
    })
  }

  return { node: snappedNode, guides }
}
