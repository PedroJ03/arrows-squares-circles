import type { Anchor, Arrow, ArrowEndpoint, Node, Point, Scene } from './types'

export type Bounds = { x: number; y: number; width: number; height: number }

export const SNAP_DISTANCE = 8
export const ENDPOINT_ATTACH_DISTANCE = 12

export const getNodeCenter = (node: Node): Point => ({
  x: node.x + node.width / 2,
  y: node.y + node.height / 2,
})

export const rotatePoint = (point: Point, center: Point, angleRad: number): Point => {
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

export const inverseRotatePoint = (
  point: Point,
  center: Point,
  angleRad: number,
): Point => rotatePoint(point, center, -angleRad)

export const getNodeCorners = (node: Node): Point[] => {
  const center = getNodeCenter(node)
  const corners = [
    { x: node.x, y: node.y },
    { x: node.x + node.width, y: node.y },
    { x: node.x + node.width, y: node.y + node.height },
    { x: node.x, y: node.y + node.height },
  ]
  return corners.map((corner) => rotatePoint(corner, center, node.rotation))
}

export const getNodeBounds = (node: Node): Bounds => {
  const corners = getNodeCorners(node)
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export const getAnchorPoint = (node: Node, anchor: Anchor): Point => {
  const center = getNodeCenter(node)
  const halfW = node.width / 2
  const halfH = node.height / 2
  let point: Point = center
  switch (anchor) {
    case 'n':
      point = { x: center.x, y: center.y - halfH }
      break
    case 's':
      point = { x: center.x, y: center.y + halfH }
      break
    case 'e':
      point = { x: center.x + halfW, y: center.y }
      break
    case 'w':
      point = { x: center.x - halfW, y: center.y }
      break
    case 'center':
      point = center
      break
  }
  return rotatePoint(point, center, node.rotation)
}

export const getClosestAnchor = (node: Node, point: Point): Anchor => {
  const anchors: Anchor[] = ['n', 's', 'e', 'w', 'center']
  let best: Anchor = 'center'
  let bestDist = Number.POSITIVE_INFINITY
  anchors.forEach((anchor) => {
    const candidate = getAnchorPoint(node, anchor)
    const dist = distance(point, candidate)
    if (dist < bestDist) {
      bestDist = dist
      best = anchor
    }
  })
  return best
}

export const distance = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y)

export const distanceToSegment = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return distance(p, a)
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)
  const clamped = Math.max(0, Math.min(1, t))
  return distance(p, { x: a.x + clamped * dx, y: a.y + clamped * dy })
}

export const resolveEndpoint = (endpoint: ArrowEndpoint, scene: Scene): Point => {
  if (endpoint.kind === 'free') return { x: endpoint.x, y: endpoint.y }
  const target = scene.nodes.find((node) => node.id === endpoint.targetId)
  if (!target) return { x: 0, y: 0 }
  return getAnchorPoint(target, endpoint.anchor)
}

export const getArrowPoints = (arrow: Arrow, scene: Scene): { start: Point; end: Point } => ({
  start: resolveEndpoint(arrow.start, scene),
  end: resolveEndpoint(arrow.end, scene),
})

export const getElbowPath = (start: Point, end: Point): Point[] => {
  if (start.x === end.x || start.y === end.y) {
    return [start, end]
  }
  return [start, { x: end.x, y: start.y }, end]
}

export const getArrowPathPoints = (arrow: Arrow, scene: Scene): Point[] => {
  const { start, end } = getArrowPoints(arrow, scene)
  if (arrow.arrowStyle === 'elbow') {
    return getElbowPath(start, end)
  }
  return [start, end]
}

export const hitTestNode = (point: Point, node: Node): boolean => {
  const center = getNodeCenter(node)
  const local = inverseRotatePoint(point, center, node.rotation)
  if (node.type === 'square') {
    return (
      local.x >= node.x &&
      local.x <= node.x + node.width &&
      local.y >= node.y &&
      local.y <= node.y + node.height
    )
  }
  const rx = node.width / 2
  const ry = node.height / 2
  const nx = (local.x - center.x) / rx
  const ny = (local.y - center.y) / ry
  return nx * nx + ny * ny <= 1
}

export const hitTestArrow = (point: Point, arrow: Arrow, scene: Scene): boolean => {
  const points = getArrowPathPoints(arrow, scene)
  for (let i = 0; i < points.length - 1; i += 1) {
    if (distanceToSegment(point, points[i], points[i + 1]) <= 6) return true
  }
  return false
}

export const hitTestScene = (point: Point, scene: Scene): string | null => {
  for (let i = scene.nodes.length - 1; i >= 0; i -= 1) {
    const node = scene.nodes[i]
    if (hitTestNode(point, node)) return node.id
  }
  for (let i = scene.arrows.length - 1; i >= 0; i -= 1) {
    const arrow = scene.arrows[i]
    if (hitTestArrow(point, arrow, scene)) return arrow.id
  }
  return null
}
