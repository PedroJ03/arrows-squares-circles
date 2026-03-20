import { describe, expect, it, vi } from 'vitest'
import { exportPng, serializeSvg } from './export'

describe('export helpers', () => {
  it('serializes SVG without UI decorations', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const ui = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    ui.setAttribute('data-ui', 'true')
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    node.setAttribute('data-id', 'node-1')
    svg.appendChild(ui)
    svg.appendChild(node)

    const serialized = serializeSvg(svg)

    expect(serialized).toContain('<circle')
    expect(serialized).not.toContain('data-ui')
  })

  it('exports PNG by rasterizing the SVG', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    Object.defineProperty(svg, 'clientWidth', { value: 400 })
    Object.defineProperty(svg, 'clientHeight', { value: 300 })

    const drawImage = vi.fn()
    const toDataURL = vi.fn(() => 'data:image/png;base64,fake')
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(toDataURL)

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const originalImage = globalThis.Image
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        this.onload?.()
      }
    }
    // @ts-expect-error test shim
    globalThis.Image = MockImage

    await exportPng(svg)

    expect(drawImage).toHaveBeenCalled()
    expect(toDataURL).toHaveBeenCalledWith('image/png')
    expect(clickSpy).toHaveBeenCalled()

    globalThis.Image = originalImage
    clickSpy.mockRestore()
  })
})
