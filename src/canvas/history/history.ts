import type { CanvasState } from '../model/types'

export type HistoryState = {
  undoStack: CanvasState[]
  redoStack: CanvasState[]
  pending: CanvasState | null
}

const cloneState = (state: CanvasState): CanvasState => {
  if (typeof structuredClone === 'function') {
    return structuredClone(state)
  }
  return JSON.parse(JSON.stringify(state)) as CanvasState
}

export const createHistory = (): HistoryState => ({
  undoStack: [],
  redoStack: [],
  pending: null,
})

export const startHistory = (history: HistoryState, state: CanvasState) => {
  if (!history.pending) {
    history.pending = cloneState(state)
  }
}

export const commitHistory = (history: HistoryState) => {
  if (history.pending) {
    history.undoStack.push(history.pending)
    history.pending = null
    history.redoStack = []
  }
}

export const pushHistory = (history: HistoryState, previousState: CanvasState) => {
  history.undoStack.push(cloneState(previousState))
  history.redoStack = []
}

export const undoHistory = (history: HistoryState, current: CanvasState): CanvasState => {
  const prev = history.undoStack.pop()
  if (!prev) return current
  history.redoStack.push(cloneState(current))
  history.pending = null
  return prev
}

export const redoHistory = (history: HistoryState, current: CanvasState): CanvasState => {
  const next = history.redoStack.pop()
  if (!next) return current
  history.undoStack.push(cloneState(current))
  history.pending = null
  return next
}
