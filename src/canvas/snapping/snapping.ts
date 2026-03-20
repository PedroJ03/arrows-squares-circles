import type { Node, Point, Scene } from '../model/types'
import { SNAP_DISTANCE, getNodeCenter } from '../model/geometry'

export type SnapTarget = { x: number; y: number }

export const getSnapTargets = (scene: Scene, excludeId?: string): SnapTarget[] => {
  const targets: SnapTarget[] = []
  scene.nodes.forEach((node) => {
    if (node.id === excludeId) return
    const center = getNodeCenter(node)
    const xs = [node.x, center.x, node.x + node.width]
    const ys = [node.y, center.y, node.y + node.height]
    xs.forEach((x) => {
      ys.forEach((y) => {
        targets.push({ x, y })
      })
    })
  })
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
  node: Node,
  targets: SnapTarget[],
  threshold: number = SNAP_DISTANCE,
): Node => {
  const center = getNodeCenter(node)
  const candidatesX = [node.x, center.x, node.x + node.width]
  const candidatesY = [node.y, center.y, node.y + node.height]
  let bestDx = 0
  let bestDy = 0
  let bestXDist = threshold
  let bestYDist = threshold

  targets.forEach((target) => {
    candidatesX.forEach((cx) => {
      const dx = target.x - cx
      const dist = Math.abs(dx)
      if (dist < bestXDist) {
        bestXDist = dist
        bestDx = dx
      }
    })
    candidatesY.forEach((cy) => {
      const dy = target.y - cy
      const dist = Math.abs(dy)
      if (dist < bestYDist) {
        bestYDist = dist
        bestDy = dy
      }
    })
  })

  return {
    ...node,
    x: node.x + bestDx,
    y: node.y + bestDy,
  }
}
