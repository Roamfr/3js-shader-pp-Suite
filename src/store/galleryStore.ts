import { create } from 'zustand'
import type { TileConfig, SceneType, BuiltinModel, CameraState } from '../types/tile'
import type { ShaderConfig, PostEffectConfig } from '../types/shader'
import type { GridSize } from '../types/gallery'
import { loadGalleryState } from '../lib/persistence'

// Default camera: positioned at (3, 2, 5) looking at origin
const DEFAULT_CAMERA: CameraState = {
  position: [3, 2, 5],
  target: [0, 0, 0],
}

function createDefaultTile(label: string): TileConfig {
  return {
    id: crypto.randomUUID(),
    label,
    sceneType: 'procedural',
    builtinModel: 'DamagedHelmet',
    customModelUrl: null,
    shader: null,
    postEffects: [],
    cameraState: { ...DEFAULT_CAMERA },
    isGenerating: false,
    error: null,
    lastGoodShader: null,
  }
}

interface GalleryStore {
  tiles: TileConfig[]
  gridSize: GridSize

  setGridSize: (size: GridSize) => void
  addTile: () => void
  removeTile: (id: string) => void
  updateTile: (id: string, updates: Partial<TileConfig>) => void
  setShader: (id: string, shader: ShaderConfig) => void
  setPostEffect: (id: string, effects: PostEffectConfig[]) => void
  clearTile: (id: string) => void
  duplicateTile: (id: string) => void
  setTileError: (id: string, error: string | null) => void
  setTileGenerating: (id: string, generating: boolean) => void
  setTileScene: (id: string, sceneType: SceneType) => void
  setTileModel: (id: string, model: BuiltinModel) => void
  setCustomModelUrl: (id: string, url: string | null) => void
  setTileCameraState: (id: string, cameraState: CameraState) => void
  syncCameraToAll: (cameraState: CameraState) => void
  hydrateFromSaved: (tiles: TileConfig[], gridSize: GridSize) => void
}

// Grid size to tile count mapping
const GRID_TILE_COUNTS: Record<GridSize, number> = {
  '2x2': 4,
  '2x3': 6,
  '3x3': 9,
}

// Synchronous hydration from localStorage
const saved = loadGalleryState()

export const useGalleryStore = create<GalleryStore>((set) => ({
  tiles: saved?.tiles ?? [
    createDefaultTile('Tile 1'),
    createDefaultTile('Tile 2'),
    createDefaultTile('Tile 3'),
    createDefaultTile('Tile 4'),
  ],
  gridSize: saved?.gridSize ?? '2x2',

  setGridSize: (size) =>
    set((state) => {
      const targetCount = GRID_TILE_COUNTS[size]
      let tiles = [...state.tiles]
      while (tiles.length < targetCount) {
        tiles.push(createDefaultTile(`Tile ${tiles.length + 1}`))
      }
      tiles = tiles.slice(0, targetCount)
      return { gridSize: size, tiles }
    }),

  addTile: () =>
    set((state) => ({
      tiles: [...state.tiles, createDefaultTile(`Tile ${state.tiles.length + 1}`)],
    })),

  removeTile: (id) =>
    set((state) => ({
      tiles: state.tiles.filter((t) => t.id !== id),
    })),

  updateTile: (id, updates) =>
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  setShader: (id, shader) =>
    set((state) => ({
      tiles: state.tiles.map((t) =>
        t.id === id
          ? { ...t, shader, lastGoodShader: t.shader ?? t.lastGoodShader, error: null }
          : t
      ),
    })),

  setPostEffect: (id, effects) =>
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === id ? { ...t, postEffects: effects } : t)),
    })),

  clearTile: (id) =>
    set((state) => ({
      tiles: state.tiles.map((t) =>
        t.id === id
          ? { ...t, shader: null, postEffects: [], error: null, lastGoodShader: null }
          : t
      ),
    })),

  duplicateTile: (id) =>
    set((state) => {
      const source = state.tiles.find((t) => t.id === id)
      if (!source) return state
      const newTile: TileConfig = {
        ...source,
        id: crypto.randomUUID(),
        label: `${source.label} (copy)`,
      }
      return { tiles: [...state.tiles, newTile] }
    }),

  setTileError: (id, error) =>
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === id ? { ...t, error } : t)),
    })),

  setTileGenerating: (id, generating) =>
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === id ? { ...t, isGenerating: generating } : t)),
    })),

  setTileScene: (id, sceneType) =>
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === id ? { ...t, sceneType } : t)),
    })),

  setTileModel: (id, model) =>
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === id ? { ...t, builtinModel: model } : t)),
    })),

  setCustomModelUrl: (id, url) =>
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === id ? { ...t, customModelUrl: url } : t)),
    })),

  setTileCameraState: (id, cameraState) =>
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === id ? { ...t, cameraState } : t)),
    })),

  syncCameraToAll: (cameraState) =>
    set((state) => ({
      // Exclude clawGame tiles from camera sync — they use a fixed game camera
      tiles: state.tiles.map((t) =>
        t.sceneType === 'clawGame' ? t : { ...t, cameraState }
      ),
    })),

  hydrateFromSaved: (tiles, gridSize) => set({ tiles, gridSize }),
}))
