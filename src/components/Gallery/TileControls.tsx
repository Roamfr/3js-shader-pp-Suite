interface TileControlsProps {
  onClear: () => void
  onDuplicate: () => void
  onResetCamera: () => void
}

const btnStyle: React.CSSProperties = {
  padding: '2px 6px',
  background: 'rgba(0,0,0,0.6)',
  color: '#aaa',
  border: '1px solid #444',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 11,
}

export function TileControls({ onClear, onDuplicate, onResetCamera }: TileControlsProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        display: 'flex',
        gap: 2,
        opacity: 0,
        transition: 'opacity 0.2s',
        zIndex: 10,
      }}
      className="tile-controls"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onResetCamera() }}
        title="Reset camera to default view"
        style={btnStyle}
      >
        home
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate() }}
        title="Duplicate tile"
        style={btnStyle}
      >
        dup
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onClear() }}
        title="Clear tile"
        style={{ ...btnStyle, color: '#ff6666' }}
      >
        clr
      </button>
    </div>
  )
}
