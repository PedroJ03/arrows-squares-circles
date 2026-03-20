import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { ENDPOINT_ATTACH_DISTANCE, distance, getAnchorPoint } from './canvas/model/geometry'
import type { Node } from './canvas/model/types'

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
})

describe('App integration', () => {
  it('selects, drags, and resizes a node via pointer events', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    fireEvent.click(screen.getByRole('button', { name: /add square/i }))

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()
    const initialX = Number(rect.getAttribute('x'))
    const initialY = Number(rect.getAttribute('y'))

    fireEvent.pointerDown(svg, {
      clientX: initialX + 10,
      clientY: initialY + 10,
      pageX: initialX + 10,
      pageY: initialY + 10,
      pointerId: 1,
      button: 0,
    })
    fireEvent.pointerMove(rect, {
      clientX: initialX + 60,
      clientY: initialY + 10,
      pageX: initialX + 60,
      pageY: initialY + 10,
      pointerId: 1,
    })
    fireEvent.pointerUp(rect, { pointerId: 1 })

    const draggedRect = container.querySelector('rect[data-id]') as SVGRectElement
    const draggedX = Number(draggedRect.getAttribute('x'))
    expect(draggedX).toBeGreaterThan(initialX)

    const handle = container.querySelector('circle[data-handle="resize-se"]') as SVGCircleElement
    expect(handle).toBeTruthy()
    const handleX = Number(handle.getAttribute('cx'))
    const handleY = Number(handle.getAttribute('cy'))
    const widthBefore = Number(draggedRect.getAttribute('width'))
    const heightBefore = Number(draggedRect.getAttribute('height'))

    fireEvent.pointerDown(handle, {
      clientX: handleX,
      clientY: handleY,
      pageX: handleX,
      pageY: handleY,
      pointerId: 2,
      button: 0,
    })
    fireEvent.pointerMove(handle, {
      clientX: handleX + 40,
      clientY: handleY + 40,
      pageX: handleX + 40,
      pageY: handleY + 40,
      pointerId: 2,
    })
    fireEvent.pointerUp(handle, { pointerId: 2 })

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

    fireEvent.click(screen.getByRole('button', { name: /add square/i }))

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()
    const rectX = Number(rect.getAttribute('x'))
    const rectY = Number(rect.getAttribute('y'))

    fireEvent.pointerDown(rect, {
      clientX: rectX + 10,
      clientY: rectY + 10,
      pageX: rectX + 10,
      pageY: rectY + 10,
      pointerId: 3,
      button: 0,
    })
    fireEvent.pointerUp(rect, { pointerId: 3 })

    expect(container.querySelector('circle[data-handle="resize-se"]')).toBeInTheDocument()

    fireEvent.pointerDown(svg, {
      clientX: 10,
      clientY: 10,
      pageX: 10,
      pageY: 10,
      pointerId: 4,
      button: 0,
    })

    expect(container.querySelector('circle[data-handle="resize-se"]')).not.toBeInTheDocument()
  })

  it('ignores drag when no selection exists', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    fireEvent.click(screen.getByRole('button', { name: /add square/i }))
    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()

    const initialX = Number(rect.getAttribute('x'))
    const initialY = Number(rect.getAttribute('y'))

    fireEvent.pointerDown(svg, {
      clientX: 10,
      clientY: 10,
      pageX: 10,
      pageY: 10,
      pointerId: 5,
      button: 0,
    })
    fireEvent.pointerMove(svg, {
      clientX: 200,
      clientY: 200,
      pageX: 200,
      pageY: 200,
      pointerId: 5,
    })
    fireEvent.pointerUp(svg, { pointerId: 5 })

    const rectAfter = container.querySelector('rect[data-id]') as SVGRectElement
    expect(Number(rectAfter.getAttribute('x'))).toBeCloseTo(initialX)
    expect(Number(rectAfter.getAttribute('y'))).toBeCloseTo(initialY)
  })

  it('rotates a selected node via the rotate handle', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    fireEvent.click(screen.getByRole('button', { name: /add circle/i }))

    const ellipse = container.querySelector('ellipse[data-id]') as SVGEllipseElement
    expect(ellipse).toBeTruthy()
    const centerX = Number(ellipse.getAttribute('cx'))
    const centerY = Number(ellipse.getAttribute('cy'))

    fireEvent.pointerDown(ellipse, {
      clientX: centerX,
      clientY: centerY,
      pageX: centerX,
      pageY: centerY,
      pointerId: 6,
      button: 0,
    })
    fireEvent.pointerUp(ellipse, { pointerId: 6 })

    const rotateHandle = container.querySelector('circle[data-handle="rotate"]') as SVGCircleElement
    expect(rotateHandle).toBeTruthy()
    const handleX = Number(rotateHandle.getAttribute('cx'))
    const handleY = Number(rotateHandle.getAttribute('cy'))
    const transformBefore = ellipse.getAttribute('transform')

    fireEvent.pointerDown(rotateHandle, {
      clientX: handleX,
      clientY: handleY,
      pageX: handleX,
      pageY: handleY,
      pointerId: 7,
      button: 0,
    })
    fireEvent.pointerMove(rotateHandle, {
      clientX: centerX,
      clientY: centerY + 80,
      pageX: centerX,
      pageY: centerY + 80,
      pointerId: 7,
    })
    fireEvent.pointerUp(rotateHandle, { pointerId: 7 })

    const updatedEllipse = container.querySelector('ellipse[data-id]') as SVGEllipseElement
    const transformAfter = updatedEllipse.getAttribute('transform')
    expect(transformAfter).not.toEqual(transformBefore)
  })

  it('attaches and detaches arrow endpoints when dragged', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    fireEvent.click(screen.getByRole('button', { name: /add square/i }))
    fireEvent.click(screen.getByRole('button', { name: /add arrow/i }))

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    const rectId = rect.getAttribute('data-id') ?? 'square'
    const node: Node = {
      id: rectId,
      type: 'square',
      x: Number(rect.getAttribute('x')),
      y: Number(rect.getAttribute('y')),
      width: Number(rect.getAttribute('width')),
      height: Number(rect.getAttribute('height')),
      rotation: 0,
    }

    const arrowPath = container.querySelector('path[data-id]') as SVGPathElement
    expect(arrowPath).toBeTruthy()

    fireEvent.pointerDown(arrowPath, {
      clientX: 0,
      clientY: 0,
      pageX: 0,
      pageY: 0,
      pointerId: 8,
      button: 0,
    })

    const endpointHandle = container.querySelector('circle[data-handle="endpoint-end"]') as SVGCircleElement
    expect(endpointHandle).toBeTruthy()
    const handleX = Number(endpointHandle.getAttribute('cx'))
    const handleY = Number(endpointHandle.getAttribute('cy'))
    const anchorPoint = getAnchorPoint(node, 'e')

    fireEvent.pointerDown(endpointHandle, {
      clientX: handleX,
      clientY: handleY,
      pageX: handleX,
      pageY: handleY,
      pointerId: 9,
      button: 0,
    })
    fireEvent.pointerMove(endpointHandle, {
      clientX: anchorPoint.x,
      clientY: anchorPoint.y,
      pageX: anchorPoint.x,
      pageY: anchorPoint.y,
      pointerId: 9,
    })
    fireEvent.pointerUp(endpointHandle, { pointerId: 9 })

    const attachedHandle = container.querySelector('circle[data-handle="endpoint-end"]') as SVGCircleElement
    const attachedX = Number(attachedHandle.getAttribute('cx'))
    const attachedY = Number(attachedHandle.getAttribute('cy'))
    expect(attachedX).toBeCloseTo(anchorPoint.x)
    expect(attachedY).toBeCloseTo(anchorPoint.y)

    const detachPoint = {
      x: anchorPoint.x + ENDPOINT_ATTACH_DISTANCE * 4,
      y: anchorPoint.y + ENDPOINT_ATTACH_DISTANCE * 4,
    }

    fireEvent.pointerDown(attachedHandle, {
      clientX: attachedX,
      clientY: attachedY,
      pageX: attachedX,
      pageY: attachedY,
      pointerId: 10,
      button: 0,
    })
    fireEvent.pointerMove(attachedHandle, {
      clientX: detachPoint.x,
      clientY: detachPoint.y,
      pageX: detachPoint.x,
      pageY: detachPoint.y,
      pointerId: 10,
    })
    fireEvent.pointerUp(attachedHandle, { pointerId: 10 })

    const detachedHandle = container.querySelector('circle[data-handle="endpoint-end"]') as SVGCircleElement
    const detachedX = Number(detachedHandle.getAttribute('cx'))
    const detachedY = Number(detachedHandle.getAttribute('cy'))
    expect(distance({ x: detachedX, y: detachedY }, anchorPoint)).toBeGreaterThan(ENDPOINT_ATTACH_DISTANCE)
  })

  it('saves persistence after an edit commit', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toBeTruthy()
    mockSvgRect(svg)

    fireEvent.click(screen.getByRole('button', { name: /add square/i }))

    const rect = container.querySelector('rect[data-id]') as SVGRectElement
    expect(rect).toBeTruthy()
    const initialX = Number(rect.getAttribute('x'))
    const initialY = Number(rect.getAttribute('y'))

    const storedBefore = JSON.parse(localStorage.getItem('ux-canvas-state') ?? '{}')

    fireEvent.pointerDown(rect, {
      clientX: initialX + 10,
      clientY: initialY + 10,
      pageX: initialX + 10,
      pageY: initialY + 10,
      pointerId: 11,
      button: 0,
    })
    fireEvent.pointerMove(rect, {
      clientX: initialX + 90,
      clientY: initialY + 10,
      pageX: initialX + 90,
      pageY: initialY + 10,
      pointerId: 11,
    })
    fireEvent.pointerUp(rect, { pointerId: 11 })

    const storedAfter = JSON.parse(localStorage.getItem('ux-canvas-state') ?? '{}')
    const beforeNode = storedBefore.scene?.nodes?.[0]
    const afterNode = storedAfter.scene?.nodes?.[0]
    expect(beforeNode).toBeTruthy()
    expect(afterNode).toBeTruthy()
    expect(afterNode.x).not.toEqual(beforeNode.x)
    expect(afterNode.y).toEqual(beforeNode.y)
  })

  it('pans and zooms the view with wheel events', () => {
    const { container } = render(<App />)
    const svg = container.querySelector('svg') as SVGSVGElement
    const group = container.querySelector('svg g') as SVGGElement
    expect(svg).toBeTruthy()
    expect(group).toBeTruthy()
    mockSvgRect(svg)

    fireEvent.wheel(svg, { deltaX: 10, deltaY: 20 })
    expect(group.getAttribute('transform')).toContain('translate(-10 -20)')

    fireEvent.wheel(svg, { deltaY: -100, ctrlKey: true })
    expect(group.getAttribute('transform')).toMatch(/scale\(1\.08/)
  })

  it('restores persisted canvas state on load', () => {
    localStorage.setItem(
      'ux-canvas-state',
      JSON.stringify({
        version: 1,
        scene: {
          nodes: [
            {
              id: 'persisted-node',
              type: 'square',
              x: 50,
              y: 70,
              width: 120,
              height: 120,
              rotation: 0,
            },
          ],
          arrows: [],
        },
        view: { pan: { x: 0, y: 0 }, zoom: 1 },
        snapping: { enabled: true },
      }),
    )

    const { container } = render(<App />)
    const restored = container.querySelector('rect[data-id="persisted-node"]')
    expect(restored).toBeInTheDocument()
    localStorage.clear()
  })
})
