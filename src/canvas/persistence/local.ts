import type { CanvasObject, CanvasState, Scene, Shape, StyleDefaults, StrokeWidth, TextFontSize, Tool } from '../model/types'

const STORAGE_KEY = 'ux-canvas-state'
const STORAGE_VERSION = 3

type StoredStateV1 = {
  version?: never
  scene: {
    nodes: Array<{
      id: string
      type: 'square' | 'circle'
      x: number
      y: number
      width: number
      height: number
      rotation: number
      strokeColor?: string
      strokeWidth?: number
    }>
    arrows: Array<{
      id: string
      type: 'arrow'
      start: { kind: 'free'; x: number; y: number } | { kind: 'attached'; targetId: string; anchor: string }
      end: { kind: 'free'; x: number; y: number } | { kind: 'attached'; targetId: string; anchor: string }
      strokeColor?: string
      strokeWidth?: number
      arrowStyle?: string
    }>
  }
  view: { pan: { x: number; y: number }; zoom: number }
  snapping: { enabled: boolean }
  defaults?: {
    strokeColor: string
    strokeWidth: number
    arrowStyle: string
  }
}

type StoredStateV2 = {
  version: 2
  scene: {
    nodes: Array<{
      id: string
      type: 'square' | 'circle'
      x: number
      y: number
      width: number
      height: number
      rotation: number
      strokeColor?: string
      strokeWidth?: number
    }>
    arrows: Array<{
      id: string
      type: 'arrow'
      start: { kind: 'free'; x: number; y: number } | { kind: 'attached'; targetId: string; anchor: string }
      end: { kind: 'free'; x: number; y: number } | { kind: 'attached'; targetId: string; anchor: string }
      strokeColor?: string
      strokeWidth?: number
      arrowStyle?: string
    }>
  }
  view: { pan: { x: number; y: number }; zoom: number }
  snapping: { enabled: boolean }
  defaults?: {
    strokeColor: string
    strokeWidth: number
    arrowStyle: string
  }
}

type StoredStateV3 = {
  version: 3
  scene: Scene
  view: { pan: { x: number; y: number }; zoom: number }
  snapping: { enabled: boolean }
  defaults: StyleDefaults
  ui?: { tool: string; textFontSize: TextFontSize }
}

const defaultDefaults: StyleDefaults = {
  strokeColor: '#2b2d42',
  strokeWidth: 2,
  arrowStyle: 'straight',
  fillColor: 'transparent',
  textFontSize: 24,
}

export const saveCanvasState = (state: CanvasState) => {
  const payload: StoredStateV3 = {
    version: STORAGE_VERSION,
    scene: state.scene,
    view: state.view,
    snapping: state.snapping,
    defaults: state.defaults,
    ui: state.ui,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

// Migrate v1/v2 to v3 normalized format
const migrateToV3 = (legacy: StoredStateV1 | StoredStateV2): StoredStateV3 => {
  const nodes = legacy.scene.nodes.map((node): Shape => ({
    id: node.id,
    type: node.type === 'square' ? 'rectangle' : 'ellipse',
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    strokeColor: node.strokeColor as StyleDefaults['strokeColor'],
    strokeWidth: node.strokeWidth as StrokeWidth,
    fillColor: 'transparent',
  }))
  
  const byId: Record<string, CanvasObject> = {}
  const order: string[] = []
  
  for (const node of nodes) {
    byId[node.id] = node
    order.push(node.id)
  }
  
  for (const arrow of legacy.scene.arrows) {
    byId[arrow.id] = arrow as CanvasObject
    order.push(arrow.id)
  }
  
  const migratedDefaults: StyleDefaults = legacy.defaults
    ? {
        strokeColor: legacy.defaults.strokeColor,
        strokeWidth: legacy.defaults.strokeWidth as StrokeWidth,
        arrowStyle: legacy.defaults.arrowStyle as StyleDefaults['arrowStyle'],
        fillColor: 'transparent',
        textFontSize: 24,
      }
    : defaultDefaults
  
  return {
    version: STORAGE_VERSION,
    scene: { byId, order },
    view: legacy.view,
    snapping: legacy.snapping,
    defaults: migratedDefaults,
  }
}

export const loadCanvasState = (): CanvasState | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredStateV1 | StoredStateV2 | StoredStateV3
    
    // Handle legacy versions (v1 or v2)
    if (!parsed.version || parsed.version < 3) {
      const migrated = migrateToV3(parsed as StoredStateV1 | StoredStateV2)
      return {
        scene: migrated.scene,
        view: migrated.view,
        snapping: migrated.snapping,
        selection: { ids: [], primaryId: null, marquee: null, editingTextId: null },
        defaults: migrated.defaults,
        ui: { tool: 'pointer', textFontSize: 24 },
        overlay: { floatingToolbar: { visible: false, anchorBounds: null }, guideLayer: { visible: false, guides: [] }, zoomControls: { visible: true }, minimap: { visible: true, width: 200, height: 150 } },
      }
    }
    
    // Handle v3
    const v3 = parsed as StoredStateV3
    return {
      scene: v3.scene,
      view: v3.view,
      snapping: v3.snapping,
      selection: { ids: [], primaryId: null, marquee: null, editingTextId: null },
      defaults: v3.defaults ?? defaultDefaults,
      ui: v3.ui ? { tool: v3.ui.tool as Tool, textFontSize: v3.ui.textFontSize } : { tool: 'pointer', textFontSize: 24 },
      overlay: { floatingToolbar: { visible: false, anchorBounds: null }, guideLayer: { visible: false, guides: [] }, zoomControls: { visible: true }, minimap: { visible: true, width: 200, height: 150 } },
    }
  } catch (error) {
    return null
  }
}
