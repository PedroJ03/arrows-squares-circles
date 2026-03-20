import type { CanvasState } from '../model/types'

const STORAGE_KEY = 'ux-canvas-state'
const STORAGE_VERSION = 2

type StoredState = {
  version: number
  scene: CanvasState['scene']
  view: CanvasState['view']
  snapping: CanvasState['snapping']
  defaults: CanvasState['defaults']
}

export const saveCanvasState = (state: CanvasState) => {
  const payload: StoredState = {
    version: STORAGE_VERSION,
    scene: state.scene,
    view: state.view,
    snapping: state.snapping,
    defaults: state.defaults,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export const loadCanvasState = (): CanvasState | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as any
    const defaults = parsed.defaults ?? {
      strokeColor: '#2b2d42',
      strokeWidth: 2,
      arrowStyle: 'straight',
    }
    return {
      scene: parsed.scene,
      view: parsed.view,
      snapping: parsed.snapping,
      selection: { id: null },
      defaults,
    }
  } catch (error) {
    return null
  }
}
