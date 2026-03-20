import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { ArrowStyle, NodeType, StrokeColor, StrokeWidth, StyleDefaults } from './canvas/model/types'
import { createCanvasStore } from './canvas/store/canvasStore'
import { SvgRenderer } from './canvas/renderer/svg/SvgRenderer'
import { createGestureController } from './canvas/interaction/gesture'
import { exportPng, exportSvg } from './canvas/export/export'
import { loadCanvasState, saveCanvasState } from './canvas/persistence/local'

const COLORS: StrokeColor[] = [
  '#2b2d42',
  '#6b3cff',
  '#ff595e',
  '#ffca3a',
  '#8ac926',
  '#1982c4',
  '#4267b2',
  '#adb5bd',
]
const WIDTHS: StrokeWidth[] = [1, 2, 4, 8]
const ARROW_STYLES: ArrowStyle[] = ['straight', 'dashed', 'elbow']

type Tool = 'select' | 'pan'

const useCanvasState = (store: ReturnType<typeof createCanvasStore>) => {
  const [state, setState] = useState(store.getState())
  useEffect(() => store.subscribe(() => setState(store.getState())), [store])
  return state
}

function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const store = useMemo(() => createCanvasStore(loadCanvasState() ?? undefined), [])
  const state = useCanvasState(store)
  const [tool, setTool] = useState<Tool>('select')

  const gesture = useMemo(
    () =>
      createGestureController({
        store,
        svgRef,
        onCommit: () => saveCanvasState(store.getState()),
      }),
    [store],
  )

  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  const getViewCenter = () => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { pan, zoom } = store.getState().view
    const screen = { x: rect.width / 2, y: rect.height / 2 }
    return { x: (screen.x - pan.x) / zoom, y: (screen.y - pan.y) / zoom }
  }

  const addNode = (type: NodeType) => {
    const center = getViewCenter()
    const size = type === 'square' ? 120 : 110
    store.dispatch({
      type: 'node/add',
      node: {
        id: crypto.randomUUID(),
        type,
        x: center.x - size / 2,
        y: center.y - size / 2,
        width: size,
        height: size,
        rotation: 0,
        strokeColor: state.defaults.strokeColor,
        strokeWidth: state.defaults.strokeWidth,
      },
    })
    saveCanvasState(store.getState())
  }

  const addArrow = () => {
    const center = getViewCenter()
    const offset = 80
    store.dispatch({
      type: 'arrow/add',
      arrow: {
        id: crypto.randomUUID(),
        type: 'arrow',
        start: { kind: 'free', x: center.x - offset, y: center.y },
        end: { kind: 'free', x: center.x + offset, y: center.y },
        strokeColor: state.defaults.strokeColor,
        strokeWidth: state.defaults.strokeWidth,
        arrowStyle: state.defaults.arrowStyle,
      },
    })
    saveCanvasState(store.getState())
  }

  const toggleSnapping = () => {
    store.dispatch({ type: 'snapping/set', enabled: !state.snapping.enabled }, { history: false })
    saveCanvasState(store.getState())
  }

  const undo = () => {
    store.undo()
    saveCanvasState(store.getState())
  }

  const redo = () => {
    store.redo()
    saveCanvasState(store.getState())
  }

  const handleExportSvg = () => {
    if (svgRef.current) exportSvg(svgRef.current)
  }

  const handleExportPng = () => {
    if (svgRef.current) exportPng(svgRef.current)
  }

  const selectedId = state.selection.id
  const selectedNode = state.scene.nodes.find((n) => n.id === selectedId)
  const selectedArrow = state.scene.arrows.find((a) => a.id === selectedId)

  const effectiveColor = selectedId
    ? selectedNode?.strokeColor ?? selectedArrow?.strokeColor
    : state.defaults.strokeColor

  const effectiveWidth = selectedId
    ? selectedNode?.strokeWidth ?? selectedArrow?.strokeWidth
    : state.defaults.strokeWidth

  const effectiveArrowStyle = selectedId
    ? selectedArrow?.arrowStyle ?? 'straight'
    : state.defaults.arrowStyle

  const applyStyleChange = (patch: Partial<StyleDefaults>) => {
    if (selectedId) {
      if (selectedNode) {
        store.dispatch({
          type: 'node/update',
          id: selectedId,
          patch: { strokeColor: patch.strokeColor, strokeWidth: patch.strokeWidth },
        })
      } else if (selectedArrow) {
        store.dispatch({ type: 'arrow/update', id: selectedId, patch })
      }
    } else {
      store.dispatch({ type: 'defaults/set', patch })
    }
    saveCanvasState(store.getState())
  }

  return (
    <div
      className="canvas-app"
      ref={containerRef}
      tabIndex={0}
      onKeyDown={gesture.handleKeyDown}
      onKeyUp={gesture.handleKeyUp}
    >
      <header className="toolbar">
        <div className="toolbar-group">
          <button type="button" onClick={() => addNode('square')}>Add square</button>
          <button type="button" onClick={() => addNode('circle')}>Add circle</button>
          <button type="button" onClick={addArrow}>Add arrow</button>
        </div>
        <div className="toolbar-group">
          <button
            type="button"
            className={tool === 'select' ? 'active' : ''}
            onClick={() => setTool('select')}
          >
            Select
          </button>
          <button
            type="button"
            className={tool === 'pan' ? 'active' : ''}
            onClick={() => setTool('pan')}
          >
            Pan
          </button>
        </div>
        <div className="toolbar-group">
          <button type="button" onClick={undo}>Undo</button>
          <button type="button" onClick={redo}>Redo</button>
          <button
            type="button"
            className={state.snapping.enabled ? 'active' : ''}
            onClick={toggleSnapping}
          >
            Snapping {state.snapping.enabled ? 'On' : 'Off'}
          </button>
        </div>
        <div className="toolbar-group">
          <div className="palette-group">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`palette-chip ${effectiveColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => applyStyleChange({ strokeColor: color })}
                title={`Set color: ${color}`}
              />
            ))}
          </div>
          <div className="segmented-control">
            {WIDTHS.map((width) => (
              <button
                key={width}
                type="button"
                className={effectiveWidth === width ? 'active' : ''}
                onClick={() => applyStyleChange({ strokeWidth: width })}
              >
                {width}
              </button>
            ))}
          </div>
          <div className="segmented-control">
            {ARROW_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                className={effectiveArrowStyle === style ? 'active' : ''}
                onClick={() => applyStyleChange({ arrowStyle: style })}
                disabled={selectedId ? !selectedArrow : false}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar-group">
          <button type="button" onClick={handleExportSvg}>Export SVG</button>
          <button type="button" onClick={handleExportPng}>Export PNG</button>
        </div>
      </header>
      <main className="canvas-wrapper">
        {SvgRenderer.render({
          state,
          svgRef,
          onPointerDown: (event) => {
            if (tool === 'pan') {
              if (event.button === 0) {
                gesture.handlePointerDown({ ...event, button: 2 } as React.PointerEvent<SVGSVGElement>)
              }
              return
            }
            gesture.handlePointerDown(event)
          },
          onPointerMove: gesture.handlePointerMove,
          onPointerUp: gesture.handlePointerUp,
          onPointerLeave: gesture.handlePointerLeave,
          onWheel: gesture.handleWheel,
          onContextMenu: gesture.handleContextMenu,
        })}
      </main>
    </div>
  )
}

export default App
