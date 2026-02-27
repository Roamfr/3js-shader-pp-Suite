import type { TileConfig } from '../types/tile'
import type { GridSize, ProjectJSON } from '../types/gallery'

const STORAGE_KEY = 'shader-eval-gallery'

interface SavedState {
  tiles: TileConfig[]
  gridSize: GridSize
}

export function saveGalleryState(tiles: TileConfig[], gridSize: GridSize): void {
  try {
    const data: SavedState = {
      tiles: tiles.map((t) => ({
        ...t,
        isGenerating: false,
        error: null,
      })),
      gridSize,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function loadGalleryState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SavedState
    if (!Array.isArray(data.tiles) || !data.gridSize) return null
    return data
  } catch {
    return null
  }
}

export function clearGalleryState(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function exportProjectJSON(tiles: TileConfig[], gridSize: GridSize): ProjectJSON {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    gridSize,
    tiles: tiles.map((t) => ({
      ...t,
      isGenerating: false,
      error: null,
    })),
  }
}

export function parseProjectJSON(json: string): ProjectJSON {
  const data = JSON.parse(json)
  if (data.version !== 1 || !Array.isArray(data.tiles) || !data.gridSize) {
    throw new Error('Invalid project file format')
  }
  return data as ProjectJSON
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadGLSL(source: string, filename: string): void {
  downloadFile(source, filename, 'text/plain')
}

export function downloadScreenshot(canvas: HTMLCanvasElement, filename: string): void {
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
