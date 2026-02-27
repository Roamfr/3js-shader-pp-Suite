import { useGalleryStore } from '../../store/galleryStore'
import { TileView } from './TileView'

const GRID_COLUMNS: Record<string, number> = {
  '2x2': 2,
  '2x3': 3,
  '3x3': 3,
}

export function GalleryGrid() {
  const tiles = useGalleryStore((s) => s.tiles)
  const gridSize = useGalleryStore((s) => s.gridSize)
  const columns = GRID_COLUMNS[gridSize] ?? 2

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
