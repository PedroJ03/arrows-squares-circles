import { describe, expect, it } from 'vitest'
import type { Shape, Scene } from '../model/types'
import { applySnapToNode, applySnapToPoint, getSnapTargets } from './snapping'

describe('snapping', () => {
  it('snaps a moving node to nearby targets', () => {
    const anchorNode: Shape = {
      id: 'anchor',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
    }
    const movingNode: Shape = {
      id: 'moving',
      type: 'rectangle',
      x: 97,
      y: 98,
      width: 50,
      height: 50,
      rotation: 0,
    }
    const scene: Scene = {
      byId: { anchor: anchorNode, moving: movingNode },
      order: ['anchor', 'moving'],
    }

    const targets = getSnapTargets(scene, movingNode.id)
    const snapped = applySnapToNode(movingNode, targets)

    expect(snapped.x).toBe(100)
    expect(snapped.y).toBe(100)
  })

  it('snaps points when close to a target', () => {
    const targets = [{ x: 100, y: 100 }]
    const result = applySnapToPoint({ x: 96, y: 104 }, targets)

    expect(result.snapped).toBe(true)
    expect(result.point).toEqual({ x: 100, y: 100 })
  })

  it('extracts snap points from shapes', () => {
    const scene: Scene = {
      byId: {
        n1: { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100, rotation: 0 },
      },
      order: ['n1'],
    }
    const targets = getSnapTargets(scene, 'n2')
    // Should include x=0, x=50, x=100 and y=0, y=50, y=100
    expect(targets.length).toBe(9)
  })

  it('excludes the current node', () => {
    const scene: Scene = {
      byId: {
        n1: { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100, rotation: 0 },
      },
      order: ['n1'],
    }
    const targets = getSnapTargets(scene, 'n1')
    // Should be empty since n1 is excluded
    expect(targets.length).toBe(0)
  })

  it('ignores arrows and text objects', () => {
    const scene: Scene = {
      byId: {
        n1: { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100, rotation: 0 },
        a1: { id: 'a1', type: 'arrow', start: { kind: 'free', x: 0, y: 0 }, end: { kind: 'free', x: 100, y: 100 } },
        t1: { id: 't1', type: 'text', x: 50, y: 50, content: 'Hello', rotation: 0 },
      },
      order: ['n1', 'a1', 't1'],
    }
    const targets = getSnapTargets(scene)
    // Only the rectangle should contribute snap points
    expect(targets.length).toBe(9)
  })
})
