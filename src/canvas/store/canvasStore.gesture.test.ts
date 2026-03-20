import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Shape } from '../model/types'
import { createCanvasStore } from './canvasStore'
import { createGestureController } from '../interaction/gesture'

// Mock SVG element
const mockSvgRef = {
  current: {
    getBoundingClientRect: () => ({ left: 0, top: 0, x: 0, y: 0, width: 800, height: 600 } as DOMRect),
  },
} as unknown as React.RefObject<SVGSVGElement | null>

// Stub navigator.platform for Mac shortcuts
const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform')
beforeEach(() => {
  Object.defineProperty(navigator, 'platform', { value: 'Mac', writable: true, configurable: true })
})
afterEach(() => {
  if (originalPlatform) {
    Object.defineProperty(navigator, 'platform', originalPlatform)
  }
})

describe('gesture keyboard shortcuts', () => {
  let store: ReturnType<typeof createCanvasStore>

  beforeEach(() => {
    store = createCanvasStore()
    const shape: Shape = {
      id: 'n1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 80,
      height: 60,
      rotation: 0,
    }
    store.dispatch({ type: 'object/add', object: shape })
    store.dispatch({ type: 'selection/setMany', ids: ['n1'] }, { history: false })
  })

  it('V key sets pointer tool', () => {
    const gesture = createGestureController({ store, svgRef: mockSvgRef })
    const event = new KeyboardEvent('keydown', { key: 'v' })
    Object.defineProperty(event, 'target', { value: document.body })
    gesture.handleKeyDown(event as unknown as React.KeyboardEvent)
    expect(store.getState().ui.tool).toBe('pointer')
  })

  it('R key sets rectangle tool', () => {
    const gesture = createGestureController({ store, svgRef: mockSvgRef })
    const event = new KeyboardEvent('keydown', { key: 'r' })
    gesture.handleKeyDown(event as unknown as React.KeyboardEvent)
    expect(store.getState().ui.tool).toBe('rectangle')
  })

  it('Delete key deletes selected shape', () => {
    const gesture = createGestureController({ store, svgRef: mockSvgRef })
    expect(store.getState().scene.byId['n1']).toBeDefined()
    const event = new KeyboardEvent('keydown', { key: 'Delete' })
    gesture.handleKeyDown(event as unknown as React.KeyboardEvent)
    expect(store.getState().scene.byId['n1']).toBeUndefined()
  })

  it('Backspace key deletes selected shape', () => {
    const gesture = createGestureController({ store, svgRef: mockSvgRef })
    expect(store.getState().scene.byId['n1']).toBeDefined()
    const event = new KeyboardEvent('keydown', { key: 'Backspace' })
    gesture.handleKeyDown(event as unknown as React.KeyboardEvent)
    expect(store.getState().scene.byId['n1']).toBeUndefined()
  })

  it('Cmd+0 resets zoom to 100%', () => {
    store.dispatch({ type: 'view/setZoom', zoom: 2 })
    expect(store.getState().view.zoom).toBe(2)
    const gesture = createGestureController({ store, svgRef: mockSvgRef })
    const event = new KeyboardEvent('keydown', { key: '0', metaKey: true })
    gesture.handleKeyDown(event as unknown as React.KeyboardEvent)
    expect(store.getState().view.zoom).toBe(1)
  })

  it('Cmd+1 signals fit (triggers callback)', () => {
    let fitCalled = false
    const gesture = createGestureController({
      store,
      svgRef: mockSvgRef,
      onFitRequested: () => { fitCalled = true },
    })
    const event = new KeyboardEvent('keydown', { key: '1', metaKey: true })
    gesture.handleKeyDown(event as unknown as React.KeyboardEvent)
    expect(fitCalled).toBe(true)
  })
})

describe('gesture keyboard shortcuts guarded by text editing', () => {
  let store: ReturnType<typeof createCanvasStore>

  beforeEach(() => {
    store = createCanvasStore()
    const shape: Shape = { id: 'n1', type: 'rectangle', x: 100, y: 100, width: 80, height: 60, rotation: 0 }
    store.dispatch({ type: 'object/add', object: shape })
    store.dispatch({ type: 'selection/setMany', ids: ['n1'] }, { history: false })
  })

  it('tool shortcut is blocked when editing text', () => {
    store.dispatch({ type: 'selection/setEditingText', id: 'n1' }, { history: false })
    const gesture = createGestureController({ store, svgRef: mockSvgRef })
    const event = new KeyboardEvent('keydown', { key: 'r' })
    // Simulate textarea focus
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()
    gesture.handleKeyDown(event as unknown as React.KeyboardEvent)
    expect(store.getState().ui.tool).toBe('pointer')
    document.body.removeChild(textarea)
  })
})
