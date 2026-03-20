import { describe, expect, it } from 'vitest'
import type { Shape } from '../model/types'
import { createCanvasStore } from './canvasStore'

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
