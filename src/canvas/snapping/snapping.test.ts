import { describe, expect, it } from 'vitest'
import type { Node, Scene } from '../model/types'
import { applySnapToNode, applySnapToPoint, getSnapTargets } from './snapping'

describe('snapping', () => {
  it('snaps a moving node to nearby targets', () => {
    const anchorNode: Node = {
      id: 'anchor',
      type: 'square',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
    }
    const movingNode: Node = {
      id: 'moving',
      type: 'square',
      x: 97,
      y: 98,
      width: 50,
      height: 50,
      rotation: 0,
    }
    const scene: Scene = { nodes: [anchorNode, movingNode], arrows: [] }

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
})
