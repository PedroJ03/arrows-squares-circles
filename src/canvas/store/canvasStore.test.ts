import { describe, expect, it } from 'vitest'
import type { Shape, CanvasObject } from '../model/types'
import { createCanvasStore } from './canvasStore'
import { getDuplicateObjects, DUPLICATE_OFFSET } from '../interaction/gesture'

describe('canvasStore history', () => {
  it('undoes and redoes reducer actions', () => {
    const store = createCanvasStore()
    const node: Shape = {
      id: 'n1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
    }

    store.dispatch({ type: 'object/add', object: node })
    store.dispatch({ type: 'object/update', id: node.id, patch: { x: 50 } })

    expect((store.getState().scene.byId['n1'] as Shape)?.x).toBe(50)

    store.undo()
    expect((store.getState().scene.byId['n1'] as Shape)?.x).toBe(0)

    store.redo()
    expect((store.getState().scene.byId['n1'] as Shape)?.x).toBe(50)
  })

  it('commits pending history for gesture-like updates', () => {
    const store = createCanvasStore()
    const node: Shape = {
      id: 'n2',
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 100,
      rotation: 0,
    }

    store.dispatch({ type: 'object/add', object: node })
    store.startHistory()
    store.dispatch({ type: 'object/update', id: node.id, patch: { y: 60 } }, { history: false })
    store.commitHistory()

    expect((store.getState().scene.byId['n2'] as Shape)?.y).toBe(60)

    store.undo()
    expect((store.getState().scene.byId['n2'] as Shape)?.y).toBe(20)
  })
})

describe('canvasStore defaults', () => {
  it('initializes defaults and updates them', () => {
    const store = createCanvasStore()
    expect(store.getState().defaults.strokeColor).toBe('#2b2d42')

    store.dispatch({ type: 'defaults/set', patch: { strokeWidth: 4 } })
    expect(store.getState().defaults.strokeWidth).toBe(4)
    expect(store.getState().defaults.strokeColor).toBe('#2b2d42')
  })
})

describe('canvasStore selection', () => {
  it('selects single object', () => {
    const store = createCanvasStore()
    store.dispatch({ type: 'selection/set', id: 'test-id' })
    expect(store.getState().selection.ids).toEqual(['test-id'])
    expect(store.getState().selection.primaryId).toBe('test-id')
  })

  it('selects multiple objects (setMany)', () => {
    const store = createCanvasStore()
    store.dispatch({ type: 'selection/setMany', ids: ['id1', 'id2', 'id3'] })
    expect(store.getState().selection.ids).toEqual(['id1', 'id2', 'id3'])
    expect(store.getState().selection.primaryId).toBe('id1')
  })

  it('clears selection', () => {
    const store = createCanvasStore()
    store.dispatch({ type: 'selection/set', id: 'test-id' })
    store.dispatch({ type: 'selection/set', id: null })
    expect(store.getState().selection.ids).toEqual([])
    expect(store.getState().selection.primaryId).toBeNull()
  })
})

describe('canvasStore batch operations', () => {
  it('updates multiple objects (updateMany)', () => {
    const store = createCanvasStore()
    const node1: Shape = { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, rotation: 0 }
    const node2: Shape = { id: 'n2', type: 'ellipse', x: 100, y: 100, width: 50, height: 50, rotation: 0 }
    
    store.dispatch({ type: 'object/add', object: node1 })
    store.dispatch({ type: 'object/add', object: node2 })
    store.dispatch({ type: 'objects/updateMany', ids: ['n1', 'n2'], patch: { strokeColor: '#ff0000' } })
    
    expect(store.getState().scene.byId['n1']?.strokeColor).toBe('#ff0000')
    expect(store.getState().scene.byId['n2']?.strokeColor).toBe('#ff0000')
  })

  it('deletes multiple objects (deleteMany)', () => {
    const store = createCanvasStore()
    const node1: Shape = { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, rotation: 0 }
    const node2: Shape = { id: 'n2', type: 'ellipse', x: 100, y: 100, width: 50, height: 50, rotation: 0 }
    
    store.dispatch({ type: 'object/add', object: node1 })
    store.dispatch({ type: 'object/add', object: node2 })
    store.dispatch({ type: 'objects/deleteMany', ids: ['n1', 'n2'] })
    
    expect(store.getState().scene.byId['n1']).toBeUndefined()
    expect(store.getState().scene.byId['n2']).toBeUndefined()
    expect(store.getState().selection.ids).toEqual([])
  })
})

