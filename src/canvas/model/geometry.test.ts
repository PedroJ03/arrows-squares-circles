import { describe, expect, it } from 'vitest'
import type { Arrow, Shape, Scene } from './types'
import { 
  getNodeBounds, 
  hitTestArrow, 
  hitTestNode, 
  boundsIntersect, 
  getMarqueeIntersectingIds,
  getRotateHandlePoint,
  getArrowBounds,
  getSceneBounds,
  fitViewToContent,
  ROTATE_HANDLE_GAP,
} from './geometry'

describe('geometry', () => {
  it('computes bounds for rotated nodes', () => {
    const node: Shape = {
      id: 'n1',
      type: 'rectangle',
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

  it('hit-tests rectangles and ellipses', () => {
    const rectangle: Shape = {
      id: 's1',
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 80,
      height: 40,
      rotation: 0,
    }
    const ellipse: Shape = {
      id: 'c1',
      type: 'ellipse',
      x: 200,
      y: 200,
      width: 80,
      height: 80,
      rotation: 0,
    }

    expect(hitTestNode({ x: 20, y: 30 }, rectangle)).toBe(true)
    expect(hitTestNode({ x: 95, y: 70 }, rectangle)).toBe(false)

    expect(hitTestNode({ x: 240, y: 240 }, ellipse)).toBe(true)
    expect(hitTestNode({ x: 300, y: 300 }, ellipse)).toBe(false)
  })

  it('hit-tests arrow segments', () => {
    const arrow: Arrow = {
      id: 'a1',
      type: 'arrow',
      start: { kind: 'free', x: 0, y: 0 },
      end: { kind: 'free', x: 100, y: 0 },
    }
    const scene: Scene = { byId: { a1: arrow }, order: ['a1'] }

    expect(hitTestArrow({ x: 50, y: 2 }, arrow, scene)).toBe(true)
    expect(hitTestArrow({ x: 50, y: 12 }, arrow, scene)).toBe(false)
  })

  it('computes elbow paths and hit-tests them', () => {
    const arrow: Arrow = {
      id: 'a1',
      type: 'arrow',
      start: { kind: 'free', x: 0, y: 0 },
      end: { kind: 'free', x: 100, y: 100 },
      arrowStyle: 'elbow',
    }
    const scene: Scene = { byId: { a1: arrow }, order: ['a1'] }

    // Path should be (0,0) -> (100, 0) -> (100, 100) based on current implementation
    expect(hitTestArrow({ x: 50, y: 0 }, arrow, scene)).toBe(true)
    expect(hitTestArrow({ x: 100, y: 50 }, arrow, scene)).toBe(true)
    expect(hitTestArrow({ x: 50, y: 50 }, arrow, scene)).toBe(false)
  })
})

describe('boundsIntersect', () => {
  it('detects intersecting bounds', () => {
    const a = { x: 0, y: 0, width: 50, height: 50 }
    const b = { x: 40, y: 40, width: 50, height: 50 }
    expect(boundsIntersect(a, b)).toBe(true)
  })

  it('detects non-intersecting bounds', () => {
    const a = { x: 0, y: 0, width: 50, height: 50 }
    const b = { x: 100, y: 100, width: 50, height: 50 }
    expect(boundsIntersect(a, b)).toBe(false)
  })

  it('detects partial overlap', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 }
    const b = { x: 50, y: 50, width: 100, height: 100 }
    expect(boundsIntersect(a, b)).toBe(true)
  })

  it('handles contained bounds', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 }
    const b = { x: 25, y: 25, width: 50, height: 50 }
    expect(boundsIntersect(a, b)).toBe(true)
  })
})

describe('getMarqueeIntersectingIds', () => {
  it('returns empty array when no objects intersect', () => {
    const scene: Scene = {
      byId: {
        n1: { id: 'n1', type: 'rectangle', x: 500, y: 500, width: 100, height: 100, rotation: 0 },
      },
      order: ['n1'],
    }
    const marquee = { x: 0, y: 0, width: 50, height: 50 }
    expect(getMarqueeIntersectingIds(scene, marquee)).toEqual([])
  })

  it('returns intersecting ids', () => {
    const scene: Scene = {
      byId: {
        n1: { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100, rotation: 0 },
        n2: { id: 'n2', type: 'ellipse', x: 200, y: 200, width: 100, height: 100, rotation: 0 },
      },
      order: ['n1', 'n2'],
    }
    const marquee = { x: 50, y: 50, width: 100, height: 100 }
    const result = getMarqueeIntersectingIds(scene, marquee)
    expect(result).toContain('n1')
    expect(result).not.toContain('n2')
  })

  it('handles full overlap selection', () => {
    const scene: Scene = {
      byId: {
        n1: { id: 'n1', type: 'rectangle', x: 10, y: 10, width: 80, height: 80, rotation: 0 },
        n2: { id: 'n2', type: 'rectangle', x: 100, y: 100, width: 80, height: 80, rotation: 0 },
      },
      order: ['n1', 'n2'],
    }
    const marquee = { x: 0, y: 0, width: 500, height: 500 }
    const result = getMarqueeIntersectingIds(scene, marquee)
    expect(result).toContain('n1')
    expect(result).toContain('n2')
  })
})

