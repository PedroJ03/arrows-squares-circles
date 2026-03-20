import type { CanvasAction, CanvasObject, CanvasState, StyleDefaults } from '../model/types'
import {
  commitHistory,
  createHistory,
  pushHistory,
  redoHistory,
  startHistory,
  undoHistory,
} from '../history/history'

export type CanvasListener = () => void

export type CanvasStore = {
  getState: () => CanvasState
  setState: (state: CanvasState) => void
  dispatch: (action: CanvasAction, options?: { history?: boolean }) => void
  subscribe: (listener: CanvasListener) => () => void
  startHistory: () => void
  commitHistory: () => void
  undo: () => void
  redo: () => void
}

const defaultDefaults: StyleDefaults = {
  strokeColor: '#2b2d42',
  strokeWidth: 2,
  arrowStyle: 'straight',
  fillColor: 'transparent',
  textFontSize: 24,
}

const defaultOverlay = {
  floatingToolbar: { visible: false, anchorBounds: null },
  guideLayer: { visible: false, guides: [] },
  zoomControls: { visible: true },
  minimap: { visible: true, width: 200, height: 150 },
}

const createDefaultState = (): CanvasState => ({
  scene: { byId: {}, order: [] },
  view: { pan: { x: 0, y: 0 }, zoom: 1 },
  selection: { ids: [], primaryId: null, marquee: null, editingTextId: null },
  ui: { tool: 'pointer', textFontSize: 24 },
  snapping: { enabled: true },
  defaults: defaultDefaults,
  overlay: defaultOverlay,
})

