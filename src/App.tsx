import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { NodeType } from './canvas/model/types'
import { createCanvasStore } from './canvas/store/canvasStore'
import { SvgRenderer } from './canvas/renderer/svg/SvgRenderer'
import { createGestureController } from './canvas/interaction/gesture'
import { exportPng, exportSvg } from './canvas/export/export'
import { loadCanvasState, saveCanvasState } from './canvas/persistence/local'

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
