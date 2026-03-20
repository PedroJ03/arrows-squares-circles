export type ShapeId = string

export type Point = { x: number; y: number }

export type ViewState = {
  pan: Point
  zoom: number
}

export type NodeType = 'square' | 'circle'

export type StrokeWidth = 1 | 2 | 4 | 8
export type ArrowStyle = 'straight' | 'dashed' | 'elbow'
export type StrokeColor = string

export type StyleDefaults = {
  strokeColor: StrokeColor
  strokeWidth: StrokeWidth
  arrowStyle: ArrowStyle
}

export type Node = {
  id: ShapeId
  type: NodeType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  strokeColor?: StrokeColor
  strokeWidth?: StrokeWidth
}

export type ArrowEndpoint =
  | { kind: 'free'; x: number; y: number }
  | { kind: 'attached'; targetId: ShapeId; anchor: Anchor }

export type Arrow = {
  id: ShapeId
  type: 'arrow'
  start: ArrowEndpoint
  end: ArrowEndpoint
  strokeColor?: StrokeColor
  strokeWidth?: StrokeWidth
  arrowStyle?: ArrowStyle
}

export type Scene = { nodes: Node[]; arrows: Arrow[] }

export type SelectionState = { id: ShapeId | null }

export type SnappingState = { enabled: boolean }

export type CanvasState = {
  scene: Scene
  view: ViewState
  selection: SelectionState
  snapping: SnappingState
  defaults: StyleDefaults
}

export type Anchor = 'n' | 's' | 'e' | 'w' | 'center'

export type CanvasAction =
  | { type: 'node/add'; node: Node }
  | { type: 'node/update'; id: ShapeId; patch: Partial<Node> }
  | { type: 'arrow/add'; arrow: Arrow }
  | { type: 'arrow/update'; id: ShapeId; patch: Partial<Arrow> }
  | { type: 'selection/set'; id: ShapeId | null }
  | { type: 'view/pan'; dx: number; dy: number }
  | { type: 'view/zoom'; scale: number; anchor: Point }
  | { type: 'snapping/set'; enabled: boolean }
  | { type: 'scene/set'; scene: Scene }
  | { type: 'defaults/set'; patch: Partial<StyleDefaults> }