describe('getRotateHandlePoint', () => {
  it('computes handle above shape at zero rotation', () => {
    const node: Shape = { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 100, height: 50, rotation: 0 }
    const handle = getRotateHandlePoint(node)
    
    // Top center is at (50, 0), should be extended upward by ROTATE_HANDLE_GAP
    expect(handle.x).toBeCloseTo(50)
    expect(handle.y).toBeCloseTo(-ROTATE_HANDLE_GAP)
  })

  it('computes handle for rotated shape', () => {
    const node: Shape = { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 100, height: 50, rotation: Math.PI / 2 }
    const handle = getRotateHandlePoint(node)
    const center = { x: 50, y: 25 }
    
    // After 90 degree rotation, the top edge becomes the right edge
    // Handle should be to the right of the shape
    expect(handle.x).toBeGreaterThan(center.x)
  })
})

describe('getArrowBounds', () => {
  it('computes bounds for straight arrow', () => {
    const arrow: Arrow = {
      id: 'a1',
      type: 'arrow',
      start: { kind: 'free', x: 0, y: 0 },
      end: { kind: 'free', x: 100, y: 50 },
    }
    const scene: Scene = { byId: { a1: arrow }, order: ['a1'] }
    const bounds = getArrowBounds(arrow, scene)
    
    expect(bounds.x).toBe(0)
    expect(bounds.y).toBe(0)
    expect(bounds.width).toBe(100)
    expect(bounds.height).toBe(50)
  })

  it('computes bounds for elbow arrow', () => {
    const arrow: Arrow = {
      id: 'a1',
      type: 'arrow',
      start: { kind: 'free', x: 0, y: 0 },
      end: { kind: 'free', x: 100, y: 100 },
      arrowStyle: 'elbow',
    }
    const scene: Scene = { byId: { a1: arrow }, order: ['a1'] }
    const bounds = getArrowBounds(arrow, scene)
    
    // Elbow goes (0,0) -> (100,0) -> (100,100)
    expect(bounds.x).toBe(0)
    expect(bounds.y).toBe(0)
    expect(bounds.width).toBe(100)
    expect(bounds.height).toBe(100)
  })
})

describe('getSceneBounds', () => {
  it('returns null for empty scene', () => {
    const scene: Scene = { byId: {}, order: [] }
    expect(getSceneBounds(scene)).toBeNull()
  })

  it('returns bounds for single shape', () => {
    const scene: Scene = {
      byId: { n1: { id: 'n1', type: 'rectangle', x: 10, y: 20, width: 80, height: 40, rotation: 0 } },
      order: ['n1'],
    }
    const bounds = getSceneBounds(scene)
    expect(bounds).toEqual({ x: 10, y: 20, width: 80, height: 40 })
  })

  it('returns combined bounds for multiple shapes', () => {
    const scene: Scene = {
      byId: {
        n1: { id: 'n1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, rotation: 0 },
        n2: { id: 'n2', type: 'rectangle', x: 100, y: 200, width: 30, height: 20, rotation: 0 },
      },
      order: ['n1', 'n2'],
    }
    const bounds = getSceneBounds(scene)
    expect(bounds?.x).toBe(0)
    expect(bounds?.y).toBe(0)
    expect(bounds?.width).toBe(130)
    expect(bounds?.height).toBe(220)
  })
})

describe('fitViewToContent', () => {
  it('computes zoom/pan to fit content in viewport', () => {
    const bounds = { x: 0, y: 0, width: 800, height: 600 }
    const result = fitViewToContent(bounds, 800, 600, 40)
    // Zoom fits content with padding, not 1:1
    expect(result.zoom).toBeGreaterThan(0)
    expect(result.zoom).toBeLessThan(1)
    // Pan should center with padding
    expect(result.pan.x).toBeGreaterThan(0)
    expect(result.pan.y).toBeGreaterThan(0)
  })

  it('scales down when content is larger than viewport', () => {
    const bounds = { x: 0, y: 0, width: 1600, height: 1200 }
    const result = fitViewToContent(bounds, 800, 600, 40)
    expect(result.zoom).toBeLessThan(1)
    expect(result.zoom).toBeGreaterThan(0)
  })

  it('respects max zoom cap of 4', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 }
    const result = fitViewToContent(bounds, 800, 600, 40)
    expect(result.zoom).toBeLessThanOrEqual(4)
  })
})
