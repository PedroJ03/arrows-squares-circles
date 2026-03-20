import type { CanvasStore } from '../store/canvasStore'
import type { Anchor, Arrow, ArrowEndpoint, Node, Point } from '../model/types'
import {
  ENDPOINT_ATTACH_DISTANCE,
  distance,
  getAnchorPoint,
  getClosestAnchor,
  getNodeCenter,
  hitTestScene,
  inverseRotatePoint,
} from '../model/geometry'
import { applySnapToNode, applySnapToPoint, getSnapTargets } from '../snapping/snapping'

type InteractionMode =
  | 'idle'
  | 'dragging'
  | 'resizing'
  | 'rotating'
  | 'panning'
  | 'endpoint'

type InteractionState = {
  mode: InteractionMode
  pointerId: number | null
  start: Point
  last: Point
  nodeId?: string
  arrowId?: string
  handle?: string
  startNode?: Node
  startView?: { pan: Point; zoom: number }
}

export const createGestureController = (options: {
  store: CanvasStore
  svgRef: React.RefObject<SVGSVGElement | null>
  onCommit?: () => void
}) => {
  const { store, svgRef, onCommit } = options
  const state: InteractionState = {
    mode: 'idle',
    pointerId: null,
    start: { x: 0, y: 0 },
    last: { x: 0, y: 0 },
  }
  const keys = new Set<string>()

  const getCanvasPoint = (event: {
    clientX: number
    clientY: number
    pageX?: number
    pageY?: number
    nativeEvent?: { clientX?: number; clientY?: number; pageX?: number; pageY?: number }
  }): Point => {
    const rect = svgRef.current?.getBoundingClientRect()
    const { pan, zoom } = store.getState().view
    if (!rect) return { x: 0, y: 0 }
    const left = Number.isFinite(rect.left) ? rect.left : rect.x
    const top = Number.isFinite(rect.top) ? rect.top : rect.y
    const nativeEvent = event.nativeEvent
    const rawClientX = Number.isFinite(event.clientX)
      ? event.clientX
      : (nativeEvent?.clientX ?? nativeEvent?.pageX ?? event.pageX ?? 0)
    const rawClientY = Number.isFinite(event.clientY)
      ? event.clientY
      : (nativeEvent?.clientY ?? nativeEvent?.pageY ?? event.pageY ?? 0)
    const clientX = Number(rawClientX)
    const clientY = Number(rawClientY)
    const x = clientX - left
    const y = clientY - top
    return { x: (x - pan.x) / zoom, y: (y - pan.y) / zoom }
  }

  const startInteraction = (event: React.PointerEvent<SVGSVGElement>) => {
    const canvasPoint = getCanvasPoint(event)
    state.start = canvasPoint
    state.last = canvasPoint
    state.pointerId = event.pointerId
  }

  const startPan = (event: React.PointerEvent<SVGSVGElement>) => {
    startInteraction(event)
    state.mode = 'panning'
    state.startView = { ...store.getState().view }
  }

  const startDrag = (event: React.PointerEvent<SVGSVGElement>, node: Node) => {
    startInteraction(event)
    state.mode = 'dragging'
    state.nodeId = node.id
    state.startNode = { ...node }
    store.startHistory()
  }

  const startResize = (event: React.PointerEvent<SVGSVGElement>, node: Node, handle: string) => {
    startInteraction(event)
    state.mode = 'resizing'
    state.nodeId = node.id
    state.handle = handle
    state.startNode = { ...node }
    store.startHistory()
  }

  const startRotate = (event: React.PointerEvent<SVGSVGElement>, node: Node) => {
    startInteraction(event)
    state.mode = 'rotating'
    state.nodeId = node.id
    state.startNode = { ...node }
    store.startHistory()
  }

  const startEndpoint = (event: React.PointerEvent<SVGSVGElement>, arrow: Arrow, handle: string) => {
    startInteraction(event)
    state.mode = 'endpoint'
    state.arrowId = arrow.id
    state.handle = handle
    store.startHistory()
  }

  const endInteraction = () => {
    if (state.mode !== 'idle' && state.mode !== 'panning') {
      store.commitHistory()
      onCommit?.()
    }
    state.mode = 'idle'
    state.pointerId = null
    state.nodeId = undefined
    state.arrowId = undefined
    state.handle = undefined
    state.startNode = undefined
    state.startView = undefined
  }

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button === 2 || keys.has(' ')) {
      event.preventDefault()
      startPan(event)
      return
    }

    const target = event.target as Element | null
    const datasetHandle = target instanceof HTMLElement ? target.dataset.handle : undefined
    const datasetId = target instanceof HTMLElement ? target.dataset.id : undefined
    const handle = datasetHandle ?? target?.getAttribute?.('data-handle') ?? undefined
    const targetId = datasetId ?? target?.getAttribute?.('data-id') ?? undefined
    const { scene } = store.getState()

    if (handle && targetId) {
      const node = scene.nodes.find((item) => item.id === targetId)
      const arrow = scene.arrows.find((item) => item.id === targetId)
      if (node && handle.startsWith('resize')) {
        startResize(event, node, handle)
        return
      }
      if (node && handle === 'rotate') {
        startRotate(event, node)
        return
      }
      if (arrow && handle.startsWith('endpoint')) {
        startEndpoint(event, arrow, handle)
        return
      }
    }

    if (targetId) {
      const node = scene.nodes.find((item) => item.id === targetId)
      if (node) {
        store.dispatch({ type: 'selection/set', id: node.id }, { history: false })
        startDrag(event, node)
        return
      }
      const arrow = scene.arrows.find((item) => item.id === targetId)
      if (arrow) {
        store.dispatch({ type: 'selection/set', id: arrow.id }, { history: false })
        return
      }
    }

    const canvasPoint = getCanvasPoint(event)
    const hitId = hitTestScene(canvasPoint, scene)
    if (hitId) {
      store.dispatch({ type: 'selection/set', id: hitId }, { history: false })
      const node = scene.nodes.find((item) => item.id === hitId)
      if (node) {
        startDrag(event, node)
        return
      }
      const arrow = scene.arrows.find((item) => item.id === hitId)
      if (arrow) {
        store.dispatch({ type: 'selection/set', id: arrow.id }, { history: false })
        return
      }
    } else {
      store.dispatch({ type: 'selection/set', id: null }, { history: false })
    }
  }

  const updateDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!state.nodeId || !state.startNode) return
    const nextPoint = getCanvasPoint(event)
    const dx = nextPoint.x - state.start.x
    const dy = nextPoint.y - state.start.y
    const node = { ...state.startNode, x: state.startNode.x + dx, y: state.startNode.y + dy }
    const { scene, snapping } = store.getState()
    const snappedNode = snapping.enabled
      ? applySnapToNode(node, getSnapTargets(scene, node.id))
      : node
    store.dispatch({ type: 'node/update', id: node.id, patch: { x: snappedNode.x, y: snappedNode.y } }, { history: false })
  }

  const updateResize = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!state.nodeId || !state.startNode || !state.handle) return
    const nextPoint = getCanvasPoint(event)
    const node = state.startNode
    const center = getNodeCenter(node)
    const localPoint = inverseRotatePoint(nextPoint, center, node.rotation)
    let { x, y, width, height } = node

    if (state.handle.includes('e')) {
      width = Math.max(20, localPoint.x - node.x)
    }
    if (state.handle.includes('s')) {
      height = Math.max(20, localPoint.y - node.y)
    }
    if (state.handle.includes('w')) {
      const nextX = Math.min(localPoint.x, node.x + node.width - 20)
      width = node.x + node.width - nextX
      x = nextX
    }
    if (state.handle.includes('n')) {
      const nextY = Math.min(localPoint.y, node.y + node.height - 20)
      height = node.y + node.height - nextY
      y = nextY
    }

    const resized = { ...node, x, y, width, height }
    const { scene, snapping } = store.getState()
    const snapped = snapping.enabled
      ? applySnapToNode(resized, getSnapTargets(scene, node.id))
      : resized
    store.dispatch(
      {
        type: 'node/update',
        id: node.id,
        patch: { x: snapped.x, y: snapped.y, width: snapped.width, height: snapped.height },
      },
      { history: false },
    )
  }

  const updateRotate = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!state.nodeId || !state.startNode) return
    const node = state.startNode
    const center = getNodeCenter(node)
    const nextPoint = getCanvasPoint(event)
    const angle = Math.atan2(nextPoint.y - center.y, nextPoint.x - center.x)
    store.dispatch({ type: 'node/update', id: node.id, patch: { rotation: angle } }, { history: false })
  }

  const updatePan = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!state.startView) return
    const current = getCanvasPoint(event)
    const dx = (current.x - state.start.x) * store.getState().view.zoom
    const dy = (current.y - state.start.y) * store.getState().view.zoom
    store.dispatch({ type: 'view/pan', dx, dy }, { history: false })
  }

  const updateEndpoint = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!state.arrowId || !state.handle) return
    const nextPoint = getCanvasPoint(event)
    const { scene, snapping } = store.getState()
    const targets = getSnapTargets(scene, state.arrowId)
    const snapped = snapping.enabled ? applySnapToPoint(nextPoint, targets) : { point: nextPoint, snapped: false }
    let endpoint: ArrowEndpoint = { kind: 'free', x: snapped.point.x, y: snapped.point.y }

    let attachedTarget: Node | undefined
    let attachedAnchor: Anchor | undefined
    let bestDistance = ENDPOINT_ATTACH_DISTANCE
    scene.nodes.forEach((node) => {
      const anchor = getClosestAnchor(node, snapped.point)
      const anchorPoint = getAnchorPoint(node, anchor)
      const dist = distance(snapped.point, anchorPoint)
      if (dist < bestDistance) {
        bestDistance = dist
        attachedTarget = node
        attachedAnchor = anchor
      }
    })

    if (attachedTarget && attachedAnchor) {
      endpoint = { kind: 'attached', targetId: attachedTarget.id, anchor: attachedAnchor }
    }

    const patch = state.handle === 'endpoint-start' ? { start: endpoint } : { end: endpoint }
    store.dispatch({ type: 'arrow/update', id: state.arrowId, patch }, { history: false })
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (state.pointerId !== event.pointerId) return
    state.last = getCanvasPoint(event)
    switch (state.mode) {
      case 'dragging':
        if (state.nodeId) updateDrag(event)
        break
      case 'resizing':
        updateResize(event)
        break
      case 'rotating':
        updateRotate(event)
        break
      case 'panning':
        updatePan(event)
        break
      case 'endpoint':
        updateEndpoint(event)
        break
      default:
        break
    }
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (state.pointerId !== event.pointerId) return
    endInteraction()
  }

  const handlePointerLeave = (event: React.PointerEvent<SVGSVGElement>) => {
    if (state.pointerId !== event.pointerId) return
    endInteraction()
  }

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const anchor = getCanvasPoint(event)
    if (event.ctrlKey) {
      const scale = event.deltaY < 0 ? 1.08 : 0.92
      store.dispatch({ type: 'view/zoom', scale, anchor }, { history: false })
    } else {
      store.dispatch({ type: 'view/pan', dx: -event.deltaX, dy: -event.deltaY }, { history: false })
    }
  }

  const handleContextMenu = (event: React.MouseEvent<SVGSVGElement>) => {
    event.preventDefault()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    keys.add(event.key)
  }

  const handleKeyUp = (event: React.KeyboardEvent) => {
    keys.delete(event.key)
  }

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handleWheel,
    handleContextMenu,
    handleKeyDown,
    handleKeyUp,
  }
}
