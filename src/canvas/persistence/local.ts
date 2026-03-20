import type { CanvasState } from '../model/types'

const STORAGE_KEY = 'ux-canvas-state'
const STORAGE_VERSION = 1

type StoredState = {
  version: number
  scene: CanvasState['scene']
  view: CanvasState['view']
  snapping: CanvasState['snapping']
}

export const saveCanvasState = (state: CanvasState) => {
  const payload: StoredState = {
    version: STORAGE_VERSION,
    scene: state.scene,
    view: state.view,
    snapping: state.snapping,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export const loadCanvasState = (): CanvasState | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredState
    if (parsed.version !== STORAGE_VERSION) return null
    return {
      scene: parsed.scene,
      view: parsed.view,
      snapping: parsed.snapping,
      selection: { id: null },
    }
  } catch (error) {
    return null
  }
}
