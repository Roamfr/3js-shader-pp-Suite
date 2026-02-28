import { useEvalStore, type EvalFilter } from '../../store/evalStore'
import { useGalleryStore } from '../../store/galleryStore'
import type { GridSize } from '../../types/gallery'

const GRID_TILE_COUNTS: Record<GridSize, number> = {
  '2x2': 4,
  '2x3': 6,
  '3x3': 9,
}

const FILTER_OPTIONS: { value: EvalFilter; label: string }[] = [
  { value: 'all', label: 'All (49)' },
  { value: 'postfx', label: 'Post-FX Only (6)' },
  { value: 'material', label: 'Materials Only (6)' },
  { value: 'combo', label: 'Combinations (36)' },
]

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 12,
  fontWeight: 600,
  border: '1px solid #333',
  borderRadius: 6,
  cursor: 'pointer',
}

const navBtnStyle: React.CSSProperties = {
  ...btnStyle,
  padding: '6px 12px',
  background: '#1a1a2e',
  color: '#ccc',
}

export function EvalPanel() {
  const isEvalMode = useEvalStore((s) => s.isEvalMode)
  const filter = useEvalStore((s) => s.filter)
  const currentPage = useEvalStore((s) => s.currentPage)
  const startEval = useEvalStore((s) => s.startEval)
  const stopEval = useEvalStore((s) => s.stopEval)
  const setFilter = useEvalStore((s) => s.setFilter)
  const nextPage = useEvalStore((s) => s.nextPage)
  const prevPage = useEvalStore((s) => s.prevPage)
  const totalPages = useEvalStore((s) => s.totalPages)
  const gridSize = useGalleryStore((s) => s.gridSize)

  const handleStart = () => {
    const pageSize = GRID_TILE_COUNTS[gridSize] ?? 4
    startEval(pageSize)
  }

  if (!isEvalMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={handleStart}
          style={{
            ...btnStyle,
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
          }}
        >
          Start Auto Eval
        </button>
        <div style={{ fontSize: 11, color: '#666' }}>
          Generates all 49 effect combinations using the current grid size ({gridSize}).
        </div>
      </div>
    )
  }

  const total = totalPages()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Filter
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as EvalFilter)}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: '#1a1a1a',
            color: '#ccc',
            border: '1px solid #333',
            borderRadius: 4,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Page navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          style={{
            ...navBtnStyle,
            opacity: currentPage === 0 ? 0.3 : 1,
            cursor: currentPage === 0 ? 'default' : 'pointer',
          }}
        >
          Prev
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#aaa' }}>
          Page {currentPage + 1} of {total}
        </span>
        <button
          onClick={nextPage}
          disabled={currentPage >= total - 1}
          style={{
            ...navBtnStyle,
            opacity: currentPage >= total - 1 ? 0.3 : 1,
            cursor: currentPage >= total - 1 ? 'default' : 'pointer',
          }}
        >
          Next
        </button>
      </div>

      {/* Stop button */}
      <button
        onClick={stopEval}
        style={{
          ...btnStyle,
          background: '#dc2626',
          color: '#fff',
          border: 'none',
        }}
      >
        Stop Eval
      </button>
    </div>
  )
}