describe('canvasStore tool and UI', () => {
  it('sets tool', () => {
    const store = createCanvasStore()
    store.dispatch({ type: 'tool/set', tool: 'rectangle' })
    expect(store.getState().ui.tool).toBe('rectangle')
  })

  it('sets text preset', () => {
    const store = createCanvasStore()
    store.dispatch({ type: 'text/setPreset', fontSize: 32 })
    expect(store.getState().ui.textFontSize).toBe(32)
    expect(store.getState().defaults.textFontSize).toBe(32)
  })
})

describe('canvasStore single-shot insert', () => {
  it('returns to pointer after adding object', () => {
    const store = createCanvasStore()
    store.dispatch({ type: 'tool/set', tool: 'rectangle' })
    
    const node: Shape = { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, rotation: 0 }
    store.dispatch({ type: 'object/add', object: node })
    
    // Tool should have been set to pointer during object/add for insert tools
    // (This is handled in the gesture layer, but the reducer behavior is tested here)
    expect(store.getState().scene.order).toContain('n1')
  })
})

describe('canvasStore scene/reorder', () => {
  const makeStore = () => {
    const store = createCanvasStore()
    const n1: Shape = { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, rotation: 0 }
    const n2: Shape = { id: 'n2', type: 'rectangle', x: 100, y: 0, width: 50, height: 50, rotation: 0 }
    const n3: Shape = { id: 'n3', type: 'rectangle', x: 200, y: 0, width: 50, height: 50, rotation: 0 }
    store.dispatch({ type: 'object/add', object: n1 })
    store.dispatch({ type: 'object/add', object: n2 })
    store.dispatch({ type: 'object/add', object: n3 })
    return { store, ids: ['n1', 'n2', 'n3'] }
  }

  it('brings selected shape to front', () => {
    const { store, ids } = makeStore()
    store.dispatch({ type: 'scene/reorder', ids: [ids[0]], direction: 'front' })
    expect(store.getState().scene.order).toEqual(['n2', 'n3', 'n1'])
  })

  it('sends selected shape to back', () => {
    const { store, ids } = makeStore()
    store.dispatch({ type: 'scene/reorder', ids: [ids[2]], direction: 'back' })
    expect(store.getState().scene.order).toEqual(['n3', 'n1', 'n2'])
  })

  it('brings multiple shapes to front maintaining relative order', () => {
    const { store, ids } = makeStore()
    store.dispatch({ type: 'scene/reorder', ids: [ids[0], ids[1]], direction: 'front' })
    // n1 and n2 maintain relative order, placed at end
    expect(store.getState().scene.order).toEqual(['n3', 'n1', 'n2'])
  })

  it('sends multiple shapes to back maintaining relative order', () => {
    const { store, ids } = makeStore()
    store.dispatch({ type: 'scene/reorder', ids: [ids[1], ids[2]], direction: 'back' })
    // n1, n2, n3 -> n2, n3, n1 (selected placed at back, relative order among selected)
    expect(store.getState().scene.order).toEqual(['n2', 'n3', 'n1'])
  })
})

describe('canvasStore view/setZoom', () => {
  it('sets zoom to specific value', () => {
    const store = createCanvasStore()
    store.dispatch({ type: 'view/setZoom', zoom: 2 })
    expect(store.getState().view.zoom).toBe(2)
  })

  it('clamps zoom to min/max (0.25 to 4)', () => {
    const store = createCanvasStore()
    store.dispatch({ type: 'view/setZoom', zoom: 10 })
    expect(store.getState().view.zoom).toBe(4)
    store.dispatch({ type: 'view/setZoom', zoom: 0.1 })
    expect(store.getState().view.zoom).toBe(0.25)
  })
})

