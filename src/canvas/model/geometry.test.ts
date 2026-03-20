import { describe, expect, it } from 'vitest'
import type { Arrow, Node, Scene } from './types'
import { getNodeBounds, hitTestArrow, hitTestNode } from './geometry'

describe('geometry', () => {
  it('computes bounds for rotated nodes', () => {
    const node: Node = {
      id: 'n1',
      type: 'square',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: Math.PI / 2,
    }

    const bounds = getNodeBounds(node)

    expect(bounds.width).toBeCloseTo(50)
    expect(bounds.height).toBeCloseTo(100)
  })

  it('hit-tests squares and circles', () => {
    const square: Node = {
      id: 's1',
      type: 'square',
      x: 10,
      y: 20,
      width: 80,
      height: 40,
      rotation: 0,
    }
    const circle: Node = {
      id: 'c1',
      type: 'circle',
      x: 200,
      y: 200,
      width: 80,
      height: 80,
      rotation: 0,
    }

    expect(hitTestNode({ x: 20, y: 30 }, square)).toBe(true)
    expect(hitTestNode({ x: 95, y: 70 }, square)).toBe(false)

    expect(hitTestNode({ x: 240, y: 240 }, circle)).toBe(true)
    expect(hitTestNode({ x: 300, y: 300 }, circle)).toBe(false)
  })

  it('hit-tests arrow segments', () => {
    const arrow: Arrow = {
      id: 'a1',
      type: 'arrow',
      start: { kind: 'free', x: 0, y: 0 },
      end: { kind: 'free', x: 100, y: 0 },
    }
    const scene: Scene = { nodes: [], arrows: [arrow] }

    expect(hitTestArrow({ x: 50, y: 2 }, arrow, scene)).toBe(true)
    expect(hitTestArrow({ x: 50, y: 12 }, arrow, scene)).toBe(false)
  })
})
