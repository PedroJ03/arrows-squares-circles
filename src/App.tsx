import type { ArrowStyle, StrokeColor, StrokeWidth, StyleDefaults, TextFontSize, Tool } from './canvas/model/types'
import { createCanvasStore } from './canvas/store/canvasStore'
import type { CanvasStore } from './canvas/store/canvasStore'
import { SvgRenderer } from './canvas/renderer/svg/SvgRenderer'
import { createGestureController } from './canvas/interaction/gesture'
import { TextEditorOverlay } from './canvas/text/TextEditorOverlay'
import { exportPng, exportSvg } from './canvas/export/export'
import { loadCanvasState, saveCanvasState } from './canvas/persistence/local'
import { OverlayLayers } from './canvas/overlay/OverlayLayers'
import { fitViewToContent, getSceneBounds, getObjectBounds } from './canvas/model/geometry'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

// Registry for test access to stores
const __testStoreRegistry: Map<string, CanvasStore> = new Map()

// Test utilities - exposed for testing purposes
export const __testUtils = {
  registerStore: (id: string, store: CanvasStore) => {
    __testStoreRegistry.set(id, store)
  },
  getStore: (id: string) => __testStoreRegistry.get(id),
  clearRegistry: () => __testStoreRegistry.clear(),
  createRect: (store: CanvasStore, x: number, y: number) => {
    store.dispatch({
      type: 'object/add',
      object: {
        id: crypto.randomUUID(),
        type: 'rectangle' as const,
        x: x - 60,
        y: y - 40,
        width: 120,
        height: 80,
        rotation: 0,
        strokeColor: store.getState().defaults.strokeColor,
        strokeWidth: store.getState().defaults.strokeWidth,
        fillColor: store.getState().defaults.fillColor,
      },
    })
  },
  createEllipse: (store: CanvasStore, x: number, y: number) => {
    store.dispatch({
      type: 'object/add',
      object: {
        id: crypto.randomUUID(),
        type: 'ellipse' as const,
        x: x - 55,
        y: y - 55,
        width: 110,
        height: 110,
        rotation: 0,
        strokeColor: store.getState().defaults.strokeColor,
        strokeWidth: store.getState().defaults.strokeWidth,
        fillColor: store.getState().defaults.fillColor,
      },
    })
  },
  createArrow: (store: CanvasStore, x: number, y: number) => {
    store.dispatch({
      type: 'object/add',
      object: {
        id: crypto.randomUUID(),
        type: 'arrow' as const,
        start: { kind: 'free' as const, x: x - 80, y },
        end: { kind: 'free' as const, x: x + 80, y },
        strokeColor: store.getState().defaults.strokeColor,
        strokeWidth: store.getState().defaults.strokeWidth,
        arrowStyle: store.getState().defaults.arrowStyle,
      },
    })
  },
}

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
const FONT_SIZES: TextFontSize[] = [16, 24, 32, 48]

export const useCanvasState = (store: ReturnType<typeof createCanvasStore>) => {
  const [state, setState] = useState(store.getState())
  useEffect(() => store.subscribe(() => setState(store.getState())), [store])
  return state
}

