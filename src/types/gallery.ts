import type { TileConfig } from './tile'

export type GridSize = '2x2' | '2x3' | '3x3'

export interface GalleryState {
  tiles: TileConfig[]
  gridSize: GridSize
}
