export type ShapeId = string

export type Point = { x: number; y: number }

export type ViewState = {
  pan: Point
  zoom: number
}

// Shape type labels (renamed from square/circle)
export type ShapeType = 'rectangle' | 'ellipse'

export type StrokeWidth = 1 | 2 | 4 | 8
export type ArrowStyle = 'straight' | 'dashed' | 'elbow'
export type StrokeColor = string
export type FillColor = string
export type TextFontSize = 16 | 24 | 32 | 48

export type StyleDefaults = {
  strokeColor: StrokeColor
  strokeWidth: StrokeWidth
  arrowStyle: ArrowStyle
  fillColor: FillColor
  textFontSize: TextFontSize
}

// Base shape (rectangle/ellipse)
export type Shape = {
  id: ShapeId
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  strokeColor?: StrokeColor
  strokeWidth?: StrokeWidth
  fillColor?: FillColor
}

// Text object
export type TextObject = {
  id: ShapeId
  type: 'text'
  x: number
  y: number
  content: string
  rotation: number
  strokeColor?: StrokeColor
  fontSize?: TextFontSize
}

// Arrow endpoint
export type ArrowEndpoint =
  | { kind: 'free'; x: number; y: number }
  | { kind: 'attached'; targetId: ShapeId; anchor: Anchor }

// Arrow object
export type Arrow = {
  id: ShapeId
  type: 'arrow'
  start: ArrowEndpoint
  end: ArrowEndpoint
  strokeColor?: StrokeColor
  strokeWidth?: StrokeWidth
  arrowStyle?: ArrowStyle
}

// Union of all canvas objects
export type CanvasObject = Shape | Arrow | TextObject

// Normalized scene structure
export type Scene = {
  byId: Record<ShapeId, CanvasObject>
  order: ShapeId[]
}

// Set-based selection state
export type SelectionState = {
  ids: ShapeId[]
  primaryId: ShapeId | null
  marquee: Bounds | null
  editingTextId: ShapeId | null
}

// UI tool state
export type Tool = 'pointer' | 'pan' | 'rectangle' | 'ellipse' | 'arrow' | 'text' | 'delete'

export type UiState = {
  tool: Tool
  textFontSize: TextFontSize
}

// Snapping state
export type SnappingState = { enabled: boolean }

// Full canvas state
export type CanvasState = {
  scene: Scene
  view: ViewState
  selection: SelectionState
  ui: UiState
  snapping: SnappingState
  defaults: StyleDefaults
}

// Anchor positions
export type Anchor = 'n' | 's' | 'e' | 'w' | 'center'

// Bounds type
export type Bounds = { x: number; y: number; width: number; height: number }

// All canvas actions
export type CanvasAction =
  // Shape actions
  | { type: 'object/add'; object: CanvasObject }
  | { type: 'object/update'; id: ShapeId; patch: Partial<CanvasObject> }
  | { type: 'objects/updateMany'; ids: ShapeId[]; patch: Partial<CanvasObject> }
  | { type: 'objects/deleteMany'; ids: ShapeId[] }
  // Selection actions
  | { type: 'selection/set'; id: ShapeId | null }
  | { type: 'selection/setMany'; ids: ShapeId[] }
  | { type: 'selection/setMarquee'; bounds: Bounds | null }
  | { type: 'selection/setEditingText'; id: ShapeId | null }
  // View actions
  | { type: 'view/pan'; dx: number; dy: number }
  | { type: 'view/zoom'; scale: number; anchor: Point }
  // Snapping
  | { type: 'snapping/set'; enabled: boolean }
  // Scene
  | { type: 'scene/set'; scene: Scene }
  // Defaults
  | { type: 'defaults/set'; patch: Partial<StyleDefaults> }
  // UI
  | { type: 'tool/set'; tool: Tool }
  | { type: 'text/setPreset'; fontSize: TextFontSize }

// Legacy types for migration compatibility
export type NodeType = 'rectangle' | 'ellipse'
export type Node = Shape
