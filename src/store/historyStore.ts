import { create } from 'zustand'
import type { ShaderConfig, PostEffectConfig } from '../types/shader'
import { useGalleryStore } from './galleryStore'

const MAX_HISTORY = 20

export interface TileSnapshot {
  shader: ShaderConfig | null
  postEffects: PostEffectConfig[]
}

interface TileHistory {
  past: TileSnapshot[]
  future: TileSnapshot[]
}

interface HistoryStore {
  histories: Record<string, TileHistory>
  pushSnapshot: (tileId: string, snapshot: TileSnapshot) => void
  undo: (tileId: string) => TileSnapshot | null
  redo: (tileId: string) => TileSnapshot | null
  canUndo: (tileId: string) => boolean
  canRedo: (tileId: string) => boolean
  clearHistory: (tileId: string) => void
}

function getHistory(histories: Record<string, TileHistory>, tileId: string): TileHistory {
  return histories[tileId] ?? { past: [], future: [] }
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  histories: {},

  pushSnapshot: (tileId, snapshot) =>
    set((state) => {
      const history = getHistory(state.histories, tileId)
      const past = [...history.past, snapshot].slice(-MAX_HISTORY)
      return {
        histories: {
          ...state.histories,
          [tileId]: { past, future: [] },
        },
      }
    }),

  undo: (tileId) => {
    const state = get()
    const history = getHistory(state.histories, tileId)
    if (history.past.length === 0) return null

    // Get current state to push onto future
    const tile = useGalleryStore.getState().tiles.find((t) => t.id === tileId)
    if (!tile) return null

    const currentSnapshot: TileSnapshot = {
      shader: tile.shader,
      postEffects: tile.postEffects,
    }

    const past = [...history.past]
    const restored = past.pop()!
    const future = [currentSnapshot, ...history.future]

    set({
      histories: {
        ...state.histories,
        [tileId]: { past, future },
      },
    })

    return restored
  },

  redo: (tileId) => {
    const state = get()
    const history = getHistory(state.histories, tileId)
    if (history.future.length === 0) return null

    const tile = useGalleryStore.getState().tiles.find((t) => t.id === tileId)
    if (!tile) return null

    const currentSnapshot: TileSnapshot = {
      shader: tile.shader,
      postEffects: tile.postEffects,
    }

    const future = [...history.future]
    const restored = future.shift()!
    const past = [...history.past, currentSnapshot]

    set({
      histories: {
        ...state.histories,
        [tileId]: { past, future },
      },
    })

    return restored
  },

  canUndo: (tileId) => {
    const history = getHistory(get().histories, tileId)
    return history.past.length > 0
  },

  canRedo: (tileId) => {
    const history = getHistory(get().histories, tileId)
    return history.future.length > 0
  },

  clearHistory: (tileId) =>
    set((state) => ({
      histories: {
        ...state.histories,
        [tileId]: { past: [], future: [] },
      },
    })),
}))

/**
 * Hook that wires history + galleryStore together.
 * Call pushCurrentSnapshot before making changes, then undo/redo to apply.
 */
export function useUndoRedo() {
  const historyStore = useHistoryStore()
  const galleryStore = useGalleryStore()

  function pushCurrentSnapshot(tileId: string) {
    const tile = galleryStore.tiles.find((t) => t.id === tileId)
    if (!tile) return
    historyStore.pushSnapshot(tileId, {
      shader: tile.shader,
      postEffects: tile.postEffects,
    })
  }

  function undo(tileId: string) {
    const snapshot = historyStore.undo(tileId)
    if (!snapshot) return
    // Apply the restored snapshot to galleryStore
    galleryStore.updateTile(tileId, {
      shader: snapshot.shader,
      postEffects: snapshot.postEffects,
    })
  }

  function redo(tileId: string) {
    const snapshot = historyStore.redo(tileId)
    if (!snapshot) return
    galleryStore.updateTile(tileId, {
      shader: snapshot.shader,
      postEffects: snapshot.postEffects,
    })
  }

  return { pushCurrentSnapshot, undo, redo, canUndo: historyStore.canUndo, canRedo: historyStore.canRedo }
}