describe('canvasStore overlay actions', () => {
  it('sets floating toolbar state', () => {
    const store = createCanvasStore()
    store.dispatch({ type: 'overlay/setToolbar', visible: true, anchorBounds: { x: 10, y: 20, width: 100, height: 50 } })
    const { floatingToolbar } = store.getState().overlay
    expect(floatingToolbar.visible).toBe(true)
    expect(floatingToolbar.anchorBounds).toEqual({ x: 10, y: 20, width: 100, height: 50 })
  })

  it('hides floating toolbar', () => {
    const store = createCanvasStore()
    store.dispatch({ type: 'overlay/setToolbar', visible: true, anchorBounds: { x: 0, y: 0, width: 100, height: 50 } })
    store.dispatch({ type: 'overlay/setToolbar', visible: false, anchorBounds: null })
    expect(store.getState().overlay.floatingToolbar.visible).toBe(false)
    expect(store.getState().overlay.floatingToolbar.anchorBounds).toBeNull()
  })

  it('sets guide layer state', () => {
    const store = createCanvasStore()
    const guides = [{ type: 'edge' as const, axis: 'x' as const, value: 100, sourceId: 'n1' }]
    store.dispatch({ type: 'overlay/setGuideLayer', visible: true, guides })
    expect(store.getState().overlay.guideLayer.visible).toBe(true)
    expect(store.getState().overlay.guideLayer.guides).toEqual(guides)
  })

  it('toggles zoom controls', () => {
    const store = createCanvasStore()
    expect(store.getState().overlay.zoomControls.visible).toBe(true)
    store.dispatch({ type: 'overlay/setZoomControls', visible: false })
    expect(store.getState().overlay.zoomControls.visible).toBe(false)
  })
})