function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const store = useMemo(() => {
    const newStore = createCanvasStore(loadCanvasState() ?? undefined)
    // Register store for testing (synchronous)
    __testUtils.registerStore('default', newStore)
    return newStore
  }, [])
  const state = useCanvasState(store)
  const currentTool = state.ui.tool

  const gesture = useMemo(
    () =>
      createGestureController({
        store,
        svgRef,
        onCommit: () => saveCanvasState(store.getState()),
        onFitRequested: () => {
          const sceneBounds = getSceneBounds(store.getState().scene)
          if (sceneBounds && containerRef.current) {
            const vw = containerRef.current.clientWidth
            const vh = containerRef.current.clientHeight
            const { pan, zoom } = fitViewToContent(sceneBounds, vw, vh)
            store.dispatch({ type: 'view/pan', dx: pan.x - store.getState().view.pan.x, dy: pan.y - store.getState().view.pan.y }, { history: false })
            store.dispatch({ type: 'view/setZoom', zoom }, { history: false })
          }
        },
      }),
    [store],
  )

  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  const selectedIds = state.selection.ids
  const primaryId = selectedIds[0] ?? null
  const primaryObj = primaryId ? state.scene.byId[primaryId] : null

  // Compute effective styles
  const effectiveColor = primaryObj?.strokeColor ?? state.defaults.strokeColor
  const effectiveWidth = primaryObj && 'strokeWidth' in primaryObj ? (primaryObj.strokeWidth ?? state.defaults.strokeWidth) : state.defaults.strokeWidth
  const effectiveArrowStyle = primaryObj?.type === 'arrow' ? (primaryObj.arrowStyle ?? state.defaults.arrowStyle) : state.defaults.arrowStyle

  const setTool = (tool: Tool) => {
    store.dispatch({ type: 'tool/set', tool })
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

  const applyStyleChange = (patch: Partial<StyleDefaults>) => {
    if (selectedIds.length > 0) {
      // Batch update all selected objects
      store.dispatch({ type: 'objects/updateMany', ids: selectedIds, patch })
    } else {
      store.dispatch({ type: 'defaults/set', patch })
    }
    saveCanvasState(store.getState())
  }

  const handleTextFontSize = (fontSize: TextFontSize) => {
    store.dispatch({ type: 'text/setPreset', fontSize })
  }

  const handleTextCommit = (id: string, content: string) => {
    if (content.trim()) {
      store.dispatch({ type: 'object/update', id, patch: { content } })
    }
    store.dispatch({ type: 'selection/setEditingText', id: null })
    saveCanvasState(store.getState())
  }

  const handleTextCancel = () => {
    // If the text is empty, delete the object
    const editingId = state.selection.editingTextId
    if (editingId) {
      const obj = state.scene.byId[editingId]
      if (obj && obj.type === 'text' && !obj.content.trim()) {
        store.dispatch({ type: 'objects/deleteMany', ids: [editingId] })
      }
    }
    store.dispatch({ type: 'selection/setEditingText', id: null })
  }

  // Wire toolbar visibility based on selection
  useEffect(() => {
    const { ids } = state.selection
    if (ids.length > 0) {
      // Compute bounding box of selected objects
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const id of ids) {
        const obj = state.scene.byId[id]
        if (!obj) continue
        const bounds = getObjectBounds(obj, state.scene)
        minX = Math.min(minX, bounds.x)
        minY = Math.min(minY, bounds.y)
        maxX = Math.max(maxX, bounds.x + bounds.width)
        maxY = Math.max(maxY, bounds.y + bounds.height)
      }
      if (isFinite(minX)) {
        store.dispatch({
          type: 'overlay/setToolbar',
          visible: true,
          anchorBounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        })
      }
    } else {
      store.dispatch({ type: 'overlay/setToolbar', visible: false, anchorBounds: null })
    }
  }, [state.selection.ids, state.scene.byId])

  return (
    <div
      className="canvas-app"
      ref={containerRef}
      tabIndex={0}
      onKeyDown={gesture.handleKeyDown}
      onKeyUp={gesture.handleKeyUp}
    >
      {/* Left Sidebar */}
      <aside className="sidebar">
        {/* Pointer Group */}
        <div className="sidebar-group">
          <button
            type="button"
            className={`sidebar-btn ${currentTool === 'pointer' ? 'active' : ''}`}
            onClick={() => setTool('pointer')}
            title="Select (V)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            </svg>
          </button>
          <button
            type="button"
            className={`sidebar-btn ${currentTool === 'pan' ? 'active' : ''}`}
            onClick={() => setTool('pan')}
            title="Pan (Space)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
            </svg>
          </button>
        </div>

        {/* Insert Group */}
        <div className="sidebar-group">
          <button
            type="button"
            className={`sidebar-btn ${currentTool === 'rectangle' ? 'active' : ''}`}
            onClick={() => setTool('rectangle')}
            title="Rectangle"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>
          <button
            type="button"
            className={`sidebar-btn ${currentTool === 'ellipse' ? 'active' : ''}`}
            onClick={() => setTool('ellipse')}
            title="Ellipse"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="12" rx="9" ry="7" />
            </svg>
          </button>
          <button
            type="button"
            className={`sidebar-btn ${currentTool === 'arrow' ? 'active' : ''}`}
            onClick={() => setTool('arrow')}
            title="Arrow"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <button
            type="button"
            className={`sidebar-btn ${currentTool === 'text' ? 'active' : ''}`}
            onClick={() => setTool('text')}
            title="Text"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </button>
          <button
            type="button"
            className={`sidebar-btn ${currentTool === 'delete' ? 'active' : ''}`}
            onClick={() => setTool('delete')}
            title="Delete"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

        {/* Style Group */}
        <div className="sidebar-group">
          <div className="palette-group">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`palette-chip ${effectiveColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => applyStyleChange({ strokeColor: color })}
                title={`Color: ${color}`}
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
                disabled={selectedIds.length > 0 && primaryObj?.type !== 'arrow'}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Document Group */}
        <div className="sidebar-group">
          <button type="button" onClick={undo} title="Undo (Ctrl+Z)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button type="button" onClick={redo} title="Redo (Ctrl+Y)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
            </svg>
          </button>
          <button
            type="button"
            className={state.snapping.enabled ? 'active' : ''}
            onClick={toggleSnapping}
            title="Snapping"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
        </div>

        {/* Text Preset (when text tool active) */}
        {currentTool === 'text' && (
          <div className="sidebar-group">
            <select
              className="font-size-select"
              value={state.ui.textFontSize}
              onChange={(e) => handleTextFontSize(Number(e.target.value) as TextFontSize)}
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>
        )}
      </aside>

      {/* Canvas */}
      <main className="canvas-wrapper" ref={containerRef}>
        {SvgRenderer.render({
          state,
          svgRef,
          onPointerDown: (event) => {
            if (currentTool === 'pan') {
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
        <TextEditorOverlay
          editingTextId={state.selection.editingTextId}
          objects={state.scene.byId}
          view={state.view}
          onCommit={handleTextCommit}
          onCancel={handleTextCancel}
        />
        <OverlayLayers store={store} containerRef={containerRef} />
      </main>

      {/* Export buttons */}
      <div className="export-buttons">
        <button type="button" onClick={handleExportSvg}>SVG</button>
        <button type="button" onClick={handleExportPng}>PNG</button>
      </div>
    </div>
  )
}

export default App
