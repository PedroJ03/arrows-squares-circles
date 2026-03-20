import type { CanvasAction, CanvasState, Scene } from '../model/types'
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

const createDefaultState = (): CanvasState => ({
  scene: { nodes: [], arrows: [] },
  view: { pan: { x: 0, y: 0 }, zoom: 1 },
  selection: { id: null },
  snapping: { enabled: true },
  defaults: {
    strokeColor: '#2b2d42',
    strokeWidth: 2,
    arrowStyle: 'straight',
  },
})

const updateScene = (scene: Scene, updater: (scene: Scene) => Scene): Scene => updater(scene)

const reducer = (state: CanvasState, action: CanvasAction): CanvasState => {
  switch (action.type) {
    case 'node/add':
      return {
        ...state,
        scene: updateScene(state.scene, (scene) => ({
          ...scene,
          nodes: [...scene.nodes, action.node],
        })),
        selection: { id: action.node.id },
      }
    case 'node/update':
      return {
        ...state,
        scene: updateScene(state.scene, (scene) => ({
          ...scene,
          nodes: scene.nodes.map((node) =>
            node.id === action.id ? { ...node, ...action.patch } : node,
          ),
        })),
      }
    case 'arrow/add':
      return {
        ...state,
        scene: updateScene(state.scene, (scene) => ({
          ...scene,
          arrows: [...scene.arrows, action.arrow],
        })),
        selection: { id: action.arrow.id },
      }
    case 'arrow/update':
      return {
        ...state,
        scene: updateScene(state.scene, (scene) => ({
          ...scene,
          arrows: scene.arrows.map((arrow) =>
            arrow.id === action.id ? { ...arrow, ...action.patch } : arrow,
          ),
        })),
      }
    case 'selection/set':
      return { ...state, selection: { id: action.id } }
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
