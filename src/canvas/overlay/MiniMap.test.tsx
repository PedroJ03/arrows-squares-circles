import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { act } from 'react'
import { MiniMap } from './MiniMap'
import { createCanvasStore } from '../store/canvasStore'
import type { Shape } from '../model/types'

// Mock the useCanvasState hook
vi.mock('../../App', () => ({
  useCanvasState: (store: any) => store.getState(),
}))

const createMockContainerRef = () => {
  return { current: null } as React.RefObject<HTMLDivElement | null>
}

describe('MiniMap', () => {
  let store: ReturnType<typeof createCanvasStore>

  beforeEach(() => {
    store = createCanvasStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders without crashing when scene is empty', () => {
    // Ensure minimap is visible
    store.dispatch({ type: 'overlay/setMinimap', visible: true })

    const containerRef = createMockContainerRef()
    
    // Should not throw
    expect(() => {
      render(<MiniMap store={store} containerRef={containerRef} />)
    }).not.toThrow()
  })

  it('renders without crashing when scene has shapes', () => {
    // Ensure minimap is visible
    store.dispatch({ type: 'overlay/setMinimap', visible: true })

    // Add some shapes to the scene
    const rect1: Shape = {
      id: 'rect1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 80,
      height: 60,
      rotation: 0,
    }
    const rect2: Shape = {
      id: 'rect2',
      type: 'rectangle',
      x: 200,
      y: 200,
      width: 100,
      height: 80,
      rotation: 0,
    }
    const ellipse: Shape = {
      id: 'ellipse1',
      type: 'ellipse',
      x: 300,
      y: 150,
      width: 70,
      height: 70,
      rotation: 0,
    }

    act(() => {
      store.dispatch({ type: 'object/add', object: rect1 })
      store.dispatch({ type: 'object/add', object: rect2 })
      store.dispatch({ type: 'object/add', object: ellipse })
    })

    const containerRef = createMockContainerRef()
    
    // Should not throw
    expect(() => {
      render(<MiniMap store={store} containerRef={containerRef} />)
    }).not.toThrow()
  })

  it('renders canvas element with correct dimensions', () => {
    store.dispatch({ type: 'overlay/setMinimap', visible: true })
    
    const containerRef = createMockContainerRef()
    const { container } = render(<MiniMap store={store} containerRef={containerRef} />)
    
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
    expect(canvas?.getAttribute('width')).toBe('200')
    expect(canvas?.getAttribute('height')).toBe('150')
  })

  it('returns hidden div when minimap is not visible', () => {
    store.dispatch({ type: 'overlay/setMinimap', visible: false })
    
    const containerRef = createMockContainerRef()
    const { container } = render(<MiniMap store={store} containerRef={containerRef} />)
    
    const div = container.querySelector('div')
    expect(div).toHaveAttribute('style', expect.stringContaining('display: none'))
  })

  it('handles many shapes without crashing', () => {
    store.dispatch({ type: 'overlay/setMinimap', visible: true })

    // Add 10 shapes
    act(() => {
      for (let i = 0; i < 10; i++) {
        const shape: Shape = {
          id: `shape${i}`,
          type: i % 2 === 0 ? 'rectangle' : 'ellipse',
          x: i * 50,
          y: i * 30,
          width: 40,
          height: 40,
          rotation: 0,
        }
        store.dispatch({ type: 'object/add', object: shape })
      }
    })

    const containerRef = createMockContainerRef()
    
    expect(() => {
      render(<MiniMap store={store} containerRef={containerRef} />)
    }).not.toThrow()
  })

  it('renders with pan and zoom applied', () => {
    store.dispatch({ type: 'overlay/setMinimap', visible: true })
    
    // Add a shape
    act(() => {
      store.dispatch({
        type: 'object/add',
        object: { id: 'rect1', type: 'rectangle', x: 100, y: 100, width: 80, height: 60, rotation: 0 },
      })
    })
    
    // Apply pan and zoom
    act(() => {
      store.dispatch({ type: 'view/pan', dx: 50, dy: 30 })
      store.dispatch({ type: 'view/zoom', scale: 1.5, anchor: { x: 400, y: 300 } })
    })

    const containerRef = createMockContainerRef()
    
    expect(() => {
      render(<MiniMap store={store} containerRef={containerRef} />)
    }).not.toThrow()
  })
})