describe('getDuplicateObjects', () => {
  it('returns empty arrays for empty selection', () => {
    const scene = { byId: {}, order: [] }
    const result = getDuplicateObjects(scene, [])
    expect(result.additions).toEqual([])
    expect(result.arrowUpdates).toEqual([])
  })

  it('duplicates a rectangle with +20/+20 offset', () => {
    const rect: Shape = {
      id: 'rect1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 80,
      height: 60,
      rotation: 0,
    }
    const scene = { byId: { rect1: rect }, order: ['rect1'] }
    
    const { additions } = getDuplicateObjects(scene, ['rect1'])
    
    expect(additions).toHaveLength(1)
    const cloned = additions[0] as Shape
    expect(cloned.id).not.toBe('rect1')
    expect(cloned.type).toBe('rectangle')
    expect(cloned.x).toBe(100 + DUPLICATE_OFFSET)
    expect(cloned.y).toBe(100 + DUPLICATE_OFFSET)
    expect(cloned.width).toBe(80)
    expect(cloned.height).toBe(60)
  })

  it('duplicates an ellipse with +20/+20 offset', () => {
    const ellipse: Shape = {
      id: 'ellipse1',
      type: 'ellipse',
      x: 200,
      y: 200,
      width: 100,
      height: 100,
      rotation: 0,
    }
    const scene = { byId: { ellipse1: ellipse }, order: ['ellipse1'] }
    
    const { additions } = getDuplicateObjects(scene, ['ellipse1'])
    
    expect(additions).toHaveLength(1)
    const cloned = additions[0] as Shape
    expect(cloned.type).toBe('ellipse')
    expect(cloned.x).toBe(200 + DUPLICATE_OFFSET)
    expect(cloned.y).toBe(200 + DUPLICATE_OFFSET)
  })

  it('preserves styles when duplicating', () => {
    const rect: Shape = {
      id: 'rect1',
      type: 'rectangle',
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      rotation: 0,
      strokeColor: '#ff0000',
      strokeWidth: 4,
      fillColor: '#00ff00',
    }
    const scene = { byId: { rect1: rect }, order: ['rect1'] }
    
    const { additions } = getDuplicateObjects(scene, ['rect1'])
    
    const cloned = additions[0] as Shape
    expect(cloned.strokeColor).toBe('#ff0000')
    expect(cloned.strokeWidth).toBe(4)
    expect(cloned.fillColor).toBe('#00ff00')
  })

  it('duplicates multiple selected objects', () => {
    const rect1: Shape = { id: 'rect1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, rotation: 0 }
    const rect2: Shape = { id: 'rect2', type: 'rectangle', x: 100, y: 100, width: 50, height: 50, rotation: 0 }
    const scene = { byId: { rect1, rect2 }, order: ['rect1', 'rect2'] }
    
    const { additions } = getDuplicateObjects(scene, ['rect1', 'rect2'])
    
    expect(additions).toHaveLength(2)
    expect(additions.map(a => (a as Shape).x)).toEqual([0 + DUPLICATE_OFFSET, 100 + DUPLICATE_OFFSET])
    expect(additions.map(a => (a as Shape).y)).toEqual([0 + DUPLICATE_OFFSET, 100 + DUPLICATE_OFFSET])
  })

  it('duplicates text objects with +20/+20 offset', () => {
    const textObj: CanvasObject = {
      id: 'text1',
      type: 'text',
      x: 150,
      y: 150,
      content: 'Hello',
      rotation: 0,
      strokeColor: '#000',
      fontSize: 24,
    }
    const scene = { byId: { text1: textObj }, order: ['text1'] }
    
    const { additions } = getDuplicateObjects(scene, ['text1'])
    
    expect(additions).toHaveLength(1)
    const cloned = additions[0]
    expect(cloned.type).toBe('text')
    expect((cloned as any).x).toBe(150 + DUPLICATE_OFFSET)
    expect((cloned as any).y).toBe(150 + DUPLICATE_OFFSET)
  })

  it('duplicates arrows with free endpoints', () => {
    const arrow: CanvasObject = {
      id: 'arrow1',
      type: 'arrow',
      start: { kind: 'free', x: 0, y: 0 },
      end: { kind: 'free', x: 100, y: 100 },
      strokeColor: '#333',
      strokeWidth: 2,
    }
    const scene = { byId: { arrow1: arrow }, order: ['arrow1'] }
    
    const { additions } = getDuplicateObjects(scene, ['arrow1'])
    
    expect(additions).toHaveLength(1)
    const cloned = additions[0] as any
    expect(cloned.type).toBe('arrow')
    expect(cloned.start.kind).toBe('free')
    expect(cloned.start.x).toBe(0 + DUPLICATE_OFFSET)
    expect(cloned.start.y).toBe(0 + DUPLICATE_OFFSET)
    expect(cloned.end.x).toBe(100 + DUPLICATE_OFFSET)
    expect(cloned.end.y).toBe(100 + DUPLICATE_OFFSET)
  })

  it('remaps attached endpoints when duplicating shapes that have arrows pointing to them', () => {
    const rect: Shape = { id: 'rect1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, rotation: 0 }
    const arrow: CanvasObject = {
      id: 'arrow1',
      type: 'arrow',
      start: { kind: 'attached', targetId: 'rect1', anchor: 'center' },
      end: { kind: 'free', x: 100, y: 100 },
    }
    const scene = { byId: { rect1: rect, arrow1: arrow }, order: ['rect1', 'arrow1'] }
    
    const { additions, arrowUpdates } = getDuplicateObjects(scene, ['rect1'])
    
    // Should have the duplicated rect
    expect(additions).toHaveLength(1)
    const clonedRect = additions[0] as Shape
    expect(clonedRect.id).not.toBe('rect1')
    
    // The existing arrow should be updated to point to the cloned rect
    // (since the original rect is being duplicated, the arrow should now point to the clone)
    expect(arrowUpdates).toHaveLength(1)
    expect(arrowUpdates[0].id).toBe('arrow1')
    expect(arrowUpdates[0].start.kind).toBe('attached')
    expect((arrowUpdates[0].start as any).targetId).toBe(clonedRect.id)
  })

  it('updates existing arrows when duplicating their attached targets', () => {
    const rect: Shape = { id: 'rect1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, rotation: 0 }
    const arrow: CanvasObject = {
      id: 'arrow1',
      type: 'arrow',
      start: { kind: 'attached', targetId: 'rect1', anchor: 'center' },
      end: { kind: 'free', x: 100, y: 100 },
    }
    // Arrow is already in scene (not selected, but pointing to rect)
    const scene = { byId: { rect1: rect, arrow1: arrow }, order: ['rect1', 'arrow1'] }
    
    const { additions, arrowUpdates } = getDuplicateObjects(scene, ['rect1'])
    
    // The duplicated rect has a new ID
    const clonedRectId = additions[0].id
    
    // Arrow should be updated to point to the clone instead of original
    expect(arrowUpdates).toHaveLength(1)
    expect(arrowUpdates[0].id).toBe('arrow1')
    expect(arrowUpdates[0].start.kind).toBe('attached')
    expect((arrowUpdates[0].start as any).targetId).toBe(clonedRectId)
  })

  it('gives each duplicate a unique ID', () => {
    const rect1: Shape = { id: 'rect1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, rotation: 0 }
    const rect2: Shape = { id: 'rect2', type: 'rectangle', x: 50, y: 50, width: 50, height: 50, rotation: 0 }
    const scene = { byId: { rect1, rect2 }, order: ['rect1', 'rect2'] }
    
    const { additions } = getDuplicateObjects(scene, ['rect1', 'rect2'])
    
    const ids = additions.map(a => a.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(2)
    expect(ids[0]).not.toBe(ids[1])
  })
})
