import type { Anchor, Arrow, ArrowEndpoint, Bounds, CanvasObject, Point, Scene, Shape, TextObject } from './types'

export const SNAP_DISTANCE = 8
export const ENDPOINT_ATTACH_DISTANCE = 12
export const ROTATE_HANDLE_GAP = 40

export const getNodeCenter = (node: Shape): Point => ({
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

export const getNodeCorners = (node: Shape): Point[] => {
  const center = getNodeCenter(node)
  const corners = [
    { x: node.x, y: node.y },
    { x: node.x + node.width, y: node.y },
    { x: node.x + node.width, y: node.y + node.height },
    { x: node.x, y: node.y + node.height },
  ]
  return corners.map((corner) => rotatePoint(corner, center, node.rotation))
}

export const getNodeBounds = (node: Shape): Bounds => {
  const corners = getNodeCorners(node)
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export const getAnchorPoint = (node: Shape, anchor: Anchor): Point => {
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

export const getClosestAnchor = (node: Shape, point: Point): Anchor => {
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
  const target = scene.byId[endpoint.targetId]
  if (!target || target.type === 'arrow' || target.type === 'text') return { x: 0, y: 0 }
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

export const hitTestNode = (point: Point, node: Shape): boolean => {
  const center = getNodeCenter(node)
  const local = inverseRotatePoint(point, center, node.rotation)
  if (node.type === 'rectangle') {
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
  // Check in reverse order (top objects first)
  for (let i = scene.order.length - 1; i >= 0; i -= 1) {
    const id = scene.order[i]
    const obj = scene.byId[id]
    if (!obj) continue
    
    if (obj.type === 'rectangle' || obj.type === 'ellipse') {
      if (hitTestNode(point, obj)) return obj.id
    } else if (obj.type === 'arrow') {
      if (hitTestArrow(point, obj, scene)) return obj.id
    } else if (obj.type === 'text') {
      // Text hit test: use a simple bounding box
      const textBounds: Bounds = {
        x: obj.x,
        y: obj.y,
        width: obj.content.length * (obj.fontSize ?? 24) * 0.6,
        height: obj.fontSize ?? 24,
      }
      if (boundsContainsPoint(textBounds, point)) return obj.id
    }
  }
  return null
}

// Bounds utilities
export const boundsContainsPoint = (bounds: Bounds, point: Point): boolean => {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}

export const boundsIntersect = (a: Bounds, b: Bounds): boolean => {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  )
}

export const getObjectBounds = (obj: CanvasObject, scene: Scene): Bounds => {
  if (obj.type === 'rectangle' || obj.type === 'ellipse') {
    return getNodeBounds(obj)
  }
  if (obj.type === 'arrow') {
    return getArrowBounds(obj, scene)
  }
  // Text object
  const textObj = obj as TextObject
  const fontSize = textObj.fontSize ?? 24
  return {
    x: textObj.x,
    y: textObj.y,
    width: textObj.content.length * fontSize * 0.6,
    height: fontSize,
  }
}

export const getArrowBounds = (arrow: Arrow, scene: Scene): Bounds => {
  const points = getArrowPathPoints(arrow, scene)
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export const getMarqueeIntersectingIds = (scene: Scene, marquee: Bounds): string[] => {
  const intersecting: string[] = []
  for (const id of scene.order) {
    const obj = scene.byId[id]
    if (!obj) continue
    const bounds = getObjectBounds(obj, scene)
    if (boundsIntersect(bounds, marquee)) {
      intersecting.push(id)
    }
  }
  return intersecting
}

export const getRotateHandlePoint = (node: Shape): Point => {
  const center = getNodeCenter(node)
  // Top edge midpoint
  const topMidX = node.x + node.width / 2
  const topMidY = node.y
  const topMid = rotatePoint({ x: topMidX, y: topMidY }, center, node.rotation)
  // Direction from center to top midpoint
  const dx = topMid.x - center.x
  const dy = topMid.y - center.y
  const len = Math.hypot(dx, dy)
  // Extend outward by ROTATE_HANDLE_GAP
  return {
    x: topMid.x + (dx / len) * ROTATE_HANDLE_GAP,
    y: topMid.y + (dy / len) * ROTATE_HANDLE_GAP,
  }
}

// --- Scene-level bounds ---

export const getSceneBounds = (scene: Scene): Bounds | null => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let hasAny = false
  for (const id of scene.order) {
    const obj = scene.byId[id]
    if (!obj) continue
    hasAny = true
    const bounds = getObjectBounds(obj, scene)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  }
  if (!hasAny) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Compute view state (pan + zoom) to fit scene bounds within a viewport.
 * @param sceneBounds  The bounding box of all shapes in canvas space
 * @param viewportWidth  Visible viewport width in pixels
 * @param viewportHeight  Visible viewport height in pixels
 * @param padding  Extra margin around content (in canvas units)
 */
export const fitViewToContent = (
  sceneBounds: Bounds,
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 40,
): { pan: Point; zoom: number } => {
  const contentWidth = sceneBounds.width + padding * 2
  const contentHeight = sceneBounds.height + padding * 2
  const zoom = Math.min(
    viewportWidth / contentWidth,
    viewportHeight / contentHeight,
    4, // max zoom
  )
  const canvasW = contentWidth * zoom
  const canvasH = contentHeight * zoom
  const panX = (viewportWidth - canvasW) / 2 - (sceneBounds.x - padding) * zoom
  const panY = (viewportHeight - canvasH) / 2 - (sceneBounds.y - padding) * zoom
  return { pan: { x: panX, y: panY }, zoom }
}
