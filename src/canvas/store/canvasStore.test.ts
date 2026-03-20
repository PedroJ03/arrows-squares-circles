import { describe, expect, it } from 'vitest'
import type { Node } from '../model/types'
import { createCanvasStore } from './canvasStore'

describe('canvasStore history', () => {
  it('undoes and redoes reducer actions', () => {
    const store = createCanvasStore()
    const node: Node = {
      id: 'n1',
      type: 'square',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
    }

    store.dispatch({ type: 'node/add', node })
    store.dispatch({ type: 'node/update', id: node.id, patch: { x: 50 } })

    expect(store.getState().scene.nodes[0].x).toBe(50)

    store.undo()
    expect(store.getState().scene.nodes[0].x).toBe(0)

    store.redo()
    expect(store.getState().scene.nodes[0].x).toBe(50)
  })

  it('commits pending history for gesture-like updates', () => {
    const store = createCanvasStore()
    const node: Node = {
      id: 'n2',
      type: 'square',
      x: 10,
      y: 20,
      width: 100,
      height: 100,
      rotation: 0,
    }

    store.dispatch({ type: 'node/add', node })
    store.startHistory()
    store.dispatch({ type: 'node/update', id: node.id, patch: { y: 60 } }, { history: false })
    store.commitHistory()

    expect(store.getState().scene.nodes[0].y).toBe(60)

    store.undo()
    expect(store.getState().scene.nodes[0].y).toBe(20)
  })
})
