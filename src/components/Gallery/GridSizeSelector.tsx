import { useGalleryStore } from '../../store/galleryStore'
import type { GridSize } from '../../types/gallery'

const GRID_OPTIONS: { value: GridSize; label: string }[] = [
  { value: '2x2', label: '2x2 (4 tiles)' },
  { value: '2x3', label: '2x3 (6 tiles)' },
  { value: '3x3', label: '3x3 (9 tiles)' },
]

export function GridSizeSelector() {
  const gridSize = useGalleryStore((s) => s.gridSize)
  const setGridSize = useGalleryStore((s) => s.setGridSize)

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {GRID_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setGridSize(value)}
          style={{
            padding: '4px 10px',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: gridSize === value ? 600 : 400,
            background: gridSize === value ? '#3b82f6' : '#2a2a2a',
            color: gridSize === value ? '#fff' : '#888',
          }}
        >
          {value}
        </button>
      ))}
    </div>
  )
}
