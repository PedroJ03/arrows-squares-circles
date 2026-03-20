import type { CanvasStore } from '../store/canvasStore'
import type { Arrow, ArrowEndpoint, Bounds, CanvasObject, Point, Shape } from '../model/types'
import {
  ENDPOINT_ATTACH_DISTANCE,
  distance,
  getAnchorPoint,
  getClosestAnchor,
  getMarqueeIntersectingIds,
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
  | 'marquee'

type InteractionState = {
  mode: InteractionMode
  pointerId: number | null
  start: Point
  last: Point
  objectId?: string
  handle?: string
  startObject?: CanvasObject
  startView?: { pan: Point; zoom: number }
  marqueeStart?: Point
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

  const startDrag = (event: React.PointerEvent<SVGSVGElement>, obj: CanvasObject) => {
    startInteraction(event)
    state.mode = 'dragging'
    state.objectId = obj.id
    state.startObject = { ...obj } as CanvasObject
    store.startHistory()
  }

  const startResize = (event: React.PointerEvent<SVGSVGElement>, node: Shape, handle: string) => {
    startInteraction(event)
    state.mode = 'resizing'
    state.objectId = node.id
    state.handle = handle
    state.startObject = { ...node } as CanvasObject
    store.startHistory()
  }

  const startRotate = (event: React.PointerEvent<SVGSVGElement>, node: Shape) => {
    startInteraction(event)
    state.mode = 'rotating'
    state.objectId = node.id
    state.startObject = { ...node } as CanvasObject
    store.startHistory()
  }

  const startEndpoint = (event: React.PointerEvent<SVGSVGElement>, arrow: Arrow, handle: string) => {
    startInteraction(event)
    state.mode = 'endpoint'
    state.objectId = arrow.id
    state.handle = handle
    store.startHistory()
  }

  const startMarquee = (event: React.PointerEvent<SVGSVGElement>) => {
    startInteraction(event)
    state.mode = 'marquee'
    state.marqueeStart = { ...state.start }
    store.dispatch({ type: 'selection/setMarquee', bounds: null }, { history: false })
  }

  const endInteraction = () => {
    if (state.mode !== 'idle' && state.mode !== 'panning' && state.mode !== 'marquee') {
      store.commitHistory()
      onCommit?.()
    }
    state.mode = 'idle'
    state.pointerId = null
    state.objectId = undefined
    state.handle = undefined
    state.startObject = undefined
    state.startView = undefined
    state.marqueeStart = undefined
  }

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const { ui } = store.getState()
    const tool = ui.tool

    // Pan mode or space key
    if (event.button === 2 || keys.has(' ') || tool === 'pan') {
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

    // Handle UI handles (resize, rotate, endpoint, text-edit)
    if (handle && targetId) {
      const obj = scene.byId[targetId]
      if (!obj) return

      if ((obj.type === 'rectangle' || obj.type === 'ellipse') && handle.startsWith('resize')) {
        startResize(event, obj, handle)
        return
      }
      if ((obj.type === 'rectangle' || obj.type === 'ellipse') && handle === 'rotate') {
        startRotate(event, obj)
        return
      }
      if (obj.type === 'arrow' && handle.startsWith('endpoint')) {
        startEndpoint(event, obj, handle)
        return
      }
      if (obj.type === 'text' && handle === 'text-edit') {
        store.dispatch({ type: 'selection/setEditingText', id: targetId }, { history: false })
        return
      }
    }

    // Check if clicking on an existing object
    const canvasPoint = getCanvasPoint(event)
    const hitId = hitTestScene(canvasPoint, scene)

    // Delete tool
    if (tool === 'delete') {
      if (hitId) {
        const { selection } = store.getState()
        const idsToDelete = selection.ids.includes(hitId) ? selection.ids : [hitId]
        if (idsToDelete.length > 0) {
          store.dispatch({ type: 'objects/deleteMany', ids: idsToDelete })
        }
      }
      // No-op if no hit - do nothing
      return
    }

    // Text tool - place text object
    if (tool === 'text') {
      const textObj = {
        id: crypto.randomUUID(),
        type: 'text' as const,
        x: canvasPoint.x,
        y: canvasPoint.y,
        content: 'Text',
        rotation: 0,
        strokeColor: store.getState().defaults.strokeColor,
        fontSize: ui.textFontSize,
      }
      store.dispatch({ type: 'object/add', object: textObj })
      store.dispatch({ type: 'selection/setEditingText', id: textObj.id }, { history: false })
      // Single-shot: return to pointer
      store.dispatch({ type: 'tool/set', tool: 'pointer' })
      return
    }

    // Rectangle tool
    if (tool === 'rectangle') {
      const shape = {
        id: crypto.randomUUID(),
        type: 'rectangle' as const,
        x: canvasPoint.x - 60,
        y: canvasPoint.y - 40,
        width: 120,
        height: 80,
        rotation: 0,
        strokeColor: store.getState().defaults.strokeColor,
        strokeWidth: store.getState().defaults.strokeWidth,
        fillColor: store.getState().defaults.fillColor,
      }
      store.dispatch({ type: 'object/add', object: shape })
      // Single-shot: return to pointer
      store.dispatch({ type: 'tool/set', tool: 'pointer' })
      return
    }

    // Ellipse tool
    if (tool === 'ellipse') {
      const shape = {
        id: crypto.randomUUID(),
        type: 'ellipse' as const,
        x: canvasPoint.x - 55,
        y: canvasPoint.y - 55,
        width: 110,
        height: 110,
        rotation: 0,
        strokeColor: store.getState().defaults.strokeColor,
        strokeWidth: store.getState().defaults.strokeWidth,
        fillColor: store.getState().defaults.fillColor,
      }
      store.dispatch({ type: 'object/add', object: shape })
      // Single-shot: return to pointer
      store.dispatch({ type: 'tool/set', tool: 'pointer' })
      return
    }

    // Arrow tool
    if (tool === 'arrow') {
      const arrow = {
        id: crypto.randomUUID(),
        type: 'arrow' as const,
        start: { kind: 'free' as const, x: canvasPoint.x - 80, y: canvasPoint.y },
        end: { kind: 'free' as const, x: canvasPoint.x + 80, y: canvasPoint.y },
        strokeColor: store.getState().defaults.strokeColor,
        strokeWidth: store.getState().defaults.strokeWidth,
        arrowStyle: store.getState().defaults.arrowStyle,
      }
      store.dispatch({ type: 'object/add', object: arrow })
      // Single-shot: return to pointer
      store.dispatch({ type: 'tool/set', tool: 'pointer' })
      return
    }

    // Pointer tool - existing behavior
    if (tool === 'pointer') {
      if (hitId) {
        const obj = scene.byId[hitId]
        if (obj) {
          // Add to selection if Shift is held, otherwise replace
          const currentIds = store.getState().selection.ids
          const newIds = event.shiftKey 
            ? (currentIds.includes(hitId) ? currentIds.filter(id => id !== hitId) : [...currentIds, hitId])
            : [hitId]
          store.dispatch({ type: 'selection/setMany', ids: newIds }, { history: false })
          
          if (obj.type === 'rectangle' || obj.type === 'ellipse') {
            startDrag(event, obj)
            return
          }
          return
        }
      } else {
        // Start marquee selection
        startMarquee(event)
        return
      }
    }
  }

  const updateDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!state.objectId || !state.startObject) return
    const nextPoint = getCanvasPoint(event)
    const dx = nextPoint.x - state.start.x
    const dy = nextPoint.y - state.start.y

    // Handle batch move for multi-selection
    const { selection } = store.getState()
    if (selection.ids.length > 1 && selection.ids.includes(state.objectId)) {
      // Move all selected objects
      for (const id of selection.ids) {
        const startObj = selection.ids[0] === id ? state.startObject : store.getState().scene.byId[id]
        if (!startObj) continue
        
        if (startObj.type === 'arrow') {
          const arrowStart = startObj.start.kind === 'free' 
            ? { kind: 'free' as const, x: startObj.start.x + dx, y: startObj.start.y + dy }
            : startObj.start
          const arrowEnd = startObj.end.kind === 'free'
            ? { kind: 'free' as const, x: startObj.end.x + dx, y: startObj.end.y + dy }
            : startObj.end
          store.dispatch({ type: 'object/update', id, patch: { start: arrowStart, end: arrowEnd } }, { history: false })
          continue
        }
        
        if (startObj.type === 'text') {
          store.dispatch({ type: 'object/update', id, patch: { x: startObj.x + dx, y: startObj.y + dy } }, { history: false })
          continue
        }

        // Shape drag
        const node = { ...startObj, x: startObj.x + dx, y: startObj.y + dy } as Shape
        const { scene, snapping } = store.getState()
        const snappedNode = snapping.enabled
          ? applySnapToNode(node, getSnapTargets(scene, id))
          : node
        store.dispatch({ type: 'object/update', id, patch: { x: snappedNode.x, y: snappedNode.y } }, { history: false })
      }
      return
    }

    // Single object drag
    const startObj = state.startObject
    if (startObj.type === 'arrow') {
      // Arrow drag - update endpoints
      const arrowStart = startObj.start.kind === 'free' 
        ? { kind: 'free' as const, x: startObj.start.x + dx, y: startObj.start.y + dy }
        : startObj.start
      const arrowEnd = startObj.end.kind === 'free'
        ? { kind: 'free' as const, x: startObj.end.x + dx, y: startObj.end.y + dy }
        : startObj.end
      store.dispatch({ type: 'object/update', id: state.objectId!, patch: { start: arrowStart, end: arrowEnd } }, { history: false })
      return
    }
    
    if (startObj.type === 'text') {
      store.dispatch({ type: 'object/update', id: state.objectId!, patch: { x: startObj.x + dx, y: startObj.y + dy } }, { history: false })
      return
    }

    // Shape drag
    const node = { ...startObj, x: startObj.x + dx, y: startObj.y + dy } as Shape
    const { scene, snapping } = store.getState()
    const snappedNode = snapping.enabled
      ? applySnapToNode(node, getSnapTargets(scene, node.id))
      : node
    store.dispatch({ type: 'object/update', id: state.objectId!, patch: { x: snappedNode.x, y: snappedNode.y } }, { history: false })
  }

  const updateResize = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!state.objectId || !state.startObject || !state.handle) return
    if (state.startObject.type === 'arrow' || state.startObject.type === 'text') return
    
    const nextPoint = getCanvasPoint(event)
    const node = state.startObject as Shape
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
        type: 'object/update',
        id: state.objectId!,
        patch: { x: snapped.x, y: snapped.y, width: snapped.width, height: snapped.height },
      },
      { history: false },
    )
  }

  const updateRotate = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!state.objectId || !state.startObject) return
    if (state.startObject.type === 'arrow' || state.startObject.type === 'text') return
    
    const node = state.startObject as Shape
    const center = getNodeCenter(node)
    const nextPoint = getCanvasPoint(event)
    const angle = Math.atan2(nextPoint.y - center.y, nextPoint.x - center.x)
    store.dispatch({ type: 'object/update', id: state.objectId!, patch: { rotation: angle } }, { history: false })
  }

  const updatePan = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!state.startView) return
    const current = getCanvasPoint(event)
    const dx = (current.x - state.start.x) * store.getState().view.zoom
    const dy = (current.y - state.start.y) * store.getState().view.zoom
    store.dispatch({ type: 'view/pan', dx, dy }, { history: false })
  }

  const updateMarquee = (event: React.PointerEvent<SVGSVGElement>) => {
    if (state.mode !== 'marquee' || !state.marqueeStart) return
    const current = getCanvasPoint(event)
    const minX = Math.min(state.marqueeStart.x, current.x)
    const minY = Math.min(state.marqueeStart.y, current.y)
    const maxX = Math.max(state.marqueeStart.x, current.x)
    const maxY = Math.max(state.marqueeStart.y, current.y)
    
    const marquee: Bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
    
    store.dispatch({ type: 'selection/setMarquee', bounds: marquee }, { history: false })
  }

  const updateEndpoint = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!state.objectId || !state.handle) return
    const nextPoint = getCanvasPoint(event)
    const { scene, snapping } = store.getState()
    const targets = getSnapTargets(scene, state.objectId)
    const snapped = snapping.enabled ? applySnapToPoint(nextPoint, targets) : { point: nextPoint, snapped: false }
    let endpoint: ArrowEndpoint = { kind: 'free', x: snapped.point.x, y: snapped.point.y }

    // Check for anchor attachment
    for (const id of scene.order) {
      const obj = scene.byId[id]
      if (!obj || obj.type === 'arrow' || obj.type === 'text') continue
      const node = obj as Shape
      const anchor = getClosestAnchor(node, snapped.point)
      const anchorPoint = getAnchorPoint(node, anchor)
      const dist = distance(snapped.point, anchorPoint)
      if (dist < ENDPOINT_ATTACH_DISTANCE) {
        endpoint = { kind: 'attached', targetId: node.id, anchor }
        break
      }
    }

    const patch = state.handle === 'endpoint-start' ? { start: endpoint } : { end: endpoint }
    store.dispatch({ type: 'object/update', id: state.objectId!, patch }, { history: false })
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (state.pointerId !== event.pointerId) return
    state.last = getCanvasPoint(event)
    switch (state.mode) {
      case 'dragging':
        updateDrag(event)
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
      case 'marquee':
        updateMarquee(event)
        break
      default:
        break
    }
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (state.pointerId !== event.pointerId) return
    
    // Commit marquee selection
    if (state.mode === 'marquee') {
      const { scene, selection } = store.getState()
      if (selection.marquee) {
        const intersecting = getMarqueeIntersectingIds(scene, selection.marquee)
        if (intersecting.length > 0) {
          store.dispatch({ type: 'selection/setMany', ids: intersecting })
        } else {
          store.dispatch({ type: 'selection/setMany', ids: [] })
        }
      }
      store.dispatch({ type: 'selection/setMarquee', bounds: null }, { history: false })
    }
    
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
