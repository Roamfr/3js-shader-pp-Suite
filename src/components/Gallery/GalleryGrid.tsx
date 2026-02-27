import { useSyncExternalStore } from 'react'
import { useGalleryStore } from '../../store/galleryStore'
import { TileView } from './TileView'

const GRID_COLUMNS: Record<string, number> = {
  '2x2': 2,
  '2x3': 3,
  '3x3': 3,
}

// Responsive breakpoints
const MOBILE_MAX = 640
const TABLET_MAX = 1024

function getScreenWidth() {
  return window.innerWidth
}

function subscribeToResize(cb: () => void) {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}

function useWindowWidth() {
  return useSyncExternalStore(subscribeToResize, getScreenWidth)
}

export function GalleryGrid() {
  const tiles = useGalleryStore((s) => s.tiles)
  const gridSize = useGalleryStore((s) => s.gridSize)
  const width = useWindowWidth()

  // Responsive column override
  let columns = GRID_COLUMNS[gridSize] ?? 2
  if (width <= MOBILE_MAX) {
    columns = 1
  } else if (width <= TABLET_MAX) {
    columns = Math.min(columns, 2)
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 8,
        width: '100%',
        height: '100%',
        padding: 8,
        boxSizing: 'border-box',
      }}
    >
      {tiles.map((tile) => (
        <TileView key={tile.id} tile={tile} />
      ))}
    </div>
  )
}