const reducer = (state: CanvasState, action: CanvasAction): CanvasState => {
  switch (action.type) {
    case 'object/add':
      return {
        ...state,
        scene: {
          ...state.scene,
          byId: { ...state.scene.byId, [action.object.id]: action.object },
          order: [...state.scene.order, action.object.id],
        },
        selection: { 
          ...state.selection, 
          ids: state.ui.tool === 'pointer' ? state.selection.ids : [action.object.id],
          primaryId: action.object.id 
        },
      }
    case 'object/update': {
      const existing = state.scene.byId[action.id]
      if (!existing) return state
      return {
        ...state,
        scene: {
          ...state.scene,
          byId: { ...state.scene.byId, [action.id]: { ...existing, ...action.patch } as CanvasObject },
        },
      }
    }
    case 'objects/updateMany': {
      const newById = { ...state.scene.byId }
      for (const id of action.ids) {
        const existing = newById[id]
        if (existing) {
          newById[id] = { ...existing, ...action.patch } as CanvasObject
        }
      }
      return {
        ...state,
        scene: { ...state.scene, byId: newById },
      }
    }
    case 'objects/deleteMany': {
      const idsToDelete = new Set(action.ids)
      const newById = { ...state.scene.byId }
      for (const id of action.ids) {
        delete newById[id]
      }
      const newOrder = state.scene.order.filter((id) => !idsToDelete.has(id))
      return {
        ...state,
        scene: { byId: newById, order: newOrder },
        selection: { ids: [], primaryId: null, marquee: null, editingTextId: null },
      }
    }
    case 'selection/set':
      return { 
        ...state, 
        selection: { 
          ...state.selection, 
          ids: action.id ? [action.id] : [], 
          primaryId: action.id,
          marquee: null,
        } 
      }
    case 'selection/setMany':
      return { 
        ...state, 
        selection: { 
          ...state.selection, 
          ids: action.ids, 
          primaryId: action.ids[0] ?? null,
          marquee: null,
        } 
      }
    case 'selection/setMarquee':
      return { 
        ...state, 
        selection: { ...state.selection, marquee: action.bounds } 
      }
    case 'selection/setEditingText':
      return { 
        ...state, 
        selection: { ...state.selection, editingTextId: action.id } 
      }
    case 'view/pan':
      return {
        ...state,
        view: {
          ...state.view,
          pan: {
            x: state.view.pan.x + action.dx,
            y: state.view.pan.y + action.dy,
          },
        },
      }
    case 'view/zoom': {
      const nextZoom = Math.min(4, Math.max(0.25, state.view.zoom * action.scale))
      const zoomRatio = nextZoom / state.view.zoom
      const pan = {
        x: action.anchor.x - (action.anchor.x - state.view.pan.x) * zoomRatio,
        y: action.anchor.y - (action.anchor.y - state.view.pan.y) * zoomRatio,
      }
      return { ...state, view: { pan, zoom: nextZoom } }
    }
    case 'snapping/set':
      return { ...state, snapping: { enabled: action.enabled } }
    case 'scene/set':
      return { ...state, scene: action.scene }
    case 'defaults/set':
      return {
        ...state,
        defaults: { ...state.defaults, ...action.patch },
      }
    case 'tool/set':
      return {
        ...state,
        ui: { ...state.ui, tool: action.tool },
      }
    case 'text/setPreset':
      return {
        ...state,
        ui: { ...state.ui, textFontSize: action.fontSize },
        defaults: { ...state.defaults, textFontSize: action.fontSize },
      }
    case 'scene/reorder': {
      const { ids, direction } = action
      const idSet = new Set(ids)
      const others = state.scene.order.filter((id) => !idSet.has(id))
      let newOrder: string[]
      switch (direction) {
        case 'front': {
          // Maintain relative order of selected, place at end
          const selected = state.scene.order.filter((id) => idSet.has(id))
          newOrder = [...others, ...selected]
          break
        }
        case 'back': {
          // Maintain relative order of selected, place at start
          const selected = state.scene.order.filter((id) => idSet.has(id))
          newOrder = [...selected, ...others]
          break
        }
        case 'forward': {
          // For forward: move each selected to just after the next non-selected item above it
          const selected = state.scene.order.filter((id) => idSet.has(id))
          newOrder = []
          for (const id of state.scene.order) {
            if (idSet.has(id)) {
              // Find next non-selected item
              const idx = state.scene.order.indexOf(id)
              let inserted = false
              for (let i = idx + 1; i < state.scene.order.length; i++) {
                const next = state.scene.order[i]
                if (!idSet.has(next)) {
                  // Place selected right before this non-selected
                  if (!newOrder.includes(id)) newOrder.push(id)
                  if (!newOrder.includes(next)) newOrder.push(next)
                  inserted = true
                  break
                }
              }
              if (!inserted) {
                if (!newOrder.includes(id)) newOrder.push(id)
              }
            } else {
              if (!newOrder.includes(id)) newOrder.push(id)
            }
          }
          // Ensure all selected are included
          for (const selId of selected) {
            if (!newOrder.includes(selId)) newOrder.push(selId)
          }
          break
        }
        case 'backward': {
          // Place all non-selected first, then selected at back (maintaining relative order)
          const selected = state.scene.order.filter((id) => idSet.has(id))
          const others = state.scene.order.filter((id) => !idSet.has(id))
          newOrder = [...others, ...selected]
          break
        }
        default:
          return state
      }
      return { ...state, scene: { ...state.scene, order: newOrder } }
    }
    case 'view/setZoom': {
      const zoom = Math.min(4, Math.max(0.25, action.zoom))
      return { ...state, view: { ...state.view, zoom } }
    }
    case 'view/fit':
      return state // Handled by App level — returns new pan/zoom
    case 'overlay/setToolbar':
      return {
        ...state,
        overlay: {
          ...state.overlay,
          floatingToolbar: { visible: action.visible, anchorBounds: action.anchorBounds },
        },
      }
    case 'overlay/setGuideLayer':
      return {
        ...state,
        overlay: {
          ...state.overlay,
          guideLayer: {
            visible: action.visible,
            guides: action.guides ?? state.overlay.guideLayer.guides,
          },
        },
      }
    case 'overlay/setZoomControls':
      return {
        ...state,
        overlay: { ...state.overlay, zoomControls: { visible: action.visible } },
      }
    case 'overlay/setMinimap':
      return {
        ...state,
        overlay: { ...state.overlay, minimap: { ...state.overlay.minimap, visible: action.visible } },
      }
    default:
      return state
  }
}

export const createCanvasStore = (initialState?: CanvasState): CanvasStore => {
  let state = initialState ?? createDefaultState()
  const listeners = new Set<CanvasListener>()
  const history = createHistory()

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const setState = (next: CanvasState) => {
    state = next
    notify()
  }

  const dispatch = (action: CanvasAction, options?: { history?: boolean }) => {
    const nextState = reducer(state, action)
    if (options?.history !== false) {
      pushHistory(history, state)
    }
    state = nextState
    notify()
  }

  const subscribe = (listener: CanvasListener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const start = () => startHistory(history, state)
  const commit = () => commitHistory(history)

  const undo = () => {
    state = undoHistory(history, state)
    notify()
  }

  const redo = () => {
    state = redoHistory(history, state)
    notify()
  }

  return {
    getState: () => state,
    setState,
    dispatch,
    subscribe,
    startHistory: start,
    commitHistory: commit,
    undo,
    redo,
  }
}
