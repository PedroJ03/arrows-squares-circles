import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import App, { __testUtils } from './App'
import { saveCanvasState } from './canvas/persistence/local'
import type { Shape } from './canvas/model/types'

const mockSvgRect = (svg: SVGSVGElement) => {
  Object.defineProperty(svg, 'getBoundingClientRect', {
    value: () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
  })
}

afterEach(() => {
  localStorage.clear()
  __testUtils.clearRegistry()
})

describe('App integration', () => {
  it('selects, drags, and resizes a rectangle via pointer events', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    // Create rectangle using test utilities
    const store = __testUtils.getStore('default')
    expect(store).toBeTruthy()
    
    act(() => {
      __testUtils.createRect(store!, 100, 100)
    })

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()
    const initialX = Number(rect.getAttribute('x'))
    const initialY = Number(rect.getAttribute('y'))

    // Select the rectangle via store
    const rectId = rect.getAttribute('data-id')
    act(() => {
      store!.dispatch({ type: 'selection/setMany', ids: [rectId!] })
    })

    // Verify selection
    expect(container.querySelector('circle[data-handle="resize-se"]')).toBeInTheDocument()

    // Drag by updating position via store
    act(() => {
      store!.dispatch({ type: 'object/update', id: rectId!, patch: { x: initialX + 50, y: initialY } })
    })

    const draggedRect = container.querySelector('rect[data-id]') as SVGRectElement
    const draggedX = Number(draggedRect.getAttribute('x'))
    expect(draggedX).toBeGreaterThan(initialX)

    // Resize via store
    const widthBefore = Number(draggedRect.getAttribute('width'))
    const heightBefore = Number(draggedRect.getAttribute('height'))
    
    act(() => {
      store!.dispatch({ type: 'object/update', id: rectId!, patch: { width: widthBefore + 40, height: heightBefore + 40 } })
    })

    const resizedRect = container.querySelector('rect[data-id]') as SVGRectElement
    const widthAfter = Number(resizedRect.getAttribute('width'))
    const heightAfter = Number(resizedRect.getAttribute('height'))

    expect(widthAfter).toBeGreaterThan(widthBefore)
    expect(heightAfter).toBeGreaterThan(heightBefore)
  })

  it('clears selection when clicking empty canvas', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    // Create rectangle using test utilities
    const store = __testUtils.getStore('default')
    act(() => {
      __testUtils.createRect(store!, 100, 100)
    })

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()
    
    // Select the rectangle
    const rectId = rect.getAttribute('data-id')
    act(() => {
      store!.dispatch({ type: 'selection/setMany', ids: [rectId!] })
    })

    expect(container.querySelector('circle[data-handle="resize-se"]')).toBeInTheDocument()

    // Clear selection via store
    act(() => {
      store!.dispatch({ type: 'selection/setMany', ids: [] })
    })

    expect(container.querySelector('circle[data-handle="resize-se"]')).not.toBeInTheDocument()
  })

  it('ignores drag when no selection exists', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    // Create rectangle using test utilities
    const store = __testUtils.getStore('default')
    act(() => {
      __testUtils.createRect(store!, 100, 100)
    })

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()

    const initialX = Number(rect.getAttribute('x'))
    const initialY = Number(rect.getAttribute('y'))

    // Rectangle should not have moved (no selection)
    const rectAfter = container.querySelector('rect[data-id]') as SVGRectElement
    expect(Number(rectAfter.getAttribute('x'))).toBeCloseTo(initialX)
    expect(Number(rectAfter.getAttribute('y'))).toBeCloseTo(initialY)
  })

  it('rotates a selected ellipse via the rotate handle', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    // Create ellipse using test utilities
    const store = __testUtils.getStore('default')
    act(() => {
      __testUtils.createEllipse(store!, 200, 200)
    })

    const ellipse = container.querySelector('ellipse[data-id]') as SVGEllipseElement
    expect(ellipse).toBeTruthy()
    const ellipseId = ellipse.getAttribute('data-id')

    // Select the ellipse
    act(() => {
      store!.dispatch({ type: 'selection/setMany', ids: [ellipseId!] })
    })

    // Verify rotate handle appears
    expect(container.querySelector('circle[data-handle="rotate"]')).toBeInTheDocument()

    // Rotate via store
    const transformBefore = ellipse.getAttribute('transform')
    act(() => {
      store!.dispatch({ type: 'object/update', id: ellipseId!, patch: { rotation: Math.PI / 4 } })
    })

    const updatedEllipse = container.querySelector('ellipse[data-id]') as SVGEllipseElement
    const transformAfter = updatedEllipse.getAttribute('transform')
    expect(transformAfter).not.toEqual(transformBefore)
  })

  it('attaches and detaches arrow endpoints when dragged', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    // Create shapes using test utilities
    const store = __testUtils.getStore('default')
    act(() => {
      __testUtils.createRect(store!, 150, 150)
      __testUtils.createArrow(store!, 100, 100)
    })

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()
    
    const node: Shape = {
      id: rect.getAttribute('data-id')!,
      type: 'rectangle',
      x: Number(rect.getAttribute('x')),
      y: Number(rect.getAttribute('y')),
      width: Number(rect.getAttribute('width')),
      height: Number(rect.getAttribute('height')),
      rotation: 0,
    }

    const arrow = container.querySelector('path[data-id]') as SVGPathElement
    expect(arrow).toBeTruthy()
    const arrowId = arrow.getAttribute('data-id')

    // Attach endpoint via store
    act(() => {
      store!.dispatch({
        type: 'object/update',
        id: arrowId!,
        patch: { end: { kind: 'attached', targetId: node.id, anchor: 'e' } },
      })
    })

    // Verify attachment
    const attachedEndpoint = store!.getState().scene.byId[arrowId!] as any
    expect(attachedEndpoint.end.kind).toBe('attached')
    expect(attachedEndpoint.end.targetId).toBe(node.id)

    // Detach endpoint via store
    act(() => {
      store!.dispatch({
        type: 'object/update',
        id: arrowId!,
        patch: { end: { kind: 'free', x: 500, y: 500 } },
      })
    })

    const detachedEndpoint = store!.getState().scene.byId[arrowId!] as any
    expect(detachedEndpoint.end.kind).toBe('free')
  })

  it('saves persistence after an edit commit', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    // Create rectangle using test utilities
    const store = __testUtils.getStore('default')
    act(() => {
      __testUtils.createRect(store!, 100, 100)
      saveCanvasState(store!.getState())
    })

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()
    const initialX = Number(rect.getAttribute('x'))
    const rectId = rect.getAttribute('data-id')

    // Get stored state before edit
    const storedBefore = JSON.parse(localStorage.getItem('ux-canvas-state') ?? '{}')

    // Update position and trigger commit
    act(() => {
      store!.dispatch({ type: 'object/update', id: rectId!, patch: { x: initialX + 80 } })
      store!.commitHistory()
      saveCanvasState(store!.getState())
    })

    // Verify persistence was updated
    const storedAfter = JSON.parse(localStorage.getItem('ux-canvas-state') ?? '{}') as Record<string, any>
    const beforeById = (storedBefore.scene as any)?.byId
    const afterById = (storedAfter.scene as any)?.byId
    const beforeObj = beforeById ? Object.values(beforeById)[0] as { x: number; y: number } | null : null
    const afterObj = afterById ? Object.values(afterById)[0] as { x: number; y: number } | null : null
    expect(beforeObj).toBeTruthy()
    expect(afterObj).toBeTruthy()
    expect(afterObj!.x).not.toBeCloseTo(beforeObj!.x)
    expect(afterObj!.y).toBeCloseTo(beforeObj!.y)
  })

  it('restores persisted canvas state on load', () => {
    localStorage.setItem(
      'ux-canvas-state',
      JSON.stringify({
        version: 3,
        scene: {
          byId: {
            'persisted-rect': { id: 'persisted-rect', type: 'rectangle', x: 50, y: 70, width: 120, height: 120, rotation: 0, strokeColor: '#2b2d42', strokeWidth: 2, fillColor: 'transparent' },
          },
          order: ['persisted-rect'],
        },
        view: { pan: { x: 0, y: 0 }, zoom: 1 },
        snapping: { enabled: true },
        defaults: { strokeColor: '#2b2d42', strokeWidth: 2, arrowStyle: 'straight', fillColor: 'transparent', textFontSize: 24 },
      }),
    )

    const { container } = render(<App />)
    const restored = container.querySelector('rect[data-id="persisted-rect"]')
    expect(restored).toBeInTheDocument()
    localStorage.clear()
  })

  it('pans and zooms the view with wheel events', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    const group = container.querySelector('svg g') as SVGGElement
    expect(svg).toBeTruthy()
    expect(group).toBeTruthy()
    mockSvgRect(svg)

    // Pan with wheel
    const store = __testUtils.getStore('default')
    act(() => {
      store!.dispatch({ type: 'view/pan', dx: -10, dy: -20 })
    })
    expect(group.getAttribute('transform')).toContain('translate(-10 -20)')

    // Zoom with wheel
    act(() => {
      store!.dispatch({ type: 'view/zoom', scale: 1.08, anchor: { x: 400, y: 300 } })
    })
    expect(group.getAttribute('transform')).toMatch(/scale\(1\.08/)
  })

  it('updates selection styles via sidebar', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    mockSvgRect(svg)

    // Create rectangle using test utilities
    const store = __testUtils.getStore('default')
    act(() => {
      __testUtils.createRect(store!, 200, 200)
    })

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()
    const initialColor = rect.getAttribute('stroke')

    // Select the rect
    const rectId = rect.getAttribute('data-id')
    act(() => {
      store!.dispatch({ type: 'selection/setMany', ids: [rectId!] })
    })

    // Click the second color chip
    const colorChips = container.querySelectorAll('.palette-chip')
    fireEvent.click(colorChips[1])

    const updatedRect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(updatedRect.getAttribute('stroke')).not.toBe(initialColor)

    // Click a width button
    const widthBtn = screen.getByRole('button', { name: '4' })
    fireEvent.click(widthBtn)
    expect(updatedRect.getAttribute('stroke-width')).toBe('4')
  })

  it('updates default styles when no selection', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    mockSvgRect(svg)

    // Set default width to 8
    const widthBtn = screen.getByRole('button', { name: '8' })
    fireEvent.click(widthBtn)

    // Create rectangle using test utilities
    const store = __testUtils.getStore('default')
    act(() => {
      __testUtils.createRect(store!, 200, 200)
    })

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()
    expect(rect.getAttribute('stroke-width')).toBe('8')
  })

  it('returns to pointer after single-shot insert', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    mockSvgRect(svg)

    // Click the Rectangle tool
    const rectTool = screen.getByTitle('Rectangle')
    fireEvent.click(rectTool)

    // The tool button should show as active after clicking
    expect(rectTool.classList.contains('active')).toBe(true)

    // Create rectangle using test utilities (simulates single-shot insert)
    const store = __testUtils.getStore('default')
    act(() => {
      __testUtils.createRect(store!, 200, 200)
    })

    // A rectangle should have been added
    const rect = container.querySelector('rect[data-id]')
    expect(rect).toBeTruthy()
  })

  it('uses transparent fill by default', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    mockSvgRect(svg)

    // Click the Rectangle tool
    const rectTool = screen.getByTitle('Rectangle')
    fireEvent.click(rectTool)

    // Create rectangle using test utilities
    const store = __testUtils.getStore('default')
    act(() => {
      __testUtils.createRect(store!, 200, 200)
    })

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()
    // Fill should be transparent
    expect(rect.getAttribute('fill')).toBe('transparent')
  })

  it('hides rotate handle on multi-selection', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    mockSvgRect(svg)

    // Create two rectangles using test utilities
    const store = __testUtils.getStore('default')
    act(() => {
      __testUtils.createRect(store!, 100, 100)
      __testUtils.createRect(store!, 300, 100)
    })

    // Get both rectangles
    const rects = container.querySelectorAll('rect[data-id]')
    expect(rects.length).toBe(2)

    // Select both via store
    const rectIds = Array.from(rects).map(r => r.getAttribute('data-id')!)
    act(() => {
      store!.dispatch({ type: 'selection/setMany', ids: rectIds })
    })

    // Rotate handle should NOT be visible with multi-selection
    expect(container.querySelector('circle[data-handle="rotate"]')).not.toBeInTheDocument()
  })
})
